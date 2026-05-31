'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button, buttonVariants } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { EmptyState } from '@/components/ui/empty-state';
import { apiFetch } from '@/lib/api-client';
import { parseJsonField } from '@/lib/json-field';
import { APP_HOME } from '@/lib/paths';
import type { Book, CefrLevel, Quiz } from '@/lib/db/schema';
import { useKeyboardNav } from '@/lib/hooks/use-keyboard-nav';
import { useProfileStore } from '@/stores/profile';
import {
  ConfettiBurst,
  GeneratingState,
  ImmediateToggle,
  ScoreHeader,
} from './quiz-runner/components';

interface Props {
  book: Book;
  initialQuizzes: Quiz[];
}

type AnswerMap = Record<number, number>;

const LEVEL_CLASS: Record<CefrLevel, string> = {
  A1: 'level-a1',
  A2: 'level-a2',
  B1: 'level-b1',
  B2: 'level-b2',
};

/**
 * 퀴즈 제출 시 독서 로그 저장 (best-effort).
 * Reader가 이미 만든 로그 id가 localStorage(`reader:log:${profileId}:${bookId}`)에 있으면
 * 그 로그를 PATCH하여 "한 세션"으로 이어간다. 없으면 새 POST 후 PATCH.
 * 완료된 세션은 localStorage 키 제거 → 재독 시 새 log 생성.
 */
async function saveReadingLog(
  profileId: number,
  bookId: number,
  quizScore: number,
) {
  const key = `reader:log:${profileId}:${bookId}`;
  let logId: number | null = null;
  try {
    const cached = window.localStorage.getItem(key);
    if (cached) {
      const n = Number(cached);
      if (Number.isFinite(n)) logId = n;
    }
  } catch {
    /* ignore */
  }
  try {
    if (logId === null) {
      const { log } = await apiFetch<{ log: { id: number } }>('/api/logs', {
        method: 'POST',
        body: JSON.stringify({ profileId, bookId }),
      });
      logId = log.id;
    }
    await apiFetch('/api/logs', {
      method: 'PATCH',
      body: JSON.stringify({
        id: logId,
        progressRatio: 1,
        quizScore,
        finishedAtUnix: Math.floor(Date.now() / 1000),
      }),
    });
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  } catch (err) {
    console.warn('[reading-log] save failed:', err);
  }
}

const IMMEDIATE_KEY = 'quiz:immediate-feedback';

/**
 * Quiz.choices가 string으로 도착해도 (mysql2 typeCast 우회 케이스, 2026-04-26 사고)
 * UI에서 `.map`이 폭발하지 않도록 array로 정규화한다. parse 실패하면 빈 4지선다 폴백.
 */
function normalizeQuiz(q: Quiz): Quiz {
  const parsed = parseJsonField<Quiz['choices']>(q.choices);
  if (parsed && Array.isArray(parsed)) {
    return q.choices === parsed ? q : { ...q, choices: parsed };
  }
  return { ...q, choices: ['', '', '', ''] };
}

