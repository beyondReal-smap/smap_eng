'use client';

import Link from 'next/link';
import { ChevronRight, Sparkles, Star } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ApiError, apiFetch } from '@/lib/api-client';
import {
  GENRE_TITLE,
  INTAKE_SUBTITLE,
  INTAKE_TITLE,
  LEVEL_TITLE,
  genreNoun,
  genreObjectParticle,
  genreSubjectParticle,
  genreSubtitle,
  levelSubtitle,
  previewSentence,
  recommendationBadge,
  recommendedLevel,
} from '@/lib/create-book/guide';
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
  BearPrompt,
  CORAL_PILL,
  GlassCircleButton,
  StepDots,
  StepFooter,
} from './create-book-dialog/chrome';
import {
  StepGenre,
  StepIntake,
  StepLevel,
} from './create-book-dialog/steps';

interface Props {
  profileId: number | null;
  onCreated?: (book: Book) => void;
  /**
   * 기본 "새 책 만들기" 버튼 대신 쓸 트리거 모양(책장의 "새 동화 만들기" 마법 책 등).
   * 주면 `<button>` 안에 이 내용을 그리고 `triggerClassName`·`triggerLabel`을 붙인다.
   */
  trigger?: {
    content: ReactNode;
    className?: string;
    label: string;
  };
  /** 곰 말풍선 호칭("지우가 좋아하는 쪽을…")·추천 배지용. 없으면 이름 없는 문구. */
  childName?: string | null;
  /** 레벨 추천(14차) — 가장 최근 읽은 책 / 최근 만든 책의 레벨. 없으면 나이로 추천. */
  recentReadLevel?: CefrLevel | null;
  latestCreatedLevel?: CefrLevel | null;
}

/**
 * 새 동화 만들기 — "곰과 함께 동화 만들기"(웹 3단계, 네이티브 14차와 같은 3단계).
 * 1 장르(카드를 누르면 바로 다음) · 2 레벨(추천 레벨 미리 선택) · 3 질문(서버 인테이크 + 주제 + 미리보기 + 만들기).
 * 모바일은 전체 화면 시트, 640px 이상은 가운데 큰 카드. 생성 요청·별 차감·인테이크 요청·완성 후 이동 로직은 그대로.
 */
