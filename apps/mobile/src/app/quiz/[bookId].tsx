import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as SecureStore from 'expo-secure-store';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { ConfettiBurst } from '@/components/quiz/confetti-burst';
import { ScoreHeader } from '@/components/quiz/score-header';
import { PrimaryButton } from '@/components/common/primary-button';
import { Screen } from '@/components/common/screen';
import { StatusPill } from '@/components/common/status-pill';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getOrCreateQuizzes, updateReadingLog, type Quiz } from '@/lib/api';
import { blurActiveElement } from '@/lib/focus';

const IMMEDIATE_KEY = 'quiz.immediate-feedback';
const INTRO_KEY = 'quiz.intro.seen';
// 즉시 피드백 ON에서 정답일 때 자동으로 다음 문제로 넘어가는 지연.
const AUTO_ADVANCE_DELAY_MS = 900;

function firstParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function parsePositiveInt(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

async function readKey(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') return null;
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

async function writeKey(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(key, value);
    } catch {
      /* noop */
    }
    return;
  }
  try {
    await SecureStore.setItemAsync(key, value);
  } catch {
    /* noop */
  }
}

// expo-haptics는 web에서는 noop. notificationAsync는 RN 한정.
async function pulseSuccess() {
  if (Platform.OS === 'web') return;
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {
    /* device 미지원 */
  }
}
async function pulseWarning() {
  if (Platform.OS === 'web') return;
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  } catch {
    /* device 미지원 */
  }
}

