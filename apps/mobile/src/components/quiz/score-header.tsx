import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface ScoreHeaderProps {
  title: string;
  score: number;
  total: number;
}

/**
 * 결과 카드 — 만점 트로피 회전, 점수, 진행 게이지.
 * 웹 quiz-runner.tsx:438~476 ScoreHeader와 동등.
 *
 * RN에서는 ratio 별 표정 이모지를 텍스트로 그대로 사용.
 * 만점일 때만 트로피가 1회 360deg 회전 후 정지(웹 animate-trophy 대응).
 */
export function ScoreHeader({ title, score, total }: ScoreHeaderProps) {
  const theme = useTheme();
  const ratio = total > 0 ? score / total : 0;
  const isPerfect = ratio === 1;
  const emoji = isPerfect ? '🏆' : ratio >= 0.6 ? '🎉' : '💪';
  const label = isPerfect
    ? '만점!'
    : ratio >= 0.6
      ? '잘했어요'
      : '한 번 더 읽어볼까요?';
  const pct = Math.round(ratio * 100);

  const rotation = useSharedValue(0);
  useEffect(() => {
    if (!isPerfect) return;
    rotation.value = 0;
    rotation.value = withRepeat(
      withTiming(360, { duration: 900, easing: Easing.out(Easing.cubic) }),
      1,
      false,
    );
  }, [isPerfect, rotation]);

  const trophyStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.backgroundElement, borderColor: theme.border },
      ]}>
      <Animated.Text style={[styles.emoji, isPerfect ? trophyStyle : undefined]}>
        {emoji}
      </Animated.Text>
      <View style={styles.scoreRow}>
        <Text style={[styles.scoreNum, { color: theme.accent }]}>{score}</Text>
        <Text style={[styles.scoreSep, { color: theme.textSecondary }]}>
          {' / '}
          {total}
        </Text>
      </View>
      <Text style={[styles.caption, { color: theme.textSecondary }]}>
        {label} · {title}
      </Text>
      <View style={[styles.track, { backgroundColor: theme.border }]}>
        <View
          style={[
            styles.fill,
            { backgroundColor: theme.accent, width: `${pct}%` },
          ]}
        />
      </View>
      <Text style={[styles.percent, { color: theme.accent }]}>{pct}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 28,
    paddingVertical: Spacing.four,
    paddingHorizontal: Spacing.three,
    gap: 8,
    alignItems: 'center',
  },
  emoji: {
    fontSize: 56,
    lineHeight: 64,
    marginBottom: 2,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  scoreNum: {
    fontSize: 38,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    letterSpacing: -1,
  },
  scoreSep: {
    fontSize: 22,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  caption: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  track: {
    marginTop: 10,
    width: '100%',
    maxWidth: 320,
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 999,
  },
  percent: {
    fontSize: 12,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
});
