/**
 * 자주 묻는 질문 — AI 검색이 가장 직접적으로 인용하는 콘텐츠 단위.
 *
 * 답변 작성 규칙(AI 인용을 전제로 함):
 *  - 각 answer는 **앞뒤 문맥 없이 단독으로 인용되어도 정확한** 완결 문장으로 쓴다.
 *    ("위에서 설명한 것처럼", "아래 표 참고" 같은 참조 표현 금지)
 *  - 수치·가격·정책은 반드시 코드상의 SSOT를 근거로 한다. 확인되지 않은 수치를
 *    쓰지 않는다 — AI가 인용해 퍼뜨리면 정정이 사실상 불가능하다.
 *  - 결제/환불 문구는 `/legal/refund`(전자상거래법 §17 준거)가 유일한 기준이다.
 *
 * 가격 문구는 `@/lib/billing/packages`의 값을 런타임에 주입한다(하드코딩 금지) —
 * env로 가격을 바꿨을 때 FAQ만 옛 가격을 말하는 사고를 막는다.
 */

import { STAR_PACKAGES, formatKrw } from '@/lib/billing/packages';

export const FAQ_CATEGORIES = ['서비스', '학습', '이용', '결제', '안전'] as const;
export type FaqCategory = (typeof FAQ_CATEGORIES)[number];

export interface FaqItem {
  id: string;
  category: FaqCategory;
  question: string;
  answer: string;
}

const [small, medium, large] = STAR_PACKAGES;

