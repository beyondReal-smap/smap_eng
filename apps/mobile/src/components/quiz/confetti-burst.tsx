import { useEffect, useMemo } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/hooks/use-theme';

interface PieceSpec {
  id: number;
  startX: number;
  driftX: number;
  rotateTo: number;
  delay: number;
  size: number;
  color: string;
}

/**
 * 만점 confetti — Reanimated 4 자체 구현.
 * 24 pieces · 1.6s 후 자동 소멸. 외부 라이브러리 의존성 없음(웹 동일 정책).
 *
 * - 각 조각은 화면 상단 임의 X 위치에서 시작
 * - translateY는 화면 높이의 70%만큼 낙하, translateX는 ±DRIFT_X drift
 * - 회전은 ±540deg 무작위
 * - delay 0~240ms 분산 — 한꺼번에 떨어지지 않도록
 *
 * pointer-events 차단을 위해 fixed-fullscreen `pointerEvents='none'`.
 */
const COUNT = 24;
const FALL_MS = 1600;
const COLORS_LIGHT = ['#F4A51C', '#0076AA', '#9C7BFF', '#FF6B9F', '#5BD06A'];

export function ConfettiBurst({ active }: { active: boolean }) {
  if (!active) return null;
  return <ConfettiInner />;
}

function ConfettiInner() {
  const theme = useTheme();
  const screen = useMemo(() => Dimensions.get('window'), []);
  const pieces = useMemo<PieceSpec[]>(() => {
    return Array.from({ length: COUNT }, (_, i) => ({
      id: i,
      startX: Math.random() * (screen.width - 16),
      driftX: (Math.random() - 0.5) * 220,
      rotateTo: (Math.random() - 0.5) * 1080,
      delay: Math.random() * 240,
      size: 8 + Math.random() * 6,
      color: COLORS_LIGHT[i % COLORS_LIGHT.length],
    }));
  }, [screen.width]);

  return (
    <View
      pointerEvents="none"
      style={[styles.layer, { height: screen.height }]}
      accessible={false}
      accessibilityElementsHidden>
      {pieces.map((p) => (
        <Piece key={p.id} spec={p} fallDistance={screen.height * 0.7} accent={theme.accent} />
      ))}
    </View>
  );
}

function Piece({
  spec,
  fallDistance,
}: {
  spec: PieceSpec;
  fallDistance: number;
  accent: string;
}) {
  const progress = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    progress.value = withDelay(
      spec.delay,
      withTiming(1, {
        duration: FALL_MS,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      }),
    );
    opacity.value = withDelay(
      spec.delay + FALL_MS - 280,
      withTiming(0, { duration: 280, easing: Easing.linear }),
    );
  }, [progress, opacity, spec.delay]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: progress.value * fallDistance },
      { translateX: progress.value * spec.driftX },
      { rotate: `${progress.value * spec.rotateTo}deg` },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.piece,
        {
          left: spec.startX,
          width: spec.size,
          height: spec.size * 1.6,
          backgroundColor: spec.color,
        },
        animatedStyle,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
  },
  piece: {
    position: 'absolute',
    top: -20,
    borderRadius: 2,
  },
});
