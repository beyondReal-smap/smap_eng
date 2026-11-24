'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { Check, RotateCcw, Square, Star, Volume2, X } from 'lucide-react';
import { Mascot, SpeechBubble, type MascotPose } from '@/components/haru';
import type { Book, Quiz } from '@/lib/db/schema';
import type { EvidenceMatch } from '@/lib/quiz/evidence';
import { cn } from '@/lib/utils';
import { CoverArt } from '../cover-art';

/*
 * 퀴즈 "곰과 이야기 되짚기"(11차·15차) 화면 조각 — iOS QuizView/QuizQuestionCard/QuizResultView와 같은 값.
 * 장식 전용 색(선택지 점·카드 테두리·입술 그림자·별·진행 동그라미)은 시안 값을 그대로 쓰고,
 * 글자색은 토큰(haru-ink / haru-muted / *-ink)만 쓴다.
 */

/** 선택지 순서별 색 점: 코랄 / 파랑 / 초록 / 금. */
const CHOICE_DOTS = ['#f5835c', '#6fa8dc', '#7cbb6d', '#e8a317'];

/** 오른쪽 스피커 터치 영역(44) — 카드 글자가 그 아래로 들어가지 않게 비워 둔다. */
const SPEAKER_AREA = 'pr-[52px]';

/* ---------- 상단 줄 ---------- */

export type StepState = 'open' | 'answered';

/** 닫기 ✕ + 작은 표지 + 책 제목 + (푸는 중이면) 진행 동그라미. */
export function QuizTopBar({
  book,
  closeHref,
  closeLabel,
  steps,
  currentStep,
}: {
  book: Book;
  closeHref: string;
  closeLabel: string;
  /** null이면 동그라미를 숨긴다(결과·생성 중). */
  steps: StepState[] | null;
  currentStep: number;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <Link
        href={closeHref}
        aria-label={closeLabel}
        className="group flex size-11 shrink-0 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <span className="flex size-10 items-center justify-center rounded-full bg-white/85 text-haru-ink shadow-[0_3px_4px_rgb(168_111_63/0.1)] transition-transform group-active:scale-95 motion-reduce:transition-none">
          <X aria-hidden className="size-5" strokeWidth={3} />
        </span>
      </Link>

      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span
          aria-hidden
          className="relative h-[34px] w-[26px] shrink-0 overflow-hidden rounded-l-[2px] rounded-r-[5px] shadow-[0_2px_2px_rgb(0_0_0/0.18)]"
        >
          <BookCover book={book} sizes="26px" />
        </span>
        <p className="line-clamp-2 min-w-0 font-reading text-sm font-bold leading-snug text-haru-ink">
          {book.title}
        </p>
      </div>

      {steps ? (
        <ol
          aria-label={`${steps.length}문제 중 ${Math.min(currentStep + 1, steps.length)}번째`}
          className="flex shrink-0 items-center gap-1.5"
        >
          {steps.map((step, i) => {
            const answered = step === 'answered';
            const isCurrent = i === currentStep;
            return (
              <li
                key={i}
                aria-hidden
                className={cn(
                  'flex size-[22px] items-center justify-center rounded-full border-2 transition-colors motion-reduce:transition-none',
                  answered ? 'bg-[#ffe7a6]' : 'bg-white/80',
                  isCurrent
                    ? 'border-haru-coral shadow-[0_0_0_3px_rgb(245_131_92/0.2)]'
                    : answered
                      ? 'border-[#f2c14e]'
                      : 'border-[#ebd6c3]',
                )}
              >
                {answered ? <Check className="size-2.5 text-[#8a6300]" strokeWidth={4} /> : null}
              </li>
            );
          })}
        </ol>
      ) : null}
    </div>
  );
}

/** 책 표지 — 서버 표지 이미지(인증 경로라 원본 직접) → 없거나 실패하면 결정론적 일러스트. */
function BookCover({ book, sizes }: { book: Book; sizes: string }) {
  const [failed, setFailed] = useState<string | null>(null);
  if (book.coverImagePath && failed !== book.coverImagePath) {
    return (
      <Image
        src={book.coverImagePath}
        alt=""
        fill
        unoptimized
        sizes={sizes}
        className="object-cover"
        onError={() => setFailed(book.coverImagePath)}
      />
    );
  }
  return <CoverArt seed={book.id} title={book.title} />;
}

