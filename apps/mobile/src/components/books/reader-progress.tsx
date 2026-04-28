import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

interface ReaderProgressProps {
  currentIndex: number;
  total: number;
  ttsReadyCount: number;
  ttsTotal: number;
  endingLabel?: string | null;
}

/**
 * 진행 게이지 + 카운터 + TTS 준비 배지.
 *
 * 웹 reader.tsx의 진행도 영역(912~936)과 동등. RN에서 Progress 컴포넌트가 없어
 * View 두 개를 겹쳐 width 비율로 그린다.
 */
export function ReaderProgress({
  currentIndex,
  total,
  ttsReadyCount,
  ttsTotal,
  endingLabel,
}: ReaderProgressProps) {
  const theme = useTheme();
  const progressPct = total > 0 ? Math.min(100, ((currentIndex + 1) / total) * 100) : 0;
  const allTtsReady = ttsTotal === 0 || ttsReadyCount >= ttsTotal;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={[styles.counter, { color: theme.textSecondary }]} accessibilityLiveRegion="polite">
          {currentIndex + 1}{' '}
          <Text style={{ color: theme.border }}>/</Text> {total} 문장
          {endingLabel ? (
            <Text style={[styles.endingTag, { backgroundColor: theme.backgroundElement, color: theme.text, borderColor: theme.border }]}>
              {' '}
              {endingLabel}
            </Text>
          ) : null}
        </Text>
        <View style={styles.right}>
          {!allTtsReady ? (
            <View style={[styles.badge, { backgroundColor: theme.backgroundElement }]}>
              <Text style={[styles.badgeText, { color: theme.textSecondary }]}>
                🎙️ 낭독 준비 {ttsReadyCount}/{ttsTotal}
              </Text>
            </View>
          ) : null}
          <Text style={[styles.percent, { color: theme.accent }]}>
            {Math.round(progressPct)}%
          </Text>
        </View>
      </View>
      <View style={[styles.track, { backgroundColor: theme.border }]}>
        <View
          style={[
            styles.fill,
            { width: `${progressPct}%`, backgroundColor: theme.accent },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  counter: {
    fontSize: 12,
    fontWeight: '700',
    flexShrink: 1,
  },
  endingTag: {
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
    overflow: 'hidden',
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  percent: {
    fontSize: 12,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  track: {
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 999,
  },
});
