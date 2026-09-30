'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronRight, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { EmptyState } from '@/components/ui/empty-state';
import { apiFetch } from '@/lib/api-client';
import { parseJsonField } from '@/lib/json-field';
import { APP_HOME } from '@/lib/paths';
import type { Book, Quiz } from '@/lib/db/schema';
import { useKeyboardNav } from '@/lib/hooks/use-keyboard-nav';
import { findEvidence, type EvidencePassage } from '@/lib/quiz/evidence';
import {
  highlightedChoice,
  isSameItem,
  readAloudSequence,
  readAloudText,
  type ReadAloudItem,
} from '@/lib/quiz/read-aloud';
import { sessionPoints } from '@/lib/rewards';
import { useProfileStore } from '@/stores/profile';
import {
  BearQuestion,
  ChoiceRow,
  ConfettiBurst,
  EvidenceCard,
  GeneratingState,
  PRIMARY_PILL,
  QuizResult,
  QuizTopBar,
  ordinalLabel,
  type ChoiceState,
  type ScoreSaveState,
} from './quiz-runner/components';
import { useQuizReadAloud } from './quiz-runner/use-read-aloud';

interface Props {
  book: Book;
  initialQuizzes: Quiz[];
  /** "책 속 근거" 카드용 본문 — 서버가 퀴즈와 함께 1회 불러온다(실패하면 빈 배열, 카드만 생략). */
  passages: EvidencePassage[];
}

type AnswerMap = Record<number, number>;

/**
 * 퀴즈 제출 시 독서 로그 저장.
 * Reader가 이미 만든 로그 id가 localStorage(`reader:log:${profileId}:${bookId}`)에 있으면
 * 그 로그를 PATCH하여 "한 세션"으로 이어간다. 없으면 새 POST 후 PATCH.
 * 완료된 세션은 localStorage 키 제거 → 재독 시 새 log 생성.
 * 결과 화면이 "+P 획득!"을 기록된 경우에만 보여 주도록 성공 여부를 돌려준다.
 */
async function saveReadingLog(
  profileId: number,
  bookId: number,
  quizScore: number,
): Promise<boolean> {
  const key = `reader:log:${profileId}:${bookId}`;
  let logId: number | null = null;
  try {
    const cached = window.localStorage.getItem(key);
    if (cached) {
      const n = Number(cached);
      if (Number.isFinite(n)) logId = n;
    }
  } catch {
    /* localStorage 불가 환경 — 새 로그를 만든다 */
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
      /* localStorage 불가 환경 — 다음 읽기가 같은 로그를 이어 쓸 뿐 */
    }
    return true;
  } catch (err) {
    console.warn('[reading-log] save failed:', err);
    return false;
  }
}

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

/** 푸는 중 답을 즉시 저장 — 나갔다 들어와도 이미 푼 문항을 되돌릴 수 없다(오답 후 재진입해 고치는 것 방지). */
const progressKey = (bookId: number) => `quiz:progress:${bookId}`;

function readProgress(bookId: number, quizzes: Quiz[]): AnswerMap {
  try {
    const raw = window.localStorage.getItem(progressKey(bookId));
    if (!raw) return {};
    const saved = JSON.parse(raw) as unknown;
    if (!saved || typeof saved !== 'object') return {};
    // 서버가 퀴즈를 재생성해 id가 달라졌을 수 있으므로 현재 문항에 있는 id만 복원.
    const valid = new Set(quizzes.map((q) => q.id));
    const out: AnswerMap = {};
    for (const [k, v] of Object.entries(saved as Record<string, unknown>)) {
      const id = Number(k);
      if (valid.has(id) && typeof v === 'number') out[id] = v;
    }
    return out;
  } catch (err) {
    console.warn('[quiz] progress restore failed:', err);
    return {};
  }
}

function writeProgress(bookId: number, answers: AnswerMap | null) {
  try {
    if (answers) window.localStorage.setItem(progressKey(bookId), JSON.stringify(answers));
    else window.localStorage.removeItem(progressKey(bookId));
  } catch (err) {
    console.warn('[quiz] progress save failed:', err);
  }
}

