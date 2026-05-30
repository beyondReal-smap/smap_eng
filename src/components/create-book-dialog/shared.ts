// CreateBookDialog 마법사 공유 상수·타입. 본체와 Step 컴포넌트가 공유.

import type { CefrLevel } from '@/lib/db/schema';

export const CEFRS: CefrLevel[] = ['A1', 'A2', 'B1', 'B2'];

export const CEFR_HINT: Record<CefrLevel, string> = {
  A1: '기초 · 4~10 단어 문장 · 어휘 12~32개',
  A2: '초급 · 10~16 단어 · 복문 · 어휘 32~48개',
  B1: '중급 · 12~22 단어 · 관계절 · 어휘 45~65개',
  B2: '상급 · 16~28 단어 · 어휘 60~85개 · 9~10세 도전',
};

// 한 화면에 보여줄 주제 칩 개수 — 8개 카테고리에서 골고루 추출되도록 카테고리 수의 1.5배.
export const TOPIC_SUGGESTION_COUNT = 12;
export const LOW_CREDIT_THRESHOLD = 3;

// 마법사 단계. 인덱스 1부터 시작해 진행률 표시(1/5)에 그대로 사용.
export type Step = 1 | 2 | 3 | 4 | 5;
export const TOTAL_STEPS = 5;

// /api/books/intake/questions 응답 구조와 일치 — 라우트 별도 import 회피.
export interface IntakeQuestion {
  id: string;
  text: string;
  placeholder?: string;
  suggestionChips?: string[];
}