export default function QuizScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{
    bookId?: string | string[];
    logId?: string | string[];
  }>();
  const bookId = parsePositiveInt(firstParam(params.bookId));
  const logId = parsePositiveInt(firstParam(params.logId));

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [immediate, setImmediate] = useState(false);
  const [introVisible, setIntroVisible] = useState(false);
  const [bouncingChoice, setBouncingChoice] = useState<number | null>(null);
  // immediate 토글의 hydration 가드 — 초기값(false)이 SecureStore보다 먼저 persist되지 않도록.
  const didHydrateImmediateRef = useRef(false);
  // 자동 진행 timer — 화면 언마운트 시 정리.
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // SecureStore 초기 로드.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [imm, intro] = await Promise.all([readKey(IMMEDIATE_KEY), readKey(INTRO_KEY)]);
      if (cancelled) return;
      setImmediate(imm === '1');
      setIntroVisible(intro !== '1');
      didHydrateImmediateRef.current = true;
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // immediate 변경 시 저장 (hydration 후만).
  useEffect(() => {
    if (!didHydrateImmediateRef.current) return;
    void writeKey(IMMEDIATE_KEY, immediate ? '1' : '0');
  }, [immediate]);

  // 책별 퀴즈 로드.
  useEffect(() => {
    let cancelled = false;
    async function loadQuizzes() {
      if (!bookId) {
        setError('잘못된 책입니다.');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const next = await getOrCreateQuizzes(bookId);
        if (cancelled) return;
        setQuizzes(next);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : '퀴즈를 불러오지 못했습니다.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadQuizzes();
    return () => {
      cancelled = true;
    };
  }, [bookId]);

  // 화면 언마운트 시 자동 진행 타이머 정리.
  useEffect(() => {
    return () => {
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    };
  }, []);

  const current = quizzes[idx];
  const selected = current ? answers[current.id] : undefined;
  const isLast = idx === quizzes.length - 1;
  const answeredCount = Object.keys(answers).length;
  const score = useMemo(
    () =>
      quizzes.reduce(
        (total, quiz) => total + (answers[quiz.id] === quiz.answerIndex ? 1 : 0),
        0,
      ),
    [answers, quizzes],
  );
  const progressPct = quizzes.length > 0 ? ((idx + 1) / quizzes.length) * 100 : 0;
  // 즉시 피드백 ON에서 현재 문제에 답한 상태 = 시각화 활성.
  const revealing = immediate && selected !== undefined;

  const dismissIntro = useCallback(() => {
    setIntroVisible(false);
    void writeKey(INTRO_KEY, '1');
  }, []);

  const goNext = useCallback(() => {
    setBouncingChoice(null);
    setIdx((i) => Math.min(quizzes.length - 1, i + 1));
  }, [quizzes.length]);

  const goPrev = useCallback(() => {
    setBouncingChoice(null);
    setIdx((i) => Math.max(0, i - 1));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (answeredCount < quizzes.length) {
      setError('모든 문제를 풀어 주세요.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (logId) {
        await updateReadingLog({
          id: logId,
          quizScore: score,
          progressRatio: 1,
          finishedAtUnix: Math.floor(Date.now() / 1000),
        });
      }
      setSubmitted(true);
      if (score === quizzes.length) void pulseSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : '점수를 저장하지 못했습니다.');
    } finally {
      setSaving(false);
    }
  }, [answeredCount, logId, quizzes.length, score]);

  const selectChoice = useCallback(
    (choiceIndex: number) => {
      if (!current) return;
      if (revealing) return; // 이미 답한 문제는 잠금(즉시 피드백 ON)
      setAnswers((prev) => ({ ...prev, [current.id]: choiceIndex }));
      setBouncingChoice(choiceIndex);
      setError(null);
      window.setTimeout(() => setBouncingChoice(null), 400);

      if (!immediate) return;
      const correct = choiceIndex === current.answerIndex;
      void (correct ? pulseSuccess() : pulseWarning());

      if (correct && !isLast) {
        // 정답 + 마지막 문제 아님 → 자동으로 다음.
        if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
        advanceTimerRef.current = setTimeout(() => {
          advanceTimerRef.current = null;
          goNext();
        }, AUTO_ADVANCE_DELAY_MS);
      }
    },
    [current, revealing, immediate, isLast, goNext],
  );

  if (loading) {
    return (
      <Screen>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={[styles.backText, { color: theme.forest }]}>책으로 돌아가기</Text>
        </Pressable>
        <Text style={[styles.body, { color: theme.textSecondary }]}>퀴즈를 준비하는 중...</Text>
      </Screen>
    );
  }

  if (error && quizzes.length === 0) {
    return (
      <Screen>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={[styles.backText, { color: theme.forest }]}>책으로 돌아가기</Text>
        </Pressable>
        <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          <StatusPill label="오류" tone="danger" />
          <Text style={[styles.title, { color: theme.text }]}>퀴즈를 열 수 없습니다.</Text>
          <Text style={[styles.body, { color: theme.textSecondary }]}>{error}</Text>
        </View>
      </Screen>
    );
  }

  if (quizzes.length === 0) {
    return (
      <Screen>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={[styles.backText, { color: theme.forest }]}>책으로 돌아가기</Text>
        </Pressable>
        <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          <StatusPill label="비어 있음" tone="warning" />
          <Text style={[styles.title, { color: theme.text }]}>아직 퀴즈가 없습니다.</Text>
        </View>
      </Screen>
    );
  }

  // 결과 화면.
  if (submitted) {
    const isPerfect = score === quizzes.length;
    return (
      <Screen>
        <ConfettiBurst active={isPerfect} />
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={[styles.backText, { color: theme.forest }]}>책으로 돌아가기</Text>
        </Pressable>
        <ScoreHeader title={`${quizzes.length}문제 완료`} score={score} total={quizzes.length} />

        {quizzes.map((quiz, qIdx) => {
          const userIdx = answers[quiz.id];
          const isCorrect = userIdx === quiz.answerIndex;
          return (
            <View
              key={quiz.id}
              style={[
                styles.card,
                {
                  backgroundColor: theme.backgroundElement,
                  borderColor: isCorrect ? theme.border : theme.danger,
                },
              ]}>
              <View style={styles.resultHeader}>
                <Text style={[styles.title, { color: theme.text }]}>
                  Q{qIdx + 1}. {quiz.question}
                </Text>
                <StatusPill
                  label={isCorrect ? '정답' : '오답'}
                  tone={isCorrect ? 'success' : 'danger'}
                />
              </View>
              <View style={styles.choiceList}>
                {quiz.choices.map((choice, ci) => {
                  const right = ci === quiz.answerIndex;
                  const wrongPicked = ci === userIdx && !right;
                  return (
                    <View
                      key={`${quiz.id}-${ci}`}
                      style={[
                        styles.resultChoice,
                        {
                          backgroundColor: right
                            ? theme.accentSoft
                            : wrongPicked
                              ? '#FEE2E2'
                              : theme.background,
                          borderColor: right
                            ? theme.accent
                            : wrongPicked
                              ? theme.danger
                              : theme.border,
                        },
                      ]}>
                      <Text style={[styles.choiceMarker, { color: right ? theme.goldDeep : wrongPicked ? theme.danger : theme.textSecondary }]}>
                        {right ? '✓' : wrongPicked ? '✗' : String.fromCharCode(65 + ci)}
                      </Text>
                      <Text style={[styles.choiceText, { color: theme.text }]}>{choice}</Text>
                    </View>
                  );
                })}
              </View>
              {quiz.explanation ? (
                <Text style={[styles.explanation, { color: theme.textSecondary }]}>
                  💡 {quiz.explanation}
                </Text>
              ) : null}
            </View>
          );
        })}

        <View style={styles.actions}>
          <PrimaryButton
            label="다시 읽기"
            variant="soft"
            onPress={() => {
              blurActiveElement();
              if (bookId) router.replace({ pathname: '/books/[bookId]', params: { bookId: String(bookId) } });
            }}
          />
          <PrimaryButton
            label="책장으로"
            onPress={() => {
              blurActiveElement();
              router.replace('/');
            }}
          />
        </View>
      </Screen>
    );
  }

  // 진행 화면 — 1문항씩.
  if (!current) return null;

  return (
    <Screen>
      <Pressable onPress={() => router.back()} style={styles.backButton}>
        <Text style={[styles.backText, { color: theme.forest }]}>책으로 돌아가기</Text>
      </Pressable>

      {introVisible ? (
        <View
          style={[
            styles.intro,
            { backgroundColor: theme.accentSoft, borderColor: theme.accent },
          ]}>
          <Text style={[styles.introTitle, { color: theme.text }]}>
            한 문제씩 풀고, 마지막에 제출!
          </Text>
          <Text style={[styles.introBody, { color: theme.textSecondary }]}>
            답을 고르면 다음 버튼이 활성화돼요. 즉시 피드백을 켜면 정답 여부를 바로 알려 드려요.
          </Text>
          <PrimaryButton label="확인" variant="soft" onPress={dismissIntro} />
        </View>
      ) : null}

      <View style={[styles.hero, { backgroundColor: theme.forest }]}>
        <View style={styles.heroTopRow}>
          <StatusPill label="퀴즈" tone="success" />
          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: immediate }}
            onPress={() => setImmediate((v) => !v)}
            style={[
              styles.toggle,
              {
                backgroundColor: immediate ? theme.accent : 'rgba(255,255,255,0.18)',
                borderColor: immediate ? theme.goldDeep : 'rgba(255,255,255,0.4)',
              },
            ]}>
            <Text
              style={[
                styles.toggleLabel,
                { color: immediate ? theme.text : '#FFFFFF' },
              ]}>
              {immediate ? '즉시 피드백 ON' : '즉시 피드백 OFF'}
            </Text>
          </Pressable>
        </View>
        <Text style={styles.heroTitle}>이야기를 얼마나 기억하고 있을까요?</Text>
        <View style={styles.progressMeta}>
          <Text style={styles.progressCount} accessibilityLiveRegion="polite">
            {idx + 1}
            <Text style={{ color: 'rgba(255,255,255,0.55)' }}> / </Text>
            {quizzes.length}
          </Text>
          <Text style={styles.progressPct}>{Math.round(progressPct)}%</Text>
        </View>
        <View style={styles.heroTrack}>
          <View
            style={[
              styles.heroFill,
              { width: `${progressPct}%`, backgroundColor: theme.accent },
            ]}
          />
        </View>
      </View>

      <View
        key={current.id}
        style={[
          styles.card,
          { backgroundColor: theme.backgroundElement, borderColor: theme.border },
        ]}>
        <Text style={[styles.title, { color: theme.text }]}>
          Q{idx + 1}. {current.question}
        </Text>
        <View style={styles.choiceList}>
          {current.choices.map((choice, choiceIndex) => {
            const active = selected === choiceIndex;
            const isCorrect = choiceIndex === current.answerIndex;
            const wrongPicked = revealing && active && !isCorrect;
            const correctMarked = revealing && isCorrect;
            const isBouncing = bouncingChoice === choiceIndex;

            const bg = correctMarked
              ? theme.accentSoft
              : wrongPicked
                ? '#FEE2E2'
                : active
                  ? theme.backgroundSelected
                  : theme.background;
            const border = correctMarked
              ? theme.accent
              : wrongPicked
                ? theme.danger
                : active
                  ? theme.forest
                  : theme.border;
            const markerBg = correctMarked
              ? theme.accent
              : wrongPicked
                ? theme.danger
                : active
                  ? theme.forest
                  : theme.backgroundElement;
            const markerFg = correctMarked || wrongPicked
              ? '#FFFFFF'
              : active
                ? '#FFFFFF'
                : theme.textSecondary;

            return (
              <Pressable
                key={`${current.id}-${choiceIndex}`}
                accessibilityRole="button"
                accessibilityState={{ selected: active, disabled: revealing }}
                disabled={revealing}
                onPress={() => selectChoice(choiceIndex)}
                style={({ pressed }) => [
                  styles.choice,
                  {
                    backgroundColor: bg,
                    borderColor: border,
                    transform: [{ scale: isBouncing ? 1.04 : pressed ? 0.98 : 1 }],
                    opacity: revealing && !correctMarked && !wrongPicked ? 0.7 : 1,
                  },
                ]}>
                <View
                  style={[
                    styles.choiceMarkerBubble,
                    { backgroundColor: markerBg, borderColor: border },
                  ]}>
                  <Text style={[styles.choiceMarker, { color: markerFg }]}>
                    {correctMarked ? '✓' : wrongPicked ? '✗' : String.fromCharCode(65 + choiceIndex)}
                  </Text>
                </View>
                <Text style={[styles.choiceText, { color: theme.text }]}>{choice}</Text>
              </Pressable>
            );
          })}
        </View>

        {revealing && current.explanation ? (
          <Text style={[styles.explanation, { color: theme.textSecondary }]}>
            💡 {current.explanation}
          </Text>
        ) : null}
      </View>

      {error ? <Text style={[styles.error, { color: theme.warning }]}>{error}</Text> : null}

      <View style={styles.navRow}>
        <PrimaryButton
          label="이전"
          variant="soft"
          disabled={idx === 0}
          onPress={goPrev}
          style={styles.navButton}
        />
        {isLast ? (
          <PrimaryButton
            label={
              saving
                ? '저장 중...'
                : answeredCount < quizzes.length
                  ? `제출 (${answeredCount}/${quizzes.length})`
                  : '제출하기'
            }
            disabled={saving || answeredCount < quizzes.length}
            onPress={handleSubmit}
            style={styles.navButton}
          />
        ) : (
          <PrimaryButton
            label="다음"
            disabled={selected === undefined}
            onPress={goNext}
            style={styles.navButton}
          />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
  },
  backText: {
    fontSize: 14,
    fontWeight: '800',
  },
  intro: {
    borderWidth: 1,
    borderRadius: 22,
    padding: Spacing.three,
    gap: 8,
  },
  introTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  introBody: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },
  hero: {
    borderRadius: 32,
    padding: Spacing.four,
    gap: 12,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    flexWrap: 'wrap',
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  toggle: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  toggleLabel: {
    fontSize: 12,
    fontWeight: '800',
  },
  progressMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressCount: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  progressPct: {
    color: '#FFE7B8',
    fontSize: 13,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  heroTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)',
    overflow: 'hidden',
  },
  heroFill: {
    height: '100%',
    borderRadius: 999,
  },
  card: {
    borderWidth: 1,
    borderRadius: 24,
    padding: Spacing.three,
    gap: 14,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
    fontSize: 19,
    lineHeight: 26,
    fontWeight: '800',
    flexShrink: 1,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
  },
  choiceList: {
    gap: 10,
  },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1.5,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  choiceMarkerBubble: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceMarker: {
    fontSize: 13,
    fontWeight: '800',
  },
  choiceText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '700',
  },
  resultChoice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  explanation: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '600',
  },
  error: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },
  actions: {
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
