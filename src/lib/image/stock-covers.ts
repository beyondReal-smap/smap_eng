// 책 표지 stock 풀 — 8 카테고리 × 6~7장 = 50장.
// 책 생성 시 외부 API 호출 없이 즉시 cover_image_path를 채워서 안정성·비용 0.
// 카테고리 매칭이 안 되는(자유 입력) 경우 전체 풀에서 bookId-결정성 매핑.
//
// 파일 규칙: public/images/covers/{categoryId}-{n}.png  (n: 1-indexed)
// 카테고리 ID는 src/lib/topic-suggestions.ts의 TopicCategory.id와 정확히 일치해야 함.

const COVERS_PER_CATEGORY: Record<string, number> = {
  animals: 7,
  adventure: 6,
  fantasy: 7,
  daily: 6,
  nature: 6,
  jobs: 6,
  food: 6,
  family: 6,
} as const;

export const STOCK_COVER_CATEGORIES = Object.keys(
  COVERS_PER_CATEGORY,
) as readonly string[];

const ALL_COVERS: readonly string[] = STOCK_COVER_CATEGORIES.flatMap(
  (cat) => Array.from({ length: COVERS_PER_CATEGORY[cat] }, (_, i) =>
    `/images/covers/${cat}-${i + 1}.png`,
  ),
);

export const STOCK_COVER_TOTAL = ALL_COVERS.length;

function poolFor(category: string | null | undefined): readonly string[] {
  if (category && category in COVERS_PER_CATEGORY) {
    const n = COVERS_PER_CATEGORY[category];
    return Array.from(
      { length: n },
      (_, i) => `/images/covers/${category}-${i + 1}.png`,
    );
  }
  return ALL_COVERS;
}

/**
 * 책에 stock 표지 1장을 결정성 있게 매핑.
 * - 같은 (bookId, category, reroll) 조합은 항상 같은 결과 (멱등).
 * - bookId가 단조 증가하므로 modulo로 풀에서 골고루 분배된다.
 *
 * @param bookId  내부 books.id
 * @param category  topic 칩에서 선택한 카테고리(`animals` 등) 또는 null/undefined(자유 입력)
 * @param reroll  "다시 만들기" 회차(0부터). 같은 카테고리 풀 내에서 다음 인덱스로 회전.
 */
export function pickStockCover(
  bookId: number,
  category: string | null | undefined,
  reroll = 0,
): string {
  const pool = poolFor(category);
  const idx = (bookId + reroll) % pool.length;
  return pool[idx];
}

export function isKnownCoverCategory(value: unknown): value is string {
  return typeof value === 'string' && value in COVERS_PER_CATEGORY;
}
