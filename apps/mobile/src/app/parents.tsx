import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/common/primary-button';
import { Screen } from '@/components/common/screen';
import { StatusPill } from '@/components/common/status-pill';
import { ParentalPinGate } from '@/components/parents/pin-gate';
import { Spacing } from '@/constants/theme';
import {
  deleteBook,
  fetchParentReport,
  unflagBook,
  type ParentReport,
} from '@/lib/api';
import { useTheme } from '@/hooks/use-theme';

/**
 * 보호자 화면 — 웹과 동일한 정책으로 PIN 게이트로 보호한다.
 * 게이트와 콘텐츠 모두 동일한 Screen(스크롤+SafeArea+여백)을 공유한다.
 */
export default function ParentsScreen() {
  return (
    <Screen>
      <ParentalPinGate>
        <ParentsContent />
      </ParentalPinGate>
    </Screen>
  );
}

function ParentsContent() {
  const theme = useTheme();
  const [report, setReport] = useState<ParentReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    setLoading(true);
    setError(null);
    try {
      setReport(await fetchParentReport());
    } catch (err) {
      setError(err instanceof Error ? err.message : '보호자 리포트를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  async function restoreBook(bookId: number) {
    setBusyId(bookId);
    setError(null);
    try {
      await unflagBook(bookId);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : '신고를 철회하지 못했습니다.');
    } finally {
      setBusyId(null);
    }
  }

  async function hideBook(bookId: number) {
    if (confirmDeleteId !== bookId) {
      setConfirmDeleteId(bookId);
      return;
    }
    setBusyId(bookId);
    setError(null);
    try {
      await deleteBook(bookId);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : '책을 숨기지 못했습니다.');
    } finally {
      setBusyId(null);
      setConfirmDeleteId(null);
    }
  }

  return (
    <>
      <View style={[styles.hero, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        <StatusPill label="보호자" tone="success" />
        <Text style={[styles.title, { color: theme.text }]}>주간 학습과 신고 책을 확인합니다</Text>
        <Text style={[styles.body, { color: theme.textSecondary }]}>
          웹 보호자 모드와 같은 리포트 API를 사용합니다. 신고된 책은 여기에서 복원하거나 숨길 수 있습니다.
        </Text>
      </View>

      {loading ? (
        <Text style={[styles.body, { color: theme.textSecondary }]}>리포트를 불러오는 중...</Text>
      ) : error ? (
        <Text style={[styles.error, { color: theme.warning }]}>{error}</Text>
      ) : report.length > 0 ? (
        report.map((profile) => (
          <View key={profile.profileId} style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <View style={styles.header}>
              <View style={styles.profileNameRow}>
                <Text style={styles.avatar}>{profile.avatar ?? '⭐'}</Text>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>{profile.name}</Text>
              </View>
              <StatusPill label={`${profile.activeDays.length}일 활동`} />
            </View>
            <View style={styles.metricGrid}>
              {[
                ['새 책', `${profile.booksCreatedWeek}권`],
                ['완료', `${profile.sessionsFinishedWeek}회`],
                ['정답률', profile.averageAccuracyWeek === null ? '-' : `${Math.round(profile.averageAccuracyWeek * 100)}%`],
                ['만점', `${profile.totalPerfect}회`],
              ].map(([label, value]) => (
                <View key={label} style={[styles.metricCard, { backgroundColor: theme.background, borderColor: theme.border }]}>
                  <Text style={[styles.metricValue, { color: theme.text }]}>{value}</Text>
                  <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>{label}</Text>
                </View>
              ))}
            </View>
            <View style={styles.flaggedList}>
              <Text style={[styles.subTitle, { color: theme.text }]}>보호자 확인 책</Text>
              {profile.flaggedBooks.length > 0 ? (
                profile.flaggedBooks.map((book) => (
                  <View key={book.id} style={[styles.flagCard, { backgroundColor: theme.background, borderColor: theme.border }]}>
                    <Text style={[styles.flagTitle, { color: theme.text }]}>{book.title}</Text>
                    <Text style={[styles.body, { color: theme.textSecondary }]}>
                      {book.reason ?? '사유 없음'}
                    </Text>
                    <View style={styles.actions}>
                      <PrimaryButton
                        label={busyId === book.id ? '처리 중...' : '책장 복귀'}
                        variant="soft"
                        disabled={busyId !== null}
                        onPress={() => restoreBook(book.id)}
                      />
                      <PrimaryButton
                        label={confirmDeleteId === book.id ? '숨김 확인' : '숨기기'}
                        variant="soft"
                        disabled={busyId !== null}
                        onPress={() => hideBook(book.id)}
                      />
                    </View>
                  </View>
                ))
              ) : (
                <Text style={[styles.body, { color: theme.textSecondary }]}>확인 대기 중인 책이 없습니다.</Text>
              )}
            </View>
          </View>
        ))
      ) : (
        <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          <StatusPill label="비어 있음" tone="warning" />
          <Text style={[styles.sectionTitle, { color: theme.text }]}>자녀 프로필이 없습니다.</Text>
        </View>
      )}

      <Pressable onPress={reload} style={[styles.reload, { borderColor: theme.border }]}>
        <Text style={[styles.reloadText, { color: theme.forest }]}>리포트 새로고침</Text>
      </Pressable>
    </>
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
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '600',
  },
  card: {
    borderWidth: 1,
    borderRadius: 28,
    padding: Spacing.three,
    gap: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center',
  },
  profileNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatar: {
    fontSize: 24,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 21,
    lineHeight: 27,
    fontWeight: '800',
  },
  subTitle: {
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '800',
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metricCard: {
    flexGrow: 1,
    flexBasis: '46%',
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
    gap: 4,
  },
  metricValue: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  flaggedList: {
    gap: 10,
  },
  flagCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: Spacing.three,
    gap: 10,
  },
  flagTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '800',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reload: {
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: 12,
    alignItems: 'center',
  },
  reloadText: {
    fontSize: 14,
    fontWeight: '800',
  },
  error: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },
});
