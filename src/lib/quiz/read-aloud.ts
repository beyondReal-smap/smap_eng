// 퀴즈 읽어 주기(15차) 순서·강조 규칙 — 순수 함수. iOS `QuizReadAloudPlan`과 같은 규칙.
// 재생은 리더와 같은 `/api/tts/word`(최대 200자, 텍스트 해시 캐시)를 쓴다.

export type ReadAloudItem =
  | { kind: 'question' }
  | { kind: 'choice'; index: number }
  | { kind: 'evidence' };

/** 서버 `/api/tts/word` 글자 수 상한 — 넘는 문장은 읽기 버튼을 두지 않는다. */
export const MAX_SPEAKABLE_LENGTH = 200;
/** 차례 읽기에서 문장과 문장 사이 쉼(ms). */
export const PAUSE_BETWEEN_ITEMS_MS = 350;

/** 말풍선 🔊 순서 — 답하기 전 = 질문 → 선택지 1…N, 답한 뒤 = 질문만. */
export function readAloudSequence(choiceCount: number, answered: boolean): ReadAloudItem[] {
  if (answered) return [{ kind: 'question' }];
  const choices = Array.from({ length: Math.max(choiceCount, 0) }, (_, index) => ({
    kind: 'choice' as const,
    index,
  }));
  return [{ kind: 'question' }, ...choices];
}

export function isSpeakable(text: string): boolean {
  // 글자 수는 Swift `String.count`처럼 문자 단위로 센다.
  return text !== '' && Array.from(text).length <= MAX_SPEAKABLE_LENGTH;
}

/** 읽을 문장. 비었거나 서버 상한을 넘거나 대상이 없으면 null(그 항목은 건너뛴다). */
export function readAloudText(
  item: ReadAloudItem,
  source: { question: string; choices: readonly string[]; evidenceSentence: string | null },
): string | null {
  let raw: string | null | undefined;
  switch (item.kind) {
    case 'question':
      raw = source.question;
      break;
    case 'choice':
      raw = source.choices[item.index];
      break;
    case 'evidence':
      raw = source.evidenceSentence;
      break;
  }
  if (raw == null) return null;
  const trimmed = raw.trim();
  return isSpeakable(trimmed) ? trimmed : null;
}

/** 지금 읽는 항목이 선택지면 그 선택지 번호 — 카드 강조 대상. */
export function highlightedChoice(item: ReadAloudItem | null): number | null {
  return item?.kind === 'choice' ? item.index : null;
}

export function isSameItem(a: ReadAloudItem | null, b: ReadAloudItem): boolean {
  if (!a || a.kind !== b.kind) return false;
  return a.kind !== 'choice' || (b.kind === 'choice' && a.index === b.index);
}
