// CreateBookDialog 마법사 공유 상수·타입. 본체와 Step 컴포넌트가 공유.

import type { CefrLevel } from '@/lib/db/schema';

export const CEFRS: CefrLevel[] = ['A1', 'A2', 'B1', 'B2'];

/** 레벨 카드 제목(아이 눈높이 말)·설명(나이 표기 먼저) — iOS LevelPickerStep과 같은 문구. */
export const LEVEL_CARD: Record<CefrLevel, { title: string; detail: string }> = {
  A1: { title: '처음 시작', detail: '5~7세 · 기초 단어 · 짧은 문장' },
  A2: { title: '자주 쓰는 표현', detail: '7~9세 · 과거형 · 일상 표현' },
  B1: { title: '내 생각 말하기', detail: '9~10세 · 긴 문장 · 감정 표현' },
  B2: { title: '술술 읽기', detail: '복합 문장 · 생각 넓히기' },
};

/** 레벨 칩 파스텔(통계 모험 길과 같은 색) — 글자는 본문색. */
export const LEVEL_CHIP_BG: Record<CefrLevel, string> = {
  A1: '#c8e6c9',
  A2: '#bbdefb',
  B1: '#ffe0b2',
  B2: '#f8bbd0',
};

// 한 화면에 보여줄 주제 칩 개수 — 8개 카테고리에서 골고루 추출되도록 카테고리 수의 1.5배.
export const TOPIC_SUGGESTION_COUNT = 12;
export const LOW_CREDIT_THRESHOLD = 3;

// 마법사 단계(14차 "곰과 함께 동화 만들기") — 1 장르 · 2 레벨 · 3 질문(+주제·미리보기·만들기).
export type Step = 1 | 2 | 3;
export const TOTAL_STEPS = 3;

// /api/books/intake/questions 응답 구조와 일치 — 라우트 별도 import 회피.
export interface IntakeQuestion {
  id: string;
  text: string;
  placeholder?: string;
  suggestionChips?: string[];
}