export function QuizRunner({ book, initialQuizzes }: Props) {
  const profileId = useProfileStore((s) => s.currentProfileId);
  const [quizzes, setQuizzes] = useState<Quiz[]>(() =>
    initialQuizzes.map(normalizeQuiz),
  );
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [submitted, setSubmitted] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [bouncingChoice, setBouncingChoice] = useState<number | null>(null);
  // 즉시 피드백 — 기본 OFF (일괄 채점).
  // 2026 Educational Psychology Review 메타분석: 타이밍보다 일관성이 중요.
  // 아동 인지 부하 관점에서 기본값은 일괄로 두되 부모/사용자가 토글 가능.
  const [immediate, setImmediate] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      setImmediate(window.localStorage.getItem(IMMEDIATE_KEY) === '1');
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(IMMEDIATE_KEY, immediate ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [immediate]);

  const levelClass = LEVEL_CLASS[book.cefr];

  const handleSubmit = useCallback(() => {
    const correct = quizzes.filter(
      (q) => answers[q.id] === q.answerIndex,
    ).length;
    setSubmitted(true);
    if (profileId) {
      void saveReadingLog(profileId, book.id, correct);
    }
  }, [quizzes, answers, profileId, book.id]);

  useEffect(() => {
    if (initialQuizzes.length > 0) return;
    setGenerating(true);
    apiFetch<{ quizzes: Quiz[] }>(`/api/books/${book.id}/quiz`, {
      method: 'POST',
    })
      .then((res) => setQuizzes(res.quizzes.map(normalizeQuiz)))
      .catch((err) => toast.error(`퀴즈 생성 실패: ${err.message}`))
      .finally(() => setGenerating(false));
  }, [book.id, initialQuizzes.length]);

  const current = quizzes[idx];
  const selected = current ? answers[current.id] : undefined;
  const isLast = idx === quizzes.length - 1;

  // 답변 선택 (숫자키 + 클릭 공용)
  const selectChoice = useCallback(
    (ci: number) => {
      if (!current) return;
      setAnswers((prev) => ({ ...prev, [current.id]: ci }));
      setBouncingChoice(ci);
      window.setTimeout(() => setBouncingChoice(null), 400);
    },
    [current],
  );

  // 키보드 네비게이션 (결과 화면 아님, 생성 중 아님)
  const navEnabled = !generating && !submitted && Boolean(current);
  const bindings = useMemo(
    () => ({
      '1': () => selectChoice(0),
      '2': () => selectChoice(1),
      '3': () => selectChoice(2),
      '4': () => selectChoice(3),
      ArrowLeft: () => setIdx((i) => Math.max(0, i - 1)),
      ArrowRight: () => {
        if (selected === undefined) return;
        if (isLast) {
          handleSubmit();
        } else {
          setIdx((i) => i + 1);
        }
      },
      Enter: () => {
        if (selected === undefined) return;
        if (isLast) handleSubmit();
        else setIdx((i) => i + 1);
      },
    }),
    [selectChoice, isLast, selected, handleSubmit],
  );
  useKeyboardNav(bindings, navEnabled);

  if (generating) {
    return <GeneratingState />;
  }
  if (quizzes.length === 0) {
    return <EmptyState text="아직 퀴즈가 없습니다." />;
  }
  if (!current) return null;

  if (submitted) {
    const correct = quizzes.filter(
      (q) => answers[q.id] === q.answerIndex,
    ).length;
    const isPerfect = correct === quizzes.length;
    return (
      <section className="space-y-6 animate-fade-up">
        <ScoreHeader book={book} score={correct} total={quizzes.length} />
        {isPerfect ? <ConfettiBurst /> : null}
        <div className="space-y-4">
          {quizzes.map((q, i) => {
            const userIdx = answers[q.id];
            const isCorrect = userIdx === q.answerIndex;
            return (
              <article
                key={q.id}
                className={`stagger-item overflow-hidden rounded-3xl border-2 bg-card p-5 sticker-shadow ${
                  isCorrect ? 'border-border' : 'border-[color:var(--destructive)]/60'
                }`}
              >
                <header className="mb-3 flex items-start justify-between gap-3">
                  <h3 className="text-base font-bold">
                    Q{i + 1}. {q.question}
                  </h3>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      isCorrect
                        ? 'level-a1 animate-bounce-in'
                        : 'bg-[color:var(--destructive)]/15 text-[color:var(--destructive)] animate-shake-no'
                    }`}
                  >
                    {isCorrect ? '✓ 정답' : '✗ 오답'}
                  </span>
                </header>
                <ul className="space-y-1.5 text-sm">
                  {q.choices.map((c, ci) => {
                    const right = ci === q.answerIndex;
                    const wrongPicked = ci === userIdx && !right;
                    return (
                      <li
                        key={ci}
                        className={`flex items-start gap-2 rounded-xl px-3 py-2 ${
                          right
                            ? 'bg-[color:var(--level-a1)]/60 text-[color:var(--level-a1-fg)]'
                            : wrongPicked
                              ? 'bg-[color:var(--destructive)]/10 text-[color:var(--destructive)]'
                              : 'text-muted-foreground'
                        }`}
                      >
                        <span className="mt-0.5 w-4 shrink-0 text-center">
                          {right ? '✅' : wrongPicked ? '❌' : '·'}
                        </span>
                        <span className="flex-1">{c}</span>
                      </li>
                    );
                  })}
                </ul>
                {q.explanation ? (
                  <p className="mt-3 rounded-2xl bg-muted/60 p-3 text-xs leading-relaxed">
                    💡 {q.explanation}
                  </p>
                ) : null}
              </article>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/book/${book.id}`}
            className={buttonVariants({
              variant: 'outline',
              className: 'rounded-full press-scale',
            })}
          >
            다시 읽기
          </Link>
          <Link
            href={APP_HOME}
            className={buttonVariants({
              className: 'rounded-full press-scale',
            })}
          >
            책장으로
          </Link>
        </div>
      </section>
    );
  }

  const progress = ((idx + 1) / quizzes.length) * 100;

  return (
    <section className="space-y-6 animate-fade-up">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            {book.title}
          </h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
            <span className={`${levelClass} inline-flex items-center rounded-full px-2.5 py-1 font-semibold`}>
              {book.cefr}
              <span className="level-dots" data-level={book.cefr} aria-hidden />
            </span>
            <span className="text-muted-foreground">
              4지선다 {quizzes.length}문제
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ImmediateToggle value={immediate} onChange={setImmediate} />
          <Link
            href={`/book/${book.id}`}
            className={buttonVariants({
              variant: 'outline',
              size: 'sm',
              className: 'rounded-full press-scale',
            })}
          >
            ← 돌아가기
          </Link>
        </div>
      </header>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
          <span aria-live="polite">
            {idx + 1} <span className="text-foreground/40">/</span>{' '}
            {quizzes.length}
          </span>
          <span className="tabular-nums text-primary">
            {Math.round(progress)}%
          </span>
        </div>
        <Progress value={progress} className="h-2.5 rounded-full" />
      </div>

      <article
        key={current.id}
        className="animate-pop-in rounded-3xl border-2 border-border bg-card p-6 sticker-shadow sm:p-8"
      >
        <h2 className="text-lg font-bold leading-relaxed sm:text-xl">
          Q{idx + 1}. {current.question}
        </h2>
        <div className="mt-5 grid gap-2.5">
          {current.choices.map((c, ci) => {
            const active = selected === ci;
            const isBouncing = bouncingChoice === ci;
            // 즉시 피드백 ON + 이미 답변한 경우: 선택지별 정/오 시각화
            const revealing = immediate && selected !== undefined;
            const isCorrect = ci === current.answerIndex;
            const wrongPicked = revealing && active && !isCorrect;
            const correctMarked = revealing && isCorrect;
            let state = '';
            if (wrongPicked) {
              state =
                'border-[color:var(--destructive)]/50 bg-[color:var(--destructive)]/10 text-[color:var(--destructive)] animate-shake-no';
            } else if (correctMarked) {
              state =
                'border-[color:var(--level-a1)] bg-[color:var(--level-a1)]/50 text-[color:var(--level-a1-fg)]';
            } else if (active) {
              state =
                'border-primary bg-primary/10 text-foreground ring-2 ring-primary/30';
            } else {
              state = 'border-border/60 bg-background hover:bg-muted/60';
            }
            return (
              <button
                key={ci}
                type="button"
                onClick={() => selectChoice(ci)}
                aria-pressed={active}
                disabled={revealing}
                className={`group flex items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-medium transition ${active || revealing ? '' : 'press-scale'} ${state} ${isBouncing && !revealing ? 'animate-bounce-in' : ''}`}
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition ${
                    correctMarked
                      ? 'bg-[color:var(--level-a1-fg)] text-[color:var(--level-a1)]'
                      : wrongPicked
                        ? 'bg-[color:var(--destructive)] text-white'
                        : active
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground group-hover:bg-background'
                  }`}
                  aria-hidden
                >
                  {correctMarked ? '✓' : wrongPicked ? '✗' : String.fromCharCode(65 + ci)}
                </span>
                <span className="flex-1 leading-relaxed">{c}</span>
                <kbd className="hidden rounded bg-muted/70 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground sm:inline">
                  {ci + 1}
                </kbd>
              </button>
            );
          })}
        </div>

        {/* 즉시 피드백 ON + 답변한 경우: 해설 (있으면) */}
        {immediate && selected !== undefined && current.explanation ? (
          <p className="mt-3 rounded-xl bg-muted/60 p-3 text-xs leading-relaxed animate-fade-up">
            💡 {current.explanation}
          </p>
        ) : null}
      </article>

      <div className="flex items-center justify-between gap-3">
        <Button
          variant="outline"
          onClick={() => setIdx((i) => Math.max(0, i - 1))}
          disabled={idx === 0}
          className="rounded-full press-scale"
        >
          ← 이전
        </Button>
        {isLast ? (
          <Button
            onClick={handleSubmit}
            disabled={Object.keys(answers).length < quizzes.length}
            variant="complete"
            size="lg"
            className="rounded-full press-scale"
          >
            제출하기
          </Button>
        ) : (
          <Button
            onClick={() => setIdx((i) => i + 1)}
            disabled={selected === undefined}
            className="rounded-full press-scale"
          >
            다음 →
          </Button>
        )}
      </div>
    </section>
  );
}
