import { useLocalSearchParams, useRouter } from 'expo-router';
import { setAudioModeAsync } from 'expo-audio';
import { Image as ExpoImage } from 'expo-image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';

import { AudioButton } from '@/components/books/audio-button';
import { FontSizePicker } from '@/components/books/font-size-picker';
import { PassageText, buildVocabMap } from '@/components/books/passage-text';
import { ReaderProgress } from '@/components/books/reader-progress';
import { PrimaryButton } from '@/components/common/primary-button';
import { Screen } from '@/components/common/screen';
import { StatusPill } from '@/components/common/status-pill';
import { Spacing } from '@/constants/theme';
import { useBackgroundTts } from '@/hooks/use-background-tts';
import { usePanNavigation } from '@/hooks/use-pan-navigation';
import { useReaderProgress } from '@/hooks/use-reader-progress';
import { useTheme } from '@/hooks/use-theme';
import {
  fetchBookDetail,
  startReadingLog,
  synthesizePassageAudio,
  toApiAssetUrl,
  updateReadingLog,
  type Book,
  type EndingPassage,
  type Passage,
} from '@/lib/api';
import { blurActiveElement } from '@/lib/focus';

export default function BookReaderScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { bookId } = useLocalSearchParams<{ bookId?: string }>();
  const parsedBookId = Number(bookId);
  const validBookId = Number.isInteger(parsedBookId) && parsedBookId > 0 ? parsedBookId : null;

  const [book, setBook] = useState<Book | null>(null);
  const [passages, setPassages] = useState<Passage[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [endingBranch, setEndingBranch] = useState<'A' | 'B' | null>(null);
  const [endingIndex, setEndingIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [ttsLoadingId, setTtsLoadingId] = useState<number | null>(null);
  const [readingLogId, setReadingLogId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showTranslation, setShowTranslation] = useState(false);
  const [autoplay, setAutoplay] = useState(false);

  const progressStore = useReaderProgress(validBookId);
  // 진행률 keepalive — unmount 시 마지막 ratio를 fetch keepalive로 한 번 더 PATCH.
  const latestRatioRef = useRef(0);
  const ratioDirtyRef = useRef(false);
  const readingLogIdRef = useRef<number | null>(null);
  // 같은 책에서 hydration → autoplay/index 복원은 1회만 하고, 그 후 사용자 변경은
  // store에 곧장 반영. didHydrateRef로 1회 복원 여부를 추적.
  const didHydrateRef = useRef(false);
  // 책 변경 시 hydration 가드 리셋.
  useEffect(() => {
    didHydrateRef.current = false;
  }, [validBookId]);

  // store hydration → activeIndex/autoplay 복원 (1회).
  useEffect(() => {
    if (!progressStore.hydrated || didHydrateRef.current) return;
    didHydrateRef.current = true;
    if (passages.length > 0) {
      const maxIdx = passages.length - 1;
      const restored = Math.min(maxIdx, Math.max(0, progressStore.savedIndex));
      setActiveIndex(restored);
    } else {
      setActiveIndex(progressStore.savedIndex);
    }
    setAutoplay(progressStore.savedAutoplay);
  }, [progressStore.hydrated, progressStore.savedIndex, progressStore.savedAutoplay, passages.length]);

  // activeIndex 변경 시 store 저장 (단, hydration 후에만).
  useEffect(() => {
    if (!progressStore.hydrated || !didHydrateRef.current) return;
    progressStore.persistIndex(activeIndex);
  }, [activeIndex, progressStore]);

  useEffect(() => {
    if (!progressStore.hydrated || !didHydrateRef.current) return;
    progressStore.persistAutoplay(autoplay);
  }, [autoplay, progressStore]);

  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function runInitialLoad() {
      if (!validBookId) {
        setError('잘못된 책입니다.');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const detail = await fetchBookDetail(validBookId);
        if (cancelled) return;
        setBook(detail.book);
        setPassages(detail.passages);
        setEndingBranch(null);
        setEndingIndex(0);
        setShowTranslation(false);
        const log = await startReadingLog(detail.book.profileId, detail.book.id);
        if (cancelled) return;
        setReadingLogId(log.id);
        readingLogIdRef.current = log.id;
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : '이야기를 불러오지 못했습니다.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void runInitialLoad();
    return () => {
      cancelled = true;
    };
  }, [validBookId]);

  // unmount 시 keepalive PATCH — Reader 떠나면서 마지막 ratio가 dirty면 한 번 더.
  useEffect(() => {
    return () => {
      const id = readingLogIdRef.current;
      if (!id || !ratioDirtyRef.current) return;
      // RN fetch는 keepalive 미지원이지만 await 없이 fire-and-forget으로 보내면
      // 대부분 환경에서 OS 큐가 마무리한다. 실패 시 다음 진입 startReadingLog가 동기화.
      void updateReadingLog({ id, progressRatio: latestRatioRef.current }).catch(() => undefined);
    };
  }, []);

  // 백그라운드 TTS 프리페치.
  const handleAudioReady = useCallback((passageId: number, audioPath: string) => {
    setPassages((current) =>
      current.map((p) => (p.id === passageId ? { ...p, audioPath } : p)),
    );
  }, []);
  useBackgroundTts(validBookId, passages, handleAudioReady);

  const ending = book?.alternateEnding ?? null;
  const selectedEndingPassages: EndingPassage[] =
    ending && endingBranch === 'A'
      ? ending.passagesA
      : ending && endingBranch === 'B'
        ? ending.passagesB
        : [];
  const activePassage = endingBranch ? null : passages[activeIndex] ?? null;
  const activeEndingPassage = endingBranch ? selectedEndingPassages[endingIndex] ?? null : null;
  const isLastPassage = activeIndex === passages.length - 1;
  const sceneUrl = activePassage ? toApiAssetUrl(activePassage.sceneImagePath) : null;

  const ttsReadyCount = useMemo(
    () => passages.reduce((n, p) => (p.audioPath ? n + 1 : n), 0),
    [passages],
  );
  const vocabMap = useMemo(() => buildVocabMap(book?.vocabulary), [book?.vocabulary]);

  const saveProgress = useCallback(
    async (nextIndex: number, finished = false) => {
      if (!readingLogId || passages.length === 0) return;
      const progressRatio = Math.min(1, Math.max(0, (nextIndex + 1) / passages.length));
      latestRatioRef.current = progressRatio;
      ratioDirtyRef.current = true;
      try {
        await updateReadingLog({
          id: readingLogId,
          progressRatio,
          finishedAtUnix: finished ? Math.floor(Date.now() / 1000) : undefined,
        });
        ratioDirtyRef.current = false;
      } catch (err) {
        setError(err instanceof Error ? err.message : '진행률을 저장하지 못했습니다.');
      }
    },
    [readingLogId, passages.length],
  );

  const goToPassage = useCallback(
    async (nextIndex: number) => {
      const bounded = Math.min(passages.length - 1, Math.max(0, nextIndex));
      setActiveIndex(bounded);
      setEndingBranch(null);
      setEndingIndex(0);
      setShowTranslation(false);
      await saveProgress(bounded, bounded === passages.length - 1);
    },
    [passages.length, saveProgress],
  );

  const chooseEnding = useCallback(
    async (branch: 'A' | 'B') => {
      setEndingBranch(branch);
      setEndingIndex(0);
      setShowTranslation(false);
      await saveProgress(passages.length - 1, false);
    },
    [passages.length, saveProgress],
  );

  const openQuiz = useCallback(async () => {
    if (!book) return;
    await saveProgress(passages.length - 1, true);
    blurActiveElement();
    router.push({
      pathname: '/quiz/[bookId]',
      params: {
        bookId: String(book.id),
        logId: readingLogId ? String(readingLogId) : '',
      },
    });
  }, [book, passages.length, readingLogId, router, saveProgress]);

  const goBack = useCallback(async () => {
    if (endingBranch) {
      if (endingIndex > 0) {
        setEndingIndex((current) => current - 1);
        setShowTranslation(false);
        return;
      }
      setEndingBranch(null);
      setEndingIndex(0);
      setShowTranslation(false);
      return;
    }
    if (activeIndex === 0) return;
    await goToPassage(activeIndex - 1);
  }, [activeIndex, endingBranch, endingIndex, goToPassage]);

  const goForward = useCallback(async () => {
    if (endingBranch) {
      if (endingIndex < selectedEndingPassages.length - 1) {
        setEndingIndex((current) => current + 1);
        setShowTranslation(false);
        return;
      }
      await openQuiz();
      return;
    }
    if (ending && isLastPassage) {
      // 결말 선택이 필요한 시점 — 스와이프로는 선택을 강제할 수 없으므로 무시.
      return;
    }
    if (isLastPassage) {
      await openQuiz();
      return;
    }
    await goToPassage(activeIndex + 1);
  }, [
    activeIndex,
    ending,
    endingBranch,
    endingIndex,
    isLastPassage,
    goToPassage,
    openQuiz,
    selectedEndingPassages.length,
  ]);

  // 자동재생 종료 콜백 — autoplay ON일 때만 다음 passage로.
  const handleAudioEnded = useCallback(() => {
    if (!autoplay) return;
    if (endingBranch) {
      if (endingIndex < selectedEndingPassages.length - 1) {
        setEndingIndex((current) => current + 1);
        setShowTranslation(false);
      }
      return;
    }
    if (activeIndex < passages.length - 1) {
      void goToPassage(activeIndex + 1);
    }
  }, [
    activeIndex,
    autoplay,
    endingBranch,
    endingIndex,
    goToPassage,
    passages.length,
    selectedEndingPassages.length,
  ]);

  // 좌우 스와이프 제스처. 결말 선택 단계에서는 비활성화.
  const swipeEnabled = !(ending && isLastPassage && !endingBranch);
  const panGesture = usePanNavigation({
    onPrev: () => void goBack(),
    onNext: () => void goForward(),
    enabled: swipeEnabled,
  });

  async function loadBook() {
    if (!validBookId) {
      setError('잘못된 책입니다.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const detail = await fetchBookDetail(validBookId);
      setBook(detail.book);
      setPassages(detail.passages);
      setActiveIndex(0);
      setEndingBranch(null);
      setEndingIndex(0);
      setShowTranslation(false);
      const log = await startReadingLog(detail.book.profileId, detail.book.id);
      setReadingLogId(log.id);
      readingLogIdRef.current = log.id;
    } catch (err) {
      setError(err instanceof Error ? err.message : '이야기를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }

  async function prepareVoice(passage: Passage) {
    setTtsLoadingId(passage.id);
    setError(null);
    try {
      const audioPath = await synthesizePassageAudio(passage.id);
      setPassages((current) =>
        current.map((item) => (item.id === passage.id ? { ...item, audioPath } : item)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : '음성을 준비하지 못했습니다.');
    } finally {
      setTtsLoadingId(null);
    }
  }

  const currentText = activePassage?.textEn ?? activeEndingPassage?.en ?? '';
  const endingLabelTag = endingBranch
    ? `결말 ${endingBranch} · ${endingIndex + 1}/${selectedEndingPassages.length}`
    : null;

  return (
    <GestureDetector gesture={panGesture}>
      <Screen>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Text style={[styles.backText, { color: theme.forest }]}>책장으로 돌아가기</Text>
          </Pressable>
          <FontSizePicker
            value={progressStore.savedFontSize}
            onChange={(size) => progressStore.persistFontSize(size)}
          />
        </View>

        {loading ? (
          <Text style={[styles.body, { color: theme.textSecondary }]}>이야기를 불러오는 중...</Text>
        ) : error && !book ? (
          <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <StatusPill label="오류" tone="danger" />
            <Text style={[styles.title, { color: theme.text }]}>이야기를 불러오지 못했습니다.</Text>
            <Text style={[styles.body, { color: theme.textSecondary }]}>{error}</Text>
            <PrimaryButton label="다시 시도" onPress={loadBook} />
          </View>
        ) : book && (activePassage || activeEndingPassage) ? (
          <>
            <View style={[styles.cover, { backgroundColor: theme.forest }]}>
              <StatusPill label={`${book.cefr} · ${book.age}세`} tone="success" />
              <Text style={styles.coverTitle}>{book.title}</Text>
              <Text style={styles.coverMeta}>{book.topic ?? 'AI가 만든 이야기'}</Text>
            </View>

            <ReaderProgress
              currentIndex={
                endingBranch
                  ? passages.length + endingIndex
                  : activeIndex
              }
              total={passages.length + (endingBranch ? selectedEndingPassages.length : 0)}
              ttsReadyCount={ttsReadyCount}
              ttsTotal={passages.length}
              endingLabel={endingLabelTag}
            />

            <View style={[styles.readerCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
              {sceneUrl ? (
                <ExpoImage source={{ uri: sceneUrl }} style={styles.sceneImage} contentFit="cover" />
              ) : null}
              <PassageText
                text={currentText}
                vocabMap={vocabMap}
                fontSize={progressStore.savedFontSize}
              />
              {vocabMap.size > 0 ? (
                <Text style={[styles.hint, { color: theme.textSecondary }]}>
                  💡 밑줄 친 단어를 눌러 뜻을 볼 수 있어요
                </Text>
              ) : null}
              <PrimaryButton
                label={showTranslation ? '한글 해석 숨기기' : '한글 해석 보기'}
                variant="soft"
                onPress={() => setShowTranslation((visible) => !visible)}
              />
              {showTranslation ? (
                <View style={[styles.translationBox, { backgroundColor: theme.accentSoft }]}>
                  <Text style={[styles.korean, { color: theme.text }]}>
                    {activePassage?.textKo ?? activeEndingPassage?.ko}
                  </Text>
                </View>
              ) : null}
              {error ? <Text style={[styles.error, { color: theme.warning }]}>{error}</Text> : null}
              {activePassage ? (
                <View style={styles.audioRow}>
                  <AudioButton
                    audioUrl={toApiAssetUrl(activePassage.audioPath)}
                    onEnded={handleAudioEnded}
                    autoPlayOnLoad={autoplay}
                  />
                  <PrimaryButton
                    label={autoplay ? '자동재생 ON' : '자동재생 OFF'}
                    variant={autoplay ? 'solid' : 'soft'}
                    onPress={() => setAutoplay((v) => !v)}
                  />
                  {!activePassage.audioPath ? (
                    <PrimaryButton
                      label={ttsLoadingId === activePassage.id ? '음성 준비 중...' : '음성 만들기'}
                      variant="soft"
                      disabled={ttsLoadingId === activePassage.id}
                      onPress={() => prepareVoice(activePassage)}
                    />
                  ) : null}
                </View>
              ) : null}
            </View>

            {book.funFacts && book.funFacts.length > 0 && isLastPassage && !endingBranch ? (
              <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                <StatusPill label="지식 카드" tone="success" />
                {book.funFacts.map((fact) => (
                  <View key={fact.title} style={[styles.factCard, { backgroundColor: theme.background, borderColor: theme.border }]}>
                    <Text style={[styles.factTitle, { color: theme.text }]}>{fact.title}</Text>
                    <Text style={[styles.body, { color: theme.textSecondary }]}>{fact.body}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            {ending && isLastPassage && !endingBranch ? (
              <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                <StatusPill label="엔딩 선택" tone="success" />
                <Text style={[styles.title, { color: theme.text }]}>어떤 결말로 갈까요?</Text>
                <View style={styles.navRow}>
                  <PrimaryButton label={ending.labelA} variant="soft" onPress={() => chooseEnding('A')} style={styles.navButton} />
                  <PrimaryButton label={ending.labelB} onPress={() => chooseEnding('B')} style={styles.navButton} />
                </View>
              </View>
            ) : null}

            <View style={styles.navRow}>
              <PrimaryButton
                label="이전"
                variant="soft"
                disabled={!endingBranch && activeIndex === 0}
                onPress={goBack}
                style={styles.navButton}
              />
              <PrimaryButton
                label={
                  ending && isLastPassage && !endingBranch
                    ? '결말을 골라 주세요'
                    : (endingBranch && endingIndex === selectedEndingPassages.length - 1) || (!endingBranch && isLastPassage)
                      ? '퀴즈 풀기'
                      : '다음'
                }
                disabled={!!ending && isLastPassage && !endingBranch}
                onPress={goForward}
                style={styles.navButton}
              />
            </View>
          </>
        ) : (
          <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <StatusPill label="비어 있음" tone="warning" />
            <Text style={[styles.title, { color: theme.text }]}>본문이 없습니다.</Text>
          </View>
        )}
      </Screen>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    flexWrap: 'wrap',
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
  },
  backText: {
    fontSize: 14,
    fontWeight: '800',
  },
  cover: {
    borderRadius: 32,
    padding: Spacing.four,
    gap: 14,
  },
  coverTitle: {
    color: '#FFFFFF',
    fontSize: 32,
    lineHeight: 37,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  coverMeta: {
    color: '#E8FFF8',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
  },
  readerCard: {
    borderWidth: 1,
    borderRadius: 28,
    padding: Spacing.three,
    gap: 16,
  },
  sceneImage: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: 22,
    overflow: 'hidden',
  },
  card: {
    borderWidth: 1,
    borderRadius: 28,
    padding: Spacing.three,
    gap: 14,
  },
  title: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
  },
  factCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: Spacing.three,
    gap: 6,
  },
  factTitle: {
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '800',
  },
  hint: {
    fontSize: 11,
    fontWeight: '600',
  },
  translationBox: {
    borderRadius: 22,
    padding: 16,
  },
  korean: {
    fontSize: 17,
    lineHeight: 27,
    fontWeight: '600',
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
  error: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },
  audioRow: {
    gap: 10,
  },
  navRow: {
    flexDirection: 'row',
    gap: 12,
  },
  navButton: {
    flex: 1,
  },
});
