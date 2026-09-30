'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
  useEffect,
  useRef,
  useState,
  type PointerEvent,
  type ReactNode,
} from 'react';
import { AudioLines, GraduationCap, RotateCcw, Sparkle, Star, Volume2 } from 'lucide-react';
import type { VocabEntry } from '@/lib/db/queries';
import type { CefrLevel } from '@/lib/db/schema';
import type { CardState, Grade } from '@/lib/srs';
import { cn } from '@/lib/utils';
import { wordHighlightRange, wordScene } from '@/lib/vocab/book-context';
import { CoverArt } from '../cover-art';
import { COMPANION_PEEK } from './companion';
import type { VocabBookContext } from './use-book-contexts';

/*
 * 단어 카드 뭉치(8차 "단어 카드 뭉치", iOS VocabCardDeck/VocabCardView와 같은 값).
 * 카드 = 종이색(radius 26, 테두리 #F0E0CC). 앞면 = 책 장면 삽화 + 큰 영어 단어 + 발음 버튼,
 * 뒷면 = 뜻 + 책 속 문장(형광펜) + "이 책에서 만난 단어예요". 뒤집기는 Y축 3D 회전(동작 줄이기면 교체).
 */

/** 카드 최소 높이(px). */
const CARD_MIN_HEIGHT = 'min-h-[430px]';
/** 스와이프 임계 거리 = 카드 폭 × 이 비율. */
const SWIPE_THRESHOLD_RATIO = 0.35;
const FLY_OUT_MS = 220;

/* ---------- 뭉치 + 스와이프 ---------- */

/**
 * 지금 카드 뒤로 남은 카드(최대 2장)가 기울어 겹치고, 뒷면에서는 좌우로 끌어 채점한다.
 * 왼쪽 = 다시 볼래요(again), 오른쪽 = 알았어요(good). 임계 거리를 넘기면 카드가 그 방향으로 날아간 뒤 채점,
 * 못 넘기면 제자리로. 채점 버튼이 스와이프의 대체 수단으로 늘 함께 있다.
 * 부모가 카드마다 key를 바꿔 다시 마운트하므로 끄는 상태는 카드마다 새로 시작한다.
 */
