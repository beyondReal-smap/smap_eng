'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button, buttonVariants } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { EmptyState } from '@/components/ui/empty-state';
import { apiFetch } from '@/lib/api-client';
import { parseJsonField } from '@/lib/json-field';
import { APP_HOME } from '@/lib/paths';
import type {
  AlternateEnding,
  Book,
  EndingPassage,
  FunFact,
  Mission,
  Passage,
  VocabularyEntry,
} from '@/lib/db/schema';
import { useKeyboardNav } from '@/lib/hooks/use-keyboard-nav';
import { useProfileStore } from '@/stores/profile';
import {
  autoplayKey,
  BACKGROUND_TTS_GAP_MS,
  BACKGROUND_TTS_RETRY_MS,
  branchKey,
  buildVocabMap,
  LEVEL_CLASS,
  missionKey,
  normalize,
  PASSAGE_FONT_CLASS,
  progressKey,
  wait,
  type Branch,
  type SlideDir,
  type TtsResponse,
} from './reader/shared';
import { PassageText } from './reader/passage-text';
import { PassageMission } from './reader/passage-mission';
import { EndingChoiceDialog } from './reader/ending-choice-dialog';
import { FontSizePicker, ReaderSettingsButton } from './reader/reader-settings';
import { useReadingLog } from './reader/use-reading-log';
import { useFontSize } from './reader/use-font-size';

interface Props {
  book: Book;
  passages: Passage[];
}

