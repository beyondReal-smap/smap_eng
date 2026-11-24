'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { toast } from 'sonner';
import { Mascot, TabHeader } from '@/components/haru';
import { apiFetch } from '@/lib/api-client';
import type { VocabEntry } from '@/lib/db/queries';
import { useKeyboardNav } from '@/lib/hooks/use-keyboard-nav';
import {
  cardState,
  DAILY_GOAL,
  gradeWord,
  gradedTodayCount,
  hydrateFromServer,
  isDue,
  isMastered,
  isNew,
  isUnknown,
  loadStore,
  normalizeKey,
  type Grade,
  type SrsStore,
} from '@/lib/srs';
import { useProfileStore } from '@/stores/profile';
import { CardStack, VocabCard } from './vocab-deck/card';
import {
  DailyProgressChip,
  EmptyTab,
  PillButton,
  SessionCompleteCard,
  Skeleton,
  TabChips,
  type Tab,
} from './vocab-deck/components';
import {
  VocabCompanionBubble,
  VocabCompanionMascot,
  type CompanionState,
} from './vocab-deck/companion';
import { useBookContexts } from './vocab-deck/use-book-contexts';

/**
 * 단어장 "단어 카드 뭉치"(그림책 세계 8차, iOS VocabDeckView와 같은 구성) + SRS(Spaced Repetition).
 * [제목 "단어 카드" + 오늘 진행 칩] → [칩 3개 + 섞기] → [종이 카드 뭉치] → [하단 버튼].
 *
 * 칩:
 *  - "오늘": 새 단어 + 복습 대기 단어(due 도래). 뒷면에서 채점.
 *  - "다시 볼 단어": "다시 볼래요"로 평가된 누적 단어만 모아서 다시 보기. 뒷면에서 채점.
 *  - "전체": 마스터 제외 전체 단어. 평가 없이 훑어보기.
 *
 * 키보드:
 *  - Space: 뒤집기
 *  - ←/→: (채점 칩 뒷면) 다시 볼래요 / 알았어요 — 스와이프 방향과 같다. 그 밖에는 이전/다음 카드.
 *  - 1 / 2: (채점 칩 뒷면) 다시 볼래요 / 알았어요
 *  - s: 섞기, p: 단어 발음 듣기
 */

