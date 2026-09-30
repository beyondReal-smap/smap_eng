'use client';

import { useId, useRef, useState, type ReactNode } from 'react';
import { Check, Lightbulb, Loader2, Pencil, RotateCcw, Shuffle, Sparkles } from 'lucide-react';
import { genreNoun } from '@/lib/create-book/guide';
import type { BookGenre, CefrLevel } from '@/lib/db/schema';
import type { PickedTopic } from '@/lib/topic-suggestions';
import { cn } from '@/lib/utils';
import { CEFRS, LEVEL_CARD, LEVEL_CHIP_BG, type IntakeQuestion } from './shared';

/* ---------- 1단계 장르 ---------- */

const GENRE_DESC: Record<BookGenre, string> = {
  fiction: '상상 속 친구들과\n신나는 모험',
  non_fiction: '진짜 세상의\n놀라운 사실',
};

/**
 * 장르 카드 위쪽 그림 — 장르 → 그림 매핑은 이 한 곳뿐이다.
 * 지금은 임시로 기존 아이콘을 크게 그린다. 대표님 일러스트(`genre_fiction`/`genre_nonfiction`)가 오면
 * 이 함수의 반환만 이미지로 바꾸면 된다.
 */
export function genreArtwork(genre: BookGenre): { gradient: string; art: ReactNode } {
  return genre === 'fiction'
    ? {
        gradient: 'bg-[linear-gradient(180deg,#e8defa,#fff3e4)]',
        art: <Sparkles aria-hidden className="size-[72px] text-haru-coral-ink" strokeWidth={1.75} />,
      }
    : {
        gradient: 'bg-[linear-gradient(180deg,#d8eef8,#fff3e4)]',
        art: <Lightbulb aria-hidden className="size-[72px] text-[#8a6300]" strokeWidth={1.75} />,
      };
}

