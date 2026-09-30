// 퀴즈 "책 속 근거" — 정답 선택지가 책의 어느 문장에 나오는지 찾는 순수 함수.
// iOS `Features/Quiz/QuizEvidence.swift`를 그대로 옮겼다(같은 입력 → 같은 결과).
// 테스트: evidence.test.ts (iOS `HaruBookTests/QuizEvidenceTests.swift`와 같은 케이스).
//
// 규칙:
// 1. 정답을 소문자·구두점 제거한 단어열로 만들고, 앞쪽 불용어(a, an, the, in, on, at, by, to, of, with)를
//    떼어 핵심 구절을 만든다("In a quiet town" → "quiet town").
// 2. ① 핵심 구절이 단어 경계로 그대로(연속으로) 들어간 문장을 찾는다.
//    ② 없으면 핵심 단어가 모두 들어간 문장을 찾는다.
// 3. 문장은 passage를 쪽 순서로 훑으며 `splitSentences`(. ! ? 기준, 리더와 같은 함수)로 나눈다. 쪽 번호는 1부터.
// 4. ①·② 후보를 모두 모은 뒤(① 후보가 있으면 ①만), 질문 핵심 단어와 가장 많이 겹치는 문장을 고른다.
//    동점이면 앞선 문장.

import { splitSentences } from '@/components/reader/shared';
import type { Passage } from '@/lib/db/schema';

export type EvidencePassage = Pick<
  Passage,
  'orderIndex' | 'textEn' | 'sceneImagePath'
>;

/** 원문 속 [start, end) 구간(UTF-16 인덱스 — `String.prototype.slice`와 같은 단위). */
export interface TextRange {
  start: number;
  end: number;
}

export interface EvidenceMatch {
  /** 쪽 번호(1부터). */
  pageNumber: number;
  /** 근거 문장(앞뒤 공백 제거). */
  sentence: string;
  /** `sentence` 안에서 형광펜을 칠할 구간들(① 구절 일치면 1개, ② 단어 일치면 단어마다, 원문 순서). */
  highlights: TextRange[];
  /** 그 쪽의 장면 삽화 경로(없으면 null). */
  sceneImagePath: string | null;
}

export interface EvidenceWord {
  /** 비교용(소문자, 굽은 따옴표 → '). */
  text: string;
  /** 원문 속 위치. */
  range: TextRange;
}

export const LEADING_STOPWORDS: ReadonlySet<string> = new Set([
  'a', 'an', 'the', 'in', 'on', 'at', 'by', 'to', 'of', 'with',
]);

/** 질문에서 빼는 의문사·조동사 — 근거 문장 고르기에 도움이 안 된다. */
export const QUESTION_WORDS: ReadonlySet<string> = new Set([
  'who', 'what', 'where', 'when', 'why', 'how', 'which', 'did', 'does', 'do',
  'was', 'were', 'is', 'are',
]);

// 글자·숫자·결합 부호·작은따옴표 묶음을 단어로 본다(Swift `isLetter || isNumber || ' || ’`).
const WORD_CHAR = /[\p{L}\p{M}\p{N}'’]/u;
const QUOTES = new Set(["'", '’']);

/** 글자·숫자·작은따옴표 묶음을 단어로 본다(구두점·공백은 경계). "Jisoo's" 같은 소유격은 한 단어. */
export function words(text: string): EvidenceWord[] {
  const result: EvidenceWord[] = [];
  let start: number | null = null;

  function flush(end: number) {
    if (start === null) return;
    // 단어 앞뒤에 붙은 따옴표(인용 부호)는 떼어 낸다 — 'hello' → hello.
    let s = start;
    let e = end;
    while (s < e && QUOTES.has(text[s])) s += 1;
    while (e > s && QUOTES.has(text[e - 1])) e -= 1;
    if (e > s) {
      result.push({
        text: text.slice(s, e).toLowerCase().replace(/’/g, "'"),
        range: { start: s, end: e },
      });
    }
    start = null;
  }

  let index = 0;
  for (const ch of text) {
    if (WORD_CHAR.test(ch)) {
      if (start === null) start = index;
    } else {
      flush(index);
    }
    index += ch.length;
  }
  flush(text.length);
  return result;
}

/** 질문 핵심 단어 — 불용어(위치 무관)와 의문사를 뺀 단어(중복 제거, 등장 순서 유지). */
export function questionKeywords(question: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const { text } of words(question)) {
    if (LEADING_STOPWORDS.has(text) || QUESTION_WORDS.has(text) || seen.has(text)) {
      continue;
    }
    seen.add(text);
    out.push(text);
  }
  return out;
}

