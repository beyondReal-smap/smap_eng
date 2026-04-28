import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Platform, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { SessionCard } from '@/components/auth/session-card';
import { BookCard } from '@/components/books/book-card';
import { PrimaryButton } from '@/components/common/primary-button';
import { Screen } from '@/components/common/screen';
import { StatusPill } from '@/components/common/status-pill';
import {
  fetchBooks,
  fetchCredits,
  fetchLearningSummary,
  fetchProfiles,
  MobileApiError,
  type Book,
  type BookProgressStat,
  type CreditBalance,
  type LearningSummary,
  type Profile,
} from '@/lib/api';
import { blurActiveElement } from '@/lib/focus';
import { clearStoredMobileSession } from '@/lib/mobile-session';
import { useTheme } from '@/hooks/use-theme';

type ShortcutItem = {
  key: 'vocab' | 'stats' | 'parents' | 'subscribe';
  label: string;
  detail: string;
  href: '/vocab' | '/stats' | '/parents' | '/subscribe';
};

export default function HomeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [stats, setStats] = useState<Record<string, BookProgressStat>>({});
  const [credits, setCredits] = useState<CreditBalance | null>(null);
  const [summary, setSummary] = useState<LearningSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeProfile = profiles.find((profile) => profile.id === selectedProfileId) ?? null;

  // 401 응답은 _layout 가드와의 안전망. 세션이 만료된 경우 stale 토큰 정리 후 로그인으로.
  async function handleAuthFailure() {
    await clearStoredMobileSession();
    router.replace('/login');
  }

  async function loadAll(refresh = false) {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const [nextProfiles, nextCredits] = await Promise.all([fetchProfiles(), fetchCredits()]);
      setProfiles(nextProfiles);
      setCredits(nextCredits);

      if (nextProfiles.length === 0) {
        // 첫 사용자: 책장이 없으니 onboarding 흐름으로.
        setBooks([]);
        setStats({});
        setSummary(null);
        router.replace('/onboarding');
        return;
      }

      const activeId =
        selectedProfileId && nextProfiles.some((p) => p.id === selectedProfileId)
          ? selectedProfileId
          : nextProfiles[0]!.id;
      setSelectedProfileId(activeId);

      const [library, nextSummary] = await Promise.all([
        fetchBooks(activeId),
        fetchLearningSummary(activeId),
      ]);
      setBooks(library.books);
      setStats(library.stats);
      setSummary(nextSummary);
    } catch (err) {
      if (err instanceof MobileApiError && (err.status === 401 || err.status === 302)) {
        await handleAuthFailure();
        return;
      }
      setError(err instanceof Error ? err.message : '책장을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadAll(false);
    // 마운트 1회. 프로필 전환은 selectProfile에서 별도 처리.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function selectProfile(profileId: number) {
    if (profileId === selectedProfileId) return;
    setSelectedProfileId(profileId);
    setLoading(true);
    setError(null);
    try {
      const [library, nextSummary] = await Promise.all([
        fetchBooks(profileId),
        fetchLearningSummary(profileId),
      ]);
      setBooks(library.books);
      setStats(library.stats);
      setSummary(nextSummary);
    } catch (err) {
      if (err instanceof MobileApiError && (err.status === 401 || err.status === 302)) {
        await handleAuthFailure();
        return;
      }
      setError(err instanceof Error ? err.message : '책을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }

  function goCreateBook() {
    if (!activeProfile) return;
    if (credits && credits.balance <= 0) {
      blurActiveElement();
      router.push('/subscribe');
      return;
    }
    blurActiveElement();
    router.push({
      pathname: '/books/new',
      params: { profileId: String(activeProfile.id) },
    });
  }

  function goContinue() {
    if (!summary?.continueBookId) return;
    blurActiveElement();
    router.push({
      pathname: '/books/[bookId]',
      params: { bookId: String(summary.continueBookId) },
    });
  }

  function goShortcut(href: ShortcutItem['href']) {
    blurActiveElement();
    router.push(href);
  }

  const shortcuts: ShortcutItem[] = [
    { key: 'vocab', label: '단어장', detail: '누적 어휘와 복습', href: '/vocab' },
    { key: 'stats', label: '통계', detail: '읽기·퀴즈 흐름', href: '/stats' },
    { key: 'parents', label: '보호자', detail: '주간 리포트', href: '/parents' },
    {
      key: 'subscribe',
      label: '별 충전',
      detail: credits ? `현재 ${credits.balance}개` : '크레딧 확인',
      href: '/subscribe',
    },
  ];

  const continueBook = summary?.continueBookId
    ? books.find((b) => b.id === summary.continueBookId)
    : null;

  return (
    <Screen
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => loadAll(true)} />
      }>
      {/* 1. 상단 바 — 브랜드 + 별 잔액 chip */}
      <View style={styles.topBar}>
        <View style={styles.brandCluster}>
          <View style={[styles.brandMark, { backgroundColor: theme.paperWarm, borderColor: theme.border }]}>
            <Image
              source={require('@/assets/images/book_icon.png')}
              style={styles.brandImage}
              resizeMode="contain"
            />
          </View>
          <Text style={[styles.brandText, { color: theme.text }]}>하루책</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="별 충전"
          onPress={() => goShortcut('/subscribe')}
          style={({ pressed }) => [
            styles.starChip,
            {
              backgroundColor: theme.accentSoft,
              borderColor: theme.goldDeep,
              opacity: pressed ? 0.78 : 1,
            },
          ]}>
          <Text style={styles.starIcon}>⭐</Text>
          <Text style={[styles.starChipText, { color: theme.text }]}>
            {credits ? `${credits.balance}` : '-'}
          </Text>
        </Pressable>
      </View>

      {/* 2. 활성 프로필 헤더 + 프로필 전환 chip row */}
      {activeProfile ? (
        <View style={styles.profileHeader}>
          <View style={[styles.activeAvatar, { backgroundColor: theme.accentSoft, borderColor: theme.accent }]}>
            <Text style={styles.activeAvatarText}>{activeProfile.avatar ?? '⭐'}</Text>
          </View>
          <View style={styles.profileTitleColumn}>
            <Text style={[styles.profileGreeting, { color: theme.textSecondary }]}>
              {activeProfile.age}세 · 영어 책장
            </Text>
            <Text style={[styles.profileTitle, { color: theme.text }]}>
              {activeProfile.name}의 하루책
            </Text>
          </View>
        </View>
      ) : null}

      {profiles.length > 1 ? (
        <View style={styles.profileSwitchRow}>
          {profiles.map((profile) => {
            const selected = profile.id === selectedProfileId;
            return (
              <Pressable
                key={profile.id}
                onPress={() => selectProfile(profile.id)}
                style={[
                  styles.profileChip,
                  {
                    backgroundColor: selected ? theme.accentSoft : theme.backgroundElement,
                    borderColor: selected ? theme.accent : theme.border,
                  },
                ]}>
                <Text style={styles.profileChipAvatar}>{profile.avatar ?? '⭐'}</Text>
                <Text style={[styles.profileChipName, { color: theme.text }]}>{profile.name}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {error ? (
        <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>확인 필요</Text>
            <StatusPill label="오류" tone="warning" />
          </View>
          <Text style={[styles.errorText, { color: theme.warning }]}>{error}</Text>
        </View>
      ) : null}

      {/* 3. 이어 읽기 카드 */}
      {continueBook ? (
        <Pressable
          onPress={goContinue}
          style={({ pressed }) => [
            styles.continueCard,
            {
              backgroundColor: theme.sky,
              borderColor: theme.skyInk,
              opacity: pressed ? 0.85 : 1,
            },
          ]}>
          <View style={styles.continueRow}>
            <View style={styles.continueColumn}>
              <Text style={[styles.continueEyebrow, { color: theme.skyInk }]}>이어 읽기</Text>
              <Text style={[styles.continueTitle, { color: theme.text }]}>
                {continueBook.title}
              </Text>
              <Text style={[styles.continueDetail, { color: theme.textSecondary }]}>
                마지막에 읽던 책으로 바로 가요.
              </Text>
            </View>
            <Text style={[styles.continueArrow, { color: theme.text }]}>→</Text>
          </View>
        </Pressable>
      ) : null}

      {/* 4. 책장 (BookCard 리스트) + 새 책 만들기 CTA */}
      <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>책장</Text>
          <StatusPill label={`${books.length}권`} />
        </View>
        {loading ? (
          <Text style={[styles.body, { color: theme.textSecondary }]}>책장을 불러오는 중...</Text>
        ) : books.length > 0 ? (
          <View style={styles.bookList}>
            {books.map((book) => (
              <BookCard key={book.id} book={book} stat={stats[String(book.id)]} />
            ))}
          </View>
        ) : (
          <Text style={[styles.body, { color: theme.textSecondary }]}>
            아직 만든 책이 없어요. 아래 버튼으로 첫 책을 만들어 보세요.
          </Text>
        )}

        <Pressable
          accessibilityRole="button"
          onPress={goCreateBook}
          disabled={!activeProfile}
          style={({ pressed }) => [
            styles.createCta,
            {
              backgroundColor: theme.accent,
              borderColor: theme.goldDeep,
              opacity: !activeProfile ? 0.5 : pressed ? 0.82 : 1,
            },
          ]}>
          <Text style={styles.createCtaPlus}>＋</Text>
          <Text style={[styles.createCtaText, { color: theme.text }]}>새 책 만들기</Text>
        </Pressable>
        {credits ? (
          <Text style={[styles.helper, { color: theme.textSecondary }]}>
            책 1권을 만들 때 별 1개를 사용해요. 현재 별 {credits.balance}개.
          </Text>
        ) : null}
      </View>

      {/* 5. 학습 요약 */}
      {summary ? (
        <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>이번 주 학습</Text>
            <StatusPill label="요약" tone="success" />
          </View>
          <View style={styles.metricGrid}>
            {[
              ['완독', `${summary.totalBooksRead}권`],
              ['세션', `${summary.totalFinishedSessions}회`],
              ['만점', `${summary.totalPerfectScores}회`],
              [
                '정답률',
                summary.averageAccuracy === null
                  ? '-'
                  : `${Math.round(summary.averageAccuracy * 100)}%`,
              ],
            ].map(([label, value]) => (
              <View
                key={label}
                style={[styles.metricCard, { backgroundColor: theme.background, borderColor: theme.border }]}>
                <Text style={[styles.metricValue, { color: theme.text }]}>{value}</Text>
                <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>{label}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {/* 6. 하단 단축 그리드 */}
      <View style={styles.shortcutGrid}>
        {shortcuts.map((item) => (
          <Pressable
            key={item.key}
            onPress={() => goShortcut(item.href)}
            style={({ pressed }) => [
              styles.shortcutCard,
              {
                backgroundColor: theme.backgroundElement,
                borderColor: theme.border,
                opacity: pressed ? 0.78 : 1,
              },
            ]}>
            <Text style={[styles.shortcutTitle, { color: theme.text }]}>{item.label}</Text>
            <Text style={[styles.shortcutDetail, { color: theme.textSecondary }]}>{item.detail}</Text>
          </Pressable>
        ))}
      </View>

      {/* 7. 세션 카드 (로그아웃) — 네이티브 전용 */}
      {Platform.OS === 'web' ? null : (
        <SessionCard
          onChanged={async () => {
            // 로그아웃 후 _layout 가드가 다음 마운트에서 redirect 처리.
            // 여기서는 즉시 로그인 화면으로 보내 잔존 UI 노출 차단.
            await handleAuthFailure();
          }}
        />
      )}

      {/* 새 프로필 만들기 — 추가 자녀 등록용 (이미 1명 이상 있을 때만 노출) */}
      {profiles.length > 0 ? (
        <PrimaryButton
          label="아이 추가하기"
          variant="soft"
          onPress={() => {
            blurActiveElement();
            router.push('/onboarding');
          }}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: {
    alignSelf: 'stretch',
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  brandCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandMark: {
    width: 40,
    height: 40,
    borderWidth: 1,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandImage: {
    width: 28,
    height: 28,
  },
  brandText: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  starChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 40,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
  },
  starIcon: {
    fontSize: 18,
  },
  starChipText: {
    fontSize: 16,
    fontWeight: '800',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingTop: 4,
  },
  activeAvatar: {
    width: 64,
    height: 64,
    borderWidth: 2,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeAvatarText: {
    fontSize: 32,
  },
  profileTitleColumn: {
    flex: 1,
    gap: 2,
  },
  profileGreeting: {
    fontSize: 13,
    fontWeight: '600',
  },
  profileTitle: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  profileSwitchRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  profileChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  profileChipAvatar: {
    fontSize: 16,
  },
  profileChipName: {
    fontSize: 14,
    fontWeight: '700',
  },
  card: {
    alignSelf: 'stretch',
    borderWidth: 1,
    borderRadius: 24,
    padding: 18,
    gap: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
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
  errorText: {
    fontSize: 14,
    fontWeight: '600',
  },
  continueCard: {
    alignSelf: 'stretch',
    borderWidth: 1,
    borderRadius: 24,
    padding: 18,
  },
  continueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  continueColumn: {
    flex: 1,
    gap: 4,
  },
  continueEyebrow: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
  continueTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  continueDetail: {
    fontSize: 13,
    fontWeight: '600',
  },
  continueArrow: {
    fontSize: 32,
    fontWeight: '800',
  },
  bookList: {
    gap: 12,
  },
  createCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 54,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 18,
  },
  createCtaPlus: {
    fontSize: 22,
    fontWeight: '800',
  },
  createCtaText: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
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
    borderRadius: 18,
    padding: 14,
    gap: 4,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  metricLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  shortcutGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  shortcutCard: {
    flexGrow: 1,
    flexBasis: '46%',
    borderWidth: 1,
    borderRadius: 22,
    padding: 16,
    gap: 6,
  },
  shortcutTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  shortcutDetail: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
});
