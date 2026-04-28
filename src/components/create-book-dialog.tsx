'use client';

import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpenText,
  Compass,
  Loader2,
  Shuffle,
  Sparkles,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ApiError, apiFetch } from '@/lib/api-client';
import type { Book, BookGenre, CefrLevel } from '@/lib/db/schema';
import { useProfileStore } from '@/stores/profile';
import { useCreditBalance } from '@/lib/hooks/use-credit-balance';
import { STAR_COPY, formatStars } from '@/lib/billing/terminology';
import {
  loadTopicHistory,
  pickTopics,
  pushTopicHistory,
  type PickedTopic,
} from '@/lib/topic-suggestions';
import { GenerationProgress } from './generation-progress';

const CEFRS: CefrLevel[] = ['A1', 'A2', 'B1', 'B2'];

const CEFR_HINT: Record<CefrLevel, string> = {
  A1: '기초 · 4~10 단어 문장 · 어휘 12~32개',
  A2: '초급 · 10~16 단어 · 복문 · 어휘 32~48개',
  B1: '중급 · 12~22 단어 · 관계절 · 어휘 45~65개',
  B2: '상급 · 16~28 단어 · 어휘 60~85개 · 9~10세 도전',
};

// 한 화면에 보여줄 주제 칩 개수 — 8개 카테고리에서 골고루 추출되도록 카테고리 수의 1.5배.
const TOPIC_SUGGESTION_COUNT = 12;
const LOW_CREDIT_THRESHOLD = 3;

// 마법사 단계. 인덱스 1부터 시작해 진행률 표시(1/5)에 그대로 사용.
type Step = 1 | 2 | 3 | 4 | 5;
const TOTAL_STEPS = 5;

// /api/books/intake/questions 응답 구조와 일치 — 라우트 별도 import 회피.
interface IntakeQuestion {
  id: string;
  text: string;
  placeholder?: string;
  suggestionChips?: string[];
}

interface Props {
  profileId: number | null;
  onCreated?: (book: Book) => void;
}