export function Reader({ book, passages }: Props) {
  const profileId = useProfileStore((s) => s.currentProfileId);
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
  const [fontSize, setFontSize] = useFontSize();
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
  // 결말 분기 passages의 사전 합성된 TTS 경로(books.endingAudioPathsA/B에 저장).
  // 책 생성 직후 batch가 만들어 두므로 Reader 진입 시 이미 채워져 있는 게 일반적.
  // 레거시 책(0011 마이그레이션 이전 생성)은 null이라 결말에 음성이 안 붙는다.
  const endingAudioPathsA = useMemo(
    () => parseJsonField<string[]>(book.endingAudioPathsA),
    [book.endingAudioPathsA],
  );
  const endingAudioPathsB = useMemo(
    () => parseJsonField<string[]>(book.endingAudioPathsB),
    [book.endingAudioPathsB],
  );
  const currentEndingAudio = useMemo(() => {
    if (!isEndingStep || !branch) return undefined;
    const list = branch === 'A' ? endingAudioPathsA : endingAudioPathsB;
    if (!Array.isArray(list)) return undefined;
    const path = list[endingIdx];
    return path && path.length > 0 ? path : undefined;
  }, [isEndingStep, branch, endingIdx, endingAudioPathsA, endingAudioPathsB]);

  const currentAudio = isEndingStep
    ? currentEndingAudio
    : currentCommon
      ? audioCache[currentCommon.id]
      : undefined;
  const currentScene = !isEndingStep && currentCommon ? sceneCache[currentCommon.id] : undefined;
  const levelClass = LEVEL_CLASS[book.cefr];
  // vocabulary도 동일하게 string으로 도착할 수 있어 정규화한다.
  const vocabulary = useMemo(
    () => parseJsonField<VocabularyEntry[]>(book.vocabulary),
    [book.vocabulary],
  );
  const vocabMap = useMemo(() => buildVocabMap(vocabulary), [vocabulary]);

  // 책 속 미션 — passageIndex → Mission 맵. 저장 시 서버가 범위/단어 존재를 이미
  // 검증했지만(fail-soft), 레거시/수동 편집 대비 워드 헌트는 vocabMap에 있는
  // 단어일 때만 유효로 간주한다(탭 대상이 밑줄 단어뿐이므로).
  const missionByIdx = useMemo(() => {
    const parsed = parseJsonField<Mission[]>(book.missions);
    const map = new Map<number, Mission>();
    if (!Array.isArray(parsed)) return map;
    for (const m of parsed) {
      if (typeof m?.passageIndex !== 'number') continue;
      const wordHunt =
        m.wordHunt && vocabMap.has(normalize(m.wordHunt.targetWord))
          ? m.wordHunt
          : undefined;
      if (!wordHunt && !m.check) continue;
      map.set(m.passageIndex, { ...m, wordHunt });
    }
    return map;
  }, [book.missions, vocabMap]);
  const currentMission = !isEndingStep ? missionByIdx.get(idx) : undefined;
  // 완료한 미션의 passageIndex 집합 — localStorage 복원은 마운트 effect에서.
  const [missionsDone, setMissionsDone] = useState<ReadonlySet<number>>(
    () => new Set(),
  );
  const completeMission = useCallback(
    (passageIndex: number) => {
      setMissionsDone((prev) => {
        if (prev.has(passageIndex)) return prev;
        const next = new Set(prev);
        next.add(passageIndex);
        try {
          window.localStorage.setItem(
            missionKey(book.id),
            JSON.stringify(Array.from(next)),
          );
        } catch {
          /* storage 접근 실패 무시 — 세션 내 상태로만 유지 */
        }
        return next;
      });
    },
    [book.id],
  );
  // 워드 헌트 판정 — 현재 passage에 미완료 워드 헌트가 있고, 탭한 단어가
  // targetWord와 일치하면 완료. 그 외의 단어 탭은 기존 뜻 보기 동작 그대로.
  const handleWordTap = useCallback(
    (word: string) => {
      const hunt = currentMission?.wordHunt;
      if (!hunt || missionsDone.has(idx)) return;
      if (normalize(word) === normalize(hunt.targetWord)) completeMission(idx);
    },
    [currentMission, missionsDone, idx, completeMission],
  );

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
      // 완료한 미션 복원 — 숫자 배열(JSON)만 신뢰.
      const savedMissions = window.localStorage.getItem(missionKey(book.id));
      if (savedMissions) {
        const arr = JSON.parse(savedMissions) as unknown;
        if (Array.isArray(arr)) {
          setMissionsDone(
            new Set(arr.filter((n): n is number => typeof n === 'number')),
          );
        }
      }
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

  // 퀴즈 prefetch — 마지막 페이지에 도달하면 백그라운드로 퀴즈 생성을 미리
  // 시작해 "퀴즈 풀러 가기" 진입 시 LLM 대기(수 초~수십 초)를 제거한다.
  // POST /api/books/[id]/quiz는 멱등 + 서버 in-flight 병합이라 퀴즈 화면의
  // 본 호출과 겹쳐도 LLM은 한 번만 실행된다. 실패는 무시 — 퀴즈 화면이 재시도.
  const quizPrefetchedRef = useRef(false);
  useEffect(() => {
    if (!isLast || quizPrefetchedRef.current) return;
    quizPrefetchedRef.current = true;
    void apiFetch(`/api/books/${book.id}/quiz`, { method: 'POST' }).catch(
      () => {
        quizPrefetchedRef.current = false;
      },
    );
  }, [isLast, book.id]);

  // 자동재생 토글 저장
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(autoplayKey(book.id), autoplay ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [autoplay, book.id]);

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

  // 서버 진도 로그 세션 확보 + idx 변경 시 debounce PATCH + 이탈 시 keepalive 보정.
  useReadingLog({
    profileId,
    bookId: book.id,
    idx,
    commonCount,
    isEndingStep,
  });

  /**
   * TTS 생성 호출. 엔딩 passage는 사전 합성 경로만 사용하므로 서버 재호출 경로가 없다.
   * - 엔딩 + audio 있음: <audio>를 처음부터 재생.
   * - 엔딩 + audio 없음(레거시 책): no-op.
   * - 공통 passage: 기존과 동일 (force=true 시 /api/tts/[id]?force=1 호출).
   */
  const requestTts = useCallback(
    async (force: boolean) => {
      if (isEndingStep) {
        // 엔딩은 서버 재합성 라우트가 없다 — 캐시된 audioPath로 그대로 재생만.
        if (!currentEndingAudio) return;
        const el = audioRef.current;
        if (!el) return;
        try { el.currentTime = 0; } catch { /* readyState=0이면 무시 */ }
        el.play().catch(() => {
          try { el.load(); } catch { /* ignore */ }
          el.play().catch(() => void 0);
        });
        return;
      }
      if (!currentCommon) return;
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
        // force 재생성 시 파일명은 동일(passage-<id>.mp3)하므로 브라우저 HTTP
        // 캐시에 묶여 새 오디오가 로드되지 않을 수 있다. cache-buster 쿼리로 audio
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
    [currentCommon, isEndingStep, currentAudio, currentEndingAudio],
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
              {/* 장면 이미지는 쿠키 인증 동적 라우트(/images/*)라 optimizer가
                  쿠키를 전달하지 못해 404가 된다 → 원본 직접 서빙. */}
              <Image
                src={currentScene}
                alt={currentTextEn}
                width={1024}
                height={768}
                unoptimized
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
            <PassageText
              text={currentTextEn}
              vocabMap={vocabMap}
              onWordTap={handleWordTap}
            />
          </p>
          {vocabMap.size > 0 ? (
            <p className="mt-2 text-[11px] text-muted-foreground">
              💡 밑줄 친 단어를 눌러 뜻을 볼 수 있어요
            </p>
          ) : null}

          {/* 책 속 미션 — 이 passage에 미션이 있을 때만. 진행을 막지 않는 재미 요소. */}
          {currentMission ? (
            <PassageMission
              mission={currentMission}
              done={missionsDone.has(idx)}
              onComplete={() => completeMission(idx)}
            />
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
            {/* TTS — 본문 passage는 DB 기반, 엔딩은 사전 합성된 path가 있을 때만. */}
            {!isEndingStep || currentEndingAudio ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handlePlay}
                disabled={loadingAudio}
                className="rounded-full press-scale"
              >
                {loadingAudio
                  ? '준비 중…'
                  : (isEndingStep
                      ? '낭독 듣기'
                      : currentCommon && playedPassages.has(currentCommon.id)
                        ? '다시 듣기'
                        : '낭독 듣기')}
                <kbd className="ml-1.5 hidden rounded bg-muted/70 px-1.5 text-[10px] font-mono sm:inline">Space</kbd>
              </Button>
            ) : null}
            {/* 자동재생 토글은 본문에서만. 엔딩은 길이가 짧아 사용자가 직접 넘기는 편이 자연스러움. */}
            {!isEndingStep ? (
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
          {currentAudio ? (
            <audio
              ref={audioRef}
              src={currentAudio}
              controls
              preload="auto"
              className="mt-4 w-full rounded-full"
              onError={isEndingStep ? undefined : handleAudioError}
              onLoadedMetadata={(e) => {
                // 어린이 학습용 기본 속도. src가 바뀔 때마다 재적용해 일부 모바일
                // 브라우저(Safari)에서 load 후 1.0으로 reset되는 케이스를 흡수.
                e.currentTarget.playbackRate = 0.75;
              }}
              onPlay={() => {
                // 본문 passage만 playedPassages에 기록(다시듣기 라벨 토글용).
                // 엔딩은 id가 없고 짧아서 기록 대상 아님.
                if (isEndingStep || !currentCommon) return;
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
