import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * 흰 말풍선 — 꼬리가 왼쪽(곰 쪽)을 향한다. iOS `SpeechBubble`과 같은 모양:
 * 둥근 몸통(20) + 왼쪽 꼬리(폭 10 × 높이 20, 바닥에서 14 위) + 나무색 그림자.
 * 몸통과 꼬리에 drop-shadow를 함께 걸어 그림자가 끊기지 않게 한다.
 * 내용(글꼴·색)은 호출부가 정하고 모양·여백·그림자만 여기서 통일한다.
 */
export function SpeechBubble({
  children,
  className,
  bodyClassName,
}: {
  children: ReactNode;
  className?: string;
  /** 몸통(흰 면)에 더할 클래스 — 여백·최소 높이 조정 등. */
  bodyClassName?: string;
}) {
  return (
    <div
      className={cn(
        'relative ml-[10px] [filter:drop-shadow(0_6px_8px_rgb(168_111_63/0.14))]',
        className,
      )}
    >
      <svg
        aria-hidden
        viewBox="0 0 11 20"
        className="absolute bottom-[14px] left-[-10px] h-5 w-[11px] fill-white"
      >
        <path d="M11 0 L0 10 L11 20 Z" />
      </svg>
      <div className={cn('relative rounded-[20px] bg-white px-4 py-[13px]', bodyClassName)}>
        {children}
      </div>
    </div>
  );
}