export function CreateBookDialog({ profileId, onCreated }: Props) {
  const router = useRouter();
  // 프로필에 등록된 연령을 자동 사용 — 중복 입력 제거
  const profileAge = useProfileStore((s) => s.currentProfileAge);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>(1);
  const [genre, setGenre] = useState<BookGenre>('fiction');
  const [cefr, setCefr] = useState<CefrLevel>('A1');
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<PickedTopic[]>([]);
  const { credits, refresh: refreshCredits } = useCreditBalance();

  // 인테이크(step 3) 상태.
  const [intakeLoading, setIntakeLoading] = useState(false);
  const [intakeError, setIntakeError] = useState<string | null>(null);
  const [intakeQuestions, setIntakeQuestions] = useState<IntakeQuestion[]>([]);
  // questionId → 답변 텍스트. 입력 즉시 반영, 빈 문자열은 "스킵"으로 처리.
  const [answers, setAnswers] = useState<Record<string, string>>({});
  // 동일 (genre, cefr) 쌍에 대해 한 번 로드한 질문은 재방문 시 재사용.
  const intakeCacheKey = useRef<string | null>(null);

  const noStars = credits !== null && credits.balance <= 0;
  const lowStars =
    credits !== null &&
    credits.balance > 0 &&
    credits.balance <= LOW_CREDIT_THRESHOLD;

  const dialogTitle = useMemo(() => {
    if (loading) return '이야기를 준비하고 있어요';
    return genre === 'non_fiction' ? '새 지식책 만들기' : '새 동화 만들기';
  }, [loading, genre]);

  // 다이얼로그 열릴 때마다 12개 추출 + 직전 노출 ID는 회피.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const history = loadTopicHistory();
    const picked = pickTopics(TOPIC_SUGGESTION_COUNT, history);
    pushTopicHistory(picked.map((t) => t.id));
    window.requestAnimationFrame(() => {
      if (!cancelled) setSuggestions(picked);
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  function reshuffleSuggestions() {
    const history = loadTopicHistory();
    const picked = pickTopics(TOPIC_SUGGESTION_COUNT, history);
    setSuggestions(picked);
    pushTopicHistory(picked.map((t) => t.id));
  }

  function resetWizard() {
    setStep(1);
    setGenre('fiction');
    setCefr('A1');
    setTopic('');
    setAnswers({});
    setIntakeQuestions([]);
    setIntakeError(null);
    intakeCacheKey.current = null;
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) resetWizard();
  }

  // step 3에 들어왔을 때 LLM 질문을 1회 로드. 이미 같은 (profile, genre, cefr)
  // 쌍으로 받아둔 질문이 있으면 재사용 — UX상 뒤로가기 후 다시 들어와도
  // 동일 질문이 보이도록 유지.
  useEffect(() => {
    if (!open || step !== 3) return;
    if (!profileId) return;
    const key = `${profileId}:${genre}:${cefr}`;
    if (intakeCacheKey.current === key && intakeQuestions.length > 0) return;

    let cancelled = false;
    setIntakeLoading(true);
    setIntakeError(null);
    apiFetch<{ questions: IntakeQuestion[] }>('/api/books/intake/questions', {
      method: 'POST',
      body: JSON.stringify({ profileId, genre, cefr }),
    })
      .then((data) => {
        if (cancelled) return;
        intakeCacheKey.current = key;
        setIntakeQuestions(data.questions);
      })
      .catch((err) => {
        if (cancelled) return;
        const msg =
          err instanceof ApiError && err.status === 429
            ? '잠시 후 다시 시도해 주세요'
            : '질문을 불러오지 못했어요. 그냥 만들기로 진행해도 좋아요.';
        setIntakeError(msg);
        setIntakeQuestions([]);
      })
      .finally(() => {
        if (!cancelled) setIntakeLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, step, profileId, genre, cefr, intakeQuestions.length]);

  function buildIntakePayload() {
    if (intakeQuestions.length === 0) return undefined;
    const trimmed = intakeQuestions.map((q) => ({
      id: q.id,
      text: q.text,
    }));
    const answerList = intakeQuestions.map((q) => {
      const raw = answers[q.id]?.trim();
      return {
        questionId: q.id,
        text: raw && raw.length > 0 ? raw : null,
      };
    });
    // 답변이 모두 비어 있으면 인테이크 자체를 보내지 않음 — 서버 schema를
    // 가볍게 유지하고 LLM 프롬프트도 깔끔해진다.
    const hasAny = answerList.some((a) => a.text !== null);
    if (!hasAny) return undefined;
    return { questions: trimmed, answers: answerList };
  }

  async function handleGenerate() {
    if (!profileId) {
      toast.error('프로필을 먼저 선택해 주세요');
      return;
    }
    if (!profileAge) {
      toast.error('프로필에 연령 정보가 없어요. 프로필을 새로 만들어 주세요.');
      return;
    }
    if (noStars) {
      toast.error(STAR_COPY.insufficient, {
        action: {
          label: '충전하러 가기',
          onClick: () => router.push('/subscribe'),
        },
      });
      return;
    }
    setLoading(true);
    const t0 = performance.now();
    try {
      const intakePayload = buildIntakePayload();
      const { book } = await apiFetch<{ book: Book }>('/api/books', {
        method: 'POST',
        body: JSON.stringify({
          profileId,
          level: { age: profileAge, cefr },
          genre,
          topic: topic.trim() || undefined,
          intake: intakePayload,
        }),
      });
      const ms = Math.round(performance.now() - t0);
      toast.success(`"${book.title}" 생성 완료 (${(ms / 1000).toFixed(1)}s)`);
      const remaining = credits ? credits.balance - 1 : null;
      if (remaining !== null && remaining <= LOW_CREDIT_THRESHOLD) {
        toast.info(
          remaining > 0
            ? `이제 ${formatStars(remaining)} 남았어요. 다음 책을 위해 미리 충전해둘까요?`
            : '이번 책을 만들고 별이 모두 사용되었어요. 다음 책 전에 충전해둘까요?',
          {
            action: {
              label: '별 충전',
              onClick: () => router.push('/subscribe'),
            },
          },
        );
      }
      handleOpenChange(false);
      refreshCredits();
      onCreated?.(book);
      router.push(`/book/${book.id}`);
    } catch (err) {
      // 서버 잔액 부족(402)이면 별 잔액을 최신으로 갱신하고 충전 액션을 안내.
      if (err instanceof ApiError && err.status === 402) {
        refreshCredits();
        toast.error(STAR_COPY.insufficient, {
          action: {
            label: '충전하러 가기',
            onClick: () => router.push('/subscribe'),
          },
        });
      } else {
        toast.error(`생성 실패: ${(err as Error).message}`);
      }
    } finally {
      setLoading(false);
    }
  }

  function goNext() {
    if (step < TOTAL_STEPS) setStep((step + 1) as Step);
  }
  function goBack() {
    if (step > 1) setStep((step - 1) as Step);
  }

  // step별 다음 버튼 라벨/동작.
  const isLastStep = step === TOTAL_STEPS;
  const primaryLabel = (() => {
    if (loading) return '생성 중…';
    if (noStars && isLastStep) return '별 충전 필요';
    if (isLastStep) return '생성';
    if (step === 3) {
      const filled = intakeQuestions.some((q) => answers[q.id]?.trim());
      return filled ? '다음' : '건너뛰고 다음';
    }
    return '다음';
  })();

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button
            size="lg"
            disabled={!profileId}
            className="rounded-full shadow-sm press-scale disabled:opacity-60"
          />
        }
      >
        <Sparkles aria-hidden className="h-4 w-4" />
        새 책 만들기
      </DialogTrigger>
      <DialogContent className="animate-pop-in sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          {!loading ? (
            <DialogDescription>
              {profileAge
                ? `${profileAge}세에 맞춰 ${
                    genre === 'non_fiction'
                      ? '지식책'
                      : '동화책'
                  } 한 편을 만들어 드려요.`
                : '영어 수준과 주제를 고르면 한 편을 만들어 드려요.'}
            </DialogDescription>
          ) : null}
          {!loading ? (
            <div className="mt-2 flex items-center justify-between gap-3">
              <div className="flex items-center gap-1">
                {Array.from({ length: TOTAL_STEPS }).map((_, i) => {
                  const filled = i < step;
                  return (
                    <span
                      key={i}
                      aria-hidden
                      className={`h-1.5 w-6 rounded-full transition ${
                        filled ? 'bg-primary' : 'bg-muted'
                      }`}
                    />
                  );
                })}
                <span className="ml-2 text-xs text-muted-foreground">
                  {step}/{TOTAL_STEPS}
                </span>
              </div>
              {credits ? (
                <p
                  className={`inline-flex items-center gap-1 text-xs font-medium ${
                    noStars
                      ? 'text-[color:var(--destructive)]'
                      : 'text-muted-foreground'
                  }`}
                >
                  {noStars ? (
                    <AlertTriangle aria-hidden className="size-3.5" />
                  ) : null}
                  {noStars
                    ? `${STAR_COPY.balanceEmpty} · 만들려면 별 1개 필요`
                    : lowStars
                      ? `보유 ${formatStars(credits.balance)} · 3개 이하라 미리 충전 추천`
                      : `보유 ${formatStars(credits.balance)} · 만들 때 별 1개 사용`}
                </p>
              ) : null}
            </div>
          ) : null}
        </DialogHeader>

        {loading ? (
          <GenerationProgress />
        ) : (
          <div className="grid gap-5 py-2">
            {step === 1 ? (
              <StepGenre genre={genre} onChange={setGenre} />
            ) : null}
            {step === 2 ? (
              <StepCefr cefr={cefr} onChange={setCefr} />
            ) : null}
            {step === 3 ? (
              <StepIntake
                loading={intakeLoading}
                error={intakeError}
                questions={intakeQuestions}
                answers={answers}
                onChange={(id, text) =>
                  setAnswers((prev) => ({ ...prev, [id]: text }))
                }
                onSkipAll={() => {
                  // 답변을 모두 지우고 마지막 단계로 점프 — "그냥 만들기" 폴백.
                  setAnswers({});
                  setStep(5);
                }}
                onRetry={() => {
                  intakeCacheKey.current = null;
                  setIntakeQuestions([]);
                }}
              />
            ) : null}
            {step === 4 ? (
              <StepTopic
                genre={genre}
                topic={topic}
                onChange={setTopic}
                suggestions={suggestions}
                onReshuffle={reshuffleSuggestions}
              />
            ) : null}
            {step === 5 ? (
              <StepReview
                genre={genre}
                cefr={cefr}
                topic={topic}
                profileAge={profileAge}
                intakeAnswers={
                  intakeQuestions.length > 0
                    ? intakeQuestions
                        .map((q) => ({
                          q: q.text,
                          a: answers[q.id]?.trim() ?? '',
                        }))
                        .filter((p) => p.a.length > 0)
                    : []
                }
              />
            ) : null}
          </div>
        )}

        {!loading ? (
          <DialogFooter className="flex-row items-center justify-between gap-2 sm:justify-between">
            <Button
              variant="outline"
              onClick={step === 1 ? () => handleOpenChange(false) : goBack}
              className="rounded-md"
              type="button"
            >
              {step === 1 ? (
                '취소'
              ) : (
                <>
                  <ArrowLeft aria-hidden className="size-4" />
                  뒤로
                </>
              )}
            </Button>
            <Button
              onClick={isLastStep ? handleGenerate : goNext}
              disabled={isLastStep && noStars}
              className="rounded-md press-scale disabled:opacity-60"
              type="button"
            >
              {primaryLabel}
              {!isLastStep ? (
                <ArrowRight aria-hidden className="size-4" />
              ) : null}
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

// ===== Sub steps =====

function StepGenre({
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

function GenreCard({
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

function StepCefr({
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

function StepIntake({
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
            className="h-11 rounded-xl"
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

function StepTopic({
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
        className="h-11 rounded-xl"
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

function StepReview({
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