export function VocabDeck() {
  const hasHydrated = useProfileStore((s) => s.hasHydrated);
  const profileId = useProfileStore((s) => s.currentProfileId);
  const [entries, setEntries] = useState<VocabEntry[]>([]);
  // 초기값 true: persist hydration 전 EmptyState 깜빡임 방지.
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('review');
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [srsStore, setSrsStore] = useState<SrsStore>({});
  const [nowMs, setNowMs] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  // 단어 → audioPath 메모리 캐시. 같은 단어 반복 재생 시 API 스킵.
  const audioCacheRef = useRef<Map<string, string>>(new Map());
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // 학습 컴패니언 — 평가 이벤트에 반응 후 idle로 복귀. pulse는 연속 같은 상태에서도
  // 연출/문구가 갱신되도록 하는 카운터.
  const [companionState, setCompanionState] = useState<CompanionState>('idle');
  const [companionPulse, setCompanionPulse] = useState(0);
  /** 순환 대사 대신 보여 줄 고정 대사 — 오늘 목표를 막 채운 순간. */
  const [companionOverride, setCompanionOverride] = useState<string | null>(null);
  const companionTimerRef = useRef<number | null>(null);
  /** 채점할 때마다 늘려 카드 key를 바꾼다 — 다음 카드가 뒤집힌 채 돌아오며 뜻이 비치지 않게 새로 마운트. */
  const [gradeCount, setGradeCount] = useState(0);
  const { contexts, prefetch } = useBookContexts();

  useEffect(() => {
    return () => {
      if (companionTimerRef.current !== null) {
        window.clearTimeout(companionTimerRef.current);
      }
    };
  }, []);

  // 초기 SRS 스토어 로드 (프로필 변경 시 재로드).
  // 1) 로컬에서 즉시 표시 → 2) 서버 진도를 받아 머지 (다른 디바이스 평가 통합).
  useEffect(() => {
    let cancelled = false;
    const frame = requestAnimationFrame(() => {
      if (cancelled) return;
      setSrsStore(profileId ? loadStore(profileId) : {});
      setNowMs(Date.now());
    });
    if (profileId) {
      hydrateFromServer(profileId).then((merged) => {
        if (!cancelled) setSrsStore(merged);
      });
    }
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [profileId]);

  useEffect(() => {
    if (!hasHydrated) return;
    let cancelled = false;
    let loadingFrame = 0;

    if (!profileId) {
      loadingFrame = requestAnimationFrame(() => {
        if (cancelled) return;
        setEntries([]);
        setIdx(0);
        setFlipped(false);
        setLoading(false);
      });
      return () => {
        cancelled = true;
        cancelAnimationFrame(loadingFrame);
      };
    }

    loadingFrame = requestAnimationFrame(() => {
      if (cancelled) return;
      setLoading(true);
    });

    apiFetch<{ entries: VocabEntry[] }>(`/api/vocab?profileId=${profileId}`)
      .then((res) => {
        if (cancelled) return;
        // 같은 word+meaning 중복 제거.
        const seen = new Set<string>();
        const dedup = res.entries.filter((e) => {
          const key = `${e.word.toLowerCase()}::${e.meaning}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        setEntries(dedup);
        setIdx(0);
        setFlipped(false);
        setNowMs(Date.now());
      })
      .catch((err) => {
        if (cancelled) return;
        toast.error(`단어장 로드 실패: ${err.message}`);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
      cancelAnimationFrame(loadingFrame);
    };
  }, [hasHydrated, profileId]);

  useEffect(() => {
    if (!hasHydrated || !profileId) return;
    let cancelled = false;
    const timer = window.setInterval(() => {
      if (cancelled) return;
      setNowMs(Date.now());
    }, 60 * 1000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [hasHydrated, profileId]);

  // 탭별 덱 구성
  // - review: 새 단어 + due 도래 단어 (최대 20개), 마스터 제외, 새 단어 우선
  // - unknown: "몰라요" 누른 단어 누적
  // - all: 마스터 제외한 전체
  const deck = useMemo(() => {
    if (tab === 'all') return entries.filter((e) => !isMastered(srsStore, e.word));
    if (tab === 'unknown') {
      return entries.filter((e) => isUnknown(srsStore, e.word));
    }
    const candidates = entries.filter(
      (e) => isDue(srsStore, e.word, nowMs) && !isMastered(srsStore, e.word),
    );
    // 새 단어 우선 — 학습 곡선 자연스럽게.
    const sorted = [...candidates].sort((a, b) => {
      const an = isNew(srsStore, a.word);
      const bn = isNew(srsStore, b.word);
      if (an === bn) return 0;
      return an ? -1 : 1;
    });
    return sorted.slice(0, DAILY_GOAL);
  }, [entries, nowMs, srsStore, tab]);

  // 오늘 평가한 단어 수 — 일일 목표 진행률.
  const todayCount = useMemo(() => gradedTodayCount(srsStore), [srsStore]);
  const sessionComplete = tab === 'review' && deck.length === 0 && todayCount > 0;

  const total = deck.length;
  const current = deck[idx];

  /**
   * 영단어 TTS 재생. 이미 캐시된 경로는 즉시 <audio>.src로 설정해 재생.
   * 카드 클릭(flip)과 섞이지 않도록 호출부에서 stopPropagation 처리 필요.
   */
  const speak = useCallback(async (word: string) => {
    if (!word || speaking) return;
    setSpeaking(true);
    try {
      const cache = audioCacheRef.current;
      let src = cache.get(word);
      if (!src) {
        const res = await apiFetch<{ audioPath: string }>(`/api/tts/word`, {
          method: 'POST',
          body: JSON.stringify({ text: word }),
        });
        src = res.audioPath;
        cache.set(word, src);
      }
      // 동일 요소 재사용: 새 src 할당 후 처음부터 재생
      const el = audioRef.current ?? new Audio();
      audioRef.current = el;
      el.src = src;
      el.currentTime = 0;
      // 어린이 학습용 기본 속도(합성 0.85 × 재생 1.06 ≈ 실효 0.9배). src 재할당 후
      // reset되는 모바일 브라우저 대비.
      el.playbackRate = 1.06;
      await el.play().catch(() => void 0);
    } catch (err) {
      toast.error(`듣기 실패: ${(err as Error).message}`);
    } finally {
      setSpeaking(false);
    }
  }, [speaking]);

  const flip = useCallback(() => setFlipped((v) => !v), []);

  const go = useCallback(
    (delta: number) => {
      setIdx((i) => Math.max(0, Math.min(total - 1, i + delta)));
      setFlipped(false);
    },
    [total],
  );

  const shuffleDeck = useCallback(() => {
    // deck은 파생값이므로 entries 순서를 섞어 재구성.
    setEntries((prev) => {
      const arr = [...prev];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    });
    setIdx(0);
    setFlipped(false);
    toast.success('섞었어요');
  }, []);

  /**
   * 평가 적용. "몰라"면 방금 본 단어를 현재 덱의 끝으로 이동시켜 즉시 한 번 더 보게 한다.
   * "조금"/"알아"는 다음 단어로 진행.
   */
  const grade = useCallback(
    (g: Grade) => {
      if (!profileId || !current) return;
      const gradedBefore = gradedTodayCount(srsStore);
      gradeWord(profileId, current.word, g);
      const updated = loadStore(profileId);
      setSrsStore(updated);
      setNowMs(Date.now());
      setFlipped(false);
      setGradeCount((n) => n + 1);
      // 오늘 목표를 막 채운 순간은 한 번뿐인 큰 순간 — 평소 반응 대신 고정 대사로 조금 더 오래 축하(iOS와 같다).
      const reachedGoal = gradedBefore < DAILY_GOAL && gradedTodayCount(updated) >= DAILY_GOAL;
      // 컴패니언 반응 — 정답으로 마스터에 도달하면 축하, 아니면 정/오답 반응.
      // 잠시 뒤 idle 복귀(연속 평가 시 타이머 리셋).
      const mastered = g === 'good' && isMastered(updated, current.word);
      setCompanionState(
        reachedGoal || mastered ? 'celebrate' : g === 'good' ? 'correct' : 'wrong',
      );
      setCompanionOverride(reachedGoal ? '오늘 목표 달성!' : null);
      setCompanionPulse((p) => p + 1);
      if (companionTimerRef.current !== null) {
        window.clearTimeout(companionTimerRef.current);
      }
      companionTimerRef.current = window.setTimeout(
        () => {
          setCompanionState('idle');
          setCompanionOverride(null);
        },
        reachedGoal ? 3000 : mastered ? 2600 : 1800,
      );
      if (g === 'again') {
        // 덱 끝으로 이동 — entries 차원에서 당장 재시도 가능하게.
        setEntries((prev) => {
          const curKey = normalizeKey(current.word);
          const withoutCur = prev.filter(
            (e) => normalizeKey(e.word) !== curKey,
          );
          return [...withoutCur, current];
        });
        setIdx((i) => Math.min(i, Math.max(0, total - 1)));
      } else {
        // 한 칸 전진. 마지막이면 유지.
        setIdx((i) => Math.min(i + 1, Math.max(0, total - 1)));
      }
    },
    [profileId, current, total, srsStore],
  );

  // 오늘 학습 남은 수(새 단어 + 복습 대기 단어, 탭 뱃지). 마스터 단어 제외 + 20개 상한 → deck 길이와 일치.
  const dueCount = useMemo(() => {
    const raw = entries.filter(
      (e) => isDue(srsStore, e.word, nowMs) && !isMastered(srsStore, e.word),
    ).length;
    return Math.min(raw, 20);
  }, [entries, nowMs, srsStore]);

  // "몰라" 누적 수(탭 뱃지).
  const unknownCount = useMemo(() => {
    return entries.filter((e) => isUnknown(srsStore, e.word)).length;
  }, [entries, srsStore]);

  // "전체" 탭 배지 — 마스터한 단어를 제외한 남은 학습 대상.
  const remainingCount = useMemo(() => {
    return entries.filter((e) => !isMastered(srsStore, e.word)).length;
  }, [entries, srsStore]);

  // 마스터한 단어 수 — 헤더에 진도 표시.
  const masteredCount = useMemo(() => {
    return entries.filter((e) => isMastered(srsStore, e.word)).length;
  }, [entries, srsStore]);

  const isGradingTab = tab === 'review' || tab === 'unknown';
  const canGrade = isGradingTab && flipped;

  // 지금·다음 카드의 책 맥락(삽화·문장)을 미리 받아 둔다 — 책별 1회.
  const nextBookId = deck[idx + 1]?.bookId;
  useEffect(() => {
    if (!current) return;
    prefetch(nextBookId !== undefined ? [current.bookId, nextBookId] : [current.bookId]);
  }, [current, nextBookId, prefetch]);

  const bindings = useMemo(
    () => ({
      ' ': flip,
      // 채점 칩 뒷면에서는 스와이프 방향과 같게 ← 다시 볼래요 / → 알았어요, 그 밖에는 이전/다음 카드.
      ArrowLeft: () => (canGrade ? grade('again') : go(-1)),
      ArrowRight: () => (canGrade ? grade('good') : go(1)),
      s: shuffleDeck,
      S: shuffleDeck,
      p: () => {
        if (current) void speak(current.word);
      },
      P: () => {
        if (current) void speak(current.word);
      },
      '1': () => {
        if ((tab === 'review' || tab === 'unknown') && flipped) grade('again');
      },
      '2': () => {
        if ((tab === 'review' || tab === 'unknown') && flipped) grade('good');
      },
    }),
    [canGrade, current, flip, flipped, go, grade, shuffleDeck, speak, tab],
  );
  useKeyboardNav(bindings, total > 0);

  const header = (
    <TabHeader
      title="단어 카드"
      trailing={
        profileId && entries.length > 0 ? (
          <DailyProgressChip done={todayCount} goal={DAILY_GOAL} />
        ) : undefined
      }
    />
  );

  // hydration 전·fetch 중에는 무조건 Skeleton 우선.
  // 이전엔 !profileId가 우선이라 hydration 직전에 EmptyState가 깜빡 노출됐다.
  if (!hasHydrated || loading) {
    return (
      <>
        {header}
        <div className="mx-auto mt-3.5 w-full max-w-[520px]">
          <Skeleton />
        </div>
      </>
    );
  }
  if (!profileId || entries.length === 0) {
    return (
      <>
        {header}
        <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
          <Mascot pose="normal" size={120} />
          <p className="mt-1 text-lg font-extrabold text-haru-ink">
            {!profileId ? '누가 볼 거예요?' : '아직 모은 단어가 없어요'}
          </p>
          <p className="text-sm font-bold text-haru-muted">
            {!profileId
              ? '먼저 프로필을 선택해 주세요.'
              : '책을 만들고 읽어 보면 단어가 여기에 쌓여요.'}
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      {header}
      <div className="mx-auto mt-3.5 w-full max-w-[520px]">
        <TabChips
          tab={tab}
          onChange={(t) => {
            setTab(t);
            setIdx(0);
            setFlipped(false);
          }}
          // "전체" 배지는 마스터 제외한 남은 학습 대상.
          counts={{ review: dueCount, unknown: unknownCount, all: remainingCount }}
          onShuffle={shuffleDeck}
          canShuffle={total > 1}
        />

        {total === 0 ? (
          sessionComplete ? (
            <SessionCompleteCard todayCount={todayCount} masteredCount={masteredCount} />
          ) : (
            <EmptyTab tab={tab} />
          )
        ) : (
          <>
            <p className="sr-only" aria-live="polite">
              {`${total}장 중 ${idx + 1}번째 카드`}
            </p>
            <div className="mx-auto mt-1 w-full max-w-[360px] px-3">
              <CardStack
                key={`${tab}-${idx}-${current!.word}-${gradeCount}`}
                remainingBehind={Math.max(0, total - idx - 1)}
                canSwipe={canGrade}
                onSwipe={grade}
                // 학습 컴패니언 — 평가가 일어나는 칩에서만. 훑어보기(전체)에는 미노출.
                mascot={
                  isGradingTab ? (
                    <VocabCompanionMascot state={companionState} pulse={companionPulse} />
                  ) : undefined
                }
                bubble={
                  isGradingTab ? (
                    <VocabCompanionBubble
                      state={companionState}
                      pulse={companionPulse}
                      messageOverride={companionOverride}
                    />
                  ) : undefined
                }
              >
                <VocabCard
                  entry={current!}
                  cardState={cardState(srsStore, current!.word)}
                  level={srsStore[normalizeKey(current!.word)]?.level ?? 0}
                  flipped={flipped}
                  speaking={speaking}
                  context={contexts[current!.bookId]}
                  onFlip={flip}
                  onSpeak={() => void speak(current!.word)}
                />
              </CardStack>
            </div>

            {/* 하단 — 앞면: 뒤집어 보기 / 뒷면(채점 칩): 다시 볼래요·알았어요 / 뒷면(전체): 이전·다음. */}
            <div className="sticky bottom-0 -mx-3 mt-6 bg-[linear-gradient(to_bottom,transparent,var(--haru-wall)_30%)] px-3 pb-4 pt-4 sm:mx-0 sm:px-0">
              {canGrade ? (
                <>
                  <p aria-hidden className="mb-2.5 text-center text-xs font-bold text-haru-muted">
                    ← 밀면 다시 볼래요 · 밀면 알았어요 →
                  </p>
                  <div className="flex gap-3">
                    <PillButton variant="outline" label="다시 볼래요" onClick={() => grade('again')}>
                      <span aria-hidden>🙈</span> 다시 볼래요
                    </PillButton>
                    <PillButton variant="filled" label="알았어요" onClick={() => grade('good')}>
                      <span aria-hidden>😊</span> 알았어요
                    </PillButton>
                  </div>
                </>
              ) : flipped ? (
                <div className="flex gap-3">
                  <PillButton variant="outline" label="이전 카드" onClick={() => go(-1)} disabled={idx === 0}>
                    ← 이전
                  </PillButton>
                  <PillButton variant="filled" label="다음 카드" onClick={() => go(1)} disabled={idx >= total - 1}>
                    다음 →
                  </PillButton>
                </div>
              ) : (
                <div className="flex">
                  <PillButton variant="outline" ink="coral" label="카드 뒤집기" onClick={flip}>
                    <span aria-hidden>↺</span> 뒤집어 보기
                  </PillButton>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
