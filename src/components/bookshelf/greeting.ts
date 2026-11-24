// 책장 인사 문구 — 곰이 아이 이름을 부르며 오늘 할 일을 권한다.
// iOS `Features/Bookshelf/GreetingBubble.swift`의 GreetingCopy와 같은 문구·규칙.
// 첫 줄은 본문색, 둘째 줄은 코랄 잉크로 강조한다.

import { vocative } from '@/lib/korean-particle';

export type GreetingSituation =
  /** 읽다 만 책이 있음 — 말풍선을 누르면 이어 읽기. */
  | 'continueReading'
  /** 책은 있지만 이어 읽을 책이 없음. */
  | 'pickABook'
  /** 첫 실행(책 0권). */
  | 'firstBook'
  /** 책장을 불러오지 못함. */
  | 'loadFailed';

export interface GreetingCopy {
  firstLine: string;
  secondLine: string;
}

export function greetingCopy(
  situation: GreetingSituation,
  childName: string | null | undefined,
): GreetingCopy {
  const call = childName ? vocative(childName) : null;
  switch (situation) {
    case 'continueReading':
      return {
        firstLine: call ? `${call}, 어제 읽던 책` : '어제 읽던 책',
        secondLine: '마저 읽어 볼까?',
      };
    case 'pickABook':
      return { firstLine: call ? `${call}, 오늘은` : '오늘은', secondLine: '어떤 이야기를 읽을까?' };
    case 'firstBook':
      return { firstLine: call ? `안녕, ${call}!` : '안녕!', secondLine: '첫 동화를 같이 만들어 볼까?' };
    case 'loadFailed':
      return { firstLine: '앗, 책장을 불러오지 못했어', secondLine: '아래에서 다시 해 볼까?' };
  }
}

/** 상황별 곰 포즈 — iOS BookshelfView.mascotPose와 같다. */
export function greetingPose(
  situation: GreetingSituation | null,
): 'normal' | 'reading' | 'worried' {
  switch (situation) {
    case 'loadFailed':
      return 'worried';
    case 'continueReading':
    case 'firstBook':
      return 'reading';
    default:
      return 'normal';
  }
}
