// 단어가 나온 책의 맥락 — 단어 카드 앞면 삽화와 뒷면 "책 속 문장"·"이 책에서 만난 단어예요"에 쓴다.
// iOS `Features/Vocab/VocabBookContext.swift`와 같은 규칙(테스트: book-context.test.ts).
// VocabEntry에는 bookId만 있으므로 호출부가 `GET /api/books/{id}`(책 + passages)를 책별 1회 받아 넘긴다.

import type { Book, Passage } from '@/lib/db/schema';

export type ContextPassage = Pick<Passage, 'orderIndex' | 'textEn' | 'sceneImagePath'>;
export type ContextBook = Pick<Book, 'coverImagePath'>;

export interface WordScene {
  /** 단어를 포함한 첫 문장. 못 찾으면 null(문장 줄 생략). */
  sentence: string | null;
  /** 앞면 삽화 — 그 문장의 장면 삽화 → 책의 아무 장면 삽화 → 책 표지. 모두 없으면 null(자리표시). */
  imagePath: string | null;
}

// 마침표·물음표·느낌표(연속·닫는 따옴표 포함) 뒤에서 문장을 나눈다.
const SENTENCE = /[^.!?]+(?:[.!?]+["'”’)]*)?/g;

/** 문장 나누기 — 앞뒤 공백 제거, 빈 조각 제외. */
export function vocabSentences(text: string): string[] {
  return (text.match(SENTENCE) ?? []).map((s) => s.trim()).filter((s) => s !== '');
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** 글자·숫자가 앞뒤로 붙지 않은 곳만 — "bake"가 "bakery" 안에서 걸리지 않게. 대소문자 무시. */
function wordPattern(word: string): RegExp | null {
  const trimmed = word.trim();
  if (!trimmed) return null;
  return new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegExp(trimmed)}(?![\\p{L}\\p{N}])`, 'iu');
}

/** passages를 쪽 순서로 훑어 단어를 단어 경계·대소문자 무시로 포함한 첫 문장. */
export function firstSentenceContaining<P extends ContextPassage>(
  word: string,
  passages: readonly P[],
): { sentence: string; passage: P } | null {
  const pattern = wordPattern(word);
  if (!pattern) return null;
  const ordered = [...passages].sort((a, b) => a.orderIndex - b.orderIndex);
  for (const passage of ordered) {
    for (const sentence of vocabSentences(passage.textEn)) {
      if (pattern.test(sentence)) return { sentence, passage };
    }
  }
  return null;
}

/** 문장 안에서 단어가 처음 나오는 [start, end) 구간(형광펜 표시용). */
export function wordHighlightRange(
  word: string,
  sentence: string,
): { start: number; end: number } | null {
  const pattern = wordPattern(word);
  const m = pattern ? pattern.exec(sentence) : null;
  return m ? { start: m.index, end: m.index + m[0].length } : null;
}

function nonEmpty(s: string | null | undefined): string | null {
  return s ? s : null;
}

/** 한 단어의 카드 표시 정보(문장 + 삽화 우선순위). */
export function wordScene(
  word: string,
  book: ContextBook,
  passages: readonly ContextPassage[],
): WordScene {
  const match = firstSentenceContaining(word, passages);
  const ordered = [...passages].sort((a, b) => a.orderIndex - b.orderIndex);
  const imagePath =
    nonEmpty(match?.passage.sceneImagePath) ??
    ordered.map((p) => nonEmpty(p.sceneImagePath)).find((p) => p !== null) ??
    nonEmpty(book.coverImagePath);
  return { sentence: match?.sentence ?? null, imagePath };
}
