// 한국어 조사 처리 — 받침 유무로 달라지는 부분을 한곳에 모은 순수 함수들.
// iOS `Features/Bookshelf/KoreanParticle.swift`와 같은 규칙.
// 이름 뒤 조사는 받침이 있으면 친근형 "이"를 먼저 붙인다(하준 → 하준이가).
// 마지막 글자가 한글이 아니면(영문 이름 등) 받침 없는 쪽으로 처리한다.

/** 마지막 글자의 받침 인덱스(0 = 받침 없음). 한글 음절이 아니면 null. */
export function finalConsonantIndex(word: string): number | null {
  const last = Array.from(word).at(-1);
  if (!last) return null;
  const code = last.codePointAt(0) ?? 0;
  if (code < 0xac00 || code > 0xd7a3) return null;
  return (code - 0xac00) % 28;
}

/** 받침이 있는지. 한글이 아니면 false. */
export function hasFinalConsonant(word: string): boolean {
  return (finalConsonantIndex(word) ?? 0) !== 0;
}

/** 부르는 말 — 지우야 / 하준아. */
export function vocative(name: string): string {
  return name + (hasFinalConsonant(name) ? '아' : '야');
}

/** 조사 앞 친근형 — 받침이 있으면 "이"를 붙인다(하준 → 하준이, 지우 → 지우). */
export function familiar(name: string): string {
  return hasFinalConsonant(name) ? `${name}이` : name;
}

/** 주격 — 지우가 / 하준이가. */
export function subject(name: string): string {
  return `${familiar(name)}가`;
}
