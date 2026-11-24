/**
 * 레벨 체계(연령 × CEFR) 공개 설명 — "A1이 뭔가요", "우리 아이는 몇 레벨인가요"에 답하는 데이터.
 *
 * ⚠️ 수치 출처: `src/lib/llm/prompts/book.ts`의 `levelGuideline()`.
 *    그 함수가 실제로 LLM에 주입되는 생성 규칙이므로 유일한 사실 근거다.
 *    book.ts의 구간이 바뀌면 이 표도 함께 갱신할 것(그쪽은 프롬프트 문자열을 만드는
 *    내부 함수라 직접 import 하면 프롬프트 빌더가 공개 콘텐츠에 결합되므로 값만 복사).
 *
 * 한 지문(passage)은 화면 한 장에 해당하며, 하루책은 지문당 3문장을 고정으로 사용한다.
 */

import type { CefrLevel } from '@/lib/db/schema';

export interface LevelSpec {
  cefr: CefrLevel;
  /** 이 레벨을 주로 선택하는 연령대 */
  recommendedAge: string;
  /** 레벨 한 줄 설명 */
  label: string;
  /** 책 한 권의 지문(화면) 수 */
  passageCount: string;
  /** 지문 1장의 영어 단어 수 */
  wordsPerPassage: string;
  /** 책 한 권에 실리는 단어장 항목 수 */
  vocabCount: string;
  /** 다루는 문법 범위 */
  grammar: string;
  /** 문장 스타일 */
  style: string;
  /** 해당 레벨의 실제 문장 예시(영문) */
  example: string;
}

export const LEVELS: LevelSpec[] = [
  {
    cefr: 'A1',
    recommendedAge: '5~6세',
    label: '기초 — 영어 문장을 처음 소리 내어 읽는 단계',
    passageCount: '17~21장',
    wordsPerPassage: '12~22단어',
    vocabCount: '32~40개',
    grammar: '현재형만 사용, 축약형 없음, 조동사 배제',
    style: '5세가 소리 내어 읽을 수 있는 아주 짧고 밝은 문장',
    example: 'The cat is small. It likes milk. It runs fast.',
  },
  {
    cefr: 'A1',
    recommendedAge: '7~8세',
    label: '기초+ — 과거형과 간단한 접속사가 들어오는 단계',
    passageCount: '19~25장',
    wordsPerPassage: '18~32단어',
    vocabCount: '48~62개',
    grammar: '현재형·과거형, 간단한 접속사(and, but, so)',
    style: '반복과 인과가 뚜렷한 동화 리듬',
    example: 'The fox walked into the forest. He saw a little rabbit. The rabbit looked sad, so the fox stopped.',
  },
  {
    cefr: 'A2',
    recommendedAge: '7~9세',
    label: '초급 — 장면 묘사와 대화가 섞이는 단계',
    passageCount: '23~29장',
    wordsPerPassage: '30~50단어',
    vocabCount: '65~85개',
    grammar: '과거진행·현재완료, 시간·이유 접속사(when, while, because), 묘사 형용사·부사, 중문',
    style: '오감 묘사가 들어간 서술과 짧은 대화',
    example:
      'While the golden sun was setting behind the mountains, Maya carefully climbed the tall oak tree. She wanted to find her lost kite before dark.',
  },
  {
    cefr: 'B1',
    recommendedAge: '8~10세',
    label: '중급 — 관계절과 감정선이 있는 이야기 단계',
    passageCount: '25~33장',
    wordsPerPassage: '45~70단어',
    vocabCount: '80~105개',
    grammar: '과거완료, 관계절(who/which/that/where), 간접화법, 1·2형식 조건문, 연결 부사(however, suddenly, meanwhile)',
    style: '장면 전환과 감정의 흐름이 있는 중학년 서사, 자연스러운 대화',
    example:
      'Ethan, who had never seen the ocean before, stared in wonder as the enormous waves crashed against the black rocks.',
  },
  {
    cefr: 'B2',
    recommendedAge: '9~10세',
    label: '상급 — 문학적 표현에 도전하는 단계',
    passageCount: '27~35장',
    wordsPerPassage: '60~95단어',
    vocabCount: '100~130개',
    grammar: '전 시제(과거완료진행 포함), 혼합 조건문, 자연스러운 수동태, 복합 관계절, 분사구문, 고급 연결어(nevertheless, despite, as a result)',
    style: '복선과 비유(은유·직유)가 들어간 상위 중학년 문학 서술, 인물 내면 묘사',
    example:
      'Having waited for what felt like an eternity at the edge of the whispering forest, Ellie finally took a deep breath and stepped inside.',
  },
];

/** 선택 가능한 연령 범위 — 프로필 생성 시 입력값(`src/lib/llm/schemas.ts`의 `age` 제약과 동일). */
export const AGE_RANGE = { min: 5, max: 10 } as const;

/** 레벨 선택 가이드 — "몇 살이면 어느 레벨인가요"에 대한 요약 답변. */
export const LEVEL_GUIDANCE =
  '레벨은 나이와 CEFR을 함께 골라 정합니다. 알파벳과 파닉스를 막 뗐다면 A1, 짧은 문장을 혼자 읽을 수 있으면 A2, 문단을 읽고 내용을 설명할 수 있으면 B1, 챕터북을 읽는 수준이면 B2가 기준입니다. 같은 A1이라도 나이가 많을수록 문장이 길어지므로, 확신이 없다면 한 단계 낮게 시작해 아이가 소리 내어 막힘없이 읽는지 확인하는 편이 좋습니다.';