/** 1단계 — 큰 그림 카드 2장. 누르면 선택과 동시에 다음 단계로. 아주 좁은 화면에선 세로로 쌓는다. */
export function StepGenre({ onSelect }: { onSelect: (g: BookGenre) => void }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 max-[359px]:grid-cols-1">
        {(['fiction', 'non_fiction'] as const).map((g) => {
          const { gradient, art } = genreArtwork(g);
          return (
            <button
              key={g}
              type="button"
              onClick={() => onSelect(g)}
              aria-label={`${genreNoun(g)}, ${GENRE_DESC[g].replace('\n', ' ')}`}
              className="flex min-h-[300px] flex-col overflow-hidden rounded-[26px] bg-white text-center shadow-[0_10px_22px_rgb(168_111_63/0.14)] transition-transform hover:-translate-y-1 active:translate-y-0 active:scale-[0.98] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none"
            >
              <span aria-hidden className={cn('flex h-[180px] w-full items-center justify-center', gradient)}>
                {art}
              </span>
              <span className="flex flex-1 flex-col items-center justify-center gap-1.5 px-3 py-3">
                <span className="text-[22px] font-extrabold text-haru-ink">{genreNoun(g)}</span>
                <span className="whitespace-pre-line text-[13px] font-bold leading-snug text-haru-muted">
                  {GENRE_DESC[g]}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      <p className="text-center text-[13px] font-bold text-haru-muted">카드를 누르면 다음으로 넘어가요</p>
    </div>
  );
}

/* ---------- 2단계 레벨 ---------- */

/** 2단계 — 라디오 카드 4장(단일 선택). 추천 레벨을 미리 골라 두고 배지로 알린다. */
export function StepLevel({
  cefr,
  onChange,
  recommended,
  badge,
}: {
  cefr: CefrLevel;
  onChange: (c: CefrLevel) => void;
  recommended: CefrLevel;
  badge: string;
}) {
  // 라디오 그룹 키보드 — 화살표로 선택 이동(WAI-ARIA radio 패턴).
  function onKeyDown(e: React.KeyboardEvent, index: number) {
    const delta = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0;
    if (delta === 0) return;
    e.preventDefault();
    const next = CEFRS[(index + delta + CEFRS.length) % CEFRS.length];
    onChange(next);
    const group = (e.currentTarget as HTMLElement).parentElement;
    group?.querySelector<HTMLElement>(`[data-level="${next}"]`)?.focus();
  }

  return (
    <div role="radiogroup" aria-label="레벨 고르기" className="space-y-2.5 pt-3">
      {CEFRS.map((c, i) => {
        const selected = cefr === c;
        const isRecommended = c === recommended;
        const card = LEVEL_CARD[c];
        return (
          <button
            key={c}
            type="button"
            role="radio"
            data-level={c}
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            aria-label={`${c}, ${card.title}, ${card.detail}${isRecommended ? `, 추천: ${badge}` : ''}`}
            onClick={() => onChange(c)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              'relative flex min-h-[74px] w-full items-center gap-3 rounded-[20px] border-[2.5px] px-3.5 py-3 text-left transition-[border-color,background-color,box-shadow] duration-150 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none',
              selected
                ? 'border-haru-coral bg-[#fff7f1] shadow-[0_8px_18px_rgb(245_131_92/0.2)]'
                : 'border-transparent bg-white shadow-[0_4px_12px_rgb(168_111_63/0.08)]',
            )}
          >
            {isRecommended ? (
              <span
                aria-hidden
                className="absolute -top-2.5 left-[70px] rounded-[10px] bg-haru-coral px-2 py-[3px] text-[11.5px] font-extrabold text-haru-on-coral"
              >
                {badge}
              </span>
            ) : null}
            <span
              aria-hidden
              className="flex size-11 shrink-0 items-center justify-center rounded-[14px] text-[15px] font-extrabold text-haru-ink"
              style={{ background: LEVEL_CHIP_BG[c] }}
            >
              {c}
            </span>
            <span aria-hidden className="min-w-0 flex-1">
              <span className="block text-[16.5px] font-extrabold text-haru-ink">{card.title}</span>
              <span className="mt-0.5 block text-[12.5px] font-bold text-haru-muted">{card.detail}</span>
            </span>
            <span
              aria-hidden
              className={cn(
                'flex size-6 shrink-0 items-center justify-center rounded-full',
                selected ? 'bg-haru-coral text-haru-on-coral' : 'border-[2.5px] border-[#e7c49b]',
              )}
            >
              {selected ? <Check className="size-3.5" strokeWidth={4} /> : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ---------- 3단계 질문(+주제) ---------- */

/** 선택 칩 — 종이색 + 나무색 테두리, 선택 시 파스텔 코랄 + 코랄 테두리 + 코랄 잉크 글자. 토글로 읽힌다. */
function AnswerChip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        'inline-flex min-h-11 max-w-full items-center rounded-full border-2 px-3.5 text-[14.5px] font-extrabold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none',
        selected
          ? 'border-haru-coral bg-[#ffe6da] text-haru-coral-ink'
          : 'border-[#f0dcc8] bg-haru-paper text-haru-ink hover:border-[#e7c49b]',
      )}
    >
      <span className="truncate">{label}</span>
    </button>
  );
}

/** "직접 적기" — 점선 테두리 칩. 누르면 그 카드 안에 입력칸이 펼쳐진다. */
function WriteChip({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="직접 적기, 입력칸을 열어요"
      className="inline-flex min-h-11 items-center gap-1 rounded-full border-2 border-dashed border-[#e7c49b] bg-haru-paper/60 px-3.5 text-[14.5px] font-extrabold text-haru-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <Pencil aria-hidden className="size-4" />
      직접 적기
    </button>
  );
}

/**
 * 질문 카드 한 장 — 질문 + 칩(여러 줄 줄바꿈) + "직접 적기" 펼침 입력칸.
 * 칩을 누르면 같은 값이 입력칸에도 들어간다(칩 ↔ 입력칸 동기화 — 같은 답 값을 공유).
 */
function QuestionCard({
  question,
  chips,
  value,
  onChange,
  placeholder,
  maxLength,
  headerAction,
}: {
  question: string;
  chips: string[];
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  maxLength: number;
  headerAction?: ReactNode;
}) {
  const fieldId = useId();
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const [writing, setWriting] = useState(false);
  // 입력칸을 보일지 — "직접 적기"를 눌렀거나, 선택지 밖의 답을 이미 적어 뒀거나, 선택지가 없는 질문.
  const showsField = writing || chips.length === 0 || (value !== '' && !chips.includes(value));
  return (
    <div className="rounded-[20px] bg-white px-3.5 py-3 shadow-[0_4px_12px_rgb(168_111_63/0.08)]">
      <div className="flex items-start justify-between gap-2">
        <h3 id={`${fieldId}-q`} className="text-[14.5px] font-extrabold leading-snug tracking-normal text-haru-ink">
          {question}
        </h3>
        {headerAction}
      </div>
      {chips.length > 0 ? (
        <div role="group" aria-labelledby={`${fieldId}-q`} className="mt-2.5 flex flex-wrap gap-2">
          {chips.map((chip) => (
            <AnswerChip key={chip} label={chip} selected={value === chip} onClick={() => onChange(chip)} />
          ))}
          {!showsField ? (
            <WriteChip
              onClick={() => {
                setWriting(true);
                // 펼친 입력칸으로 바로 초점을 옮겨 이어서 적게 한다.
                window.requestAnimationFrame(() => fieldRef.current?.focus());
              }}
            />
          ) : null}
        </div>
      ) : null}
      {showsField ? (
        <textarea
          ref={fieldRef}
          id={fieldId}
          aria-labelledby={`${fieldId}-q`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          rows={1}
          className="mt-2.5 block min-h-12 w-full resize-none rounded-[14px] border-2 border-[#e7c49b] bg-haru-paper px-3.5 py-3 text-[15px] font-bold text-haru-ink [field-sizing:content] placeholder:text-haru-muted/80 focus:border-haru-coral focus:outline-none"
        />
      ) : null}
    </div>
  );
}

/**
 * 3단계 — 서버 인테이크 질문 카드들 + 주제 카드(웹의 옛 "주제" 단계를 합침).
 * 질문을 못 받아도(로딩·실패) 하단 주 버튼으로 바로 만들 수 있다.
 */
export function StepIntake({
  loading,
  error,
  questions,
  answers,
  onChange,
  onRetry,
  genre,
  topic,
  onTopicChange,
  suggestions,
  onReshuffle,
}: {
  loading: boolean;
  error: string | null;
  questions: IntakeQuestion[];
  answers: Record<string, string>;
  onChange: (id: string, text: string) => void;
  onRetry: () => void;
  genre: BookGenre;
  topic: string;
  onTopicChange: (t: string) => void;
  suggestions: PickedTopic[];
  onReshuffle: () => void;
}) {
  return (
    <div className="space-y-3 pt-1">
      {loading ? (
        <div role="status" className="flex items-center justify-center gap-2 rounded-[20px] bg-white/70 py-8 text-sm font-bold text-haru-muted">
          <Loader2 aria-hidden className="size-5 animate-spin motion-reduce:animate-none" />
          오늘의 질문을 만들고 있어요…
        </div>
      ) : error || questions.length === 0 ? (
        <div role="status" className="space-y-2.5 rounded-[20px] bg-white/80 px-4 py-4 text-center">
          <p className="text-sm font-bold text-haru-ink">{error ?? '질문을 불러오지 못했어요.'}</p>
          <p className="text-[13px] font-bold text-haru-muted">질문 없이도 아래 버튼으로 바로 만들 수 있어요.</p>
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full border-2 border-[#ebc9b6] bg-white px-4 text-sm font-extrabold text-haru-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <RotateCcw aria-hidden className="size-4" />
            다시 시도
          </button>
        </div>
      ) : (
        questions.map((q) => (
          <QuestionCard
            key={q.id}
            question={q.text}
            chips={q.suggestionChips ?? []}
            value={answers[q.id] ?? ''}
            onChange={(v) => onChange(q.id, v)}
            placeholder={q.placeholder ?? '한두 문장으로 적어 주세요'}
            maxLength={500}
          />
        ))
      )}

      <QuestionCard
        question={genre === 'non_fiction' ? '알고 싶은 주제가 있을까? (골라도 되고 비워도 돼)' : '어떤 이야기면 좋을까? (골라도 되고 비워도 돼)'}
        chips={suggestions.map((s) => s.label)}
        value={topic}
        onChange={onTopicChange}
        placeholder={genre === 'non_fiction' ? '예: 우주의 행성들, 사람의 뼈' : '예: 숲속 친구들, 우주 모험'}
        maxLength={80}
        headerAction={
          <button
            type="button"
            onClick={onReshuffle}
            aria-label="다른 주제 보기"
            className="-mr-1.5 -mt-2 inline-flex min-h-11 shrink-0 items-center gap-1 rounded-full px-2.5 text-xs font-extrabold text-haru-muted hover:text-haru-ink focus-visible:outline-2 focus-visible:outline-ring"
          >
            <Shuffle aria-hidden className="size-3.5" />
            다른 주제
          </button>
        }
      />
    </div>
  );
}
