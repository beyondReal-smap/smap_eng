import { useEffect, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/common/primary-button';
import { Screen } from '@/components/common/screen';
import { StatusPill } from '@/components/common/status-pill';
import { Spacing } from '@/constants/theme';
import { fetchCredits, type CreditBalance } from '@/lib/api';
import { API_BASE_URL } from '@/lib/config';
import { useTheme } from '@/hooks/use-theme';

const PACKAGES = [
  {
    id: 'small',
    name: '별 1개',
    price: '1,900원',
    body: '한 편만 먼저 만들어 보는 맛보기 팩입니다.',
  },
  {
    id: 'medium',
    name: '별 50개 팩',
    price: '9,900원',
    body: '가족 책장을 꾸준히 채우는 추천 팩입니다.',
  },
  {
    id: 'large',
    name: '별 600개 팩',
    price: '89,000원',
    body: '장기 학습 루틴을 위한 대용량 팩입니다.',
  },
] as const;

export default function SubscribeScreen() {
  const theme = useTheme();
  const [credits, setCredits] = useState<CreditBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    setLoading(true);
    setError(null);
    try {
      setCredits(await fetchCredits());
    } catch (err) {
      setError(err instanceof Error ? err.message : '별 잔액을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  async function openWebSubscribe() {
    const url = new URL('/subscribe', API_BASE_URL);
    await Linking.openURL(url.toString());
  }

  return (
    <Screen>
      <View style={[styles.hero, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        <StatusPill label="별 충전" tone="success" />
        <Text style={[styles.title, { color: theme.text }]}>새 책을 만들 별을 충전합니다</Text>
        <Text style={[styles.body, { color: theme.textSecondary }]}>
          결제는 웹 결제창에서 안전하게 진행됩니다. 모바일 로그인 때 사용한 브라우저 세션을 그대로 사용합니다.
        </Text>
      </View>

      <View style={[styles.balanceCard, { backgroundColor: theme.accentSoft, borderColor: theme.accent }]}>
        <Text style={[styles.balanceValue, { color: theme.text }]}>
          {loading ? '확인 중' : credits ? `별 ${credits.balance}개` : '-'}
        </Text>
        <Text style={[styles.body, { color: theme.text }]}>현재 가족 잔액</Text>
        {error ? <Text style={[styles.error, { color: theme.warning }]}>{error}</Text> : null}
      </View>

      {PACKAGES.map((pack) => (
        <View key={pack.id} style={[styles.planCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          <View style={styles.planHeader}>
            <Text style={[styles.planName, { color: theme.text }]}>{pack.name}</Text>
            <StatusPill label={pack.price} tone={pack.id === 'medium' ? 'success' : 'neutral'} />
          </View>
          <Text style={[styles.body, { color: theme.textSecondary }]}>{pack.body}</Text>
        </View>
      ))}

      <PrimaryButton label="웹 결제창 열기" onPress={openWebSubscribe} />
      <PrimaryButton label="잔액 새로고침" variant="soft" onPress={reload} />
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
  balanceCard: {
    borderWidth: 1,
    borderRadius: 28,
    padding: Spacing.four,
    gap: 8,
  },
  balanceValue: {
    fontSize: 38,
    lineHeight: 44,
    fontWeight: '800',
  },
  planCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: Spacing.three,
    gap: 10,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  planName: {
    flex: 1,
    fontSize: 21,
    lineHeight: 27,
    fontWeight: '800',
  },
  error: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },
});