/* ---------- 곰 + 말풍선 질문 ---------- */

/** "첫 번째 질문" … "열 번째 질문", 그 뒤는 "11번째 질문". */
export function ordinalLabel(n: number): string {
  const words = ['첫', '두', '세', '네', '다섯', '여섯', '일곱', '여덟', '아홉', '열'];
  return n >= 1 && n <= words.length ? `${words[n - 1]} 번째 질문` : `${n}번째 질문`;
}

export function BearQuestion({
  question,
  label,
  pose,
  isReading,
  onSpeak,
}: {
  question: string;
  label: string;
  pose: MascotPose;
  /** 차례 읽기 진행 중 — 🔊가 "멈추기"로 바뀐다. */
  isReading: boolean;
  onSpeak: (() => void) | null;
}) {
  return (
    <div className="flex items-end gap-1.5 pt-5">
      {/* 포즈가 바뀔 때 살짝 튀어 오르며 교체 — 동작 줄이기면 전역 규칙으로 즉시. */}
      <span key={pose} className="-mb-1.5 shrink-0 animate-pop-in">
        <Mascot pose={pose} size={104} className="max-sm:size-[88px]" />
      </span>
      <SpeechBubble className="mb-[26px] min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-extrabold text-haru-coral-ink">{label}</p>
            <h2
              className={cn(
                'mt-1 break-words font-reading font-bold leading-[1.25] tracking-normal text-haru-ink',
                question.length > 70 ? 'text-xl' : 'text-[22px] sm:text-[25px]',
              )}
            >
              {question}
            </h2>
          </div>
          {onSpeak ? (
            <button
              type="button"
              onClick={onSpeak}
              aria-label={isReading ? '읽기 멈추기' : '질문 읽어 주기'}
              aria-pressed={isReading}
              className="group -mr-1.5 -mt-1.5 flex size-11 shrink-0 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-ring"
            >
              <span
                className={cn(
                  'flex size-[34px] items-center justify-center rounded-full transition-colors group-active:scale-95',
                  isReading ? 'bg-haru-coral text-haru-on-coral' : 'bg-[#fff1ea] text-haru-coral-ink',
                )}
              >
                {isReading ? (
                  <Square aria-hidden className="size-3.5 fill-current" />
                ) : (
                  <Volume2 aria-hidden className="size-[18px]" strokeWidth={2.5} />
                )}
              </span>
            </button>
          ) : null}
        </div>
      </SpeechBubble>
    </div>
  );
}

/* ---------- 선택지 ---------- */

export type ChoiceState = 'open' | 'correct' | 'picked' | 'dimmed';

