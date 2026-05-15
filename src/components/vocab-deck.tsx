'use client';

import { Loader2, Volume2 } from 'lucide-react';
import Link from 'next/link';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from 'react';
import { toast } from 'sonner';
import { Button, buttonVariants } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { EmptyState } from '@/components/ui/empty-state';
import { apiFetch } from '@/lib/api-client';
import { APP_HOME } from '@/lib/paths';
import type { VocabEntry } from '@/lib/db/queries';
import { useKeyboardNav } from '@/lib/hooks/use-keyboard-nav';
import {
  gradeWord,
  isDue,
  isUnknown,
  loadStore,
  normalizeKey,
  type Grade,
  type SrsStore,
} from '@/lib/srs';
import { useProfileStore } from '@/stores/profile';

/**
 * 단어장 플래시카드 + SRS(Spaced Repetition).
 *
 * 탭:
 *  - "오늘 학습": 새 단어 + 복습 대기 단어(due 도래). 평가 버튼 2개 노출.
 *  - "모르는 단어": "몰라"로 평가된 누적 단어만 모아서 다시 보기.
 *  - "전체 단어장": 기존 누적 단어. 평가 없이 훑어보기.
 *
 * 키보드:
 *  - Space: 뒤집기
 *  - ←/→: 이전/다음
 *  - s: 셔플
 *  - p: 단어 발음 듣기
 *  - (뒤집은 상태) 1: 몰라, 2: 알아 — 평가 즉시 다음 카드로.
 */

