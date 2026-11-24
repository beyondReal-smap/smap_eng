'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
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
  missionKey,
  normalize,
  PASSAGE_FONT_CLASS,
  PASSAGE_FONT_CLASS_PLAIN,
  progressKey,
  wait,
  type Branch,
  type SlideDir,
  type TtsResponse,
} from './reader/shared';
import { PassageText } from './reader/passage-text';
import { PassageMission } from './reader/passage-mission';
import { EndingChoiceDialog } from './reader/ending-choice-dialog';
import { ReaderSettingsButton } from './reader/reader-settings';
import { ReaderCoverPage } from './reader/cover-page';
import { FinishCard, ReaderControlBar, ReaderTopBar } from './reader/chrome';
import { useReadingLog } from './reader/use-reading-log';
import { useFontSize } from './reader/use-font-size';

interface Props {
  book: Book;
  passages: Passage[];
}

/** 낭독 파일 자동 복구 백오프(1회 즉시 → 2s → 5s) — scheduleRecovery 설명 참고. */
const RECOVERY_BACKOFF_MS = [0, 2000, 5000] as const;

export function Reader({ book, passages }: Props) {
  const profileId = useProfileStore((s) => s.currentProfileId);
  const [idx, setIdx] = useState(0);
  const [slideDir, setSlideDir] = useState<SlideDir>(null);
  // 한글 해석 토글 — 쪽을 넘겨도 유지(리더 세션 동안, 책을 닫으면 초기화 — 네이티브 10차).
  const [showKo, setShowKo] = useState(false);
  // 표지 쪽(0쪽) — 처음부터 열 때만. null = localStorage 진행 복원 전(표지가 잠깐 비쳤다
  // 사라지는 깜빡임을 막으려고 판정 전엔 아무것도 그리지 않는다).
  const [showCover, setShowCover] = useState<boolean | null>(null);
  // 전체 낭독이 재생 중인 쪽 — 쪽을 넘기면 렌더 시점에 자연히 무효(형광펜·멈추기 버튼용).
  const [playingIdx, setPlayingIdx] = useState<number | null>(null);
  const [autoplay, setAutoplay] = useState(false);
  const [audioCache, setAudioCache] = useState<Record<number, string>>(() => {
    const initial: Record<number, string> = {};
    for (const p of passages) {
      if (p.audioPath) initial[p.id] = p.audioPath;
    }
    return initial;
  });
  const [sceneCache] = useState<Record<number, string>>(() => {
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
  // 문장 탭 재생 — 전체 낭독을 한 번 들은 뒤, 본문 문장을 눌러 그 문장만 다시 듣는다.
  // 재생 중인 문장을 passage idx와 함께 담아, passage를 넘기면 하이라이트가 렌더
  // 시점에 자연히 무효가 되게 한다(effect에서 되돌리면 cascading render가 된다).
  const [playingSentence, setPlayingSentence] = useState<{
    passageIdx: number;
    sentence: number;
  } | null>(null);
  const sentenceAudioRef = useRef<HTMLAudioElement | null>(null);
  // 문장 텍스트 → audioPath. /api/tts/word가 텍스트 해시로 파일을 캐시하므로
  // 여기서는 서버 왕복만 줄이면 된다(세션 단위).
  const sentenceCacheRef = useRef<Map<string, string>>(new Map());
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
  // "한 번 다 읽은 다음"에만 문장 탭을 연다. 처음 보는 지문을 통으로 듣기 전에
  // 문장을 조각내 듣는 건 학습 순서상 맞지 않고, 밑줄 단어 탭과 인터랙션이 겹쳐
  // 혼란스럽다. 엔딩은 passage id가 없어 재생 이력을 추적하지 않으므로 제외.
  const sentenceTapEnabled =
    !isEndingStep && !!currentCommon && playedPassages.has(currentCommon.id);
  // 현재 passage에서 재생 중인 문장만 하이라이트 — passage를 넘기면 자동 해제.
  const activeSentence =
    playingSentence && playingSentence.passageIdx === idx
      ? playingSentence.sentence
      : null;
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

  /**
   * 문장 하나만 재생. passage 단위 오디오(passage-<id>.mp3)와 달리 문장은 DB 행이
   * 없으므로, 임의 텍스트를 해시 파일명으로 캐시하는 /api/tts/word를 재사용한다
   * (단어장에서 쓰는 것과 같은 경로 — 문장 median 51자로 200자 제한 안에 들어온다).
   *
   * 합성 입력이 passage 전체(median 141자)의 1/3로 짧아져 낭독이 더 안정적이다.
   */
  const handleSentenceTap = useCallback(
    async (index: number, sentence: string) => {
      // 전체 낭독이 재생 중이면 멈춘다 — 두 음성이 겹치면 알아듣기 어렵다.
      audioRef.current?.pause();
      sentenceAudioRef.current?.pause();
      setPlayingSentence({ passageIdx: idx, sentence: index });
      try {
        const cache = sentenceCacheRef.current;
        let src = cache.get(sentence);
        if (!src) {
          const res = await apiFetch<{ audioPath: string }>('/api/tts/word', {
            method: 'POST',
            body: JSON.stringify({ text: sentence }),
          });
          src = res.audioPath;
          cache.set(sentence, src);
        }
        // 동일 요소 재사용 — 같은 문장을 다시 눌러도 처음부터 재생.
        const el = sentenceAudioRef.current ?? new Audio();
        sentenceAudioRef.current = el;
        el.src = src;
        el.currentTime = 0;
        // passage 낭독과 같은 실효 속도(합성 0.85 × 재생 1.06 ≈ 0.9배)를 맞춘다.
        el.playbackRate = 1.06;
        el.onended = () => setPlayingSentence(null);
        await el.play();
      } catch (err) {
        // 하이라이트를 남기면 "재생 중"으로 오해되므로 즉시 해제.
        setPlayingSentence(null);
        console.error(`[reader:tts] sentence_fail idx=${index} err=`, err);
        toast.error(`문장 낭독 실패: ${(err as Error).message}`);
      }
    },
    [idx],
  );

  // passage/엔딩 전환 시 이전 문장 음성이 이어서 들리지 않게 멈춘다.
  // (하이라이트는 playingSentence.passageIdx 비교로 렌더 시점에 무효화된다)
  useEffect(() => {
    sentenceAudioRef.current?.pause();
  }, [idx]);

  useEffect(() => {
    audioCacheRef.current = audioCache;
  }, [audioCache]);

  // 진행 상태 복원 (localStorage) — 마운트 1회.
  // 읽기는 곧바로(아래 "idx 변경 시 저장" effect가 0을 덮어쓰기 전에) 하고, 상태 반영은 다음
  // 프레임에 한 번에 — effect 안 동기 setState 연쇄 렌더를 피한다(react-hooks 규칙).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let restored: {
      branch: Branch | null;
      idx: number | null;
      autoplay: boolean;
      missions: number[] | null;
      showCover: boolean;
    } = { branch: null, idx: null, autoplay: false, missions: null, showCover: true };
    try {
      // 브랜치 먼저 복원 (idx 범위 계산에 필요)
      const savedBranch = window.localStorage.getItem(branchKey(book.id));
      const branchValue: Branch | null =
        savedBranch === 'A' || savedBranch === 'B' ? savedBranch : null;
      const savedIdx = window.localStorage.getItem(progressKey(book.id));
      let idxValue: number | null = null;
      if (savedIdx !== null) {
        const n = Number(savedIdx);
        // 총 길이는 분기 선택 여부에 따라 가변. 공통 passage 길이로 상한 클램프.
        const maxIdx = passages.length - 1;
        if (Number.isFinite(n) && n >= 0 && n <= maxIdx) idxValue = n;
      }
      const savedAutoplay = window.localStorage.getItem(autoplayKey(book.id));
      // 완료한 미션 복원 — 숫자 배열(JSON)만 신뢰.
      const savedMissions = window.localStorage.getItem(missionKey(book.id));
      const arr = savedMissions ? (JSON.parse(savedMissions) as unknown) : null;
      restored = {
        branch: branchValue,
        idx: idxValue,
        autoplay: savedAutoplay === '1',
        missions: Array.isArray(arr)
          ? arr.filter((n): n is number => typeof n === 'number')
          : null,
        // 이어 읽기(1쪽 이후에서 다시 연 책·결말을 고른 책)면 표지를 건너뛴다.
        showCover: !(branchValue || (idxValue !== null && idxValue > 0)),
      };
    } catch (err) {
      // storage 접근·JSON 파싱 실패 — 진행 복원 없이 표지부터.
      console.warn('[reader] progress restore failed:', err);
    }
    const frame = window.requestAnimationFrame(() => {
      if (restored.branch) setBranch(restored.branch);
      if (restored.idx !== null) setIdx(restored.idx);
      if (restored.autoplay) setAutoplay(true);
      if (restored.missions) setMissionsDone(new Set(restored.missions));
      setShowCover(restored.showCover);
    });
    // 최근 읽기 저장 (Bookshelf에서 상단 고정용)
    try {
      const raw = window.localStorage.getItem('recent:books');
      const list: number[] = raw ? JSON.parse(raw) : [];
      const next = [book.id, ...list.filter((v) => v !== book.id)].slice(0, 10);
      window.localStorage.setItem('recent:books', JSON.stringify(next));
    } catch {
      /* ignore */
    }
    return () => window.cancelAnimationFrame(frame);
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
      // 문장 탭 재생 중에 전체 낭독을 시작하면 두 음성이 겹친다 — 문장 쪽을 멈춘다.
      // (문장 탭에서 전체 낭독을 멈추는 것과 대칭)
      sentenceAudioRef.current?.pause();
      setPlayingSentence(null);
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
      const passage = currentCommon;

      /** 서버에 낭독을 요청(필요하면 재합성)하고 재생. 재생 재시도가 모두 실패하면 여기로 escalate. */
      const synthesize = async (forceFlag: boolean) => {
        setLoadingAudio(true);
        try {
          // force=true(다시듣기/자동복구)는 ?force=1로 서버에 명시 — 멱등 캐시를
          // 우회해 wav를 재생성한다. 미부착 시 깨진 wav가 무한 캐시되어 다시듣기가
          // silently 무동작이 된다.
          const url = forceFlag
            ? `/api/tts/${passage.id}?force=1`
            : `/api/tts/${passage.id}`;
          const res = await apiFetch<TtsResponse>(url, { method: 'POST' });
          // force 재생성 시 파일명은 동일(passage-<id>.mp3)하므로 브라우저 HTTP
          // 캐시에 묶여 새 오디오가 로드되지 않을 수 있다. cache-buster 쿼리로 audio
          // src를 강제로 새 URL로 만들어 <audio>가 다시 fetch하게 한다.
          const cachedPath = forceFlag
            ? `${res.audioPath}?v=${Date.now()}`
            : res.audioPath;
          setAudioCache((prev) => ({
            ...prev,
            [passage.id]: cachedPath,
          }));
          setTimeout(() => {
            audioRef.current?.play().catch(() => void 0);
          }, 50);
        } catch (err) {
          console.error(
            `[reader:tts] requestTts_fail passage=${passage.id} force=${forceFlag} err=`,
            err,
          );
          toast.error(`낭독 준비 실패: ${(err as Error).message}`);
        } finally {
          setLoadingAudio(false);
        }
      };

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
              void synthesize(true);
            });
          });
        }
        return;
      }
      await synthesize(force);
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
    },
    [commonCount, endings],
  );

  /** 다른 결말을 다시 보려면 branch 해제 + 마지막 공통으로 복귀. */
  const resetBranch = useCallback(() => {
    setBranch(null);
    setSlideDir('prev');
    setIdx(Math.max(0, commonCount - 1));
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
    // 표지 쪽에서는 자동재생하지 않는다 — "읽기 시작"을 누른 뒤부터.
    if (showCover !== false) return;
    if (!autoplay || !currentCommon || isEndingStep) return;
    if (currentAudio) {
      audioRef.current?.play().catch(() => void 0);
      return;
    }
    // 낭독 준비(서버 요청)는 다음 프레임에 — effect 안 동기 setState 연쇄 렌더 방지.
    const frame = window.requestAnimationFrame(() => void handlePlay());
    return () => window.cancelAnimationFrame(frame);
  }, [showCover, autoplay, idx, currentCommon, isEndingStep, currentAudio, handlePlay]);

  /** 표지 → 1쪽. narrate면 곧바로 1쪽 낭독(클릭 처리 안에서 재생해 자동재생 차단을 피한다). */
  const startReading = useCallback(
    (narrate: boolean) => {
      setShowCover(false);
      setSlideDir(null);
      if (narrate) void handlePlay();
    },
    [handlePlay],
  );

  /** 1쪽에서 ‹ 는 표지로 돌아간다(네이티브와 같음). 읽던 낭독은 멈춘다. */
  const goBack = useCallback(() => {
    if (idx === 0) {
      audioRef.current?.pause();
      sentenceAudioRef.current?.pause();
      setShowCover(true);
      return;
    }
    go(-1);
  }, [idx, go]);

  const isPlaying = playingIdx === idx;

  /** ▶ 읽어 주기 — 재생 중이면 멈추고, 멈춘 자리가 있으면 이어서, 아니면 처음부터(기존 handlePlay). */
  const toggleListen = useCallback(() => {
    const el = audioRef.current;
    if (isPlaying && el) {
      el.pause();
      return;
    }
    if (el && currentAudio && el.currentTime > 0 && !el.ended) {
      el.play().catch((err: unknown) => {
        console.warn('[reader:audio] resume_fail — restart from beginning', err);
        void handlePlay();
      });
      return;
    }
    void handlePlay();
  }, [isPlaying, currentAudio, handlePlay]);

  // 키보드 네비게이션 — 표지에서는 → 로 읽기 시작만.
  const bindings = useMemo(
    () =>
      showCover
        ? { ArrowRight: () => startReading(false) }
        : {
            ArrowLeft: goBack,
            ArrowRight: () => {
              if (!isLast) go(1);
            },
            // Space: 재생/일시정지
            ' ': toggleListen,
            k: () => setShowKo((v) => !v),
            K: () => setShowKo((v) => !v),
          },
    [showCover, startReading, goBack, isLast, go, toggleListen],
  );
  useKeyboardNav(bindings, showCover !== null);

  // 터치 스와이프로 쪽 넘김(네이티브 페이저와 같은 동작). 가로로 충분히 밀었을 때만 —
  // 세로 스크롤·문장 탭과 겹치지 않게 가로 이동이 세로의 1.5배를 넘어야 한다.
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStartRef.current = t ? { x: t.clientX, y: t.clientY } : null;
  }, []);
  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const start = touchStartRef.current;
      touchStartRef.current = null;
      const t = e.changedTouches[0];
      if (!start || !t) return;
      const dx = t.clientX - start.x;
      const dy = t.clientY - start.y;
      if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      if (dx < 0) {
        if (!isLast) go(1);
      } else {
        goBack();
      }
    },
    [go, goBack, isLast],
  );

  const slideClass =
    slideDir === 'next'
      ? 'animate-slide-in-right'
      : slideDir === 'prev'
        ? 'animate-slide-in-left'
        : 'animate-fade-up';

  const fontClass = currentScene
    ? PASSAGE_FONT_CLASS[fontSize]
    : PASSAGE_FONT_CLASS_PLAIN[fontSize];
  const canListen = !isEndingStep || !!currentEndingAudio;
  const regenerateVisible =
    !isEndingStep && !!currentCommon && playedPassages.has(currentCommon.id);

  // 종이 위 본문 블록 — 영어 본문 + 한글 해석 + 안내 + (결말 고르기 / 완독 카드 / 더 알기 / 미션).
  const pageContent = (
    <div className="relative mx-auto w-full max-w-[640px] space-y-6 px-6 pb-28 pt-4 sm:px-8">
      <div className="space-y-2">
        {isEndingStep && branch ? (
          <p className="text-xs font-extrabold text-haru-coral-ink">
            결말 {branch} · {endingIdx + 1}
          </p>
        ) : null}
        <p className={`whitespace-pre-wrap font-normal text-haru-ink ${fontClass}`}>
          <PassageText
            text={currentTextEn}
            vocabMap={vocabMap}
            onWordTap={handleWordTap}
            onSentenceTap={sentenceTapEnabled ? handleSentenceTap : undefined}
            activeSentence={activeSentence}
            highlightAll={isPlaying}
          />
        </p>
        {showKo && currentTextKo ? (
          <p className="animate-fade-up text-[15px] font-bold leading-relaxed text-haru-muted motion-reduce:animate-none sm:text-base">
            <span className="sr-only">한글 해석, </span>
            {currentTextKo}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1">
          {vocabMap.size > 0 ? (
            <p className="text-xs font-bold text-haru-muted">
              <span aria-hidden>💡 </span>점선 밑줄 단어를 누르면 뜻을 볼 수 있어요
            </p>
          ) : null}
          {sentenceTapEnabled ? (
            <p className="text-xs font-bold text-haru-muted">
              <span aria-hidden>🔊 </span>문장을 누르면 그 문장만 다시 들려줘요
            </p>
          ) : null}
          {/* 소리 다시 만들기 — 합성은 비결정적이라(같은 문장도 매번 다른 파형)
              발음이 뭉개진 오디오를 만나면 재합성으로 실제 복구가 된다. 반면
              "읽어 주기"는 캐시된 같은 파일을 재생하므로 고쳐지지 않는다.
              비싼 경로(서버 재합성)라 이미 들어본 passage에서만 노출한다. */}
          {regenerateVisible ? (
            <button
              type="button"
              onClick={() => requestTts(true)}
              disabled={loadingAudio}
              title="발음이 이상하게 들리면 소리를 다시 만들어요"
              className="inline-flex min-h-11 items-center gap-1 rounded-full px-1 text-xs font-bold text-haru-ink focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-60"
            >
              <span className="rounded-full border border-[#b9b6b0] bg-white px-2.5 py-1">
                <span aria-hidden>↻ </span>
                {loadingAudio ? '만드는 중' : '소리 다시 만들기'}
              </span>
            </button>
          ) : null}
          {isEndingStep && branch ? (
            <button
              type="button"
              onClick={resetBranch}
              className="inline-flex min-h-11 items-center rounded-full px-1 text-xs font-bold text-haru-coral-ink underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-ring"
            >
              다른 결말 보기
            </button>
          ) : null}
        </div>
      </div>

      {/* 마지막 공통 쪽 + 분기 있음 — 결말 고르기(› 버튼과 같은 동작, 눈에 띄게 한 번 더). */}
      {needsChoice ? (
        <button
          type="button"
          onClick={() => setChoiceOpen(true)}
          className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-haru-coral text-base font-extrabold text-haru-on-coral transition-transform hover:-translate-y-0.5 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none"
        >
          이야기의 결말 고르기 →
        </button>
      ) : null}

      {/* 완독 축하 카드 — 마지막 쪽에서 퀴즈로 가는 길(하단 › 는 마지막 쪽에서 비활성). */}
      {isLast ? <FinishCard quizHref={`/quiz/${book.id}`} /> : null}

      {/* 논픽션 funFacts — 마지막 passage에서만 노출. */}
      {isLast && funFacts ? (
        <section
          aria-labelledby="fun-facts-heading"
          className="rounded-[20px] border border-haru-line bg-white p-5 shadow-[0_4px_12px_rgb(0_0_0/0.05)]"
        >
          <h2
            id="fun-facts-heading"
            className="flex items-center gap-2 text-lg font-extrabold tracking-normal text-haru-ink"
          >
            <span aria-hidden>📚</span>
            더 알기
          </h2>
          <p className="mt-1 text-xs font-bold text-haru-muted">
            오늘 읽은 내용에서 한 걸음 더 깊이 들어가 볼까요?
          </p>
          <ul className="mt-3 grid gap-2.5">
            {funFacts.map((f, i) => (
              <li key={i} className="rounded-2xl bg-haru-paper p-3.5">
                <p className="text-sm font-extrabold text-haru-ink">{f.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-haru-muted">{f.body}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* 책 속 미션 — 이 passage에 미션이 있을 때만. 진행을 막지 않는 재미 요소. */}
      {currentMission ? (
        <PassageMission
          mission={currentMission}
          done={missionsDone.has(idx)}
          onComplete={() => completeMission(idx)}
        />
      ) : null}
    </div>
  );

  return (
    // 책 한 권 무대 — 사이트 헤더(약 4.8rem) 아래 화면을 채우고, 데스크톱은 가운데 최대 720px 종이.
    <div className="relative mx-auto h-[calc(100dvh-4.8rem)] min-h-[520px] w-full max-w-[720px] overflow-hidden bg-haru-paper md:mt-1 md:h-[calc(100dvh-6rem)] md:rounded-[28px] md:shadow-[0_18px_48px_rgb(168_111_63/0.18)]">
      {showCover === null ? null : showCover ? (
        <ReaderCoverPage
          book={book}
          pageCount={commonCount}
          onStart={() => startReading(false)}
          onListen={() => startReading(true)}
        />
      ) : !hasCurrent ? (
        // 결말 데이터가 비정상이어도 상단 닫기·하단 ‹ 로 돌아갈 길은 남긴다.
        <div className="absolute inset-0 flex items-center justify-center px-6">
          <EmptyState text="이 결말 데이터가 비어 있어요. 책장으로 돌아가 다시 시도해 주세요." />
        </div>
      ) : (
        <div
          key={idx}
          className="absolute inset-0 overflow-y-auto overscroll-contain [container-type:size]"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <div className={`${slideClass} flex min-h-[100cqh] flex-col`}>
            {currentScene ? (
              // 삽화 있는 쪽: 삽화가 위쪽 남은 공간을 가득 채우고(최소 40%), 본문 블록이 컨트롤 바 바로 위에 붙는다.
              <div className="relative min-h-[40cqh] flex-1 bg-[linear-gradient(180deg,#b8d9f0,rgb(247_207_174/0.6))]">
                {/* 장면 이미지는 쿠키 인증 동적 라우트(/images/*)라 optimizer가
                    쿠키를 전달하지 못해 404가 된다 → 원본 직접 서빙. 본문이 바로 아래 있어 장식. */}
                <Image
                  src={currentScene}
                  alt=""
                  fill
                  unoptimized
                  className="object-cover"
                  preload={idx === 0}
                  sizes="(max-width: 720px) 100vw, 720px"
                />
                <div
                  aria-hidden
                  className="absolute inset-x-0 bottom-0 h-20 bg-[linear-gradient(180deg,transparent,var(--haru-paper))]"
                />
              </div>
            ) : (
              // 삽화 없는 쪽: 종이 전체 + 본문을 위(유리 버튼 줄 아래 여백)부터 — 네이티브 10차 "삽화 없는 쪽은 기존 유지".
              // 삽화가 없는 책(예: 모든 쪽 sceneImagePath null)에서 위쪽 절반이 빈 종이로 남던 문제 수정.
              <div aria-hidden className="h-20 shrink-0" />
            )}
            <div className={currentScene ? '-mt-4' : ''}>{pageContent}</div>
            {!currentScene ? <div aria-hidden className="flex-1" /> : null}
          </div>
        </div>
      )}

      <ReaderTopBar
        closeHref={APP_HOME}
        pageCount={showCover === false ? total : null}
        current={idx}
        levelLabel={`${book.cefr} 레벨, ${book.age}세${isNonFiction ? ', 지식책' : ''}`}
        ttsProgress={allTtsReady ? null : { ready: readyCount, total: totalForTts }}
        settings={
          <ReaderSettingsButton
            fontSize={fontSize}
            onFontSizeChange={setFontSize}
            autoplay={autoplay}
            onAutoplayToggle={() => setAutoplay((v) => !v)}
            isEndingStep={isEndingStep}
          />
        }
      />

      {showCover === false ? (
        <ReaderControlBar
          canGoBack
          backLabel={idx === 0 ? '표지로' : '이전 쪽'}
          onBack={goBack}
          canGoForward={!isLast}
          forwardLabel={needsChoice ? '결말 고르기' : '다음 쪽'}
          onForward={() => go(1)}
          listen={
            canListen
              ? { playing: isPlaying, preparing: loadingAudio, onClick: toggleListen }
              : null
          }
          showKo={showKo}
          onToggleKo={() => setShowKo((v) => !v)}
          isLastPage={isLast}
        />
      ) : null}

      {/* 낭독 오디오 — 화면에는 컨트롤 바의 ▶ 로만 조작한다(기본 컨트롤 숨김). */}
      {currentAudio ? (
        <audio
          ref={audioRef}
          src={currentAudio}
          preload="auto"
          className="hidden"
          onError={isEndingStep ? undefined : handleAudioError}
          onLoadedMetadata={(e) => {
            // 어린이 학습용 기본 속도(합성 0.85 × 재생 1.06 ≈ 실효 0.9배). src가
            // 바뀔 때마다 재적용해 일부 모바일 브라우저(Safari)에서 load 후 1.0으로
            // reset되는 케이스를 흡수.
            e.currentTarget.playbackRate = 1.06;
          }}
          onPlay={() => {
            setPlayingIdx(idx);
            // 본문 passage만 playedPassages에 기록(문장 탭·소리 다시 만들기 노출용).
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
          onPause={() => setPlayingIdx(null)}
          onEnded={() => setPlayingIdx(null)}
        />
      ) : null}

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