export function ChoiceRow({
  index,
  total,
  text,
  state,
  isReadingAloud,
  onSelect,
  onSpeak,
}: {
  index: number;
  total: number;
  text: string;
  state: ChoiceState;
  /** 읽어 주기로 지금 이 선택지를 읽는 중 — 코랄 테두리 + 옅은 코랄 바탕. */
  isReadingAloud: boolean;
  onSelect: () => void;
  /** 선택지 스피커(답하기 전에만). null이면 숨김. */
  onSpeak: (() => void) | null;
}) {
  const reading = isReadingAloud && state === 'open';
  const stateLabel = state === 'correct' ? ', 정답' : state === 'picked' ? ', 내가 고른 답' : '';
  return (
    <div className={cn('relative pb-1', state === 'dimmed' && 'opacity-45')}>
      <button
        type="button"
        onClick={onSelect}
        disabled={state !== 'open'}
        aria-label={`${text}, ${total}개 중 ${index + 1}번${stateLabel}`}
        className={cn(
          'flex min-h-[62px] w-full items-center gap-3 rounded-[20px] border-[2.5px] py-3 pl-4 text-left transition-[background-color,border-color,transform] duration-200 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none',
          onSpeak ? SPEAKER_AREA : 'pr-4',
          state === 'open' &&
            'bg-haru-paper shadow-[0_4px_0_#ebd3bc] hover:-translate-y-px active:translate-y-0.5 active:shadow-[0_2px_0_#ebd3bc]',
          state === 'open' && (reading ? 'border-haru-coral bg-[#fff1ea]' : 'border-[#f0dcc8]'),
          state === 'correct' && 'border-[#7cc99a] bg-haru-success-soft shadow-[0_4px_0_#a9ddbb]',
          state === 'picked' && 'border-[#e3d7ca] bg-[#f4eee8]',
          state === 'dimmed' && 'border-[#f0dcc8] bg-haru-paper',
          state !== 'open' && 'cursor-default',
        )}
      >
        <span aria-hidden className="flex w-[18px] shrink-0 justify-center">
          {state === 'correct' ? (
            <Check className="size-[18px] text-haru-success-ink" strokeWidth={4} />
          ) : (
            <span
              className="size-3.5 rounded-full"
              style={{ background: state === 'picked' ? '#c9bcb0' : CHOICE_DOTS[index % CHOICE_DOTS.length] }}
            />
          )}
        </span>
        <span
          className={cn(
            'min-w-0 flex-1 break-words font-reading text-lg leading-snug sm:text-xl',
            state === 'picked' ? 'text-haru-muted' : 'text-haru-ink',
          )}
        >
          {text}
        </span>
        {state === 'correct' ? (
          <span aria-hidden className="shrink-0 rounded-full bg-white px-2 py-[3px] text-xs font-extrabold text-haru-success-ink">
            정답
          </span>
        ) : state === 'picked' ? (
          <span aria-hidden className="shrink-0 whitespace-nowrap text-xs font-extrabold text-haru-muted">
            내가 고른 답
          </span>
        ) : null}
      </button>
      {/* 스피커는 카드 버튼 밖의 별도 버튼 — 카드 탭(답 선택)과 영역이 겹치지 않는다. */}
      {onSpeak ? (
        <button
          type="button"
          onClick={onSpeak}
          aria-label={`선택지 읽어 주기, ${text}`}
          className="absolute right-1.5 top-[calc(50%-2px)] flex size-11 -translate-y-1/2 items-center justify-center rounded-full text-haru-coral-ink hover:bg-[#fff1ea] focus-visible:outline-2 focus-visible:outline-ring"
        >
          <Volume2 aria-hidden className="size-[18px]" strokeWidth={2.5} />
        </button>
      ) : null}
    </div>
  );
}

/* ---------- 책 속 근거 ---------- */

/** 형광펜 구간을 <mark>로 감싼 문장. */
function HighlightedSentence({ match }: { match: EvidenceMatch }) {
  const parts: ReactNode[] = [];
  let cursor = 0;
  match.highlights.forEach((range, i) => {
    if (range.start > cursor) parts.push(match.sentence.slice(cursor, range.start));
    parts.push(
      <mark key={i} className="rounded-[3px] bg-[linear-gradient(transparent_45%,rgb(246_206_115/0.75)_45%)] px-0.5 text-inherit">
        {match.sentence.slice(range.start, range.end)}
      </mark>,
    );
    cursor = range.end;
  });
  if (cursor < match.sentence.length) parts.push(match.sentence.slice(cursor));
  return <>{parts}</>;
}

/**
 * 답한 뒤(맞힘·아쉬움 모두) 정답이 나온 책 속 문장 — 쪽 번호·삽화·형광펜 + 서버 해설.
 * 문장을 못 찾으면 해설만(💡), 해설도 없으면 카드를 그리지 않는다.
 */
export function EvidenceCard({
  book,
  explanation,
  evidence,
  isReadingAloud,
  onSpeak,
}: {
  book: Book;
  explanation: string | null;
  evidence: EvidenceMatch | null;
  isReadingAloud: boolean;
  /** 책 속 문장 읽기. 근거 문장이 없거나 읽을 수 없으면 null. */
  onSpeak: (() => void) | null;
}) {
  const note = explanation?.trim() || null;
  if (!evidence && !note) return null;
  const card = 'animate-fade-up rounded-[20px] bg-white px-3.5 py-3 shadow-[0_6px_16px_rgb(168_111_63/0.12)] motion-reduce:animate-none';

  if (!evidence) {
    return (
      <div className={cn(card, 'flex items-start gap-2')}>
        <span aria-hidden>💡</span>
        <p className="min-w-0 flex-1 text-sm font-bold leading-relaxed text-haru-ink">{note}</p>
      </div>
    );
  }

  return (
    <div className={cn(card, 'relative flex items-start gap-3')}>
      <span aria-hidden className="relative size-16 shrink-0 overflow-hidden rounded-[14px]">
        <EvidenceThumb book={book} scenePath={evidence.sceneImagePath} />
      </span>
      <div className={cn('min-w-0 flex-1', onSpeak && 'pr-8')}>
        <p className="text-xs font-extrabold text-haru-muted">
          <span aria-hidden>📖 </span>책 {evidence.pageNumber}쪽에 나와요
        </p>
        <p className="mt-0.5 break-words font-reading text-[17px] leading-normal text-haru-ink">
          <HighlightedSentence match={evidence} />
        </p>
        {note ? <p className="mt-2 text-[13px] font-bold leading-relaxed text-haru-muted">{note}</p> : null}
      </div>
      {onSpeak ? (
        <button
          type="button"
          onClick={onSpeak}
          aria-label="책 속 문장 읽어 주기"
          aria-pressed={isReadingAloud}
          className="group absolute right-1 top-1 flex size-11 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-ring"
        >
          <span
            className={cn(
              'flex size-8 items-center justify-center rounded-full',
              isReadingAloud ? 'bg-haru-coral text-haru-on-coral' : 'bg-[#fff1ea] text-haru-coral-ink',
            )}
          >
            <Volume2 aria-hidden className="size-4" strokeWidth={2.5} />
          </span>
        </button>
      ) : null}
    </div>
  );
}

