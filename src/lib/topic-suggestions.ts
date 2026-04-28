// 5-10세 영어 동화 주제 풀 — 8개 카테고리 × 50개 = 400개.
// 매 호출마다 카테고리/내부 항목을 셔플하여 12개를 골고루 추출하고,
// 노출 ID는 localStorage에 저장해 다음 호출과 겹치지 않게 한다.
//
// ID 형식: `${category.id}:${index}`
// — 카테고리 추가/삭제 시 다른 카테고리의 ID는 보존되도록 prefix를 둔다.
// — 카테고리 내 순서를 함부로 바꾸면 히스토리가 무효가 되므로 새 항목은 끝에만 추가.

export interface TopicCategory {
  id: string;
  label: string;
  items: readonly string[];
}

export interface PickedTopic {
  id: string;
  label: string;
  category: string;
}

export const TOPIC_CATEGORIES: readonly TopicCategory[] = [
  {
    id: 'animals',
    label: '동물 친구',
    items: [
      '숲속 친구들', '용감한 강아지', '똑똑한 고양이', '작은 토끼의 모험', '거북이와 토끼',
      '사자왕의 하루', '곰돌이의 꿀단지', '아기 코끼리', '펭귄 가족', '다람쥐의 도토리',
      '부엉이의 밤하늘', '참새의 노래', '양떼와 목동', '말과 소년', '소중한 햄스터',
      '금붕어 이야기', '비둘기 우편배달부', '벌의 꿀 모으기', '개미의 마을', '나비의 꽃밭',
      '거미의 거미줄', '무당벌레의 모험', '잠자리의 비행', '반딧불이의 빛', '개구리 왕자',
      '도롱뇽의 호수', '거위의 여행', '오리 가족', '닭과 병아리', '칠면조의 노래',
      '까치의 둥지', '부지런한 비버', '너구리의 보물', '여우의 꾀', '늑대와 양',
      '호랑이 형제', '표범의 사냥', '코뿔소의 뿔', '하마의 목욕', '기린의 긴 목',
      '얼룩말의 줄무늬', '캥거루의 주머니', '코알라의 잠', '판다의 대나무', '원숭이의 바나나',
      '박쥐의 동굴', '고슴도치의 가시', '도마뱀의 변신', '뱀의 허물벗기', '카멜레온의 색깔',
    ],
  },
  {
    id: 'adventure',
    label: '모험·탐험',
    items: [
      '우주 모험', '바다 속 탐험', '사막의 보물', '정글 탐험', '북극 여행',
      '산속 모험', '동굴 탐험', '화산섬', '무인도 표류', '잠수함 여행',
      '열기구 여행', '낙하산 모험', '배의 선장', '해적의 보물지도', '사라진 도시',
      '잃어버린 보석', '비밀의 문', '옛날 지도', '고대 유적', '공룡 시대',
      '시간 여행', '미래 도시', '외계인과 친구', '별나라 여행', '달나라 토끼',
      '화성 탐사', '깊은 바닷속', '산호초 마을', '해녀 이야기', '등대지기',
      '기차 여행', '자전거 일주', '캠핑 모험', '보물찾기', '미로 탈출',
      '비밀 일기장', '수수께끼 편지', '마술사의 트렁크', '서커스단', '박물관의 밤',
      '도서관의 비밀', '학교 옥상', '다락방 탐험', '뒷동산 산책', '시냇물 따라',
      '숲속 오두막', '사막 캐러밴', '정글 트레킹', '빙하 위에서', '동물 구조대',
    ],
  },
  {
    id: 'fantasy',
    label: '판타지·마법',
    items: [
      '마법 학교', '작은 마법사', '마녀의 빗자루', '마법의 모자', '요정의 숲',
      '꽃의 요정', '인어 공주', '용과 친구', '작은 용', '페가수스',
      '유니콘 친구', '거인의 정원', '난쟁이 마을', '도깨비방망이', '도깨비와 떡',
      '구름 위 성', '무지개 다리', '별의 정원', '달빛 마을', '햇님과 달님',
      '마법의 거울', '마법의 책', '마법의 양탄자', '소원을 들어주는 램프', '신데렐라의 구두',
      '백설공주', '잠자는 숲속의 공주', '라푼젤의 머리카락', '빨간 모자', '미녀와 야수',
      '헨젤과 그레텔', '잭과 콩나무', '피노키오', '피터팬', '이상한 나라의 앨리스',
      '오즈의 마법사', '보물섬', '어린 왕자', '파랑새', '네잎클로버',
      '마법의 정원', '시간을 멈추는 시계', '작아지는 약', '커지는 약', '투명 망토',
      '일곱 난쟁이', '황금 사과', '마법의 호수', '별똥별 소원', '소원의 우물',
    ],
  },
  {
    id: 'daily',
    label: '일상·우정',
    items: [
      '새 친구 사귀기', '가장 친한 친구', '친구와 다툰 날', '친구를 도와줘', '비밀을 지키기',
      '함께 노는 시간', '운동회 날', '학예회 무대', '소풍 가는 날', '짝꿍 이야기',
      '전학 온 친구', '새 학기', '첫 등교', '점심시간', '쉬는 시간 놀이',
      '색종이 접기', '그림 그리기', '노래 부르기', '줄넘기 시합', '공놀이',
      '자전거 배우기', '수영 배우기', '발레 시간', '태권도 도장', '음악 시간',
      '미술 시간', '도서관 이용', '알림장', '일기 쓰기', '받아쓰기',
      '구구단 외우기', '칭찬 스티커', '칭찬 받은 날', '혼난 날', '양보하기',
      '줄서기', '숨바꼭질', '술래잡기', '무궁화 꽃이 피었습니다', '비석치기',
      '공기놀이', '종이비행기', '색칠놀이', '인형놀이', '블록 쌓기',
      '퍼즐 맞추기', '보드게임', '비 오는 날', '우산 함께 쓰기', '기다리는 시간',
    ],
  },
  {
    id: 'nature',
    label: '자연·계절',
    items: [
      '봄의 새싹', '벚꽃 구경', '진달래 산', '개나리 길', '봄비 내리는 날',
      '봄나들이', '여름 바다', '시원한 계곡', '여름 숲', '매미 소리',
      '반딧불 밤', '폭우와 무지개', '태풍 이야기', '가을 단풍', '은행나무',
      '도토리 줍기', '추수 가을', '허수아비', '갈대밭', '겨울 눈',
      '눈사람 만들기', '눈싸움', '얼음 호수', '썰매타기', '스케이트',
      '군고구마', '따뜻한 이불', '호수의 얼굴', '강가 산책', '시냇물 송사리',
      '폭포의 물보라', '바위 동굴', '절벽 위', '들판의 꽃', '풀밭의 곤충',
      '하늘의 구름', '별이 빛나는 밤', '보름달', '초승달', '해돋이',
      '해넘이', '새벽 안개', '노을 진 하늘', '비 갠 후', '천둥 번개',
      '함박눈 내리는 날', '첫눈 오는 날', '얼어붙은 호수', '빗방울의 여행', '바람의 노래',
    ],
  },
  {
    id: 'jobs',
    label: '직업·꿈',
    items: [
      '용감한 소방관', '친절한 의사 선생님', '마음씨 고운 간호사', '우리 동네 경찰', '구급대원',
      '학교 선생님', '도서관 사서', '박물관 안내원', '빵집 아저씨', '떡집 할머니',
      '우체부 아저씨', '택배 기사', '마트 점원', '식당 요리사', '농부 아저씨',
      '어부의 그물', '목수의 망치', '화가의 그림', '사진작가', '작가 선생님',
      '시인의 노래', '음악가', '피아니스트', '바이올린 연주자', '가수의 무대',
      '댄서', '발레리나', '운동선수', '축구선수', '야구선수',
      '태권도 선수', '수영 선수', '스키 선수', '체조 선수', '마라토너',
      '우주 비행사', '비행기 조종사', '헬리콥터 조종사', '기관사', '버스 운전사',
      '택시 기사', '트럭 운전사', '동물 사육사', '수의사', '약사',
      '치과 의사', '미용사', '패션 디자이너', '과학자', '환경 운동가',
    ],
  },
  {
    id: 'food',
    label: '음식·요리',
    items: [
      '요리사 곰', '김밥 만들기', '떡볶이 가게', '라면 끓이기', '짜장면',
      '피자 만들기', '햄버거', '핫도그', '통닭', '치킨 가게',
      '국수 한 그릇', '비빔밥', '미역국', '김치찌개', '된장찌개',
      '나물 반찬', '계란 부침', '만두 빚기', '송편 만들기', '떡국 한 그릇',
      '잡채', '불고기', '갈비', '회 한 점', '초밥',
      '도시락', '김밥 소풍', '빵 굽기', '케이크 만들기', '컵케이크',
      '쿠키 만들기', '마카롱', '도넛', '와플', '팬케이크',
      '샌드위치', '토스트', '시리얼 아침', '우유 한 잔', '과일 화채',
      '수박 한 조각', '딸기 잼', '사과 파이', '바나나 우유', '아이스크림',
      '빙수', '푸딩', '젤리', '솜사탕', '호빵 한 입',
    ],
  },
  {
    id: 'family',
    label: '가족·사랑',
    items: [
      '엄마와 함께', '아빠의 어깨', '할머니의 옛날 이야기', '할아버지와 산책', '동생이 생긴 날',
      '형과 누나', '언니의 머리띠', '오빠의 비밀', '사촌과 노는 날', '외할머니 댁',
      '친할아버지 시골집', '가족 여행', '명절 음식', '설날 세배', '추석 보름달',
      '어버이날 카네이션', '어린이날 선물', '생일 파티', '생일 케이크', '가족 사진',
      '가족 회의', '함께 식사', '함께 운동', '함께 책 읽기', '함께 영화보기',
      '함께 게임', '함께 산책', '함께 요리', '함께 청소', '부모님 도와주기',
      '동생 돌보기', '강아지 돌보기', '엄마 심부름', '아빠 도와드리기', '사랑한다는 말',
      '고맙다는 말', '미안하다는 말', '따뜻한 포옹', '손잡고 걷기', '어깨 위 무등',
      '자장가', '동화책 읽어주기', '옛이야기', '잘 자 인사', '좋은 꿈',
      '깨어난 아침', '새해 다짐', '행복한 하루', '아빠와 캐치볼', '엄마와 시장가기',
    ],
  },
] as const;

