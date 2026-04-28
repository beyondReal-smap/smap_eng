'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Popover } from '@base-ui/react/popover';
import { Settings2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { EmptyState } from '@/components/ui/empty-state';
import { apiFetch } from '@/lib/api-client';
import { parseJsonField } from '@/lib/json-field';
import { APP_HOME } from '@/lib/paths';
import type {
  AlternateEnding,
  Book,
  CefrLevel,
  EndingPassage,
  FunFact,
  Passage,
  VocabularyEntry,
} from '@/lib/db/schema';
import { useKeyboardNav } from '@/lib/hooks/use-keyboard-nav';
import { useProfileStore } from '@/stores/profile';

interface Props {
  book: Book;
  passages: Passage[];
}

interface TtsResponse {
  passageId: number;
  audioPath: string;
  cached: boolean;
}

type SlideDir = 'next' | 'prev' | null;

const LEVEL_CLASS: Record<CefrLevel, string> = {
  A1: 'level-a1',
  A2: 'level-a2',
  B1: 'level-b1',
  B2: 'level-b2',
};

const progressKey = (bookId: number) => `reader:progress:${bookId}`;
const autoplayKey = (bookId: number) => `reader:autoplay:${bookId}`;
const branchKey = (bookId: number) => `reader:branch:${bookId}`;
const logKey = (profileId: number, bookId: number) =>
  `reader:log:${profileId}:${bookId}`;
const fontSizeKey = 'reader:font-size';
// 백그라운드 prefetch는 직렬(while + await)이지만 GAP이 너무 짧으면 Kokoro
// PyTorch 모델의 메모리가 GC되기 전에 다음 합성이 시작되며 누적 spike가
// 발생해 PM2 max_memory_restart가 30초 주기로 트리거됐다(2026-04-26 사례).
// 1.5초 gap으로 매 합성 사이에 GC + soundfile buffer 해제 시간을 확보한다.
const BACKGROUND_TTS_GAP_MS = 1500;
const BACKGROUND_TTS_RETRY_MS = 10_000;

type Branch = 'A' | 'B';

type FontSize = 'sm' | 'md' | 'lg';

/** Reader 본문 영단어 문장의 타이포 클래스 — 3단계. */
const PASSAGE_FONT_CLASS: Record<FontSize, string> = {
  sm: 'text-xl leading-relaxed sm:text-[24px] sm:leading-[1.5]',
  md: 'text-2xl leading-relaxed sm:text-[30px] sm:leading-[1.4]',
  lg: 'text-3xl leading-relaxed sm:text-[38px] sm:leading-[1.35]',
};

function isFontSize(v: unknown): v is FontSize {
  return v === 'sm' || v === 'md' || v === 'lg';
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 어휘 단어를 본문과 매칭하기 위한 정규화 키.
// 단순 lowercase — 복수형/시제 변화는 MVP 범위 밖.
// null/undefined 방어 — LLM 응답 vocabulary 누락 항목, 또는 split/capture group에서
// 나올 수 있는 undefined token을 안전하게 빈 문자열로 처리.
const normalize = (w: string | null | undefined): string =>
  (w ?? '').trim().toLowerCase().replace(/[.,!?;:"']/g, '');

function buildVocabMap(list: VocabularyEntry[] | null | undefined) {
  const map = new Map<string, VocabularyEntry>();
  if (!list) return map;
  for (const entry of list) {
    if (!entry?.word) continue;
    const key = normalize(entry.word);
    if (key && !map.has(key)) map.set(key, entry);
  }
  return map;
}

// 영문 본문을 단어·공백·구두점 토큰으로 분할.
// /(\w[\w'-]*)/ 는 "don't", "long-lost" 같은 복합 단어도 하나로 유지.
// 빈 문자열/undefined 입력과 split capture group의 undefined 결과를 모두 걸러낸다.
function tokenize(text: string | null | undefined): string[] {
  if (!text) return [];
  return text
    .split(/(\w[\w'-]*)/g)
    .filter((t): t is string => typeof t === 'string' && t !== '');
}

/** 본문에서 vocabulary와 매칭되는 단어를 Popover trigger로 감싸 렌더. */
function PassageText({
  text,
  vocabMap,
}: {
  text: string;
  vocabMap: Map<string, VocabularyEntry>;
}) {
  if (vocabMap.size === 0) {
    return <>{text}</>;
  }
  const tokens = tokenize(text);
  return (
    <>
      {tokens.map((tok, i) => {
        const entry = vocabMap.get(normalize(tok));
        if (!entry) {
          return <span key={i}>{tok}</span>;
        }
        return <VocabWord key={i} word={tok} entry={entry} />;
      })}
    </>
  );
}

function VocabWord({
  word,
  entry,
}: {
  word: string;
  entry: VocabularyEntry;
}) {
  return (
    <Popover.Root>
      <Popover.Trigger
        render={
          <button
            type="button"
            className="relative inline-block cursor-help rounded px-0.5 text-inherit underline decoration-primary/50 decoration-wavy decoration-2 underline-offset-[6px] transition-colors hover:bg-primary/10 focus:bg-primary/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            aria-label={`${entry.word} 뜻 보기`}
          />
        }
      >
        {word}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={8} align="center">
          <Popover.Popup className="animate-bounce-in z-50 max-w-[260px] rounded-2xl border border-border/60 bg-popover px-4 py-3 text-sm text-popover-foreground shadow-xl ring-1 ring-foreground/5 outline-none">
            <div className="font-bold text-primary">{entry.word}</div>
            <div className="mt-0.5 text-[15px] font-medium leading-snug">
              {entry.meaning}
            </div>
            <Popover.Arrow className="text-border" />
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

export function Reader({ book, passages }: Props) {
  const profileId = useProfileStore((s) => s.currentProfileId);
  const [logId, setLogId] = useState<number | null>(null);
  const [idx, setIdx] = useState(0);
  const [slideDir, setSlideDir] = useState<SlideDir>(null);
  const [showKo, setShowKo] = useState(false);
  const [autoplay, setAutoplay] = useState(false);
  const [audioCache, setAudioCache] = useState<Record<number, string>>(() => {
    const initial: Record<number, string> = {};
    for (const p of passages) {
      if (p.audioPath) initial[p.id] = p.audioPath;
    }
    return initial;
  });
  const [sceneCache, setSceneCache] = useState<Record<number, string>>(() => {
    const initial: Record<number, string> = {};
    for (const p of passages) {
      if (p.sceneImagePath) initial[p.id] = p.sceneImagePath;
    }
    return initial;
  });
  const [loadingAudio, setLoadingAudio] = useState(false);
  // 사용자가 실제로 재생을 시작한 passage id 집합. background batch가 음성을
  // 미리 캐시해 두어도 "다시 듣기"로 잘못 표시되는 문제를 막는다.
  // 세션 단위(컴포넌트 라이프사이클)로만 추적 — 새 페이지 진입 시 초기화.
  const [playedPassages, setPlayedPassages] = useState<ReadonlySet<number>>(
    () => new Set(),
  );
  const [fontSize, setFontSize] = useState<FontSize>('md');
  const [branch, setBranch] = useState<Branch | null>(null);
  const [choiceOpen, setChoiceOpen] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioCacheRef = useRef(audioCache);
  // DB에 audio_path가 남아 있지만 실제 wav가 아직 디스크에 없는 윈도우(책 생성 직후
  // background 합성 진행 중)에서 자동 복구 시 사용. 시도 횟수별 backoff(2s→5s→10s)
  // 후 force=true로 /api/tts/[id] 재호출. 4회째에만 사용자에게 toast로 알림.
  // passage id 기준. 컴포넌트 라이프사이클 동안만 유지.
  const recoveryAttemptsRef = useRef<Map<number, number>>(new Map());
  const recoveryTimersRef = useRef<Map<number, number>>(new Map());

  // 분기 엔딩 — book.alternateEnding이 있을 때만 활성.
  // 공통 passages[0..N-1] 다음에 선택한 브랜치의 엔딩 passages가 이어진다.
  // mysql2 typeCast가 어떤 경로(레거시 chunk/캐시)로 우회돼 string으로 도착하는
  // 사고가 있었다(2026-04-26). parseJsonField로 한 번 더 정규화한다.
  const endings = useMemo<AlternateEnding | null>(
    () => parseJsonField<AlternateEnding>(book.alternateEnding),
    [book.alternateEnding],
  );
  const endingList: EndingPassage[] = useMemo(() => {
    if (!endings || !branch) return [];
    const list = branch === 'A' ? endings.passagesA : endings.passagesB;
    return Array.isArray(list) ? list : [];
  }, [endings, branch]);

  // 논픽션 책에서 마지막 passage 아래에 노출할 추가 정보. 픽션의 alternateEnding과
  // mutually exclusive — schema 단계에서 한쪽만 채워지지만 mysql2 string typeCast
  // 우회 사고 대비로 동일하게 parseJsonField를 거친다.
  const isNonFiction = book.genre === 'non_fiction';
  const funFacts = useMemo<FunFact[] | null>(() => {
    if (!isNonFiction) return null;
    const parsed = parseJsonField<FunFact[]>(book.funFacts);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
  }, [isNonFiction, book.funFacts]);

  const commonCount = passages.length;
  const total = commonCount + endingList.length;
  const isEndingStep = idx >= commonCount;
  const endingIdx = idx - commonCount;

  /**
   * 현재 렌더할 passage. 공통 구간은 DB Passage(id 있음), 엔딩은 EndingPassage(id 없음).
   * 아래 코드에서는 id를 쓰는 동작(TTS/이미지)은 isEndingStep으로 차단.
   */
  const currentCommon: Passage | undefined = passages[idx];
  const currentEnding: EndingPassage | undefined = isEndingStep
    ? endingList[endingIdx]
    : undefined;
  const currentTextEn = isEndingStep
    ? currentEnding?.en ?? ''
    : currentCommon?.textEn ?? '';
  const currentTextKo = isEndingStep
    ? currentEnding?.ko ?? ''
    : currentCommon?.textKo ?? '';
  const hasCurrent = isEndingStep ? !!currentEnding : !!currentCommon;

  const progress = useMemo(
    () => (total > 0 ? ((idx + 1) / total) * 100 : 0),
    [idx, total],
  );
  const isFirst = idx === 0;
  // 마지막 공통 passage에서 endings가 있고 선택 전이면 "퀴즈로 가기" 대신 "결말 고르기".
  const needsChoice = !!endings && !branch && idx === commonCount - 1;
  const isLast = branch
    ? idx >= total - 1
    : !endings && idx >= commonCount - 1;
  const currentAudio = !isEndingStep && currentCommon ? audioCache[currentCommon.id] : undefined;
  const currentScene = !isEndingStep && currentCommon ? sceneCache[currentCommon.id] : undefined;
  const levelClass = LEVEL_CLASS[book.cefr];
  // vocabulary도 동일하게 string으로 도착할 수 있어 정규화한다.
  const vocabulary = useMemo(
    () => parseJsonField<VocabularyEntry[]>(book.vocabulary),
    [book.vocabulary],
  );
  const vocabMap = useMemo(() => buildVocabMap(vocabulary), [vocabulary]);

  useEffect(() => {
    audioCacheRef.current = audioCache;
  }, [audioCache]);

  // 진행 상태 복원 (localStorage) — 마운트 1회
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      // 브랜치 먼저 복원 (idx 범위 계산에 필요)
      const savedBranch = window.localStorage.getItem(branchKey(book.id));
      if (savedBranch === 'A' || savedBranch === 'B') {
        setBranch(savedBranch);
      }
      const savedIdx = window.localStorage.getItem(progressKey(book.id));
      if (savedIdx !== null) {
        const n = Number(savedIdx);
        // 총 길이는 분기 선택 여부에 따라 가변. 공통 passage 길이로 상한 클램프.
        const maxIdx = passages.length - 1;
        if (Number.isFinite(n) && n >= 0 && n <= maxIdx) {
          setIdx(n);
        }
      }
      const savedAutoplay = window.localStorage.getItem(autoplayKey(book.id));
      if (savedAutoplay === '1') setAutoplay(true);
    } catch {
      /* storage 접근 실패 무시 */
    }
    // 최근 읽기 저장 (Bookshelf에서 상단 고정용)
    try {
      const raw = window.localStorage.getItem('recent:books');
      const list: number[] = raw ? JSON.parse(raw) : [];
      const next = [book.id, ...list.filter((v) => v !== book.id)].slice(0, 10);
      window.localStorage.setItem('recent:books', JSON.stringify(next));
    } catch {
      /* ignore */
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book.id]);

  // passage 변경 시 오디오 에러 복구 마커를 이전 id에 대해 유지할 필요 없음.
  // (새 passage에서 또 실패하면 그 id에 대해 1회 재시도 허용)
  // recoveredIdsRef는 Set이라 공간 이슈도 미미.

  // idx 변경 시 저장 + 오디오 리셋
  useEffect(() => {
    audioRef.current?.pause();
    if (audioRef.current) audioRef.current.currentTime = 0;
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(progressKey(book.id), String(idx));
      } catch {
        /* ignore */
      }
    }
  }, [idx, book.id]);

  // 배치 TTS 준비 진행률 — 서버가 POST /api/books 직후 after()로 모든 passage 오디오를
  // 순차 생성한다. Reader는 최신 DB 상태를 폴링해 다른 탭/초기 배치가 만든 경로를 반영한다.
  const totalForTts = passages.length;
  const readyCount = useMemo(
    () => passages.reduce((n, p) => (audioCache[p.id] ? n + 1 : n), 0),
    [audioCache, passages],
  );
  const allTtsReady = totalForTts === 0 || readyCount >= totalForTts;
  useEffect(() => {
    if (allTtsReady) return;
    let cancelled = false;
    const id = window.setInterval(async () => {
      try {
        const res = await apiFetch<{ passages: Passage[] }>(
          `/api/books/${book.id}`,
        );
        if (cancelled) return;
        setAudioCache((prev) => {
          let changed = false;
          const next = { ...prev };
          for (const p of res.passages) {
            if (p.audioPath && !next[p.id]) {
              next[p.id] = p.audioPath;
              changed = true;
            }
          }
          return changed ? next : prev;
        });
      } catch {
        /* 폴링 실패는 무시 — on-demand fallback이 여전히 동작 */
      }
    }, 4000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [allTtsReady, book.id]);

  // 클라이언트 백그라운드 TTS 생성기.
  // after()는 라우트 maxDuration 영향을 받을 수 있으므로, Reader가 열려 있고 미완성
  // passage가 있으면 기존 passage 단위 API를 순차 호출해 끝까지 이어서 만든다.
  useEffect(() => {
    if (allTtsReady) return;
    let cancelled = false;
    const failedThisRound = new Set<number>();

    async function runBackgroundTts() {
      while (!cancelled) {
        const nextPassage = passages.find(
          (passage) =>
            !audioCacheRef.current[passage.id] &&
            !failedThisRound.has(passage.id),
        );

        if (!nextPassage) {
          const stillMissing = passages.some(
            (passage) => !audioCacheRef.current[passage.id],
          );
          if (!stillMissing) return;
          await wait(BACKGROUND_TTS_RETRY_MS);
          failedThisRound.clear();
          continue;
        }

        try {
          const res = await apiFetch<TtsResponse>(
            `/api/tts/${nextPassage.id}`,
            { method: 'POST' },
          );
          if (cancelled) return;
          failedThisRound.delete(nextPassage.id);
          setAudioCache((prev) => {
            if (prev[nextPassage.id]) return prev;
            const next = { ...prev, [nextPassage.id]: res.audioPath };
            audioCacheRef.current = next;
            return next;
          });
        } catch (err) {
          failedThisRound.add(nextPassage.id);
          console.error(
            `[tts:background] book=${book.id} passage=${nextPassage.id} failed:`,
            err,
          );
        }

        await wait(BACKGROUND_TTS_GAP_MS);
      }
    }

    void runBackgroundTts();
    return () => {
      cancelled = true;
    };
  }, [allTtsReady, book.id, passages]);

  // 자동재생 토글 저장
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(autoplayKey(book.id), autoplay ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [autoplay, book.id]);

  // 글자 크기 복원 + 저장
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = window.localStorage.getItem(fontSizeKey);
      if (isFontSize(saved)) setFontSize(saved);
    } catch {
      /* ignore */
    }
  }, []);

  // 선택한 분기 저장
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (branch) {
        window.localStorage.setItem(branchKey(book.id), branch);
      } else {
        window.localStorage.removeItem(branchKey(book.id));
      }
    } catch {
      /* ignore */
    }
  }, [branch, book.id]);

  /**
   * 서버 진도 로그 세션 확보.
   *  - localStorage에 진행 중 log id가 있으면 재사용
   *  - 없으면 POST /api/logs 로 새 세션 생성 후 id 저장
   *  - 네트워크 실패해도 Reader UX에는 영향 없음(진도 저장만 누락)
   */
  useEffect(() => {
    if (!profileId) return;
    let cancelled = false;
    const key = logKey(profileId, book.id);
    try {
      const cached = window.localStorage.getItem(key);
      if (cached) {
        const n = Number(cached);
        if (Number.isFinite(n)) {
          setLogId(n);
          return;
        }
      }
    } catch {
      /* ignore */
    }
    apiFetch<{ log: { id: number } }>('/api/logs', {
      method: 'POST',
      body: JSON.stringify({ profileId, bookId: book.id }),
    })
      .then((res) => {
        if (cancelled) return;
        setLogId(res.log.id);
        try {
          window.localStorage.setItem(key, String(res.log.id));
        } catch {
          /* ignore */
        }
      })
      .catch(() => void 0);
    return () => {
      cancelled = true;
    };
  }, [profileId, book.id]);

  // 진도 업데이트.
  //  - idx 변경 후 짧은 debounce(200ms)로 서버 PATCH → "읽은 만큼" 빠르게 반영
  //  - Reader를 떠날 때(뒤로가기/라우트 전환) 아직 안 날아간 PATCH가 있으면 cleanup에서
  //    `fetch keepalive: true`로 한 번 더 fire — 책장 진도 갱신 누락 방지.
  //
  // latestRatioRef는 최신 ratio를 컴포넌트 수명 내내 보관해 unmount 시 참조한다.
  const latestRatioRef = useRef(0);
  const ratioDirtyRef = useRef(false);
  useEffect(() => {
    if (!logId) return;
    const ratio = isEndingStep
      ? 1
      : commonCount > 0
        ? Math.min(1, (idx + 1) / commonCount)
        : 0;
    latestRatioRef.current = ratio;
    ratioDirtyRef.current = true;
    const t = window.setTimeout(() => {
      apiFetch('/api/logs', {
        method: 'PATCH',
        body: JSON.stringify({ id: logId, progressRatio: ratio }),
      })
        .then(() => {
          ratioDirtyRef.current = false;
        })
        .catch(() => void 0);
    }, 200);
    return () => window.clearTimeout(t);
  }, [logId, idx, commonCount, isEndingStep]);

  // 뒤로가기 등 unmount 시 — 아직 전송 안 된 PATCH가 있으면 keepalive로 한 번 더.
  useEffect(() => {
    return () => {
      if (!logId || !ratioDirtyRef.current) return;
      try {
        fetch('/api/logs', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            id: logId,
            progressRatio: latestRatioRef.current,
          }),
          keepalive: true,
        }).catch(() => void 0);
      } catch {
        /* unmount race — 무시 */
      }
    };
  }, [logId]);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(fontSizeKey, fontSize);
    } catch {
      /* ignore */
    }
  }, [fontSize]);

  /**
   * TTS 생성 호출. 엔딩 passage(id 없음)는 대상 아님.
   * force=true 시 캐시된 currentAudio가 있어도 강제로 서버 POST를 실행.
   * 파일 404로부터 자동 복구할 때 사용.
   */
  const requestTts = useCallback(
    async (force: boolean) => {
      if (!currentCommon || isEndingStep) return;
      if (!force && currentAudio) {
        // 다시 듣기: 이미 끝까지 재생된 audio라 currentTime이 종료 위치에 있다.
        // 0으로 리셋해 "처음부터 다시" 동작이 명확하도록 한다.
        // play() promise가 reject되면(readyState=0, ended 잔여 상태, 혹은
        // 이전 abort 때문에 src가 detach된 상태) load() 후 다시 시도하고,
        // 그래도 실패하면 force=true로 서버 재호출까지 자동 escalate.
        const el = audioRef.current;
        if (el) {
          try { el.currentTime = 0; } catch { /* readyState=0이면 무시 */ }
          el.play().catch(() => {
            try { el.load(); } catch { /* ignore */ }
            try { el.currentTime = 0; } catch { /* ignore */ }
            el.play().catch(() => {
              // 두 번째 play()도 실패 — 서버 재호출로 escalate.
              void requestTts(true);
            });
          });
        }
        return;
      }
      setLoadingAudio(true);
      try {
        // force=true(다시듣기/자동복구)는 ?force=1로 서버에 명시 — 멱등 캐시를
        // 우회해 wav를 재생성한다. 미부착 시 깨진 wav가 무한 캐시되어 다시듣기가
        // silently 무동작이 된다.
        const url = force
          ? `/api/tts/${currentCommon.id}?force=1`
          : `/api/tts/${currentCommon.id}`;
        const res = await apiFetch<TtsResponse>(url, { method: 'POST' });
        // force 재생성 시 wav 파일명은 동일(passage-<id>.wav)하므로 브라우저 HTTP
        // 캐시에 묶여 새 wav가 로드되지 않을 수 있다. cache-buster 쿼리로 audio
        // src를 강제로 새 URL로 만들어 <audio>가 다시 fetch하게 한다.
        const cachedPath = force
          ? `${res.audioPath}?v=${Date.now()}`
          : res.audioPath;
        setAudioCache((prev) => ({
          ...prev,
          [currentCommon.id]: cachedPath,
        }));
        setTimeout(() => {
          audioRef.current?.play().catch(() => void 0);
        }, 50);
      } catch (err) {
        console.error(
          `[reader:tts] requestTts_fail passage=${currentCommon.id} force=${force} err=`,
          err,
        );
        toast.error(`낭독 준비 실패: ${(err as Error).message}`);
      } finally {
        setLoadingAudio(false);
      }
    },
    [currentCommon, isEndingStep, currentAudio],
  );

  const handlePlay = useCallback(() => requestTts(false), [requestTts]);

  /**
   * DB에 audio_path가 있지만 실제 wav가 아직 디스크에 없거나 일시적 네트워크
   * 실패로 <audio>가 에러를 뱉을 때의 자동 복구.
   *
   * 책 생성 직후 background 합성이 진행 중인 짧은 윈도우(수 초~십수 초)를
   * 흡수하기 위해 1회 즉시 → 2s → 5s 백오프로 최대 3회까지 force=true 재시도.
   * 마지막 시도까지 실패하면 사용자에게 toast로 알림.
   *
   * ⚠️ false-positive 차단: HTMLMediaElement의 onError는 진짜 네트워크/디코드
   * 실패뿐 아니라 src 재할당 중 abort, 자동재생 차단 등 일시적 사유로도 발화한다.
   * `audio.error.code`로 MEDIA_ERR_NETWORK(2) / MEDIA_ERR_DECODE(3) /
   * MEDIA_ERR_SRC_NOT_SUPPORTED(4)일 때만 진짜 파일 문제로 간주.
   * MEDIA_ERR_ABORTED(1)는 사용자가 다른 passage로 이동해 src가 바뀐 정상 상황.
   */
  const RECOVERY_BACKOFF_MS = [0, 2000, 5000] as const;

  const scheduleRecovery = useCallback(
    (id: number) => {
      const attempts = recoveryAttemptsRef.current.get(id) ?? 0;
      if (attempts >= RECOVERY_BACKOFF_MS.length) {
        toast.error('낭독 파일을 만들 수 없어요. 잠시 후 다시 시도해 주세요.');
        return;
      }
      recoveryAttemptsRef.current.set(id, attempts + 1);
      const delay = RECOVERY_BACKOFF_MS[attempts];
      // 첫 시도(0ms)에만 안내 toast — 백오프 재시도는 조용히.
      if (attempts === 0) toast.info('낭독 파일을 다시 만들고 있어요…');
      setAudioCache((prev) => {
        if (!(id in prev)) return prev;
        const next = { ...prev };
        delete next[id];
        return next;
      });
      const prevTimer = recoveryTimersRef.current.get(id);
      if (prevTimer) window.clearTimeout(prevTimer);
      const timer = window.setTimeout(() => {
        recoveryTimersRef.current.delete(id);
        // 사용자가 다른 passage로 이동했으면 재시도 의미 없음.
        if (currentCommon?.id !== id) return;
        void requestTts(true);
      }, delay);
      recoveryTimersRef.current.set(id, timer);
    },
    [currentCommon, requestTts],
  );

  const handleAudioError = useCallback(
    (event: React.SyntheticEvent<HTMLAudioElement>) => {
      if (!currentCommon || isEndingStep) return;
      const audio = event.currentTarget;
      const mediaError = audio.error;
      // 1) error 객체 자체가 없거나 ABORTED면 false-positive — 무시.
      if (!mediaError || mediaError.code === 1) {
        console.log(
          `[reader:audio] error_ignored passage=${currentCommon.id} code=${mediaError?.code ?? 'null'} reason=aborted_or_null`,
        );
        return;
      }
      // 2) src가 빈 문자열/현재 페이지 URL로 잡힌 경우(Next 18 quirk) 무시.
      if (!audio.currentSrc || audio.currentSrc === window.location.href) {
        console.log(
          `[reader:audio] error_ignored passage=${currentCommon.id} reason=empty_or_self_src src="${audio.currentSrc}"`,
        );
        return;
      }
      console.error(
        `[reader:audio] error passage=${currentCommon.id} code=${mediaError.code} msg="${mediaError.message}" src="${audio.currentSrc}" net=${audio.networkState} ready=${audio.readyState}`,
      );
      scheduleRecovery(currentCommon.id);
    },
    [currentCommon, isEndingStep, scheduleRecovery],
  );

  // 언마운트 시 예약된 복구 타이머 정리 — 메모리 누수/유령 toast 방지.
  useEffect(() => {
    const timers = recoveryTimersRef.current;
    return () => {
      for (const t of timers.values()) window.clearTimeout(t);
      timers.clear();
    };
  }, []);

  const go = useCallback(
    (delta: number) => {
      // 마지막 공통 passage에서 "다음"을 눌렀고, 분기가 존재하며 아직 선택 전이면
      // 이동 대신 결말 선택 Dialog를 연다.
      if (
        delta > 0 &&
        endings &&
        !branch &&
        idx === commonCount - 1
      ) {
        setChoiceOpen(true);
        return;
      }
      setIdx((i) => {
        const maxIdx = Math.max(0, total - 1);
        const next = Math.max(0, Math.min(maxIdx, i + delta));
        if (next !== i) setSlideDir(delta > 0 ? 'next' : 'prev');
        return next;
      });
      setShowKo(false);
    },
    [branch, commonCount, endings, idx, total],
  );

  /** A/B 선택 시 해당 브랜치의 첫 엔딩 passage로 점프. */
  const pickBranch = useCallback(
    (b: Branch) => {
      // 분기 데이터에 해당 결말 passage가 누락된 비정상 레코드 방어.
      // 빈 배열로 진입하면 isEndingStep=true이지만 currentEnding=undefined가 되어
      // 컴포넌트 전체가 EmptyState로 빠지면서 헤더까지 사라진다.
      const list = b === 'A' ? endings?.passagesA : endings?.passagesB;
      if (!list || list.length === 0) {
        toast.error('이 결말 데이터를 불러오지 못했어요. 새로고침 후 다시 시도해 주세요.');
        setChoiceOpen(false);
        return;
      }
      setBranch(b);
      setChoiceOpen(false);
      setSlideDir('next');
      setIdx(commonCount);
      setShowKo(false);
    },
    [commonCount, endings],
  );

  /** 다른 결말을 다시 보려면 branch 해제 + 마지막 공통으로 복귀. */
  const resetBranch = useCallback(() => {
    setBranch(null);
    setSlideDir('prev');
    setIdx(Math.max(0, commonCount - 1));
    setShowKo(false);
  }, [commonCount]);

  // 자동재생: 오디오 종료 → 다음 passage + 자동 재생
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    function onEnded() {
      if (!autoplay) return;
      if (idx < total - 1) {
        go(1);
      }
    }
    el.addEventListener('ended', onEnded);
    return () => el.removeEventListener('ended', onEnded);
  }, [autoplay, idx, total, go]);

  // 자동재생 ON + 공통 passage 변경 + 오디오 없을 때: 선제 로드 & 재생.
  // 엔딩 passage는 TTS가 없어 자동재생 대상에서 제외.
  useEffect(() => {
    if (!autoplay || !currentCommon || isEndingStep) return;
    if (currentAudio) {
      audioRef.current?.play().catch(() => void 0);
      return;
    }
    void handlePlay();
  }, [autoplay, idx, currentCommon, isEndingStep, currentAudio, handlePlay]);

  // 키보드 네비게이션
  const bindings = useMemo(
    () => ({
      ArrowLeft: () => go(-1),
      ArrowRight: () => go(1),
      ' ': () => {
        // Space: 재생/일시정지
        const el = audioRef.current;
        if (!el) {
          void handlePlay();
          return;
        }
        if (el.paused) {
          if (!currentAudio) void handlePlay();
          else el.play().catch(() => void 0);
        } else {
          el.pause();
        }
      },
      k: () => setShowKo((v) => !v),
      K: () => setShowKo((v) => !v),
    }),
    [go, handlePlay, currentAudio],
  );
  useKeyboardNav(bindings);

  // hasCurrent=false라도 헤더(책 제목/돌아가기/폰트 컨트롤)는 살려야 한다.
  // 이전엔 컴포넌트 전체를 EmptyState로 대체해 헤더까지 사라졌다 — 분기 결말 데이터가
  // 비정상일 때 사용자가 책장으로 돌아갈 길을 잃는 UX 사고로 이어진다.

  const slideClass =
    slideDir === 'next'
      ? 'animate-slide-in-right'
      : slideDir === 'prev'
        ? 'animate-slide-in-left'
        : 'animate-pop-in';

  return (
    <div className="space-y-6 animate-fade-up">
      {/* 헤더 */}
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          {/* 랜딩 스토리북 타이틀과 톤 통일: font-heading + font-extrabold + 타이트한 letter-spacing. */}
          <h1 className="font-heading text-2xl font-extrabold tracking-tight text-balance sm:text-3xl">
            {book.title}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            {isNonFiction ? (
              <span
                className="inline-flex items-center gap-1 rounded-full bg-[color:var(--secondary)] px-2.5 py-1 font-semibold text-[color:var(--secondary-foreground)]"
                title="실제 사실로 만들어진 지식책이에요"
              >
                <span aria-hidden>📚</span>
                지식책
              </span>
            ) : null}
            <span className={`${levelClass} inline-flex items-center rounded-full px-2.5 py-1 font-semibold`}>
              {book.cefr}
              <span className="level-dots" data-level={book.cefr} aria-hidden />
            </span>
            <span className="rounded-full bg-muted px-2.5 py-1 font-medium text-muted-foreground">
              {book.age}세
            </span>
            {book.topic ? (
              <span className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground">
                {book.topic}
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <FontSizePicker value={fontSize} onChange={setFontSize} />
          <ReaderSettingsButton
            fontSize={fontSize}
            onFontSizeChange={setFontSize}
            autoplay={autoplay}
            onAutoplayToggle={() => setAutoplay((v) => !v)}
            isEndingStep={isEndingStep}
          />
          <Link
            href={APP_HOME}
            className={buttonVariants({
              variant: 'outline',
              size: 'sm',
              className: 'rounded-full press-scale',
            })}
          >
            ← 책장
          </Link>
        </div>
      </header>

      {/* 진행도 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
          <span aria-live="polite">
            {idx + 1} <span className="text-foreground/40">/</span> {total} 문장
            {isEndingStep && branch ? (
              <span className="ml-2 rounded-full border border-border/70 bg-card px-2 py-0.5 text-[10px] font-semibold text-foreground/80">
                결말 {branch}
              </span>
            ) : null}
          </span>
          <span className="flex items-center gap-2 tabular-nums text-primary">
            {!allTtsReady ? (
              <span
                className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                aria-live="polite"
                title="동화의 모든 문장을 미리 낭독 오디오로 만드는 중이에요"
              >
                🎙️ 낭독 준비 {readyCount}/{totalForTts}
              </span>
            ) : null}
            <span>{Math.round(progress)}%</span>
          </span>
        </div>
        <Progress value={progress} className="h-2.5 rounded-full" />
      </div>

      {/* 문장 카드 — hasCurrent=false면 EmptyState로 폴백(헤더는 위에서 이미 살려둠) */}
      {!hasCurrent ? (
        <EmptyState text="이 결말 데이터가 비어 있어요. 책장으로 돌아가 다시 시도해 주세요." />
      ) : (
      <article
        key={idx}
        className={`${slideClass} relative overflow-hidden rounded-3xl border-2 border-border bg-card p-6 sticker-shadow-lg sm:p-10`}
      >
        <div className="relative">
          {currentScene ? (
            <div className="mb-5 overflow-hidden rounded-2xl border-2 border-border/60 sticker-shadow animate-pop-in">
              <Image
                src={currentScene}
                alt={currentTextEn}
                width={1024}
                height={768}
                className="aspect-[4/3] w-full object-cover"
                priority={idx === 0}
                sizes="(max-width: 640px) 100vw, 640px"
              />
            </div>
          ) : null}

          <span className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
            {isEndingStep && branch
              ? `Ending ${branch} · ${endingIdx + 1}`
              : `Passage ${idx + 1}`}
          </span>
          <p
            className={`whitespace-pre-wrap font-semibold text-foreground ${PASSAGE_FONT_CLASS[fontSize]}`}
          >
            <PassageText text={currentTextEn} vocabMap={vocabMap} />
          </p>
          {vocabMap.size > 0 ? (
            <p className="mt-2 text-[11px] text-muted-foreground">
              💡 밑줄 친 단어를 눌러 뜻을 볼 수 있어요
            </p>
          ) : null}

          <div
            className={`grid transition-all duration-300 ease-out ${
              showKo
                ? 'mt-5 grid-rows-[1fr] opacity-100'
                : 'grid-rows-[0fr] opacity-0'
            }`}
          >
            <div className="overflow-hidden">
              <p className="rounded-2xl bg-[color:var(--secondary)]/60 p-4 text-base leading-relaxed text-[color:var(--secondary-foreground)]">
                {currentTextKo}
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => setShowKo((v) => !v)}
              size="sm"
              className="rounded-full press-scale"
              aria-pressed={showKo}
            >
              {showKo ? '한글 해석 숨기기' : '한글 해석 보기'}
              <kbd className="ml-1.5 hidden rounded bg-muted/70 px-1.5 text-[10px] font-mono sm:inline">K</kbd>
            </Button>
            {/* TTS·자동재생은 DB 패시지에서만. 엔딩은 텍스트/한글해석만. */}
            {!isEndingStep ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePlay}
                  disabled={loadingAudio}
                  className="rounded-full press-scale"
                >
                  {loadingAudio
                    ? '준비 중…'
                    : currentCommon && playedPassages.has(currentCommon.id)
                      ? '다시 듣기'
                      : '낭독 듣기'}
                  <kbd className="ml-1.5 hidden rounded bg-muted/70 px-1.5 text-[10px] font-mono sm:inline">Space</kbd>
                </Button>
                <Button
                  variant={autoplay ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAutoplay((v) => !v)}
                  aria-pressed={autoplay}
                  className="rounded-full press-scale"
                  title="한 문장 낭독이 끝나면 자동으로 다음 문장으로 넘어가요"
                >
                  {autoplay ? '자동재생 ON' : '자동재생 OFF'}
                </Button>
              </>
            ) : null}
            {isEndingStep && branch ? (
              <Button
                variant="outline"
                size="sm"
                onClick={resetBranch}
                className="rounded-full press-scale"
              >
                다른 결말 보기
              </Button>
            ) : null}
          </div>
          {!isEndingStep && currentAudio ? (
            <audio
              ref={audioRef}
              src={currentAudio}
              controls
              preload="auto"
              className="mt-4 w-full rounded-full"
              onError={handleAudioError}
              onPlay={() => {
                // 수동 클릭·자동재생·force 재시도 모든 경로의 단일 캡처 지점.
                if (!currentCommon) return;
                const id = currentCommon.id;
                setPlayedPassages((prev) => {
                  if (prev.has(id)) return prev;
                  const next = new Set(prev);
                  next.add(id);
                  return next;
                });
              }}
            />
          ) : null}

        </div>
      </article>
      )}

      {/* 논픽션 funFacts — 마지막 passage에서만 노출. 카드 아래에 자연스럽게 이어진다. */}
      {isLast && funFacts ? (
        <section
          aria-labelledby="fun-facts-heading"
          className="rounded-3xl border-2 border-border bg-card p-6 sticker-shadow-lg sm:p-8"
        >
          <h2
            id="fun-facts-heading"
            className="flex items-center gap-2 font-heading text-xl font-extrabold tracking-tight"
          >
            <span aria-hidden>📚</span>
            더 알기
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            오늘 읽은 내용에서 한 걸음 더 깊이 들어가 볼까요?
          </p>
          <ul className="mt-4 grid gap-3">
            {funFacts.map((f, i) => (
              <li
                key={i}
                className="rounded-2xl border border-border/60 bg-muted/30 p-4"
              >
                <p className="text-sm font-bold tracking-tight">
                  {f.title}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {f.body}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* 네비게이션 */}
      <div className="flex items-center justify-between gap-3">
        <Button
          variant="outline"
          onClick={() => go(-1)}
          disabled={isFirst}
          className="rounded-full press-scale"
        >
          ← 이전
        </Button>

        {isLast ? (
          <Link
            href={`/quiz/${book.id}`}
            className={buttonVariants({
              variant: 'complete',
              size: 'lg',
              className: 'rounded-full press-scale',
            })}
          >
            다 읽었어요! 퀴즈 풀러 가기 →
          </Link>
        ) : needsChoice ? (
          <Button
            onClick={() => setChoiceOpen(true)}
            className="rounded-full press-scale"
          >
            결말 고르기 →
          </Button>
        ) : (
          <Button
            onClick={() => go(1)}
            className="rounded-full press-scale"
          >
            다음 →
          </Button>
        )}
      </div>

      {/* 엔딩 분기 선택 Dialog */}
      {endings ? (
        <EndingChoiceDialog
          open={choiceOpen}
          onOpenChange={setChoiceOpen}
          labelA={endings.labelA || '결말 A'}
          labelB={endings.labelB || '결말 B'}
          onPick={pickBranch}
        />
      ) : null}
    </div>
  );
}

/**
 * 엔딩 분기 선택 Dialog — 2개 라벨 카드 중 하나를 고르면 해당 브랜치의 엔딩 passages로 이동.
 */
function EndingChoiceDialog({
  open,
  onOpenChange,
  labelA,
  labelB,
  onPick,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  labelA: string;
  labelB: string;
  onPick: (b: Branch) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>결말을 골라봐</DialogTitle>
          <DialogDescription>
            이야기의 마지막이 둘 중 어느 길로 흘러갈까? 언제든 돌아와 다른 결말을 볼 수 있어.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-1 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <ChoiceCard letter="A" label={labelA} onClick={() => onPick('A')} />
          <ChoiceCard letter="B" label={labelB} onClick={() => onPick('B')} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ChoiceCard({
  letter,
  label,
  onClick,
}: {
  letter: Branch;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col items-start gap-2 rounded-2xl border-2 border-border bg-card p-5 text-left transition press-scale sticker-shadow hover:border-primary/50 hover:bg-muted/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
        {letter}
      </span>
      <span className="text-lg font-bold leading-snug">{label}</span>
      <span className="text-xs text-muted-foreground group-hover:text-foreground">
        이 결말로 가기 →
      </span>
    </button>
  );
}

/**
 * 본문 글자 크기 3단계 선택. 접근성/아동 저시력 대응.
 * 값은 Reader state + localStorage('reader:font-size')에만 영향, 외부 페이지엔 영향 없음.
 */
function FontSizePicker({
  value,
  onChange,
}: {
  value: FontSize;
  onChange: (v: FontSize) => void;
}) {
  const items: Array<{ v: FontSize; label: string; sample: string }> = [
    { v: 'sm', label: '작게', sample: 'A' },
    { v: 'md', label: '기본', sample: 'A' },
    { v: 'lg', label: '크게', sample: 'A' },
  ];
  const sampleSize: Record<FontSize, string> = {
    sm: 'text-[11px]',
    md: 'text-sm',
    lg: 'text-base',
  };
  return (
    <div
      role="radiogroup"
      aria-label="본문 글자 크기"
      className="hidden items-center gap-0.5 rounded-full border border-border/60 bg-card p-0.5 sm:inline-flex"
    >
      {items.map((it) => {
        const active = value === it.v;
        return (
          <button
            key={it.v}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={it.label}
            title={it.label}
            onClick={() => onChange(it.v)}
            className={`flex h-7 w-7 items-center justify-center rounded-full font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              active
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            } ${sampleSize[it.v]}`}
          >
            {it.sample}
          </button>
        );
      })}
    </div>
  );
}

/**
 * 모바일(<640px) 전용 Reader 설정 버튼.
 * 헤더의 FontSizePicker는 데스크탑에서만 노출되므로, 모바일에서는 톱니 아이콘 버튼으로
 * Popover를 열어 폰트 크기 + 자동재생 토글을 한 곳에서 다룬다.
 * 본문 카드 안의 자동재생 버튼은 컨텐츠 흐름에 직접 묶여 있으므로 그대로 유지.
 */
function ReaderSettingsButton({
  fontSize,
  onFontSizeChange,
  autoplay,
  onAutoplayToggle,
  isEndingStep,
}: {
  fontSize: FontSize;
  onFontSizeChange: (v: FontSize) => void;
  autoplay: boolean;
  onAutoplayToggle: () => void;
  isEndingStep: boolean;
}) {
  const items: Array<{ v: FontSize; label: string; sample: string }> = [
    { v: 'sm', label: '작게', sample: 'A' },
    { v: 'md', label: '기본', sample: 'A' },
    { v: 'lg', label: '크게', sample: 'A' },
  ];
  return (
    <Popover.Root>
      <Popover.Trigger
        aria-label="읽기 설정"
        className="press-scale grid h-9 w-9 place-items-center rounded-full border-2 border-border bg-background text-foreground/80 transition hover:bg-muted hover:text-foreground sm:hidden"
      >
        <Settings2 aria-hidden className="size-4" strokeWidth={2.4} />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={8} align="end" alignOffset={-4}>
          <Popover.Popup className="z-50 w-[260px] rounded-2xl border border-border bg-popover p-3 text-sm text-popover-foreground shadow-xl ring-1 ring-foreground/5 outline-none animate-fade-up">
            <div className="flex flex-col gap-3">
              <div>
                <p className="mb-1.5 px-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  글자 크기
                </p>
                <div
                  role="radiogroup"
                  aria-label="본문 글자 크기"
                  className="flex items-center gap-1 rounded-full border border-border/60 bg-card p-0.5"
                >
                  {items.map((it) => {
                    const active = fontSize === it.v;
                    return (
                      <button
                        key={it.v}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => onFontSizeChange(it.v)}
                        className={`flex min-h-[44px] flex-1 items-center justify-center rounded-full px-2 font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                          active
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {it.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              {!isEndingStep ? (
                <div>
                  <p className="mb-1.5 px-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    자동재생
                  </p>
                  <button
                    type="button"
                    onClick={onAutoplayToggle}
                    aria-pressed={autoplay}
                    className={`flex min-h-[44px] w-full items-center justify-between rounded-xl border-2 px-3 py-2 text-left font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      autoplay
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-card text-foreground/70 hover:bg-muted'
                    }`}
                  >
                    <span>한 문장 끝나면 다음 문장으로</span>
                    <span
                      aria-hidden
                      className={`ml-2 inline-flex h-5 w-9 shrink-0 items-center rounded-full border-2 transition ${
                        autoplay ? 'border-primary bg-primary' : 'border-border bg-muted'
                      }`}
                    >
                      <span
                        className={`inline-block size-3.5 rounded-full bg-background shadow-sm transition ${
                          autoplay ? 'translate-x-4' : 'translate-x-0.5'
                        }`}
                      />
                    </span>
                  </button>
                </div>
              ) : null}
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
