// 새 동화 만들기(14차) — 레벨 추천 규칙·곰 말풍선·미리보기 문구. 화면과 분리한 순수 함수.
// iOS `Features/CreateBook/CreateBookGuide.swift`(LevelRecommendation·CreateBookCopy)와 같은 규칙.
// 테스트: guide.test.ts (iOS `HaruBookTests/CreateBookGuideTests.swift`와 같은 입력·기대값).

import type { BookProgressStat } from '@/lib/db/queries';
import type { Book, BookGenre, CefrLevel } from '@/lib/db/schema';
import { familiar, finalConsonantIndex } from '@/lib/korean-particle';

// ---------- 조사(책장 인사 헬퍼 위에 얹는 나머지) ----------

/** 보조사 — 지우는 / 하준이는. */
export function topicParticle(name: string): string {
  return `${familiar(name)}는`;
}

/** 여격 — 지우에게 / 하준이에게. */
export function dative(name: string): string {
  return `${familiar(name)}에게`;
}

/** 도구격 조사 "로/으로" — 받침이 없거나 ㄹ 받침이면 "로"(용기로·서울로), 그 밖의 받침은 "으로"(숲속으로). */
export function instrumental(word: string): string {
  const index = finalConsonantIndex(word);
  if (index === null || index === 0) return '로';
  // 종성 인덱스 8 = ㄹ
  return index === 8 ? '로' : '으로';
}

// ---------- 레벨 추천 ----------

/** 가장 최근에 읽은 책의 레벨 — 읽기 기록(startedAtUnix)이 가장 늦은 책. 기록이 없으면 null. */
export function recentReadLevel(
  books: readonly Pick<Book, 'id' | 'cefr'>[],
  stats: Readonly<Record<number, BookProgressStat>>,
): CefrLevel | null {
  let latest: { level: CefrLevel; at: number } | null = null;
  for (const b of books) {
    const s = stats[b.id];
    if (s && (latest === null || s.startedAtUnix > latest.at)) {
      latest = { level: b.cefr, at: s.startedAtUnix };
    }
  }
  return latest?.level ?? null;
}

/** 가장 최근에 만든 책의 레벨 — createdAt이 가장 늦은 책. 날짜가 모두 없으면 목록 첫 책(서버 최신순). */
export function latestCreatedLevel(
  books: readonly { cefr: CefrLevel; createdAt: Date | string | null }[],
): CefrLevel | null {
  let latest: { level: CefrLevel; at: number } | null = null;
  for (const b of books) {
    if (b.createdAt === null) continue;
    const at = new Date(b.createdAt).getTime();
    if (Number.isNaN(at)) continue;
    if (latest === null || at > latest.at) latest = { level: b.cefr, at };
  }
  return latest?.level ?? books[0]?.cefr ?? null;
}

/** 추천 레벨 — ① 가장 최근 책의 레벨 ② 없으면 나이(≤6 A1, 7–8 A2, 9+ B1). */
export function recommendedLevel(recentLevel: CefrLevel | null, age: number): CefrLevel {
  if (recentLevel) return recentLevel;
  if (age <= 6) return 'A1';
  if (age <= 8) return 'A2';
  return 'B1';
}

// ---------- 장르 명사 ----------

export function genreNoun(genre: BookGenre): string {
  return genre === 'non_fiction' ? '지식책' : '동화';
}

/** 명사 뒤 주격 조사 — 동화가 / 지식책이. */
export function genreSubjectParticle(genre: BookGenre): string {
  return genre === 'non_fiction' ? '이' : '가';
}

/** 명사 뒤 목적격 조사 — 동화를 / 지식책을. */
export function genreObjectParticle(genre: BookGenre): string {
  return genre === 'non_fiction' ? '을' : '를';
}

// ---------- 곰 말풍선·배지·미리보기 문구 ----------

export const GENRE_TITLE = '어떤 책을 만들어 볼까?';
export const LEVEL_TITLE = '어느 레벨로 읽을까?';
export const INTAKE_TITLE = '무엇이 나오면 좋을까?';
export const INTAKE_SUBTITLE = '골라도, 적어도, 건너뛰어도 좋아';

export function genreSubtitle(childName: string | null | undefined): string {
  if (!childName) return '좋아하는 쪽을 골라 줘';
  return `${familiar(childName)}가 좋아하는 쪽을 골라 줘`;
}

export function levelSubtitle(
  childName: string | null | undefined,
  recentRead: CefrLevel | null,
): string {
  if (recentRead) {
    const who = childName ? `${topicParticle(childName)} ` : '';
    return `${who}요즘 ${recentRead} 책을 읽고 있어요`;
  }
  if (childName) return `${familiar(childName)} 나이에 맞는 레벨을 골라 뒀어요`;
  return '나이에 맞는 레벨을 골라 뒀어요';
}

export function recommendationBadge(childName: string | null | undefined): string {
  if (!childName) return '딱 맞는 레벨이에요';
  return `${dative(childName)} 딱 맞아요`;
}

/** 미리보기 둘째 줄 — 고른 답을 " · "로 이어 "{답들}로 동화를 만들어요". 답이 없으면 곰이 알아서 만든다는 안내. */
export function previewSentence(answers: readonly string[], noun: string, objectParticle: string): string {
  const picked = answers.map((a) => a.trim()).filter((a) => a !== '');
  const last = picked.at(-1);
  if (last === undefined) return '곰이 알아서 재미있게 만들어 줄게요';
  return `${picked.join(' · ')}${instrumental(last)} ${noun}${objectParticle} 만들어요`;
}
