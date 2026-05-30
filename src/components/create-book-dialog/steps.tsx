'use client';

import {
  AlertTriangle,
  BookOpenText,
  Compass,
  Loader2,
  Shuffle,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { BookGenre, CefrLevel } from '@/lib/db/schema';
import type { PickedTopic } from '@/lib/topic-suggestions';
import { CEFRS, CEFR_HINT, type IntakeQuestion } from './shared';

export function StepGenre({
  genre,
  onChange,
}: {
  genre: BookGenre;
  onChange: (g: BookGenre) => void;
}) {
  return (
    <div className="grid gap-3">
      <Label>어떤 책을 만들까요?</Label>
      <div className="grid grid-cols-2 gap-2.5">
        <GenreCard
          active={genre === 'fiction'}
          icon={<Sparkles aria-hidden className="size-5" />}
          title="동화 (픽션)"
          desc="상상 속 모험·우정·따뜻한 결말"
          onClick={() => onChange('fiction')}
        />
        <GenreCard
          active={genre === 'non_fiction'}
          icon={<Compass aria-hidden className="size-5" />}
          title="지식책 (논픽션)"
          desc="실제 사실로 배우는 호기심 가득한 한 편"
          onClick={() => onChange('non_fiction')}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        선택은 다음 단계에서 언제든 바꿀 수 있어요.
      </p>
    </div>
  );
}

export function GenreCard({
  active,
  icon,
  title,
  desc,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`group flex flex-col gap-1.5 rounded-2xl border p-4 text-left transition press-scale ${
        active
          ? 'border-transparent bg-[color:var(--secondary)] text-[color:var(--secondary-foreground)] shadow-sm ring-2 ring-primary/30'
          : 'border-border/60 bg-background hover:bg-muted'
      }`}
    >
      <span className="inline-flex items-center gap-1.5 text-sm font-bold">
        {icon}
        {title}
      </span>
      <span className="text-xs text-muted-foreground group-aria-pressed:text-[color:var(--secondary-foreground)]/80">
        {desc}
      </span>
    </button>
  );
}

