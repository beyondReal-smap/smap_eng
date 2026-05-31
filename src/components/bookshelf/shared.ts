// Bookshelf 공유 상수·헬퍼. 본체와 보조 컴포넌트가 공유.

import type { CefrLevel } from '@/lib/db/schema';

export const IMAGE_GEN_ENABLED =
  process.env.NEXT_PUBLIC_ENABLE_IMAGE_GEN === 'true';

export const CEFRS: CefrLevel[] = ['A1', 'A2', 'B1', 'B2'];

export const LEVEL_CLASS: Record<CefrLevel, string> = {
  A1: 'level-a1',
  A2: 'level-a2',
  B1: 'level-b1',
  B2: 'level-b2',
};

export function readRecentIds(): number[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem('recent:books');
    const list = raw ? (JSON.parse(raw) as unknown) : [];
    if (!Array.isArray(list)) return [];
    return list.filter((v): v is number => typeof v === 'number');
  } catch {
    return [];
  }
}

// 방문마다 다른 인사말로 친근감 유도. 첫 요소가 SSR 기본값이며
// 클라이언트 mount 후 랜덤 선택으로 교체된다(hydration mismatch 방지).
export const BOOKSHELF_PROMPTS = [
  '오늘은 어떤 책을 펼쳐볼까?',
  '어떤 이야기가 궁금해?',
  '마음에 드는 표지가 있을까?',
  '다시 읽고 싶은 책이 있을까?',
  '오늘은 어떤 주인공을 만나볼까?',
  '어떤 책부터 읽어볼래?',
  '기분 따라 한 권 골라볼까?',
  '새로운 친구가 기다리고 있어.',
];
