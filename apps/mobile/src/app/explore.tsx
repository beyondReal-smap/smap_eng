import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/common/screen';
import { StatusPill } from '@/components/common/status-pill';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const steps = [
  {
    title: '1. 아이 프로필',
    detail: '이름, 나이, 영어 레벨, 좋아하는 이야기 소재를 살짝 알려주세요.',
  },
  {
    title: '2. 오늘의 동화',
    detail: '아이에게 딱 맞는 새 영어 동화를 AI가 매일 한 권 만들어 드려요.',
  },
  {
    title: '3. 듣고 따라 읽기',
    detail: '문장별 낭독과 한글 번역이 함께 나와 혼자서도 쉽게 읽어요.',
  },
  {
    title: '4. 퀴즈로 마무리',
    detail: '읽은 내용 퀴즈와 단어 복습으로 오늘 읽기를 똑똑하게 닫아요.',
  },
] as const;

export default function ExploreScreen() {
  const theme = useTheme();

  return (
    <Screen>
      <View style={[styles.hero, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        <StatusPill label="How it works" tone="success" />
        <Text style={[styles.title, { color: theme.text }]}>네 걸음이면, 오늘 읽기 끝!</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          복잡한 설정 없이 아이 프로필만 있으면 매일 새 책이 준비됩니다.
        </Text>
      </View>

      {steps.map((item) => (
        <View key={item.title} style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>{item.title}</Text>
          </View>
          <Text style={[styles.detail, { color: theme.textSecondary }]}>{item.detail}</Text>
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderWidth: 1,
    borderRadius: 32,
    padding: Spacing.four,
    gap: 14,
  },
  title: {
    fontSize: 32,
    lineHeight: 36,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
  card: {
    borderWidth: 1,
    borderRadius: 24,
    padding: Spacing.three,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  cardTitle: {
    flex: 1,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800',
  },
  detail: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '500',
  },
});