export function StepCefr({
  cefr,
  onChange,
}: {
  cefr: CefrLevel;
  onChange: (c: CefrLevel) => void;
}) {
  return (
    <div className="grid gap-2">
      <Label>영어 수준 (CEFR)</Label>
      <div className="grid grid-cols-4 gap-1.5">
        {CEFRS.map((c) => {
          const lvl =
            c === 'A1'
              ? 'level-a1'
              : c === 'A2'
                ? 'level-a2'
                : c === 'B1'
                  ? 'level-b1'
                  : 'level-b2';
          return (
            <button
              key={c}
              type="button"
              onClick={() => onChange(c)}
              aria-pressed={cefr === c}
              className={`rounded-2xl border px-3 py-2.5 text-center font-bold transition press-scale ${
                cefr === c
                  ? `${lvl} border-transparent shadow-sm ring-2 ring-primary/30`
                  : 'border-border/60 bg-background text-muted-foreground hover:bg-muted'
              }`}
            >
              {c}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">{CEFR_HINT[cefr]}</p>
    </div>
  );
}

export function StepIntake({
  loading,
  error,
  questions,
  answers,
  onChange,
  onSkipAll,
  onRetry,
}: {
  loading: boolean;
  error: string | null;
  questions: IntakeQuestion[];
  answers: Record<string, string>;
  onChange: (id: string, text: string) => void;
  onSkipAll: () => void;
  onRetry: () => void;
}) {
  if (loading) {
    return (
      <div className="grid place-items-center gap-2 py-6 text-sm text-muted-foreground">
        <Loader2 aria-hidden className="size-5 animate-spin" />
        오늘의 질문을 만들고 있어요…
      </div>
    );
  }
  if (error || questions.length === 0) {
    return (
      <div className="grid gap-3 rounded-2xl border border-border/60 bg-muted/30 p-4">
        <div className="flex items-start gap-2 text-sm">
          <AlertTriangle
            aria-hidden
            className="size-4 shrink-0 text-[color:var(--destructive)]"
          />
          <p className="text-muted-foreground">
            {error ?? '질문을 불러오지 못했어요.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onRetry}
            className="rounded-md"
          >
            다시 시도
          </Button>
          <Button
            type="button"
            onClick={onSkipAll}
            className="rounded-md press-scale"
          >
            그냥 만들기
          </Button>
        </div>
      </div>
    );
  }
  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <Label>오늘의 질문 (모두 선택)</Label>
        <button
          type="button"
          onClick={onSkipAll}
          className="text-xs font-medium text-muted-foreground transition hover:text-foreground"
        >
          모두 건너뛰기
        </button>
      </div>
      {questions.map((q) => (
        <div key={q.id} className="grid gap-1.5">
          <Label htmlFor={`intake-${q.id}`} className="text-sm font-semibold">
            {q.text}
          </Label>
          <Input
            id={`intake-${q.id}`}
            value={answers[q.id] ?? ''}
            onChange={(e) => onChange(q.id, e.target.value)}
            placeholder={q.placeholder ?? '한두 문장으로 적어 주세요'}
            maxLength={500}
            className="h-11 rounded-xl focus:border-ring focus:ring-3 focus:ring-ring/50 focus:placeholder:text-muted-foreground/35"
          />
          {q.suggestionChips && q.suggestionChips.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {q.suggestionChips.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => onChange(q.id, chip)}
                  className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground transition hover:bg-[color:var(--secondary)] hover:text-[color:var(--secondary-foreground)]"
                >
                  {chip}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function StepTopic({
  genre,
  topic,
  onChange,
  suggestions,
  onReshuffle,
}: {
  genre: BookGenre;
  topic: string;
  onChange: (t: string) => void;
  suggestions: PickedTopic[];
  onReshuffle: () => void;
}) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between">
        <Label htmlFor="topic">
          {genre === 'non_fiction' ? '주제 (선택)' : '주제 (선택)'}
        </Label>
        <button
          type="button"
          onClick={onReshuffle}
          aria-label="다른 주제 보기"
          className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <Shuffle aria-hidden className="size-3" />
          다른 주제 보기
        </button>
      </div>
      <Input
        id="topic"
        value={topic}
        onChange={(e) => onChange(e.target.value)}
        placeholder={
          genre === 'non_fiction'
            ? '예: 우주의 행성들, 사람의 뼈'
            : '예: 숲속 친구들, 우주 모험'
        }
        maxLength={80}
        className="h-11 rounded-xl focus:border-ring focus:ring-3 focus:ring-ring/50 focus:placeholder:text-muted-foreground/35"
      />
      <div className="flex flex-wrap gap-1.5 pt-1">
        {suggestions.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onChange(s.label)}
            className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground transition hover:bg-[color:var(--secondary)] hover:text-[color:var(--secondary-foreground)]"
          >
            {s.label}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        앞 단계 답변이 있으면 비워 두셔도 좋아요.
      </p>
    </div>
  );
}

export function StepReview({
  genre,
  cefr,
  topic,
  profileAge,
  intakeAnswers,
}: {
  genre: BookGenre;
  cefr: CefrLevel;
  topic: string;
  profileAge: number | null;
  intakeAnswers: { q: string; a: string }[];
}) {
  const trimmedTopic = topic.trim();
  return (
    <div className="grid gap-3 rounded-2xl border border-border/60 bg-muted/20 p-4">
      <div className="flex items-center gap-2 text-sm font-bold">
        <BookOpenText aria-hidden className="size-4" />
        {genre === 'non_fiction' ? '지식책' : '동화책'} ·{' '}
        {profileAge ? `${profileAge}세 · ` : ''}
        CEFR {cefr}
      </div>
      {trimmedTopic ? (
        <p className="text-sm">
          <span className="text-muted-foreground">주제 · </span>
          {trimmedTopic}
        </p>
      ) : null}
      {intakeAnswers.length > 0 ? (
        <ul className="grid gap-1.5 text-xs text-muted-foreground">
          {intakeAnswers.map((p, i) => (
            <li key={i}>
              <span className="font-medium text-foreground">{p.q}</span>{' '}
              <span>{p.a}</span>
            </li>
          ))}
        </ul>
      ) : null}
      <p className="text-xs text-muted-foreground">
        ‘생성’을 누르면 별 1개가 사용돼요.
      </p>
    </div>
  );
}
