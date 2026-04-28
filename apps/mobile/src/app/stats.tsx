import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/common/screen';
import { StatusPill } from '@/components/common/status-pill';
import { Spacing } from '@/constants/theme';
import {
  fetchBooks,
  fetchLearningSummary,
  fetchProfiles,
  fetchVocabulary,
  type Book,
  type BookProgressStat,
  type LearningSummary,
  type Profile,
  type VocabEntry,
} from '@/lib/api';
import { useTheme } from '@/hooks/use-theme';

export default function StatsScreen() {
  const theme = useTheme();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [profileId, setProfileId] = useState<number | null>(null);
  const [summary, setSummary] = useState<LearningSummary | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [stats, setStats] = useState<Record<string, BookProgressStat>>({});
  const [vocab, setVocab] = useState<VocabEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadProfiles() {
      setLoading(true);
      try {
        const nextProfiles = await fetchProfiles();
        if (cancelled) return;
        setProfiles(nextProfiles);
        setProfileId(nextProfiles[0]?.id ?? null);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : '프로필을 불러오지 못했습니다.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadProfiles();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (profileId === null) return;
    const currentProfileId: number = profileId;
    let cancelled = false;
    async function loadStats() {
      setLoading(true);
      setError(null);
      try {
        const [nextSummary, library, nextVocab] = await Promise.all([
          fetchLearningSummary(currentProfileId),
          fetchBooks(currentProfileId),
          fetchVocabulary(currentProfileId),
        ]);
        if (cancelled) return;
        setSummary(nextSummary);
        setBooks(library.books);
        setStats(library.stats);
        setVocab(nextVocab);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : '통계를 불러오지 못했습니다.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadStats();
    return () => {
      cancelled = true;
    };
  }, [profileId]);

  const levelStats = useMemo(() => {
    return ['A1', 'A2', 'B1', 'B2'].map((level) => {
      const count = books.filter((book) => book.cefr === level).length;
      const finished = books.filter((book) => book.cefr === level && stats[String(book.id)]?.finishedAtUnix).length;
      return { level, count, finished };
    });
  }, [books, stats]);

  const recentScores = useMemo(() => {
    return books
      .map((book) => ({ book, stat: stats[String(book.id)] }))
      .filter((item): item is { book: Book; stat: BookProgressStat } => !!item.stat?.quizScore)
      .sort((a, b) => b.stat.startedAtUnix - a.stat.startedAtUnix)
      .slice(0, 5);
  }, [books, stats]);

  return (
    <Screen>
      <View style={[styles.hero, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        <StatusPill label="통계" tone="success" />
        <Text style={[styles.title, { color: theme.text }]}>읽기 흐름을 한 번에 봅니다</Text>
        <Text style={[styles.body, { color: theme.textSecondary }]}>
          웹 통계와 같은 API를 사용해 완독, 퀴즈, 단어, 레벨 분포를 보여줍니다.
        </Text>
      </View>

      <View style={styles.profileRow}>
        {profiles.map((profile) => {
          const selected = profile.id === profileId;
          return (
            <Pressable
              key={profile.id}
              onPress={() => setProfileId(profile.id)}
              style={[
                styles.profileChip,
                {
                  backgroundColor: selected ? theme.accentSoft : theme.backgroundElement,
                  borderColor: selected ? theme.accent : theme.border,
                },
              ]}>
              <Text style={styles.avatar}>{profile.avatar ?? '⭐'}</Text>
              <Text style={[styles.profileName, { color: theme.text }]}>{profile.name}</Text>
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <Text style={[styles.body, { color: theme.textSecondary }]}>통계를 불러오는 중...</Text>
      ) : error ? (
        <Text style={[styles.error, { color: theme.warning }]}>{error}</Text>
      ) : summary ? (
        <>
          <View style={styles.metricGrid}>
            {[
              ['완독한 책', `${summary.totalBooksRead}권`],
              ['완료 세션', `${summary.totalFinishedSessions}회`],
              ['퀴즈 만점', `${summary.totalPerfectScores}회`],
              ['평균 정답률', summary.averageAccuracy === null ? '-' : `${Math.round(summary.averageAccuracy * 100)}%`],
              ['이번 주 활동', `${summary.activeDaysThisWeek.length}일`],
              ['단어 누적', `${vocab.length}개`],
            ].map(([label, value]) => (
              <View key={label} style={[styles.metricCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                <Text style={[styles.metricValue, { color: theme.text }]}>{value}</Text>
                <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>{label}</Text>
              </View>
            ))}
          </View>

          <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>레벨별 책장</Text>
            {levelStats.map((item) => (
              <View key={item.level} style={styles.row}>
                <Text style={[styles.rowLabel, { color: theme.text }]}>{item.level}</Text>
                <Text style={[styles.rowValue, { color: theme.textSecondary }]}>
                  {item.count}권 · 완독 {item.finished}권
                </Text>
              </View>
            ))}
          </View>

          <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>최근 퀴즈</Text>
            {recentScores.length > 0 ? (
              recentScores.map(({ book, stat }) => (
                <View key={book.id} style={styles.row}>
                  <Text style={[styles.rowLabel, { color: theme.text }]}>{book.title}</Text>
                  <Text style={[styles.rowValue, { color: theme.textSecondary }]}>{stat.quizScore} / 5</Text>
                </View>
              ))
            ) : (
              <Text style={[styles.body, { color: theme.textSecondary }]}>아직 저장된 퀴즈 점수가 없습니다.</Text>
            )}
          </View>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderWidth: 1,
    borderRadius: 28,
    padding: Spacing.four,
    gap: 12,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
  },
  profileRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  profileChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatar: {
    fontSize: 18,
  },
  profileName: {
    fontSize: 14,
    fontWeight: '800',
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricCard: {
    flexGrow: 1,
    flexBasis: '46%',
    borderWidth: 1,
    borderRadius: 22,
    padding: Spacing.three,
    gap: 4,
  },
  metricValue: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  card: {
    borderWidth: 1,
    borderRadius: 28,
    padding: Spacing.three,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '800',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  rowLabel: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '800',
  },
  rowValue: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  error: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },
});
