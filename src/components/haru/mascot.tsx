import { cn } from '@/lib/utils';

/**
 * 하루책 동반자 캐릭터(곰) 포즈 — iOS `MascotPose`와 같은 이름.
 * 에셋: public/images/haru/bear_{pose}.{webp,png} (포즈 간 발 위치가 같은 공통 캔버스).
 */
export type MascotPose = 'normal' | 'cheer' | 'reading' | 'worried' | 'wave';

/**
 * 장식용 곰. 의미는 곁의 텍스트가 전달하므로 스크린 리더에서 숨긴다.
 * webp를 우선 쓰고, 지원하지 않는 브라우저는 png로 받는다.
 */
export function Mascot({
  pose,
  size = 88,
  className,
}: {
  pose: MascotPose;
  /** 한 변 길이(px). 그림은 정사각형 캔버스다. */
  size?: number;
  className?: string;
}) {
  const base = `/images/haru/bear_${pose}`;
  return (
    // 크기는 CSS 변수로 — 호출부가 `max-sm:size-[88px]`처럼 반응형 크기를 덧씌울 수 있게.
    <picture
      className={cn('inline-block size-[var(--mascot-size)] shrink-0', className)}
      style={{ '--mascot-size': `${size}px` } as React.CSSProperties}
    >
      <source srcSet={`${base}.webp`} type="image/webp" />
      {/* 정적 공개 에셋이라 next/image 최적화 없이 원본(384px)을 그대로 쓴다. */}
      <img
        src={`${base}.png`}
        alt=""
        width={size}
        height={size}
        draggable={false}
        className="h-full w-full select-none object-contain"
      />
    </picture>
  );
}
