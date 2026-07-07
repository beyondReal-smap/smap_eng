'use client';

import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
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
import {
  LOW_CREDIT_THRESHOLD,
  TOPIC_SUGGESTION_COUNT,
  TOTAL_STEPS,
  type IntakeQuestion,
  type Step,
} from './create-book-dialog/shared';
import {
  StepCefr,
  StepGenre,
  StepIntake,
  StepReview,
  StepTopic,
} from './create-book-dialog/steps';

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

  // 다이얼로그 열릴 때/장르 바뀔 때마다 12개 추출 + 직전 노출 ID는 회피.
  // genre를 deps에 넣어 1단계에서 장르 토글하면 step 4 칩 풀이 즉시 재계산되도록.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const history = loadTopicHistory();
    const picked = pickTopics(TOPIC_SUGGESTION_COUNT, history, genre);
    pushTopicHistory(picked.map((t) => t.id));
    window.requestAnimationFrame(() => {
      if (!cancelled) setSuggestions(picked);
    });
    return () => {
      cancelled = true;
    };
  }, [open, genre]);

  function reshuffleSuggestions() {
    const history = loadTopicHistory();
    const picked = pickTopics(TOPIC_SUGGESTION_COUNT, history, genre);
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