export function CreateBookDialog({
  profileId,
  onCreated,
  trigger,
  childName = null,
  recentReadLevel = null,
  latestCreatedLevel = null,
}: Props) {
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
  // 추천 레벨 — ① 최근 읽은 책 → ② 최근 만든 책 → ③ 나이(프로필 나이를 모르면 7세 기준).
  const recommended = recommendedLevel(recentReadLevel ?? latestCreatedLevel, profileAge ?? 7);
  const noun = genreNoun(genre);

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
    setCefr(recommended);
    setTopic('');
    setAnswers({});
    setIntakeQuestions([]);
    setIntakeError(null);
    intakeCacheKey.current = null;
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) resetWizard();
    // 열 때 추천 레벨을 미리 골라 둔다(프로필·최근 책이 바뀌었을 수 있어 매번 다시 계산).
    else setCefr(recommended);
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

  function goBack() {
    if (step > 1) setStep((step - 1) as Step);
  }

  // 3단계 미리보기 — 질문 순서대로 고르거나 적은 답 + 주제.
  const previewAnswers = [
    ...intakeQuestions.map((q) => answers[q.id] ?? ''),
    topic,
  ];

  const bearPrompt: {
    pose: 'normal' | 'reading' | 'cheer';
    size: number;
    title: string;
    subtitle: string;
    compact?: boolean;
  } = loading
    ? {
        pose: 'reading',
        size: 92,
        title: '이야기를 준비하고 있어요',
        subtitle: `${noun}${genreSubjectParticle(genre)} 완성되면 바로 펼쳐 줄게`,
      }
    : step === 1
      ? { pose: 'normal', size: 92, title: GENRE_TITLE, subtitle: genreSubtitle(childName) }
      : step === 2
        ? { pose: 'reading', size: 92, title: LEVEL_TITLE, subtitle: levelSubtitle(childName, recentReadLevel) }
        : { pose: 'cheer', size: 80, title: INTAKE_TITLE, subtitle: INTAKE_SUBTITLE, compact: true };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger ? (
        <DialogTrigger
          render={
            <button
              type="button"
              disabled={!profileId}
              aria-label={trigger.label}
              className={trigger.className}
            />
          }
        >
          {trigger.content}
        </DialogTrigger>
      ) : (
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
      )}
      <DialogContent
        showCloseButton={false}
        // 모바일 = 전체 화면 시트(단계마다 큰 카드·하단 고정 버튼이라 작은 팝업보다 자연스럽다),
        // 640px 이상 = 가운데 큰 카드. 배경은 그림책 벽지.
        className="inset-0 top-0 left-0 flex h-dvh max-h-none w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-0 bg-haru-wall bg-[radial-gradient(circle_at_12%_6%,rgb(245_229_194/0.55),transparent_45%),radial-gradient(circle_at_92%_18%,rgb(194_217_245/0.45),transparent_40%)] p-0 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:h-[min(780px,calc(100dvh-3rem))] sm:w-[560px] sm:max-w-[calc(100%-2rem)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[28px] sm:border-2 sm:border-[#f0dcc8]"
      >
        {/* 상단 — [닫기/이전] [단계 점] [닫기]. 1단계와 생성 중엔 왼쪽이 닫기, 오른쪽은 자리만. */}
        <div className="flex shrink-0 items-center justify-between px-3 pt-[max(0.5rem,env(safe-area-inset-top))] sm:px-4 sm:pt-3">
          {step === 1 || loading ? (
            <GlassCircleButton kind="close" label="닫기" onClick={() => handleOpenChange(false)} />
          ) : (
            <GlassCircleButton kind="back" label="이전 단계" onClick={goBack} />
          )}
          {!loading ? <StepDots current={step - 1} total={TOTAL_STEPS} /> : null}
          {step === 1 || loading ? (
            <span aria-hidden className="size-11" />
          ) : (
            <GlassCircleButton kind="close" label="닫기" onClick={() => handleOpenChange(false)} />
          )}
        </div>

        <div className="shrink-0 px-4 pt-1 sm:px-6">
          <BearPrompt
            key={loading ? 'loading' : step}
            pose={bearPrompt.pose}
            mascotSize={bearPrompt.size}
            title={bearPrompt.title}
            subtitle={bearPrompt.subtitle}
            compact={bearPrompt.compact}
          />
        </div>

        {/* 단계 본문 — 넘치면 이 영역만 스크롤, 하단 버튼은 고정. */}
        <div
          key={loading ? 'loading' : step}
          className="min-h-0 flex-1 animate-fade-up overflow-y-auto overscroll-contain px-4 pb-4 motion-reduce:animate-none sm:px-6"
        >
          {loading ? (
            <GenerationProgress />
          ) : step === 1 ? (
            <StepGenre
              onSelect={(g) => {
                setGenre(g);
                setStep(2);
              }}
            />
          ) : step === 2 ? (
            <StepLevel
              cefr={cefr}
              onChange={setCefr}
              recommended={recommended}
              badge={recommendationBadge(childName)}
            />
          ) : (
            <StepIntake
              loading={intakeLoading}
              error={intakeError}
              questions={intakeQuestions}
              answers={answers}
              onChange={(id, text) =>
                setAnswers((prev) => ({ ...prev, [id]: text }))
              }
              onRetry={() => {
                intakeCacheKey.current = null;
                setIntakeQuestions([]);
              }}
              genre={genre}
              topic={topic}
              onTopicChange={setTopic}
              suggestions={suggestions}
              onReshuffle={reshuffleSuggestions}
            />
          )}
        </div>

        {!loading && step === 2 ? (
          <StepFooter>
            <button type="button" onClick={() => setStep(3)} className={CORAL_PILL}>
              다음
              <ChevronRight aria-hidden className="size-5" strokeWidth={3.5} />
            </button>
            <p className="text-center text-[12.5px] font-bold text-haru-muted">레벨은 책마다 바꿀 수 있어요</p>
          </StepFooter>
        ) : null}

        {!loading && step === 3 ? (
          <StepFooter>
            {/* 이런 책이 만들어져요 — 작은 책 + 고른 답을 이은 한 문장(한 요소로 읽힘). */}
            <div
              role="group"
              aria-label={`이런 ${noun}${genreSubjectParticle(genre)} 만들어져요: ${previewSentence(previewAnswers, noun, genreObjectParticle(genre))}`}
              className="flex items-center gap-2.5 rounded-[18px] bg-white px-3.5 py-2.5 shadow-[0_6px_14px_rgb(168_111_63/0.12)]"
            >
              <span
                aria-hidden
                className="h-11 w-[34px] shrink-0 rounded-l-[2px] rounded-r-[5px] bg-[linear-gradient(180deg,#d2b8e5,#f6ce73)] shadow-[0_2px_2px_rgb(46_32_25/0.18)]"
              />
              <span aria-hidden className="min-w-0 flex-1">
                <span className="block text-[13px] font-bold text-haru-muted">
                  이런 {noun}{genreSubjectParticle(genre)} 만들어져요
                </span>
                <span className="line-clamp-2 block text-[15.5px] font-extrabold leading-snug text-haru-ink">
                  {previewSentence(previewAnswers, noun, genreObjectParticle(genre))}
                </span>
              </span>
            </div>
            <button
              type="button"
              onClick={handleGenerate}
              // 질문을 받는 중에는 답을 쓸 기회를 주려고 잠시 비활성. 별이 없으면 기존처럼 막는다.
              disabled={intakeLoading || noStars}
              className={CORAL_PILL}
            >
              <Sparkles aria-hidden className="size-5" />
              {noun} 만들기 · 별 1개
            </button>
            {credits ? (
              noStars ? (
                <p className="text-center text-[12.5px] font-bold text-haru-ink">
                  {STAR_COPY.balanceEmpty} ·{' '}
                  <Link href="/subscribe" className="text-haru-coral-ink underline underline-offset-2">
                    별 충전하러 가기
                  </Link>
                </p>
              ) : (
                <p className="flex items-center justify-center gap-1 text-[12.5px] font-bold text-haru-muted">
                  남은 별
                  <Star aria-hidden className="size-3.5 fill-[#e08a1e] text-[#e08a1e]" />
                  <span>{credits.balance}개</span>
                  {credits.balance <= LOW_CREDIT_THRESHOLD ? ' · 미리 충전해 두면 좋아요' : ''}
                </p>
              )
            ) : null}
          </StepFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
