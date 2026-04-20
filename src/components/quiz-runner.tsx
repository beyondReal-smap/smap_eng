'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button, buttonVariants } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { apiFetch } from '@/lib/api-client';
import type { Book, Quiz } from '@/lib/db/schema';
import { useProfileStore } from '@/stores/profile';

interface Props {
  book: Book;
  initialQuizzes: Quiz[];
}

type AnswerMap = Record<number, number>;

/** 퀴즈 제출 시 독서 로그 저장 (best-effort, 실패해도 UX 유지). */
async function saveReadingLog(
  profileId: number,
  bookId: number,
  quizScore: number,
) {
  try {
    const { log } = await apiFetch<{ log: { id: number } }>('/api/logs', {
      method: 'POST',
      body: JSON.stringify({ profileId, bookId }),
    });
    await apiFetch('/api/logs', {
      method: 'PATCH',
      body: JSON.stringify({
        id: log.id,
        progressRatio: 1,
        quizScore,
        finishedAtUnix: Math.floor(Date.now() / 1000),
      }),
    });
  } catch (err) {
    console.warn('[reading-log] save failed:', err);
  }
}

export function QuizRunner({ book, initialQuizzes }: Props) {
  const profileId = useProfileStore((s) => s.currentProfileId);
  const [quizzes, setQuizzes] = useState<Quiz[]>(initialQuizzes);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [submitted, setSubmitted] = useState(false);
  const [generating, setGenerating] = useState(false);

  function handleSubmit() {
    const correct = quizzes.filter(
      (q) => answers[q.id] === q.answerIndex,
    ).length;
    setSubmitted(true);
    if (profileId) {
      void saveReadingLog(profileId, book.id, correct);
    }
  }

  useEffect(() => {
    if (initialQuizzes.length > 0) return;
    setGenerating(true);
    apiFetch<{ quizzes: Quiz[] }>(`/api/books/${book.id}/quiz`, {
      method: 'POST',
    })
      .then((res) => setQuizzes(res.quizzes))
      .catch((err) => toast.error(`퀴즈 생성 실패: ${err.message}`))
      .finally(() => setGenerating(false));
  }, [book.id, initialQuizzes.length]);

  if (generating) {
    return <GeneratingState />;
  }
  if (quizzes.length === 0) {
    return <EmptyState text="아직 퀴즈가 없습니다." />;
  }

  const current = quizzes[idx];
  if (!current) return null;

  const selected = answers[current.id];
  const progress = ((idx + 1) / quizzes.length) * 100;
  const isLast = idx === quizzes.length - 1;

  if (submitted) {
    const correct = quizzes.filter(
      (q) => answers[q.id] === q.answerIndex,
    ).length;
    return (
      <section className="space-y-6 animate-fade-up">
        <ScoreHeader book={book} score={correct} total={quizzes.length} />
        <div className="space-y-4">
          {quizzes.map((q, i) => {
            const userIdx = answers[q.id];
            const isCorrect = userIdx === q.answerIndex;
            return (
              <article
                key={q.id}
                className={`stagger-item overflow-hidden rounded-3xl border bg-card p-5 shadow-sm ${
                  isCorrect ? 'border-border/60' : 'border-[color:var(--destructive)]/40'
                }`}
              >
                <header className="mb-3 flex items-start justify-between gap-3">
                  <h3 className="text-base font-extrabold">
                    Q{i + 1}. {q.question}
                  </h3>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                      isCorrect
                        ? 'level-a1'
                        : 'bg-[color:var(--destructive)]/15 text-[color:var(--destructive)]'
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
            href="/"
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

  const levelClass =
    book.cefr === 'A1'
      ? 'level-a1'
      : book.cefr === 'A2'
        ? 'level-a2'
        : 'level-b1';

  return (
    <section className="space-y-6 animate-fade-up">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight sm:text-2xl">
            🧠 {book.title}
          </h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
            <span className={`${levelClass} rounded-full px-2.5 py-1 font-bold`}>
              {book.cefr}
            </span>
            <span className="text-muted-foreground">
              4지선다 {quizzes.length}문제
            </span>
          </div>
        </div>
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
      </header>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
          <span>
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
        className="animate-pop-in rounded-3xl border border-border/60 bg-card p-6 shadow-sm sm:p-8"
      >
        <h2 className="text-lg font-extrabold leading-relaxed sm:text-xl">
          Q{idx + 1}. {current.question}
        </h2>
        <div className="mt-5 grid gap-2.5">
          {current.choices.map((c, ci) => {
            const active = selected === ci;
            return (
              <button
                key={ci}
                type="button"
                onClick={() =>
                  setAnswers((prev) => ({ ...prev, [current.id]: ci }))
                }
                aria-pressed={active}
                className={`group flex items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-medium transition press-scale ${
                  active
                    ? 'border-primary bg-primary/10 text-foreground ring-2 ring-primary/30'
                    : 'border-border/60 bg-background hover:bg-muted/60'
                }`}
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-extrabold transition ${
                    active
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground group-hover:bg-background'
                  }`}
                >
                  {String.fromCharCode(65 + ci)}
                </span>
                <span className="flex-1 leading-relaxed">{c}</span>
              </button>
            );
          })}
        </div>
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
            size="lg"
            className="rounded-full press-scale bg-gradient-to-r from-[color:var(--primary)] to-[color:var(--chart-4)] text-primary-foreground shadow-lg"
          >
            제출하기 🎯
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

function ScoreHeader({
  book,
  score,
  total,
}: {
  book: Book;
  score: number;
  total: number;
}) {
  const ratio = score / total;
  const emoji = ratio === 1 ? '🏆' : ratio >= 0.6 ? '🎉' : '💪';
  const label =
    ratio === 1 ? '만점!' : ratio >= 0.6 ? '잘했어요' : '한 번 더 읽어볼까요?';
  const pct = Math.round(ratio * 100);
  return (
    <article className="animate-pop-in relative overflow-hidden rounded-3xl border border-border/60 bg-card p-8 text-center shadow-sm">
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[color:var(--primary)]/10 via-transparent to-[color:var(--accent)]/10"
      />
      <div className="relative">
        <div className="mx-auto mb-2 inline-block text-6xl animate-float-soft">
          {emoji}
        </div>
        <h2 className="text-3xl font-black tabular-nums">
          <span className="bg-gradient-to-r from-[color:var(--primary)] to-[color:var(--chart-4)] bg-clip-text text-transparent">
            {score}
          </span>
          <span className="text-muted-foreground"> / {total}</span>
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {label} · {book.title}
        </p>
        <div className="mx-auto mt-5 max-w-sm">
          <Progress value={pct} className="h-2.5 rounded-full" />
          <p className="mt-1 text-xs font-semibold text-primary">{pct}%</p>
        </div>
      </div>
    </article>
  );
}

function GeneratingState() {
  return (
    <div className="animate-pop-in flex flex-col items-center rounded-3xl border border-dashed border-border/80 bg-card/50 py-16 text-center glass-card">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-4xl animate-wiggle-slow">
        🧠
      </div>
      <h3 className="mt-4 text-lg font-extrabold">퀴즈를 만들고 있어요</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        10~30초쯤 걸려요. 잠깐만 기다려 주세요!
      </p>
      <div className="mt-4 w-48">
        <div className="shimmer h-2 w-full rounded-full" />
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-3xl border border-dashed py-16 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}