type Tab = 'review' | 'unknown' | 'all';

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

  // 초기 SRS 스토어 로드 (프로필 변경 시 재로드)
  useEffect(() => {
    let cancelled = false;
    const frame = requestAnimationFrame(() => {
      if (cancelled) return;
      setSrsStore(profileId ? loadStore(profileId) : {});
      setNowMs(Date.now());
    });
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
  // - review: 새 단어 + due 도래 단어 (최대 20개)
  // - unknown: 최근 "몰라"로 평가된 단어 누적
  // - all: 전체
  const deck = useMemo(() => {
    if (tab === 'all') return entries;
    if (tab === 'unknown') {
      return entries.filter((e) => isUnknown(srsStore, e.word));
    }
    return entries.filter((e) => isDue(srsStore, e.word, nowMs)).slice(0, 20);
  }, [entries, nowMs, srsStore, tab]);

  const total = deck.length;
  const current = deck[idx];
  const progress = total > 0 ? ((idx + 1) / total) * 100 : 0;

  /**
   * 영단어 Kokoro TTS 재생. 이미 캐시된 경로는 즉시 <audio>.src로 설정해 재생.
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
      // 어린이 학습용 기본 0.75배속. src 재할당 후 reset되는 모바일 브라우저 대비.
      el.playbackRate = 0.75;
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
      gradeWord(profileId, current.word, g);
      setSrsStore(loadStore(profileId));
      setNowMs(Date.now());
      setFlipped(false);
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
    [profileId, current, total],
  );

  // 오늘 학습 남은 수(새 단어 + 복습 대기 단어, 탭 뱃지).
  const dueCount = useMemo(() => {
    return entries.filter((e) => isDue(srsStore, e.word, nowMs)).length;
  }, [entries, nowMs, srsStore]);

  // "몰라" 누적 수(탭 뱃지).
  const unknownCount = useMemo(() => {
    return entries.filter((e) => isUnknown(srsStore, e.word)).length;
  }, [entries, srsStore]);

  const bindings = useMemo(
    () => ({
      ' ': flip,
      ArrowLeft: () => go(-1),
      ArrowRight: () => go(1),
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
    [current, flip, flipped, go, grade, shuffleDeck, speak, tab],
  );
  useKeyboardNav(bindings, total > 0);

  // hydration 전·fetch 중에는 무조건 Skeleton 우선.
  // 이전엔 !profileId가 우선이라 hydration 직전에 EmptyState가 깜빡 노출됐다.
  if (!hasHydrated || loading) {
    return <Skeleton />;
  }
  if (!profileId) {
    return (
      <EmptyState
        title="누가 볼 거예요?"
        text="먼저 프로필을 선택해 주세요."
      />
    );
  }
  if (entries.length === 0) {
    return (
      <EmptyState
        title="아직 모은 단어가 없어요"
        text="책을 만들고 읽어 보면 단어가 여기에 쌓여요."
      />
    );
  }

  return (
    <div className="space-y-5">
      <TabBar
        tab={tab}
        onChange={setTab}
        dueCount={dueCount}
        unknownCount={unknownCount}
        totalCount={entries.length}
      />

      {total === 0 ? (
        <EmptyState
          title="오늘 학습할 단어가 없어요"
          text="잠시 쉬거나 '전체 단어장' 탭에서 다시 훑어보세요."
        />
      ) : (
        <>
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
            <span aria-live="polite">
              {idx + 1} <span className="text-foreground/40">/</span> {total}
            </span>
            <button
              type="button"
              onClick={shuffleDeck}
              className="rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              섞기
              <kbd className="ml-1.5 hidden rounded bg-muted/70 px-1.5 text-[10px] font-mono sm:inline">S</kbd>
            </button>
          </div>
          <Progress value={progress} className="h-2 rounded-full" />

          <button
            type="button"
            onClick={flip}
            aria-pressed={flipped}
            aria-label={flipped ? '뒤집어서 단어 보기' : '뒤집어서 뜻 보기'}
            className="group relative block w-full rounded-2xl [perspective:1000px] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <div
              className={`relative h-64 w-full rounded-2xl border border-border/60 bg-card shadow-sm transition-transform duration-500 [transform-style:preserve-3d] ${
                flipped ? '[transform:rotateY(180deg)]' : ''
              }`}
            >
              {/* 앞면 — 영어 */}
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 [backface-visibility:hidden]">
                <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  영단어
                </span>
                <div className="mt-3 flex items-center gap-3">
                  <p className="text-center text-4xl font-extrabold tracking-tight sm:text-5xl">
                    {current!.word}
                  </p>
                  <PronounceButton
                    word={current!.word}
                    onSpeak={speak}
                    speaking={speaking}
                  />
                </div>
                <p className="mt-4 text-xs text-muted-foreground">
                  <Link
                    href={`/book/${current!.bookId}`}
                    onClick={(e) => e.stopPropagation()}
                    className="underline-offset-2 hover:underline"
                  >
                    {current!.bookTitle}
                  </Link>
                </p>
                <p className="mt-6 text-[11px] text-muted-foreground">
                  카드를 눌러 뜻 보기
                  <kbd className="ml-1.5 hidden rounded bg-muted/70 px-1.5 py-0.5 text-[10px] font-mono sm:inline">Space</kbd>
                </p>
              </div>
              {/* 뒷면 — 한글 뜻 */}
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 [backface-visibility:hidden] [transform:rotateY(180deg)]">
                <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  뜻
                </span>
                <p className="mt-3 text-center text-2xl font-semibold leading-snug sm:text-3xl">
                  {current!.meaning}
                </p>
                <div className="mt-6 flex items-center gap-2">
                  <p className="text-sm font-medium text-primary">
                    {current!.word}
                  </p>
                  <PronounceButton
                    word={current!.word}
                    onSpeak={speak}
                    speaking={speaking}
                    size="sm"
                  />
                </div>
              </div>
            </div>
          </button>

          {/* 복습/모르는 단어 탭 + 뒤집힌 상태에서만 평가 버튼 노출 */}
          {(tab === 'review' || tab === 'unknown') && flipped ? (
            <div className="grid grid-cols-2 gap-2">
              <GradeButton
                label="몰라"
                tone="destructive"
                onClick={() => grade('again')}
              />
              <GradeButton
                label="알아"
                tone="good"
                onClick={() => grade('good')}
              />
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <Button
                variant="outline"
                onClick={() => go(-1)}
                disabled={idx === 0}
                className="rounded-full press-scale"
              >
                ← 이전
              </Button>
              <Button
                variant="outline"
                onClick={() => go(1)}
                disabled={idx >= total - 1}
                className="rounded-full press-scale"
              >
                다음 →
              </Button>
            </div>
          )}
        </>
      )}

      <div className="flex justify-center pt-2">
        <Link
          href={APP_HOME}
          className={buttonVariants({
            variant: 'ghost',
            size: 'sm',
            className: 'rounded-full',
          })}
        >
          책장으로
        </Link>
      </div>
    </div>
  );
}

