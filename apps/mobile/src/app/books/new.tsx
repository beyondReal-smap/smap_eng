import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { PrimaryButton } from '@/components/common/primary-button';
import { Screen } from '@/components/common/screen';
import { StatusPill } from '@/components/common/status-pill';
import {
  createBook,
  fetchCredits,
  fetchIntakeQuestions,
  fetchProfiles,
  MobileApiError,
  type BookGenre,
  type BookIntakePayload,
  type CefrLevel,
  type CreditBalance,
  type IntakeQuestion,
  type Profile,
} from '@/lib/api';
import { blurActiveElement } from '@/lib/focus';
import { useTheme } from '@/hooks/use-theme';

const CEFR_LEVELS: CefrLevel[] = ['A1', 'A2', 'B1', 'B2'];
const GENRE_OPTIONS: Array<[BookGenre, string]> = [
  ['fiction', '동화'],
  ['non_fiction', '지식책'],
];

export default function NewBookScreen() {
  const router = useRouter();
  const theme = useTheme();
  const params = useLocalSearchParams<{ profileId?: string }>();
  const initialProfileId = useMemo(() => {
    const raw = Array.isArray(params.profileId) ? params.profileId[0] : params.profileId;
    const parsed = raw ? Number(raw) : NaN;
    return Number.isFinite(parsed) ? parsed : null;
  }, [params.profileId]);

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(initialProfileId);
  const [credits, setCredits] = useState<CreditBalance | null>(null);
  const [bookGenre, setBookGenre] = useState<BookGenre>('fiction');
  const [bookCefr, setBookCefr] = useState<CefrLevel>('A1');
  const [bookTopic, setBookTopic] = useState('');
  const [intakeQuestions, setIntakeQuestions] = useState<IntakeQuestion[]>([]);
  const [intakeAnswers, setIntakeAnswers] = useState<Record<string, string>>({});
  const [intakeLoading, setIntakeLoading] = useState(false);
  const [intakeError, setIntakeError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bootstrapping, setBootstrapping] = useState(true);

  const activeProfile = profiles.find((profile) => profile.id === selectedProfileId) ?? null;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [nextProfiles, nextCredits] = await Promise.all([fetchProfiles(), fetchCredits()]);
        if (cancelled) return;
        setProfiles(nextProfiles);
        setCredits(nextCredits);
        if (selectedProfileId === null) {
          setSelectedProfileId(nextProfiles[0]?.id ?? null);
        }
      } catch (err) {
        if (cancelled) return;
        if (err instanceof MobileApiError && err.status === 401) {
          router.replace('/login');
          return;
        }
        setError(err instanceof Error ? err.message : '프로필을 불러오지 못했습니다.');
      } finally {
        if (!cancelled) setBootstrapping(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // 초기 1회만 부트스트랩. selectedProfileId는 사용자가 직접 chip을 탭해야 변경됨.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function buildIntakePayload(): BookIntakePayload | undefined {
    if (intakeQuestions.length === 0) return undefined;
    const answers = intakeQuestions.map((question) => {
      const text = intakeAnswers[question.id]?.trim();
      return { questionId: question.id, text: text ? text : null };
    });
    if (!answers.some((answer) => answer.text !== null)) return undefined;
    return {
      questions: intakeQuestions.map((q) => ({ id: q.id, text: q.text })),
      answers,
    };
  }

  async function loadIntakeQuestions() {
    if (!activeProfile) {
      setError('먼저 아이 프로필을 선택해 주세요.');
      return;
    }
    setIntakeLoading(true);
    setIntakeError(null);
    try {
      const questions = await fetchIntakeQuestions({
        profileId: activeProfile.id,
        genre: bookGenre,
        cefr: bookCefr,
      });
      setIntakeQuestions(questions);
      setIntakeAnswers({});
    } catch (err) {
      setIntakeError(err instanceof Error ? err.message : '맞춤 질문을 불러오지 못했습니다.');
    } finally {
      setIntakeLoading(false);
    }
  }

  async function handleCreate() {
    if (!activeProfile) {
      setError('먼저 아이 프로필을 선택해 주세요.');
      return;
    }
    if (credits && credits.balance <= 0) {
      blurActiveElement();
      router.replace('/subscribe');
      return;
    }

    setCreating(true);
    setError(null);
    try {
      const created = await createBook({
        profileId: activeProfile.id,
        level: { age: activeProfile.age, cefr: bookCefr },
        genre: bookGenre,
        topic: bookTopic.trim() || undefined,
        intake: buildIntakePayload(),
      });
      blurActiveElement();
      router.replace({
        pathname: '/books/[bookId]',
        params: { bookId: String(created.id) },
      });
    } catch (err) {
      if (err instanceof MobileApiError && err.status === 402) {
        blurActiveElement();
        router.replace('/subscribe');
        return;
      }
      if (err instanceof MobileApiError && err.status === 401) {
        router.replace('/login');
        return;
      }
      setError(err instanceof Error ? err.message : '새 책을 만들지 못했습니다.');
    } finally {
      setCreating(false);
    }
  }

  if (bootstrapping) {
    return (
      <Screen>
        <Text style={[styles.body, { color: theme.textSecondary }]}>준비하는 중...</Text>
      </Screen>
    );
  }

  if (profiles.length === 0) {
    return (
      <Screen>
        <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          <Text style={[styles.title, { color: theme.text }]}>아이 프로필이 필요합니다</Text>
          <Text style={[styles.body, { color: theme.textSecondary }]}>
            새 책을 만들기 전에 아이 프로필을 먼저 만들어 주세요.
          </Text>
          <PrimaryButton label="프로필 만들기" onPress={() => router.replace('/onboarding')} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen keyboardShouldPersistTaps="handled">
      {profiles.length > 1 ? (
        <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          <View style={styles.headerRow}>
            <Text style={[styles.title, { color: theme.text }]}>어느 아이 책인가요?</Text>
            <StatusPill label={`${profiles.length}명`} />
          </View>
          <View style={styles.row}>
            {profiles.map((profile) => {
              const selected = profile.id === selectedProfileId;
              return (
                <Pressable
                  key={profile.id}
                  onPress={() => setSelectedProfileId(profile.id)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: selected ? theme.accentSoft : theme.backgroundElement,
                      borderColor: selected ? theme.accent : theme.border,
                    },
                  ]}>
                  <Text style={styles.avatar}>{profile.avatar ?? '⭐'}</Text>
                  <Text style={[styles.chipText, { color: theme.text }]}>{profile.name}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: theme.text }]}>새 책 만들기</Text>
          <StatusPill
            label={activeProfile ? `${activeProfile.age}세 · ${bookCefr}` : bookCefr}
            tone="success"
          />
        </View>

        <Text style={[styles.label, { color: theme.text }]}>영어 레벨</Text>
        <View style={styles.row}>
          {CEFR_LEVELS.map((level) => {
            const selected = bookCefr === level;
            return (
              <Pressable
                key={level}
                onPress={() => setBookCefr(level)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: selected ? theme.accentSoft : theme.backgroundElement,
                    borderColor: selected ? theme.accent : theme.border,
                  },
                ]}>
                <Text style={[styles.chipText, { color: theme.text }]}>{level}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.label, { color: theme.text }]}>장르</Text>
        <View style={styles.row}>
          {GENRE_OPTIONS.map(([value, label]) => {
            const selected = bookGenre === value;
            return (
              <Pressable
                key={value}
                onPress={() => setBookGenre(value)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: selected ? theme.accentSoft : theme.backgroundElement,
                    borderColor: selected ? theme.accent : theme.border,
                  },
                ]}>
                <Text style={[styles.chipText, { color: theme.text }]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.label, { color: theme.text }]}>주제 (선택)</Text>
        <TextInput
          value={bookTopic}
          onChangeText={setBookTopic}
          placeholder="우주, 공룡, 바다 모험..."
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={80}
          style={[styles.input, { borderColor: theme.border, color: theme.text }]}
          placeholderTextColor={theme.textSecondary}
        />

        <Text style={[styles.helper, { color: theme.textSecondary }]}>
          책 1권 만들 때 별 1개를 사용합니다. {credits ? `현재 별 ${credits.balance}개.` : ''}
        </Text>

        <View style={[styles.intakeBox, { backgroundColor: theme.background, borderColor: theme.border }]}>
          <View style={styles.headerRow}>
            <Text style={[styles.subtitle, { color: theme.text }]}>맞춤 질문</Text>
            <StatusPill label={intakeQuestions.length > 0 ? `${intakeQuestions.length}개` : '선택'} />
          </View>
          <Text style={[styles.helper, { color: theme.textSecondary }]}>
            아이 취향을 더 알려주면 이야기 방향을 맞춰 드려요. 비워두고 만들어도 괜찮아요.
          </Text>
          {intakeQuestions.map((question) => (
            <View key={question.id} style={styles.stack}>
              <Text style={[styles.question, { color: theme.text }]}>{question.text}</Text>
              <TextInput
                value={intakeAnswers[question.id] ?? ''}
                onChangeText={(value) =>
                  setIntakeAnswers((current) => ({ ...current, [question.id]: value }))
                }
                placeholder={question.placeholder ?? '건너뛰어도 됩니다'}
                maxLength={160}
                style={[styles.input, { borderColor: theme.border, color: theme.text }]}
                placeholderTextColor={theme.textSecondary}
              />
              {question.suggestionChips && question.suggestionChips.length > 0 ? (
                <View style={styles.row}>
                  {question.suggestionChips.map((chip) => (
                    <Pressable
                      key={chip}
                      onPress={() =>
                        setIntakeAnswers((current) => ({ ...current, [question.id]: chip }))
                      }
                      style={[
                        styles.chip,
                        { backgroundColor: theme.backgroundElement, borderColor: theme.border },
                      ]}>
                      <Text style={[styles.chipText, { color: theme.text }]}>{chip}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>
          ))}
          {intakeError ? (
            <Text style={[styles.errorText, { color: theme.warning }]}>{intakeError}</Text>
          ) : null}
          <PrimaryButton
            label={
              intakeLoading
                ? '질문 준비 중...'
                : intakeQuestions.length > 0
                  ? '질문 다시 받기'
                  : '맞춤 질문 받기'
            }
            variant="soft"
            disabled={intakeLoading || creating}
            onPress={loadIntakeQuestions}
          />
        </View>

        {error ? <Text style={[styles.errorText, { color: theme.warning }]}>{error}</Text> : null}

        <PrimaryButton
          label={creating ? '책을 만드는 중...' : '새 책 만들기'}
          disabled={creating}
          onPress={handleCreate}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    alignSelf: 'stretch',
    borderWidth: 1,
    borderRadius: 24,
    padding: 18,
    gap: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
  helper: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  question: {
    fontSize: 14,
    fontWeight: '700',
  },
  errorText: {
    fontSize: 14,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  stack: {
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '700',
  },
  avatar: {
    fontSize: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: '500',
  },
  intakeBox: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    gap: 12,
  },
});