export function CardStack({
  remainingBehind,
  canSwipe,
  onSwipe,
  mascot,
  bubble,
  children,
}: {
  remainingBehind: number;
  /** 채점 칩이고 뒷면일 때만. */
  canSwipe: boolean;
  onSwipe: (grade: Grade) => void;
  /** 카드 뒤 윗변 위로 머리를 내민 곰(채점 칩에서만). */
  mascot?: ReactNode;
  /** 곰 왼쪽 윗변 위 말풍선. */
  bubble?: ReactNode;
  children: ReactNode;
}) {
  const startRef = useRef<{ x: number; y: number; id: number } | null>(null);
  /** 방금 끌었는지 — 끌기 끝의 click이 카드 뒤집기로 번지지 않게 막는다. */
  const draggedRef = useRef(false);
  const flyTimerRef = useRef<number | null>(null);
  const [drag, setDrag] = useState({ x: 0, width: 320, active: false, flying: false });

  useEffect(() => {
    return () => {
      if (flyTimerRef.current !== null) window.clearTimeout(flyTimerRef.current);
    };
  }, []);

  const threshold = drag.width * SWIPE_THRESHOLD_RATIO;
  const stampProgress = Math.min(1, Math.abs(drag.x) / threshold);

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (!canSwipe || drag.flying) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    startRef.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
    draggedRef.current = false;
    setDrag((d) => ({ ...d, width: e.currentTarget.offsetWidth }));
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const start = startRef.current;
    if (!start || start.id !== e.pointerId) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (!draggedRef.current) {
      // 세로 스크롤과 다투지 않게 가로 움직임이 더 클 때만 따라간다.
      if (Math.abs(dy) > 12 && Math.abs(dy) >= Math.abs(dx)) {
        startRef.current = null;
        return;
      }
      if (Math.abs(dx) < 12) return;
      draggedRef.current = true;
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    setDrag((d) => ({ ...d, x: dx, active: true }));
  }

  function endDrag(e: PointerEvent<HTMLDivElement>, cancelled: boolean) {
    const start = startRef.current;
    startRef.current = null;
    if (!start || start.id !== e.pointerId || !draggedRef.current) return;
    const dx = e.clientX - start.x;
    if (cancelled || Math.abs(dx) < threshold) {
      setDrag((d) => ({ ...d, x: 0, active: false }));
      return;
    }
    const grade: Grade = dx > 0 ? 'good' : 'again';
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDrag((d) => ({ ...d, x: 0, active: false }));
      onSwipe(grade);
      return;
    }
    setDrag((d) => ({ ...d, x: Math.sign(dx) * d.width * 1.4, active: false, flying: true }));
    flyTimerRef.current = window.setTimeout(() => {
      flyTimerRef.current = null;
      onSwipe(grade);
    }, FLY_OUT_MS);
  }

  return (
    // 곰이 머리를 내밀 자리 — 칩을 바꿔도(곰이 없는 "전체") 카드 위치가 튀지 않게 늘 비워 둔다.
    <div className="relative" style={{ paddingTop: COMPANION_PEEK + 8 }}>
      <div className="relative">
        {/* 뒤에 겹친 카드 — +4°/−3°로 기울여 "뭉치" 두께를 보여 준다(카운터 숫자 대신). */}
        {remainingBehind >= 2 ? (
          <div
            aria-hidden
            className="absolute inset-0 -translate-x-2 translate-y-2 -rotate-3 rounded-[26px] border border-[#f0e0cc] bg-[#fbf0e1]"
          />
        ) : null}
        {remainingBehind >= 1 ? (
          <div
            aria-hidden
            className="absolute inset-0 translate-x-2.5 translate-y-3.5 rotate-[4deg] rounded-[26px] border border-[#f0e0cc] bg-[#f7e9d6] shadow-[0_8px_16px_rgb(168_111_63/0.12)]"
          />
        ) : null}

        {mascot ? (
          <div className="absolute right-[18px] z-[1]" style={{ top: -COMPANION_PEEK }}>
            {mascot}
          </div>
        ) : null}

        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={(e) => endDrag(e, false)}
          onPointerCancel={(e) => endDrag(e, true)}
          onClickCapture={(e) => {
            if (draggedRef.current) {
              e.preventDefault();
              e.stopPropagation();
              draggedRef.current = false;
            }
          }}
          className={cn(
            // 끄는 만큼 옆으로 + 살짝 기울기(동작 줄이기면 기울기 없이 옆으로만).
            'relative z-[2] origin-bottom select-none [transform:translateX(var(--drag-x))_rotate(var(--drag-rot))] motion-reduce:[transform:translateX(var(--drag-x))]',
            !drag.active && 'transition-transform duration-300 ease-out motion-reduce:transition-none',
            drag.flying && '!duration-[220ms] !ease-in',
          )}
          style={
            {
              '--drag-x': `${drag.x}px`,
              '--drag-rot': `${drag.x / 20}deg`,
              touchAction: canSwipe ? 'pan-y' : 'auto',
            } as React.CSSProperties
          }
        >
          {children}
          {/* 스와이프 방향 스탬프 — 끄는 거리만큼 서서히 나타난다. */}
          <div aria-hidden className="pointer-events-none absolute inset-0 p-7">
            <span
              className="absolute left-7 top-7 -rotate-12 rounded-xl border-[3px] border-haru-success-ink bg-white/85 px-3.5 py-1.5 text-[26px] font-extrabold text-haru-success-ink"
              style={{ opacity: drag.x > 0 ? stampProgress : 0 }}
            >
              알았어!
            </span>
            <span
              className="absolute right-7 top-7 rotate-12 rounded-xl border-[3px] border-[#8f5200] bg-white/85 px-3.5 py-1.5 text-[26px] font-extrabold text-[#8f5200]"
              style={{ opacity: drag.x < 0 ? stampProgress : 0 }}
            >
              다시!
            </span>
          </div>
        </div>

        {bubble ? (
          // 곰 머리 왼쪽, 윗변에 걸친 높이.
          <div className="absolute right-[90px] z-[3]" style={{ top: -COMPANION_PEEK + 4 }}>
            {bubble}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* ---------- 카드(앞·뒷면) ---------- */

const STATE_TAG: Record<
  CardState,
  { label: (level: number) => string; spoken: (level: number) => string; ink: string; icon: ReactNode }
> = {
  new: {
    label: () => '새 단어',
    spoken: () => '새 단어',
    ink: 'text-[#1e4c66]',
    icon: <Sparkle aria-hidden className="size-3 fill-current" />,
  },
  relearning: {
    label: () => '다시 볼 단어',
    spoken: () => '다시 볼 단어',
    ink: 'text-[#8f5200]',
    icon: <RotateCcw aria-hidden className="size-3" strokeWidth={3} />,
  },
  learning: {
    label: (level) => `익히는 중 Lv.${level}`,
    spoken: (level) => `익히는 중, 레벨 ${level}`,
    ink: 'text-[#8a6300]',
    icon: <GraduationCap aria-hidden className="size-3.5" />,
  },
  mastered: {
    label: () => '마스터',
    spoken: () => '마스터',
    ink: 'text-haru-success-ink',
    icon: <Star aria-hidden className="size-3 fill-current" />,
  },
};

/** 긴 단어는 한 줄에 들어가도록 글자 크기를 줄인다(iOS minimumScaleFactor 대응). */
function wordSizeClass(word: string): string {
  const n = word.length;
  if (n <= 8) return 'text-[44px] sm:text-[52px]';
  if (n <= 11) return 'text-[38px] sm:text-[44px]';
  if (n <= 15) return 'text-[30px] sm:text-[34px]';
  return 'text-2xl sm:text-[28px]';
}

/** 삽화 로딩 중·없음 자리표시 — 책 레벨 색에서 종이색으로 흐르는 그라데이션. */
function Placeholder({ level }: { level: CefrLevel | null }) {
  const top = level ? `var(--level-${level.toLowerCase()})` : 'var(--peach)';
  return (
    <div
      aria-hidden
      className="h-full w-full"
      style={{ background: `linear-gradient(180deg, ${top}, var(--haru-paper))` }}
    />
  );
}

/** 인증 동적 경로(/images/*) 이미지 — 쿠키가 optimizer에 전달되지 않아 원본 직접. 실패하면 대체 그림. */
function AuthImage({
  src,
  sizes,
  fallback,
}: {
  src: string;
  sizes: string;
  fallback: ReactNode;
}) {
  const [failed, setFailed] = useState<string | null>(null);
  if (failed === src) return <>{fallback}</>;
  return (
    <Image
      src={src}
      alt=""
      fill
      unoptimized
      sizes={sizes}
      className="object-cover"
      onError={() => setFailed(src)}
    />
  );
}

export function VocabCard({
  entry,
  cardState,
  level,
  flipped,
  speaking,
  context,
  onFlip,
  onSpeak,
}: {
  entry: VocabEntry;
  cardState: CardState;
  level: number;
  flipped: boolean;
  speaking: boolean;
  /** 책 맥락을 아직 못 불러왔으면 undefined — 앞면은 자리표시, 뒷면은 문장 생략. */
  context: VocabBookContext | undefined;
  onFlip: () => void;
  onSpeak: () => void;
}) {
  const scene = context ? wordScene(entry.word, context.book, context.passages) : null;
  const bookLevel = context?.book.cefr ?? null;
  const bookTitle = context?.book.title ?? entry.bookTitle;
  const tag = STATE_TAG[cardState];
  const placeholder = <Placeholder level={bookLevel} />;
  const coverFallback = context ? <CoverArt seed={context.book.id} title={context.book.title} /> : placeholder;

  const frontLabel = `단어 ${entry.word}, ${tag.spoken(level)}, 누르면 뒤집기`;
  const backLabel =
    `${entry.meaning}.` +
    (scene?.sentence ? ` 예문: ${scene.sentence}.` : '') +
    ` ${bookTitle}에서 만난 단어예요. 누르면 다시 뒤집기`;

  const face =
    'relative flex flex-col overflow-hidden rounded-[26px] border border-[#f0e0cc] bg-haru-paper shadow-[0_14px_30px_rgb(168_111_63/0.18)] [backface-visibility:hidden] [grid-area:1/1]';
  const flipButton =
    'absolute inset-0 z-[1] rounded-[26px] focus-visible:outline-3 focus-visible:-outline-offset-4 focus-visible:outline-ring';

  return (
    <div className="[perspective:1400px]">
      <div
        className={cn(
          'relative grid transition-transform duration-[450ms] ease-in-out [transform-style:preserve-3d] motion-reduce:transition-none',
          CARD_MIN_HEIGHT,
          flipped && 'motion-safe:[transform:rotateY(180deg)]',
        )}
      >
        {/* 앞면 — 보이지 않을 때는 inert로 포커스·클릭·스크린 리더에서 뺀다. */}
        <div inert={flipped} className={cn(face, CARD_MIN_HEIGHT, flipped && 'motion-reduce:opacity-0')}>
          <button type="button" onClick={onFlip} aria-label={frontLabel} className={flipButton} />
          {/* 보이는 내용은 뒤집기 버튼 이름이 대신 읽으므로 조각마다 숨기고, 클릭은 아래 뒤집기 버튼으로 통과시킨다. */}
          <div className="pointer-events-none flex flex-1 flex-col items-center">
            <div aria-hidden className="relative h-[200px] w-full shrink-0 overflow-hidden">
              {scene?.imagePath ? (
                <AuthImage src={scene.imagePath} sizes="360px" fallback={placeholder} />
              ) : context ? (
                coverFallback
              ) : (
                placeholder
              )}
              <div className="absolute inset-x-0 bottom-0 h-[60px] bg-[linear-gradient(to_bottom,transparent,var(--haru-paper))]" />
              <span
                className={cn(
                  'absolute left-3.5 top-3.5 inline-flex items-center gap-1 rounded-[10px] bg-white/90 px-[9px] py-1 text-xs font-extrabold',
                  tag.ink,
                )}
              >
                {tag.icon}
                {tag.label(level)}
              </span>
            </div>
            <p
              aria-hidden
              className={cn(
                'mt-1 max-w-full whitespace-nowrap px-6 font-reading font-bold leading-tight text-haru-ink',
                wordSizeClass(entry.word),
              )}
            >
              {entry.word}
            </p>
            {/* 발음 버튼 — 뒤집기 버튼(버튼 안 버튼 금지) 위에 겹친 별도 버튼. */}
            <button
              type="button"
              onClick={onSpeak}
              disabled={speaking}
              aria-label={`${entry.word} 발음 듣기`}
              aria-busy={speaking}
              className="pointer-events-auto relative z-[2] mt-3.5 flex size-16 items-center justify-center rounded-full bg-haru-coral text-haru-on-coral shadow-[0_8px_16px_rgb(245_131_92/0.4)] transition-transform active:scale-95 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-wait motion-reduce:transition-none"
            >
              {speaking ? (
                <AudioLines aria-hidden className="size-7" strokeWidth={2.5} />
              ) : (
                <Volume2 aria-hidden className="size-7" strokeWidth={2.5} />
              )}
            </button>
            <p aria-hidden className="mb-4 mt-3.5 text-[13px] font-bold text-haru-muted">카드를 톡 누르면 뒤집혀요</p>
          </div>
        </div>

        {/* 뒷면 */}
        <div
          inert={!flipped}
          className={cn(
            face,
            CARD_MIN_HEIGHT,
            'motion-safe:[transform:rotateY(180deg)]',
            !flipped && 'motion-reduce:opacity-0',
          )}
        >
          <button type="button" onClick={onFlip} aria-label={backLabel} className={flipButton} />
          <div className="pointer-events-none flex flex-1 flex-col items-center justify-center px-6 py-[26px] text-center">
            <div aria-hidden className="flex flex-col items-center">
              <p className="max-w-full truncate font-reading text-[26px] font-bold text-haru-muted">
                {entry.word}
              </p>
              <p className="mt-1.5 break-keep text-[34px] font-extrabold leading-tight text-haru-ink sm:text-[44px]">
                {entry.meaning}
              </p>
              {scene?.sentence ? (
                <p className="mt-4 font-reading text-[19px] leading-[1.6] text-haru-ink">
                  <HighlightedSentence word={entry.word} sentence={scene.sentence} />
                </p>
              ) : null}
            </div>
            {/* "이 책에서 만난 단어예요" — 누르면 그 책을 연다(뒤집기 버튼 위 별도 링크). */}
            <Link
              href={`/book/${entry.bookId}`}
              aria-label={`${bookTitle} 책 열기`}
              className="pointer-events-auto relative z-[2] mt-[26px] flex w-full items-center gap-3 rounded-2xl bg-white p-2.5 text-left shadow-[0_4px_10px_rgb(168_111_63/0.08)] transition-transform active:scale-[0.99] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none"
            >
              <span aria-hidden className="relative h-[60px] w-[46px] shrink-0 overflow-hidden rounded-l-[3px] rounded-r-[6px] shadow-[0_3px_3px_rgb(0_0_0/0.18)]">
                {context?.book.coverImagePath ? (
                  <AuthImage src={context.book.coverImagePath} sizes="46px" fallback={coverFallback} />
                ) : (
                  coverFallback
                )}
              </span>
              <span className="min-w-0">
                <span className="line-clamp-2 font-reading text-[15px] font-bold text-haru-ink">{bookTitle}</span>
                <span className="block text-xs font-bold text-haru-muted">이 책에서 만난 단어예요</span>
              </span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/** 책 속 문장 — 단어만 형광펜(노란 반투명 배경). */
function HighlightedSentence({ word, sentence }: { word: string; sentence: string }) {
  const range = wordHighlightRange(word, sentence);
  if (!range) return <>{sentence}</>;
  return (
    <>
      {sentence.slice(0, range.start)}
      <mark className="rounded-[3px] bg-[rgb(255_214_107/0.8)] px-0.5 text-inherit">
        {sentence.slice(range.start, range.end)}
      </mark>
      {sentence.slice(range.end)}
    </>
  );
}
