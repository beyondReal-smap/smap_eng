// 프로필 아바타 이모지 → 그림책 일러스트 표.
// 서버는 아바타를 이모지 문자열로 저장한다. 표에 있는 이모지는 `public/images/haru/avatar_*.{webp,png}`로
// 바꿔 그리고, 표에 없는 이모지는 글자 그대로 보여 준다.
// iOS `DesignSystem/ProfileAvatarArt.swift`, Android `AvatarGlyph`와 같은 표.

const TABLE: Record<string, string> = {
  '🦊': 'avatar_fox',
  '🐰': 'avatar_rabbit',
  '🐻': 'avatar_bear',
  '🐼': 'avatar_panda',
  '🦁': 'avatar_lion',
  '🐯': 'avatar_tiger',
  '🐨': 'avatar_koala',
  '🐶': 'avatar_dog',
  '🐱': 'avatar_cat',
  '🦄': 'avatar_unicorn',
  '🐸': 'avatar_frog',
  '⭐': 'avatar_star',
  '🌈': 'avatar_rainbow',
};

/** 이모지에 맞는 에셋 이름. ⭐️(U+FE0F 변형 선택자 포함)과 ⭐를 같은 값으로 본다. */
export function avatarAssetName(emoji: string): string | null {
  return TABLE[emoji.replace(/️/g, '')] ?? null;
}