/**
 * 퀴즈 "곰과 이야기 되짚기"(네이티브 11차·15차와 같은 흐름).
 * 답을 고르면 바로 정답을 보여 주고(책 속 근거 카드), "다음 질문 →"으로 넘어간다.
 * 마지막 문항 뒤 "결과 보기 →"에서 점수를 기록한다. "다시 풀기"는 연습(점수 재기록 없음).
 */
export function QuizRunner({ book, initialQuizzes, passages }: Props) {
  const profileId = useProfileStore((s) => s.currentProfileId);
  const [quizzes, setQuizzes] = useState<Quiz[]>(() =>
    initialQuizzes.map(normalizeQuiz),
  );
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [finished, setFinished] = useState(false);
  // 서버에 퀴즈가 없으면 들어오자마자 생성 요청 — 첫 렌더부터 생성 중 화면.
  const [generating, setGenerating] = useState(initialQuizzes.length === 0);
  const [saveState, setSaveState] = useState<ScoreSaveState>('unavailable');
  const [announcement, setAnnouncement] = useState('');
  /** 이 화면에서 점수를 이미 기록했는지 — 다시 풀기는 연습으로 처리. */
  const recordedRef = useRef(false);
  const submittedScoreRef = useRef(0);
  const restoredRef = useRef(false);
  const resultHeadingRef = useRef<HTMLDivElement>(null);
  const readAloud = useQuizReadAloud();
  const { stop: stopReading } = readAloud;

  useEffect(() => {
    if (initialQuizzes.length > 0) return;
    apiFetch<{ quizzes: Quiz[] }>(`/api/books/${book.id}/quiz`, {
      method: 'POST',
    })
      .then((res) => setQuizzes(res.quizzes.map(normalizeQuiz)))
      .catch((err) => toast.error(`퀴즈 생성 실패: ${err.message}`))
      .finally(() => setGenerating(false));
  }, [book.id, initialQuizzes.length]);

  // 중도 이탈했던 진행분 복원 — 이미 푼 문항은 답이 고정된 채 첫 미응답 문항부터 재개.
  // localStorage는 클라이언트에서만 읽을 수 있어 마운트 뒤 한 번.
  useEffect(() => {
    if (restoredRef.current || quizzes.length === 0) return;
    restoredRef.current = true;
    const saved = readProgress(book.id, quizzes);
    if (Object.keys(saved).length === 0) return;
    const firstOpen = quizzes.findIndex((q) => saved[q.id] === undefined);
    const frame = window.requestAnimationFrame(() => {
      setAnswers(saved);
      setIdx(firstOpen === -1 ? quizzes.length - 1 : firstOpen);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [book.id, quizzes]);

  const current = quizzes[idx];
  const selected = current ? answers[current.id] : undefined;
  const answered = selected !== undefined;
  const isLast = idx === quizzes.length - 1;
  const score = quizzes.filter((q) => answers[q.id] === q.answerIndex).length;
  const isPerfect = quizzes.length > 0 && score === quizzes.length;

  const evidence = useMemo(() => {
    if (!current || !answered) return null;
    const answer = current.choices[current.answerIndex];
    return answer ? findEvidence(answer, current.question, passages) : null;
  }, [current, answered, passages]);

  const selectChoice = useCallback(
    (ci: number) => {
      if (!current || answers[current.id] !== undefined) return;
      if (ci < 0 || ci >= current.choices.length) return;
      // 답하면 읽어 주기를 즉시 멈춘다(15차).
      stopReading();
      const next = { ...answers, [current.id]: ci };
      setAnswers(next);
      writeProgress(book.id, next);
      const correctText = current.choices[current.answerIndex] ?? '';
      setAnnouncement(ci === current.answerIndex ? '정답이에요' : `아쉬워요. 정답은 ${correctText}`);
    },
    [answers, book.id, current, stopReading],
  );

  const submit = useCallback(async () => {
    stopReading();
    setFinished(true);
    writeProgress(book.id, null);
    submittedScoreRef.current = score;
    if (recordedRef.current) {
      setSaveState('practice');
      return;
    }
    if (!profileId) {
      setSaveState('unavailable');
      return;
    }
    setSaveState('saving');
    const saved = await saveReadingLog(profileId, book.id, score);
    if (saved) recordedRef.current = true;
    else toast.error('점수를 저장하지 못했어요');
    setSaveState(saved ? 'saved' : 'failed');
  }, [book.id, profileId, score, stopReading]);

  const retrySave = useCallback(async () => {
    if (!profileId || recordedRef.current) return;
    setSaveState('saving');
    const saved = await saveReadingLog(profileId, book.id, submittedScoreRef.current);
    if (saved) {
      recordedRef.current = true;
      toast.success('점수를 저장했어요');
    }
    setSaveState(saved ? 'saved' : 'failed');
  }, [book.id, profileId]);

  const goNext = useCallback(() => {
    if (!answered) return;
    stopReading();
    if (isLast) void submit();
    else {
      setIdx((i) => i + 1);
      setAnnouncement('');
    }
  }, [answered, isLast, stopReading, submit]);

  const restart = useCallback(() => {
    stopReading();
    writeProgress(book.id, null);
    setAnswers({});
    setIdx(0);
    setFinished(false);
    setAnnouncement('');
  }, [book.id, stopReading]);

  // 결과 화면으로 바뀌면 제목으로 초점을 옮겨 스크린 리더가 결과를 바로 읽는다.
  useEffect(() => {
    if (finished) resultHeadingRef.current?.querySelector('h1')?.focus();
  }, [finished]);

  // 키보드: 1~4 = 답 고르기, → = 다음(답한 뒤). Enter는 초점 버튼과 겹쳐 두 번 넘어가는 문제로 쓰지 않는다.
  const navEnabled = !generating && !finished && Boolean(current);
  const bindings = useMemo(
    () => ({
      '1': () => selectChoice(0),
      '2': () => selectChoice(1),
      '3': () => selectChoice(2),
      '4': () => selectChoice(3),
      ArrowRight: goNext,
    }),
    [selectChoice, goNext],
  );
  useKeyboardNav(bindings, navEnabled);

  const bookHref = `/book/${book.id}`;

  if (generating) {
    return (
      <div className="space-y-2">
        <QuizTopBar book={book} closeHref={bookHref} closeLabel="퀴즈 닫기" steps={null} currentStep={0} />
        <GeneratingState />
      </div>
    );
  }
  if (quizzes.length === 0) {
    return <EmptyState text="아직 퀴즈가 없습니다." />;
  }
  if (!current) return null;

  if (finished) {
    const missed = quizzes.filter(
      (q) => answers[q.id] !== undefined && answers[q.id] !== q.answerIndex,
    );
    return (
      <div className="flex min-h-[calc(100dvh-8rem)] flex-col">
        <QuizTopBar book={book} closeHref={APP_HOME} closeLabel="책장으로 닫기" steps={null} currentStep={0} />
        {isPerfect ? <ConfettiBurst /> : null}
        <div ref={resultHeadingRef} className="flex-1 pb-4">
          <QuizResult
            score={score}
            total={quizzes.length}
            missed={missed}
            earnedPoints={sessionPoints(isPerfect)}
            saveState={saveState}
            onRetrySave={() => void retrySave()}
          />
        </div>
        <div className="sticky bottom-0 -mx-4 flex gap-2.5 bg-[linear-gradient(to_bottom,transparent,var(--haru-wall)_30%)] px-4 pb-4 pt-5">
          <button
            type="button"
            onClick={restart}
            className="inline-flex min-h-[60px] w-[120px] shrink-0 items-center justify-center gap-1 rounded-full border-[2.5px] border-[#ebc9b6] bg-white/70 text-base font-extrabold text-haru-ink transition-transform active:scale-[0.98] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none"
          >
            <RotateCcw aria-hidden className="size-4" strokeWidth={3} />
            다시 풀기
          </button>
          <Link href={APP_HOME} className={`${PRIMARY_PILL} min-h-[60px] flex-1 text-base`}>
            책장으로
          </Link>
        </div>
      </div>
    );
  }

  const isCorrect = answered ? selected === current.answerIndex : null;
  const choiceState = (ci: number): ChoiceState => {
    if (!answered) return 'open';
    if (ci === current.answerIndex) return 'correct';
    if (ci === selected) return 'picked';
    return 'dimmed';
  };
  const textSource = {
    question: current.question,
    choices: current.choices,
    evidenceSentence: evidence?.sentence ?? null,
  };
  // 말풍선 🔊 차례 — 답 전 질문 → 선택지 1…N, 답한 뒤 질문만. 읽을 수 없는 항목은 건너뛴다.
  const sequence = readAloudSequence(current.choices.length, answered)
    .map((item): [ReadAloudItem, string] | null => {
      const text = readAloudText(item, textSource);
      return text ? [item, text] : null;
    })
    .filter((entry): entry is [ReadAloudItem, string] => entry !== null);
  const readingChoice = highlightedChoice(readAloud.current);
  const evidenceText = readAloudText({ kind: 'evidence' }, textSource);

  return (
    <div className="flex min-h-[calc(100dvh-8rem)] flex-col">
      <QuizTopBar
        book={book}
        closeHref={bookHref}
        closeLabel="퀴즈 닫기"
        steps={quizzes.map((q) => (answers[q.id] === undefined ? 'open' : 'answered'))}
        currentStep={idx}
      />

      <p role="status" className="sr-only">{announcement}</p>

      <div key={current.id} className="flex-1 space-y-3.5 pb-4">
        <BearQuestion
          question={current.question}
          label={
            isCorrect === null
              ? ordinalLabel(idx + 1)
              : isCorrect
                ? '맞았어! 잘 기억했네'
                : '괜찮아, 같이 찾아보자!'
          }
          pose={isCorrect === null ? 'normal' : isCorrect ? 'cheer' : 'worried'}
          isReading={readAloud.isSequence}
          onSpeak={sequence.length > 0 ? () => readAloud.toggleSequence(sequence) : null}
        />

        <div className="space-y-2.5">
          {current.choices.map((c, ci) => {
            const speakText = answered ? null : readAloudText({ kind: 'choice', index: ci }, textSource);
            return (
              <ChoiceRow
                key={ci}
                index={ci}
                total={current.choices.length}
                text={c}
                state={choiceState(ci)}
                isReadingAloud={readingChoice === ci}
                onSelect={() => selectChoice(ci)}
                onSpeak={speakText ? () => readAloud.speak({ kind: 'choice', index: ci }, speakText) : null}
              />
            );
          })}
        </div>

        {answered ? (
          <EvidenceCard
            book={book}
            explanation={current.explanation}
            evidence={evidence}
            isReadingAloud={isSameItem(readAloud.current, { kind: 'evidence' })}
            onSpeak={
              evidence && evidenceText
                ? () => readAloud.speak({ kind: 'evidence' }, evidenceText)
                : null
            }
          />
        ) : null}
      </div>

      {/* 하단 고정 — 답하기 전엔 안내 한 줄, 답한 뒤엔 "다음 질문 →" / "결과 보기 →". */}
      <div className="sticky bottom-0 -mx-4 bg-[linear-gradient(to_bottom,transparent,var(--haru-wall)_30%)] px-4 pb-4 pt-5">
        {answered ? (
          <button type="button" onClick={goNext} className={`${PRIMARY_PILL} w-full`}>
            {isLast ? '결과 보기' : '다음 질문'}
            <ChevronRight aria-hidden className="size-5" strokeWidth={3.5} />
          </button>
        ) : (
          <p className="flex min-h-[62px] items-center justify-center text-[13px] font-bold text-haru-muted">
            답을 톡 누르면 곰이 알려 줘요
          </p>
        )}
      </div>
    </div>
  );
}