/** 64 썸네일 — 그 쪽 장면 삽화 → 없거나 실패하면 표지 → 표지도 없으면 표지 일러스트. */
function EvidenceThumb({ book, scenePath }: { book: Book; scenePath: string | null }) {
  const [failed, setFailed] = useState<string | null>(null);
  if (scenePath && failed !== scenePath) {
    return (
      <Image
        // 장면 삽화도 쿠키 인증 동적 라우트 — 표지와 같은 이유로 원본 직접.
        src={scenePath}
        alt=""
        fill
        unoptimized
        sizes="64px"
        className="object-cover"
        onError={() => setFailed(scenePath)}
      />
    );
  }
  return <BookCover book={book} sizes="64px" />;
}

/* ---------- 결과 ---------- */

export type ScoreSaveState = 'saving' | 'saved' | 'practice' | 'failed' | 'unavailable';

/**
 * 결과 — 곰 + "별 N개를 모았어요!" + 별 줄 + 획득 포인트 + 한 번 더 볼 질문.
 * 획득한 것만 축하하고, 틀린 것은 "다시 보면 좋은 질문"으로 부드럽게 안내한다.
 */
export function QuizResult({
  score,
  total,
  missed,
  earnedPoints,
  saveState,
  onRetrySave,
}: {
  score: number;
  total: number;
  missed: Quiz[];
  earnedPoints: number;
  saveState: ScoreSaveState;
  onRetrySave: () => void;
}) {
  const isPerfect = total > 0 && score === total;
  return (
    <section aria-labelledby="quiz-result-title" className="flex flex-col items-center text-center">
      <Mascot pose={score > 0 ? 'cheer' : 'reading'} size={170} className="mt-2.5 animate-pop-in max-sm:size-[150px]" />
      <h1
        id="quiz-result-title"
        tabIndex={-1}
        className="mt-1 text-[28px] font-extrabold leading-tight text-haru-ink outline-none sm:text-[30px]"
      >
        <span aria-hidden>{score > 0 ? `별 ${score}개를 모았어요!` : '끝까지 풀었어요!'}</span>
        <span className="sr-only">{`${total}문제 중 ${score}개 정답, 별 ${score}개`}</span>
      </h1>
      <p className="mt-1.5 text-sm font-bold text-haru-muted">
        {isPerfect ? '하나도 안 틀렸어요!' : '끝까지 잘 풀었어요'}
      </p>

      <div aria-hidden className="mt-3.5 flex gap-2">
        {Array.from({ length: Math.max(total, 0) }).map((_, i) => (
          <Star
            key={i}
            className={cn(
              'size-[38px]',
              i < score
                ? 'fill-haru-star text-haru-star drop-shadow-[0_3px_2px_rgb(138_99_0/0.25)]'
                : 'fill-[#eadccb] text-[#eadccb]',
            )}
          />
        ))}
      </div>

      <div className="mt-3.5" aria-live="polite">
        {saveState === 'saved' ? (
          <p className="inline-flex items-center gap-1 rounded-full bg-white px-3.5 py-[7px] text-sm font-extrabold text-haru-coral-ink shadow-[0_3px_8px_rgb(168_111_63/0.1)]">
            <span aria-hidden>✨</span>+{earnedPoints}P 획득!
          </p>
        ) : saveState === 'saving' ? (
          <p className="text-[13px] font-bold text-haru-muted">점수를 기록하고 있어요…</p>
        ) : saveState === 'practice' ? (
          <p className="text-[13px] font-bold text-haru-muted">연습으로 푼 결과라 점수는 기록되지 않아요</p>
        ) : saveState === 'unavailable' ? (
          <p className="text-[13px] font-bold text-haru-muted">이번 점수는 기록되지 않았어요</p>
        ) : (
          <div className="flex flex-col items-center gap-2 rounded-2xl bg-[#fde2dd] px-4 py-3">
            <p className="text-sm font-bold text-[#a93318]">점수를 저장하지 못했어요</p>
            <button
              type="button"
              onClick={onRetrySave}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full border-2 border-[#ebc9b6] bg-white px-4 text-sm font-extrabold text-haru-ink focus-visible:outline-2 focus-visible:outline-ring"
            >
              <RotateCcw aria-hidden className="size-4" />
              다시 시도
            </button>
          </div>
        )}
      </div>

      {missed.length > 0 ? (
        <section
          aria-labelledby="quiz-missed-title"
          className="mt-5 w-full rounded-[20px] bg-white p-3.5 text-left shadow-[0_6px_16px_rgb(168_111_63/0.12)]"
        >
          <h2 id="quiz-missed-title" className="text-sm font-extrabold tracking-normal text-haru-ink">
            <span aria-hidden>🔍 </span>한 번 더 보면 좋은 질문
          </h2>
          <ul className="mt-2.5 space-y-2">
            {missed.map((q) => (
              <li
                key={q.id}
                className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 rounded-[14px] bg-haru-paper px-3 py-2.5"
              >
                <span className="min-w-0 flex-1 basis-48 font-reading text-base font-bold text-haru-ink">
                  {q.question}
                </span>
                <span className="font-reading text-[13px] font-bold text-haru-success-ink">
                  <span className="sr-only">정답 </span>
                  {q.choices[q.answerIndex] ?? ''}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </section>
  );
}

/* ---------- 상태 ---------- */

/** 0~1 사이 결정적 값 — 렌더가 순수해야 해서 Math.random 대신 조각 번호로 흩뿌린다. */
function scatter(i: number, salt: number): number {
  const v = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return v - Math.floor(v);
}

const CONFETTI_COLORS = ['#f5835c', '#f5b82e', '#7cbb6d', '#6fa8dc', '#f1bbc1'];
const CONFETTI_PIECES = Array.from({ length: 24 }, (_, i) => ({
  x: (scatter(i, 1) - 0.5) * 460,
  r: (scatter(i, 2) - 0.5) * 1080,
  delay: scatter(i, 3) * 240,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  left: 12 + scatter(i, 4) * 76,
}));

/** CSS keyframe 기반 confetti — 외부 라이브러리 없음, 24 pieces, 1.6s 후 자동 소멸. 만점일 때만. */
export function ConfettiBurst() {
  const pieces = CONFETTI_PIECES;
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-20 z-50 mx-auto h-[500px] max-w-6xl overflow-visible"
    >
      {pieces.map((p, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={
            {
              left: `${p.left}%`,
              background: p.color,
              animationDelay: `${p.delay}ms`,
              '--x': `${p.x}px`,
              '--r': `${p.r}deg`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

/** 퀴즈 생성 대기 — 책 읽는 곰 + 안내. */
export function GeneratingState() {
  return (
    <div role="status" className="flex flex-col items-center py-12 text-center">
      <Mascot pose="reading" size={140} />
      <h2 className="mt-3 text-lg font-extrabold text-haru-ink">퀴즈를 만들고 있어요</h2>
      <p className="mt-1 text-sm font-bold text-haru-muted">10~30초쯤 걸려요. 잠깐만 기다려 주세요.</p>
      <div className="mt-4 w-48">
        <div className="shimmer h-2 w-full rounded-full" />
      </div>
    </div>
  );
}

/** 하단 고정 큰 버튼(코랄 채움·짙은 글자·높이 62). */
export const PRIMARY_PILL =
  'inline-flex min-h-[62px] items-center justify-center gap-2 rounded-full bg-haru-coral px-6 text-lg font-extrabold text-haru-on-coral shadow-[0_10px_20px_rgb(245_131_92/0.35)] transition-transform hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-70 motion-reduce:transition-none';