function isInflection(word: string, base: string): boolean {
  if (!base) return false;
  if (['s', 'es', 'ed', 'ing'].some((suffix) => word === base + suffix)) return true;
  if (base.endsWith('e')) {
    return word === `${base}d` || word === `${base.slice(0, -1)}ing`;
  }
  return false;
}

/**
 * 가벼운 어미 처리 — 같은 단어이거나 한쪽이 다른 쪽 + s/es/ed/ing(e로 끝나면 +d, e 탈락 +ing)이면 같은 말로 본다.
 * live ↔ lived / living, coat ↔ coats, miss ↔ missing.
 */
export function isRelated(a: string, b: string): boolean {
  return a === b || isInflection(a, b) || isInflection(b, a);
}

/** 질문 핵심 단어 중 문장에 (어미 처리 포함) 들어간 개수. */
export function overlapScore(keywords: string[], sentenceWords: EvidenceWord[]): number {
  return keywords.filter((keyword) =>
    sentenceWords.some((w) => isRelated(w.text, keyword)),
  ).length;
}

/** 정답 문자열 → 핵심 단어열. 불용어만으로 된 답이면 빈 배열. */
export function coreWords(answer: string): string[] {
  const list = words(answer).map((w) => w.text);
  while (list.length > 0 && LEADING_STOPWORDS.has(list[0])) list.shift();
  return list;
}

/** 핵심 단어열이 문장 토큰 안에 연속으로 있으면 원문 구간(첫 단어 시작 ~ 마지막 단어 끝). */
function phraseRange(core: string[], tokens: EvidenceWord[]): TextRange | null {
  if (tokens.length < core.length) return null;
  for (let start = 0; start <= tokens.length - core.length; start += 1) {
    const window = tokens.slice(start, start + core.length);
    if (window.every((token, i) => token.text === core[i])) {
      return { start: window[0].range.start, end: window[window.length - 1].range.end };
    }
  }
  return null;
}

/**
 * 정답의 근거 문장을 찾는다.
 * @param question 문항 질문. 후보가 여럿이면 질문과 가장 많이 겹치는 문장을 고른다(비우면 첫 후보).
 */
export function findEvidence(
  answer: string,
  question: string,
  passages: readonly EvidencePassage[],
): EvidenceMatch | null {
  const core = coreWords(answer);
  if (core.length === 0) return null;
  const keywords = questionKeywords(question);
  const pages = [...passages].sort((a, b) => a.orderIndex - b.orderIndex);

  type Entry = { match: EvidenceMatch; tokens: EvidenceWord[] };
  // ① 구절 그대로 일치하는 문장 전부.
  const phraseMatches: Entry[] = [];
  // ② 핵심 단어가 모두 들어간 문장 전부 — 단어마다 첫 등장을 칠한다.
  const allWordMatches: Entry[] = [];

  pages.forEach((passage, index) => {
    for (const raw of splitSentences(passage.textEn)) {
      const sentence = raw.trim();
      const tokens = words(sentence);
      const base = {
        pageNumber: index + 1,
        sentence,
        sceneImagePath: passage.sceneImagePath ?? null,
      };
      const phrase = phraseRange(core, tokens);
      if (phrase) {
        phraseMatches.push({ match: { ...base, highlights: [phrase] }, tokens });
        continue;
      }
      const ranges: TextRange[] = [];
      for (const word of core) {
        const token = tokens.find((t) => t.text === word);
        if (!token) break;
        ranges.push(token.range);
      }
      if (ranges.length === core.length) {
        allWordMatches.push({
          match: { ...base, highlights: [...ranges].sort((a, b) => a.start - b.start) },
          tokens,
        });
      }
    }
  });

  const pool = phraseMatches.length > 0 ? phraseMatches : allWordMatches;
  // 질문과 가장 많이 겹치는 후보 — 동점이면 앞선 문장(엄격히 더 클 때만 교체).
  let best: { match: EvidenceMatch; score: number } | null = null;
  for (const entry of pool) {
    const score = overlapScore(keywords, entry.tokens);
    if (score > (best?.score ?? -1)) best = { match: entry.match, score };
  }
  return best?.match ?? null;
}
