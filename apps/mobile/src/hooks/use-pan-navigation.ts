import { useMemo } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-worklets';

interface PanNavigationOptions {
  onPrev?: () => void;
  onNext?: () => void;
  // 임계값(px). 이 거리 이상 좌/우 스와이프 시 콜백 발화.
  threshold?: number;
  enabled?: boolean;
}

/**
 * 좌우 스와이프로 Reader 페이지를 넘기는 Pan 제스처.
 *
 * 세로 스크롤(ScrollView)과 충돌하지 않도록 activeOffsetX로 분리:
 * - 가로 변위 |Δx| > 10 일 때만 제스처가 활성화되고
 * - 세로 변위는 [-20, 20] 안에서만 시작을 허용해 수직 스크롤 의도를 우선
 *
 * worklets의 runOnJS로 JS 스레드 콜백을 호출. enabled=false면 제스처가
 * 평가되지 않아 다른 화면(설정/단어장)에서 충돌하지 않는다.
 */
export function usePanNavigation({
  onPrev,
  onNext,
  threshold = 60,
  enabled = true,
}: PanNavigationOptions) {
  return useMemo(() => {
    const gesture = Gesture.Pan()
      .enabled(enabled)
      .activeOffsetX([-10, 10])
      .failOffsetY([-20, 20])
      .onEnd((event) => {
        'worklet';
        if (event.translationX <= -threshold) {
          if (onNext) runOnJS(onNext)();
          return;
        }
        if (event.translationX >= threshold) {
          if (onPrev) runOnJS(onPrev)();
        }
      });
    return gesture;
  }, [onPrev, onNext, threshold, enabled]);
}
