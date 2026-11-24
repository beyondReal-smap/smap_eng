import { cn } from '@/lib/utils';
import { avatarAssetName } from './avatar-art';

/**
 * 원형 아바타 안의 그림 — 바깥 원(배경색·테두리)은 호출하는 쪽이 그린다.
 * 표에 있는 이모지는 그림책 일러스트로, 없는 이모지(웹에서 고른 값 등)는 글자 그대로.
 * 그림도 이모지로 읽히게 해(alt) 기존 이모지 글자와 스크린 리더 동작을 같게 둔다.
 * 장식으로 숨길 곳(옆에 이름이 있는 목록 등)은 `decorative`.
 */
export function AvatarGlyph({
  emoji,
  size,
  decorative = false,
  className,
}: {
  emoji: string;
  /** 바깥 원 지름(px). */
  size: number;
  decorative?: boolean;
  className?: string;
}) {
  const asset = avatarAssetName(emoji);
  if (!asset) {
    return (
      <span
        aria-hidden={decorative || undefined}
        className={cn('inline-flex items-center justify-center leading-none', className)}
        style={{ width: size, height: size, fontSize: Math.round(size * 0.55) }}
      >
        {emoji}
      </span>
    );
  }
  const base = `/images/haru/${asset}`;
  return (
    <picture
      className={cn('inline-block shrink-0 overflow-hidden rounded-full', className)}
      style={{ width: size, height: size }}
    >
      <source srcSet={`${base}.webp`} type="image/webp" />
      {/* 정적 공개 에셋(192px) — next/image 최적화 없이 원본 사용. */}
      <img
        src={`${base}.png`}
        alt={decorative ? '' : emoji}
        width={size}
        height={size}
        draggable={false}
        className="h-full w-full select-none object-cover"
      />
    </picture>
  );
}