/* ---------- Subcomponents ---------- */

function TabBar({
  tab,
  onChange,
  dueCount,
  unknownCount,
  totalCount,
}: {
  tab: Tab;
  onChange: (t: Tab) => void;
  dueCount: number;
  unknownCount: number;
  totalCount: number;
}) {
  return (
    <div
      role="tablist"
      className="inline-flex flex-wrap rounded-full border border-border bg-card p-0.5"
    >
      <TabItem
        active={tab === 'review'}
        onClick={() => onChange('review')}
        label="오늘 학습"
        badge={dueCount}
      />
      <TabItem
        active={tab === 'unknown'}
        onClick={() => onChange('unknown')}
        label="모르는 단어"
        badge={unknownCount}
      />
      <TabItem
        active={tab === 'all'}
        onClick={() => onChange('all')}
        label="전체"
        badge={totalCount}
      />
    </div>
  );
}

function TabItem({
  active,
  onClick,
  label,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  badge: number;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`relative rounded-full px-3 py-1.5 text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        active
          ? 'bg-primary text-primary-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground'
      }`}
    >
      {label}
      <span className="ml-1.5 rounded bg-background/40 px-1.5 text-[10px] tabular-nums">
        {badge}
      </span>
    </button>
  );
}

function GradeButton({
  label,
  tone,
  onClick,
}: {
  label: string;
  tone: 'destructive' | 'good';
  onClick: () => void;
}) {
  const toneClass =
    tone === 'destructive'
      ? 'border-[color:var(--destructive)]/40 bg-[color:var(--destructive)]/10 text-[color:var(--destructive)] hover:bg-[color:var(--destructive)]/15'
      : 'border-[color:var(--level-a1)]/60 bg-[color:var(--level-a1)]/50 text-[color:var(--level-a1-fg)] hover:bg-[color:var(--level-a1)]/70';
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center rounded-xl border py-3 text-base font-bold transition press-scale focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${toneClass}`}
    >
      {label}
    </button>
  );
}

/**
 * 발음 재생 버튼 — 카드(button) 안의 내포된 button 충돌을 피하려고 <span role="button">.
 * 부모 카드 버튼은 flip, 이 버튼은 TTS 재생이라 역할이 다르다.
 */
function PronounceButton({
  word,
  onSpeak,
  speaking,
  size = 'md',
}: {
  word: string;
  onSpeak: (word: string) => void;
  speaking: boolean;
  size?: 'sm' | 'md';
}) {
  function handle(e: MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    if (speaking) return;
    onSpeak(word);
  }
  const dim = size === 'sm' ? 'h-7 w-7' : 'h-10 w-10';
  const icon = size === 'sm' ? 'h-3.5 w-3.5' : 'h-5 w-5';
  // Kokoro TTS 첫 합성은 1~3초 걸릴 수 있어, 명시적 spinner가 없으면 사용자가
  // 버튼이 안 눌린 줄 알고 연타한다. speaking 중에는 Loader2(spin)로 교체 +
  // 클릭 차단 + aria-busy 표시.
  return (
    <span
      role="button"
      aria-label={`${word} 듣기`}
      aria-busy={speaking}
      aria-disabled={speaking}
      tabIndex={0}
      onClick={handle}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.stopPropagation();
          e.preventDefault();
          if (speaking) return;
          onSpeak(word);
        }
      }}
      className={`inline-flex ${dim} shrink-0 items-center justify-center rounded-full border border-border bg-card text-primary shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        speaking
          ? 'cursor-wait opacity-70'
          : 'hover:bg-primary hover:text-primary-foreground'
      }`}
    >
      {speaking ? (
        <Loader2 aria-hidden className={`${icon} animate-spin`} />
      ) : (
        <Volume2 aria-hidden className={icon} />
      )}
    </span>
  );
}

function Skeleton() {
  return (
    <div className="space-y-5">
      <div className="shimmer h-2 w-full rounded-full" />
      <div className="shimmer h-64 w-full rounded-2xl" />
    </div>
  );
}