const STORAGE_KEY = 'smap-eng:topic-history';
// 슬라이딩 윈도우 — 직전 1회·직전직전 1회 분량(12 × 2 = 24)을 회피하면
// 다이얼로그를 빠르게 닫고 다시 여는 동안 같은 주제가 또 보이지 않는다.
const HISTORY_SIZE = 24;

function shuffle<T>(arr: readonly T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function flattenAllTopics(): PickedTopic[] {
  return TOPIC_CATEGORIES.flatMap((cat) =>
    cat.items.map<PickedTopic>((label, index) => ({
      id: `${cat.id}:${index}`,
      label,
      category: cat.id,
    })),
  );
}

/**
 * 카테고리에서 골고루 `count`개를 추출.
 *
 * 분배: count를 카테고리 수로 나눠 base = floor, extra = remainder.
 *  - 8 카테고리 × 12개 = base 1, extra 4 → 4 카테고리는 2개씩, 4 카테고리는 1개씩.
 *  - 카테고리 순서를 매번 셔플하므로 어느 카테고리가 추가 1개를 받을지 매 호출 다름.
 *
 * `exclude`(직전 노출 ID)는 우선 회피. 한 카테고리에서 회피 후 후보가 부족하면
 * 다른 카테고리의 잔여 후보로 보충해 항상 `count`개를 보장한다.
 */
export function pickTopics(
  count: number,
  exclude: ReadonlySet<string>,
): PickedTopic[] {
  if (count <= 0) return [];
  const totalCats = TOPIC_CATEGORIES.length;
  const baseEach = Math.floor(count / totalCats);
  const extra = count % totalCats;

  const shuffledCats = shuffle(TOPIC_CATEGORIES);
  const picked: PickedTopic[] = [];
  const usedIds = new Set<string>();

  shuffledCats.forEach((cat, i) => {
    const take = baseEach + (i < extra ? 1 : 0);
    if (take === 0) return;
    const candidates = cat.items
      .map<PickedTopic>((label, index) => ({
        id: `${cat.id}:${index}`,
        label,
        category: cat.id,
      }))
      .filter((t) => !exclude.has(t.id) && !usedIds.has(t.id));
    const slice = shuffle(candidates).slice(0, take);
    for (const t of slice) usedIds.add(t.id);
    picked.push(...slice);
  });

  // 카테고리당 후보 부족 시 풀 단위로 보충(항상 count개 채움).
  if (picked.length < count) {
    const need = count - picked.length;
    const fallback = flattenAllTopics().filter(
      (t) => !exclude.has(t.id) && !usedIds.has(t.id),
    );
    picked.push(...shuffle(fallback).slice(0, need));
  }

  // 카테고리 묶음으로 보이지 않게 최종 셔플.
  return shuffle(picked);
}

export function loadTopicHistory(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((x): x is string => typeof x === 'string'));
  } catch {
    return new Set();
  }
}

export function pushTopicHistory(ids: readonly string[]): void {
  if (typeof window === 'undefined') return;
  try {
    const prev = window.localStorage.getItem(STORAGE_KEY);
    const prevArr: string[] = (() => {
      if (!prev) return [];
      try {
        const p: unknown = JSON.parse(prev);
        return Array.isArray(p) ? p.filter((x): x is string => typeof x === 'string') : [];
      } catch {
        return [];
      }
    })();
    const merged = [...prevArr, ...ids].slice(-HISTORY_SIZE);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch {
    // 사파리 프라이빗 모드 등 localStorage 차단 — 풀이 충분히 커서 무시 가능.
  }
}
