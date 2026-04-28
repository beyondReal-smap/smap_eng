import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useEffect, useRef } from 'react';

import { PrimaryButton } from '@/components/common/primary-button';

interface AudioButtonProps {
  audioUrl: string | null;
  onEnded?: () => void;
  autoPlayOnLoad?: boolean;
}

export function AudioButton({ audioUrl, onEnded, autoPlayOnLoad }: AudioButtonProps) {
  const player = useAudioPlayer(audioUrl, { updateInterval: 500 });
  const status = useAudioPlayerStatus(player);
  // didJustFinish는 Android에서 다음 status update까지 true가 유지될 수 있어
  // 1회만 트리거하도록 ref로 가드. status.playing이 다시 false인 정지 구간이
  // 끝나면 ref를 해제해 다음 재생-종료 사이클에 다시 콜백이 발화한다.
  const lastFinishedRef = useRef(false);
  // autoPlayOnLoad는 새 audioUrl이 들어왔을 때 1회만 자동재생을 트리거한다.
  // 같은 url로 재진입 시 사용자의 일시정지 의도를 덮어쓰지 않도록 url별 가드.
  const autoPlayedUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (status.didJustFinish && !lastFinishedRef.current) {
      lastFinishedRef.current = true;
      onEnded?.();
      return;
    }
    if (!status.didJustFinish) {
      lastFinishedRef.current = false;
    }
  }, [status.didJustFinish, onEnded]);

  useEffect(() => {
    if (!autoPlayOnLoad || !audioUrl) return;
    if (autoPlayedUrlRef.current === audioUrl) return;
    autoPlayedUrlRef.current = audioUrl;
    try {
      player.seekTo(0);
      player.play();
    } catch {
      // 플레이어가 아직 source를 로드하지 못한 상태 — status.isLoaded 변화에서
      // 다음 effect 사이클이 다시 실행되지 않으므로 1프레임 후 재시도.
      const retry = setTimeout(() => {
        try {
          player.seekTo(0);
          player.play();
        } catch {
          /* 재시도도 실패 — 사용자가 수동 버튼 누를 때 동작 */
        }
      }, 200);
      return () => clearTimeout(retry);
    }
  }, [autoPlayOnLoad, audioUrl, player]);

  if (!audioUrl) {
    return <PrimaryButton label="음성 준비 전" variant="soft" disabled />;
  }

  return (
    <PrimaryButton
      label={status.playing ? '음성 멈춤' : '음성 재생'}
      variant={status.playing ? 'soft' : 'solid'}
      onPress={() => {
        if (status.playing) {
          player.pause();
          return;
        }
        player.seekTo(0);
        player.play();
      }}
    />
  );
}