export const FAQ: FaqItem[] = [
  // ── 서비스 ────────────────────────────────────────────────────────────────
  {
    id: 'what-is-harubook',
    category: '서비스',
    question: '하루책은 어떤 서비스인가요?',
    answer:
      '하루책은 만 5~10세 아이를 위한 AI 영어 리딩 서비스입니다. 아이의 나이와 영어 레벨(CEFR A1~B2), 좋아하는 주제를 입력하면 그 아이만을 위한 영어 동화가 새로 생성됩니다. 생성된 책에는 문장별 원어민 낭독, 문장 단위 한글 해석, 완독 후 4지선다 퀴즈, 단어장 복습이 함께 제공됩니다.',
  },
  {
    id: 'target-age',
    category: '서비스',
    question: '몇 살부터 이용할 수 있나요?',
    answer:
      '만 5세부터 10세까지를 대상으로 설계되었습니다. 프로필을 만들 때 나이(5~10세)와 CEFR 레벨(A1~B2)을 함께 지정하며, 같은 레벨이라도 나이에 따라 문장 길이와 어휘 밀도가 달라집니다. 계정은 보호자가 만들고 아이는 보호자 계정 아래 프로필로 이용합니다.',
  },
  {
    id: 'difference-from-ebook',
    category: '서비스',
    question: '기존 영어 전자책 서비스와 무엇이 다른가요?',
    answer:
      '기존 서비스는 이미 만들어진 책 목록에서 아이에게 맞는 것을 고르는 방식이지만, 하루책은 아이의 나이·레벨·관심사에 맞춰 책을 그때그때 새로 만듭니다. 따라서 읽을 책이 떨어지지 않고, 아이가 좋아하는 소재(공룡, 우주, 축구 등)를 그대로 이야기 주제로 쓸 수 있습니다.',
  },
  {
    id: 'fiction-nonfiction',
    category: '서비스',
    question: '동화 말고 지식책도 있나요?',
    answer:
      '픽션 동화와 논픽션 지식책 두 갈래를 지원합니다. 책을 만들 때 장르를 고르면 되며, 논픽션은 같은 레벨 기준을 지키면서 사실 정보를 설명하는 구성으로 생성됩니다.',
  },

  // ── 학습 ──────────────────────────────────────────────────────────────────
  {
    id: 'how-to-pick-level',
    category: '학습',
    question: '우리 아이 레벨은 어떻게 정하나요?',
    answer:
      '알파벳과 파닉스를 막 뗀 단계라면 A1, 짧은 문장을 혼자 읽을 수 있으면 A2, 문단을 읽고 내용을 설명할 수 있으면 B1, 챕터북을 읽는 수준이면 B2가 기준입니다. 확신이 서지 않으면 한 단계 낮게 시작해 아이가 소리 내어 막힘없이 읽는지 확인한 뒤 올리는 편이 좋습니다. 레벨은 책을 만들 때마다 바꿀 수 있습니다.',
  },
  {
    id: 'tts-voice',
    category: '학습',
    question: '낭독 음성은 어떻게 제공되나요?',
    answer:
      '모든 문장에 음성 낭독이 붙습니다. 재생 중인 문장이 화면에서 하이라이트되어 아이가 눈으로 따라 읽을 수 있고, 특정 문장을 탭하면 그 문장만 다시 들을 수 있습니다. 단어장에 담긴 단어도 개별 발음을 재생할 수 있습니다.',
  },
  {
    id: 'korean-translation',
    category: '학습',
    question: '한글 해석도 볼 수 있나요?',
    answer:
      '문장 단위로 한글 해석을 켜고 끌 수 있습니다. 처음에는 영어만 보며 읽다가 막히는 문장에서만 해석을 확인하는 방식이 권장됩니다. 어려운 단어에는 뜻풀이가 함께 표시됩니다.',
  },
  {
    id: 'quiz',
    category: '학습',
    question: '퀴즈는 어떤 방식인가요?',
    answer:
      '책을 다 읽으면 본문 내용을 확인하는 4지선다 퀴즈 5문항이 제공됩니다. 문제는 그 책의 본문을 근거로 생성되며, 맞힌 개수는 독서 기록에 저장되어 보호자 리포트에서 확인할 수 있습니다.',
  },
  {
    id: 'vocab-srs',
    category: '학습',
    question: '단어 복습은 어떻게 이루어지나요?',
    answer:
      '책에서 만난 단어가 아이별 단어장에 쌓이고, 간격 반복(SRS) 방식으로 복습할 시점이 자동으로 배치됩니다. 잘 맞힌 단어는 복습 간격이 길어지고 틀린 단어는 다시 짧은 주기로 돌아옵니다.',
  },
  {
    id: 'reread',
    category: '학습',
    question: '한 번 만든 책은 다시 읽을 수 있나요?',
    answer:
      '한 번 만든 책은 프로필 책장에 영구 보관되며 낭독·한글 해석·퀴즈 모두 별 잔액과 무관하게 다시 볼 수 있습니다. 일부 동화는 결말이 두 갈래로 갈라져 다시 읽을 때 다른 마지막 장면을 볼 수 있습니다.',
  },

  // ── 이용 ──────────────────────────────────────────────────────────────────
  {
    id: 'signup',
    category: '이용',
    question: '가입은 어떻게 하나요?',
    answer:
      '보호자가 구글 또는 카카오 계정으로 로그인해 계정을 만든 뒤, 아이 프로필(이름·나이·레벨)을 등록하면 바로 첫 책을 만들 수 있습니다. 별도의 비밀번호 설정 절차는 없습니다.',
  },
  {
    id: 'multiple-children',
    category: '이용',
    question: '아이가 둘 이상이어도 되나요?',
    answer:
      '한 계정 아래 아이 프로필을 여러 개(2~3명) 두고 전환하며 사용할 수 있습니다. 책장·독서 기록·단어장은 프로필별로 분리되고, 별(크레딧) 잔액만 가족 단위로 합산되어 함께 사용됩니다.',
  },
  {
    id: 'app-or-web',
    category: '이용',
    question: '앱으로도 쓸 수 있나요?',
    answer:
      'iOS와 Android 앱이 각각 App Store와 Google Play에 "하루책"으로 등록되어 있고, 웹 브라우저에서도 같은 계정으로 이용할 수 있습니다. 웹 버전은 홈 화면에 추가하면 앱처럼 실행됩니다.',
  },
  {
    id: 'parents-report',
    category: '이용',
    question: '아이가 얼마나 읽었는지 확인할 수 있나요?',
    answer:
      '보호자 모드에서 읽은 책 목록, 완독률, 퀴즈 점수, 학습한 단어 수를 확인할 수 있습니다. 주간 학습 요약도 별도로 받아볼 수 있습니다.',
  },

  // ── 결제 ──────────────────────────────────────────────────────────────────
  {
    id: 'pricing',
    category: '결제',
    question: '요금은 얼마인가요?',
    answer: `하루책은 정기 구독이 아니라 필요할 때만 충전하는 별(크레딧) 방식입니다. 별 1개로 새 동화 한 권을 만들 수 있으며, ${small.name} ${formatKrw(small.priceKrw)}, ${medium.name} ${formatKrw(medium.priceKrw)}(권당 약 ${formatKrw(medium.perStarKrw)}), ${large.name} ${formatKrw(large.priceKrw)}(권당 약 ${formatKrw(large.perStarKrw)})입니다. 낭독·한글 해석·퀴즈·단어장·보호자 리포트는 추가 비용 없이 포함됩니다.`,
  },
  {
    id: 'subscription',
    category: '결제',
    question: '자동결제나 정기구독인가요?',
    answer:
      '아닙니다. 별 충전은 그때그때 한 번씩 결제하는 방식이라 자동결제도, 해지 절차도 없습니다. 필요할 때 원하는 팩을 골라 충전하면 됩니다.',
  },
  {
    id: 'star-expiry',
    category: '결제',
    question: '충전한 별에 유효기간이 있나요?',
    answer:
      '없습니다. 별은 만료되지 않으며 잔액이 0이 될 때까지 언제든 사용할 수 있습니다. 잔액은 가족 계정 단위로 합산됩니다.',
  },
  {
    id: 'payment-method',
    category: '결제',
    question: '결제 수단은 무엇이 있나요?',
    answer:
      '웹에서는 카드 결제를 지원하며 결제대행사를 경유해 처리됩니다. iOS·Android 앱에서는 각 스토어의 인앱 결제로 충전합니다. 결제 영수증은 결제 완료 화면과 보호자 모드에서 다시 확인할 수 있습니다.',
  },
  {
    id: 'refund',
    category: '결제',
    question: '환불이 되나요?',
    answer:
      '결제일로부터 7일 이내이고 충전한 별을 한 번도 사용하지 않았다면 결제 승인취소로 결제 금액이 환불됩니다. 일부만 사용했다면 남은 별의 비율만큼 환불되며, 7일이 지난 뒤 남은 별에 대해서는 결제대행 수수료 등을 공제하고 환불됩니다. 이미 동화 생성에 사용된 별은 외부 AI 호출 비용이 이미 발생했으므로 환불 대상이 아닙니다. 자세한 기준과 신청 방법은 하루책 환불정책 페이지에 안내되어 있습니다.',
  },
  {
    id: 'free-trial',
    category: '결제',
    question: '무료로 먼저 써볼 수 있나요?',
    answer:
      '가입하면 첫 동화 한 권을 만들 수 있는 별이 제공되어, 결제 없이 생성부터 낭독·퀴즈까지 전체 흐름을 경험할 수 있습니다.',
  },

  // ── 안전 ──────────────────────────────────────────────────────────────────
  {
    id: 'ai-content-safety',
    category: '안전',
    question: 'AI가 만든 이야기인데 아이가 읽어도 괜찮은가요?',
    answer:
      '동화는 아동 독자를 전제로 한 생성 규칙 아래 만들어지며, 폭력·공포·성인 소재는 배제됩니다. 문법과 어휘도 지정한 CEFR 레벨을 벗어나지 않도록 제한됩니다. 부적절한 내용이 보이면 책 화면에서 신고할 수 있고, 신고된 책은 관리자가 검토합니다.',
  },
  {
    id: 'child-privacy',
    category: '안전',
    question: '아이 개인정보는 어떻게 관리되나요?',
    answer:
      '아이에 대해 수집하는 정보는 프로필 이름, 나이, 영어 레벨, 관심 주제로 한정되며 계정은 보호자 명의로만 개설됩니다. 만 14세 미만 아동의 직접 가입은 허용되지 않고 보호자 계정 하위 프로필로만 이용됩니다. 수집 항목과 보관 기간은 개인정보처리방침에 명시되어 있으며, 계정 삭제를 요청하면 관련 데이터가 함께 삭제됩니다.',
  },
  {
    id: 'offline',
    category: '안전',
    question: '인터넷 없이도 볼 수 있나요?',
    answer:
      '동화 생성과 음성 낭독은 서버에서 처리되므로 인터넷 연결이 필요합니다. 이미 열어 본 화면은 일시적인 연결 끊김에도 이어 볼 수 있지만, 새 책을 만들거나 낭독을 처음 재생할 때는 연결이 있어야 합니다.',
  },
];

/** 카테고리별 묶음 — /faq 페이지와 마크다운 미러가 공유. */
export function faqByCategory(): Array<{ category: FaqCategory; items: FaqItem[] }> {
  return FAQ_CATEGORIES.map((category) => ({
    category,
    items: FAQ.filter((item) => item.category === category),
  })).filter((group) => group.items.length > 0);
}

/**
 * 질의어 기반 FAQ 검색 — MCP `search_faq` 툴이 사용.
 *
 * 형태소 분석 없이 공백 토큰 부분일치로 점수를 매긴다. 문항이 수십 개 규모라
 * 이 이상의 정교함은 불필요하며, 외부 검색 인프라 의존을 만들지 않는 편이 낫다.
 * 질문 매칭에 답변 매칭보다 2배 가중치를 준다.
 */
export function searchFaq(query: string, limit = 5): FaqItem[] {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];

  return FAQ.map((item) => {
    const question = item.question.toLowerCase();
    const answer = item.answer.toLowerCase();
    const score = tokens.reduce(
      (sum, token) =>
        sum + (question.includes(token) ? 2 : 0) + (answer.includes(token) ? 1 : 0),
      0,
    );
    return { item, score };
  })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ item }) => item);
}
