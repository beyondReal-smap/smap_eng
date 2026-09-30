/**
 * 공개 샘플 동화 — AI가 실제로 읽고 인용할 수 있는 유일한 본문 콘텐츠.
 *
 * 사용자가 만든 책(`books` 테이블)은 프로필 소유 자산이라 절대 공개하지 않는다.
 * 대신 각 레벨의 결과물이 어떤 모습인지 보여주는 **정적 샘플 3권**을 여기에 고정한다.
 * DB 접근이 없으므로 이 데이터는 인증·소유권 검증 대상이 아니며, 공개 페이지·
 * llms.txt·MCP가 동일한 객체를 그대로 노출해도 안전하다.
 *
 * ⚠️ 정직성: 실제 생성되는 책은 레벨에 따라 17~35장(지문)이다. 아래 샘플은 구조를
 *    보여주기 위한 축약본이며, 각 항목의 `isAbridged`와 공개 페이지 안내 문구로
 *    이 사실을 명시한다. 분량을 실제와 같은 것처럼 표기하지 말 것.
 *
 * 본문 작성 기준은 `src/lib/llm/prompts/book.ts`의 레벨별 규칙을 따른다:
 *  - 지문 1장 = 3문장 고정
 *  - A1(5~6세): 현재형만, 축약형 없음 / A1(7~8세): 과거형 + and·but·so
 *  - A2: 과거진행·현재완료, when·while·because, 묘사 형용사
 */

import type { CefrLevel } from '@/lib/db/schema';

export interface SamplePassage {
  /** 0-based 화면 순서 */
  index: number;
  /** 영어 원문 3문장 */
  en: string[];
  /** 문장별 한글 해석 (en과 같은 길이) */
  ko: string[];
}

export interface SampleVocabItem {
  word: string;
  meaning: string;
  /** 이 책 본문에서 쓰인 예문 */
  example: string;
}

export interface SampleQuiz {
  question: string;
  choices: string[];
  /** choices의 0-based 정답 인덱스 */
  answerIndex: number;
}

export interface SampleBook {
  slug: string;
  title: string;
  titleKo: string;
  age: number;
  cefr: CefrLevel;
  genre: 'fiction' | 'non_fiction';
  topic: string;
  /** 한 문단 줄거리 — 목록/메타 설명/AI 요약 인용용 */
  summary: string;
  coverImage: string;
  coverAlt: string;
  /** 실제 생성물 대비 축약본임을 표시 */
  isAbridged: true;
  passages: SamplePassage[];
  vocabulary: SampleVocabItem[];
  quiz: SampleQuiz[];
}

export const SAMPLE_BOOKS: SampleBook[] = [
  {
    slug: 'the-sleepy-moon',
    title: 'The Sleepy Moon',
    titleKo: '졸린 달',
    age: 5,
    cefr: 'A1',
    genre: 'fiction',
    topic: '밤하늘과 잠자리',
    summary:
      '달이 너무 졸려서 하늘에서 잠이 들려고 합니다. 마을 아이들이 노래를 불러 주자 달은 다시 눈을 뜨고 밤새 언덕을 비춰 줍니다. 현재형 문장만으로 쓰인 5~6세 A1 레벨 이야기입니다.',
    coverImage: '/images/landing/cover-sleepy-moon.png',
    coverAlt: '잠든 달과 언덕 마을이 담긴 영어 동화 표지',
    isAbridged: true,
    passages: [
      {
        index: 0,
        en: ['The moon is round and white.', 'It sits high in the dark sky.', 'It looks very sleepy.'],
        ko: ['달은 동그랗고 하얘요.', '달은 어두운 하늘 높이 떠 있어요.', '달은 무척 졸려 보여요.'],
      },
      {
        index: 1,
        en: ['The moon yawns one time.', 'Its light goes soft and small.', 'The hills turn dark.'],
        ko: ['달이 한 번 하품을 해요.', '달빛이 부드럽고 작아져요.', '언덕이 어두워져요.'],
      },
      {
        index: 2,
        en: ['A small girl looks up.', 'She sees the sleepy moon.', 'She wants to help.'],
        ko: ['작은 여자아이가 위를 올려다봐요.', '아이는 졸린 달을 봐요.', '아이는 도와주고 싶어요.'],
      },
      {
        index: 3,
        en: ['The girl sings a soft song.', 'Her friends come and sing too.', 'The song goes up to the sky.'],
        ko: ['여자아이가 조용한 노래를 불러요.', '친구들도 와서 함께 불러요.', '노래가 하늘로 올라가요.'],
      },
      {
        index: 4,
        en: ['The moon opens its eyes.', 'It smiles at the children.', 'Its light grows big again.'],
        ko: ['달이 눈을 떠요.', '달이 아이들을 보고 웃어요.', '달빛이 다시 커져요.'],
      },
      {
        index: 5,
        en: ['Now the hills are bright.', 'The children go to bed.', 'The moon stays awake all night.'],
        ko: ['이제 언덕이 환해요.', '아이들은 잠자리에 들어요.', '달은 밤새 깨어 있어요.'],
      },
    ],
    vocabulary: [
      { word: 'moon', meaning: '달', example: 'The moon is round and white.' },
      { word: 'sleepy', meaning: '졸린', example: 'It looks very sleepy.' },
      { word: 'yawn', meaning: '하품하다', example: 'The moon yawns one time.' },
      { word: 'hill', meaning: '언덕', example: 'The hills turn dark.' },
      { word: 'soft', meaning: '부드러운, 조용한', example: 'The girl sings a soft song.' },
      { word: 'bright', meaning: '밝은', example: 'Now the hills are bright.' },
      { word: 'awake', meaning: '깨어 있는', example: 'The moon stays awake all night.' },
    ],
    quiz: [
      {
        question: 'How does the moon look at the beginning of the story?',
        choices: ['Angry', 'Sleepy', 'Hungry', 'Afraid'],
        answerIndex: 1,
      },
      {
        question: 'What happens to the hills when the moon yawns?',
        choices: ['They turn dark', 'They grow bigger', 'They get warm', 'They disappear'],
        answerIndex: 0,
      },
      {
        question: 'Who helps the moon first?',
        choices: ['A small girl', 'A big cat', 'A tall man', 'A bird'],
        answerIndex: 0,
      },
      {
        question: 'What do the children do to help?',
        choices: ['They run fast', 'They sing a song', 'They make a fire', 'They clap loudly'],
        answerIndex: 1,
      },
      {
        question: 'What does the moon do at the end?',
        choices: ['It falls asleep', 'It goes away', 'It stays awake all night', 'It turns red'],
        answerIndex: 2,
      },
    ],
  },
  {
    slug: 'little-fox-castle',
    title: 'Little Fox Castle',
    titleKo: '작은 여우의 성',
    age: 7,
    cefr: 'A1',
    genre: 'fiction',
    topic: '숲속 친구와 우정',
    summary:
      '작은 여우가 숲 언덕에 돌로 성을 쌓지만 혼자서는 벽이 자꾸 무너집니다. 토끼와 오소리가 도와주면서 여우는 성보다 친구가 더 좋다는 것을 알게 됩니다. 과거형과 간단한 접속사를 쓰는 7~8세 A1 레벨 이야기입니다.',
    coverImage: '/images/landing/cover-fox-castle.png',
    coverAlt: '성 앞의 작은 여우가 손짓하는 영어 동화 표지',
    isAbridged: true,
    passages: [
      {
        index: 0,
        en: [
          'A little fox lived on a green hill.',
          'He wanted a castle of his own, so he carried gray stones all morning.',
          'The stones were heavy, but the fox did not stop.',
        ],
        ko: [
          '작은 여우가 초록 언덕에 살았어요.',
          '여우는 자기만의 성을 갖고 싶어서 아침 내내 회색 돌을 날랐어요.',
          '돌은 무거웠지만 여우는 멈추지 않았어요.',
        ],
      },
      {
        index: 1,
        en: [
          'By noon the first wall stood tall.',
          'The fox smiled and put one more stone on top.',
          'Then the wall shook and fell down.',
        ],
        ko: [
          '점심때쯤 첫 번째 벽이 높이 섰어요.',
          '여우는 웃으며 맨 위에 돌을 하나 더 올렸어요.',
          '그러자 벽이 흔들리더니 무너졌어요.',
        ],
      },
      {
        index: 2,
        en: [
          'A rabbit hopped out of the tall grass.',
          'She looked at the broken wall and asked, "Can I help you?"',
          'The fox said yes, so they lifted the stones together.',
        ],
        ko: [
          '토끼가 긴 풀숲에서 폴짝 나왔어요.',
          '토끼는 무너진 벽을 보고 물었어요. "내가 도와줄까?"',
          '여우가 좋다고 해서 둘은 함께 돌을 들었어요.',
        ],
      },
      {
        index: 3,
        en: [
          'An old badger watched them from the trees.',
          'He knew about stones, so he showed them how to place the big ones first.',
          'The new wall did not shake at all.',
        ],
        ko: [
          '나이 든 오소리가 나무 사이에서 그들을 지켜봤어요.',
          '오소리는 돌을 잘 알아서 큰 돌을 먼저 놓는 법을 알려 줬어요.',
          '새 벽은 전혀 흔들리지 않았어요.',
        ],
      },
      {
        index: 4,
        en: [
          'They worked until the sun went down.',
          'The castle had four strong walls and one round door.',
          'The fox looked at it and felt proud.',
        ],
        ko: [
          '그들은 해가 질 때까지 일했어요.',
          '성에는 튼튼한 벽 네 개와 둥근 문 하나가 생겼어요.',
          '여우는 성을 보며 뿌듯했어요.',
        ],
      },
      {
        index: 5,
        en: [
          'The fox opened the round door wide.',
          '"This castle is for all of us," he said.',
          'The rabbit and the badger came inside, and the hill was not lonely anymore.',
        ],
        ko: [
          '여우가 둥근 문을 활짝 열었어요.',
          '"이 성은 우리 모두의 것이야." 여우가 말했어요.',
          '토끼와 오소리가 안으로 들어왔고, 언덕은 더 이상 외롭지 않았어요.',
        ],
      },
    ],
    vocabulary: [
      { word: 'castle', meaning: '성', example: 'He wanted a castle of his own.' },
      { word: 'stone', meaning: '돌', example: 'He carried gray stones all morning.' },
      { word: 'heavy', meaning: '무거운', example: 'The stones were heavy.' },
      { word: 'wall', meaning: '벽', example: 'By noon the first wall stood tall.' },
      { word: 'shake', meaning: '흔들리다', example: 'Then the wall shook and fell down.' },
      { word: 'lift', meaning: '들어 올리다', example: 'They lifted the stones together.' },
      { word: 'proud', meaning: '뿌듯한, 자랑스러운', example: 'The fox looked at it and felt proud.' },
      { word: 'lonely', meaning: '외로운', example: 'The hill was not lonely anymore.' },
    ],
    quiz: [
      {
        question: 'What did the little fox want to build?',
        choices: ['A boat', 'A castle', 'A bridge', 'A garden'],
        answerIndex: 1,
      },
      {
        question: 'Why did the first wall fall down?',
        choices: [
          'The rabbit pushed it',
          'The rain washed it away',
          'The fox put one more stone on top',
          'The wind was too strong',
        ],
        answerIndex: 2,
      },
      {
        question: 'What did the old badger teach them?',
        choices: [
          'To place the big stones first',
          'To work only at night',
          'To use wood instead of stone',
          'To build a smaller castle',
        ],
        answerIndex: 0,
      },
      {
        question: 'How many walls did the finished castle have?',
        choices: ['Two', 'Three', 'Four', 'Six'],
        answerIndex: 2,
      },
      {
        question: 'What did the fox decide at the end?',
        choices: [
          'The castle was for all of them',
          'He would live alone',
          'He would build another castle',
          'He would move to the forest',
        ],
        answerIndex: 0,
      },
    ],
  },
  {
    slug: 'balloon-over-hills',
    title: 'Balloon Over Hills',
    titleKo: '언덕 위의 열기구',
    age: 8,
    cefr: 'A2',
    genre: 'fiction',
    topic: '모험과 용기',
    summary:
      '할아버지의 낡은 열기구를 고친 미나가 처음으로 혼자 하늘에 오릅니다. 안개 속에서 길을 잃지만 마을 불빛을 찾아 무사히 돌아옵니다. 과거진행형과 이유·시간 접속사가 들어간 7~9세 A2 레벨 이야기입니다.',
    coverImage: '/images/landing/cover-balloon-hills.png',
    coverAlt: '푸른 언덕 위 열기구가 떠 있는 영어 동화 표지',
    isAbridged: true,
    passages: [
      {
        index: 0,
        en: [
          'The old balloon had been sitting in the barn for years, and its blue cloth was covered with dust.',
          'Mina found it while she was looking for her grandfather\'s tools.',
          'She promised herself that she would make it fly again before summer ended.',
        ],
        ko: [
          '낡은 열기구는 몇 년째 헛간에 놓여 있었고, 파란 천은 먼지로 덮여 있었어요.',
          '미나는 할아버지의 연장을 찾다가 그것을 발견했어요.',
          '미나는 여름이 끝나기 전에 다시 날게 하겠다고 스스로 약속했어요.',
        ],
      },
      {
        index: 1,
        en: [
          'For three weeks she washed the cloth and sewed every small hole she could find.',
          'Her grandfather watched from the porch because his knees were too sore for climbing.',
          '"You are doing it exactly the way I did," he said quietly.',
        ],
        ko: [
          '3주 동안 미나는 천을 빨고 눈에 띄는 작은 구멍을 모두 꿰맸어요.',
          '할아버지는 무릎이 아파 올라갈 수 없었기 때문에 현관에서 지켜보았어요.',
          '"내가 하던 것과 똑같이 하고 있구나." 할아버지가 조용히 말했어요.',
        ],
      },
      {
        index: 2,
        en: [
          'On a clear morning in August, the balloon finally lifted off the grass.',
          'While the ground was falling away below her, Mina held the basket with both hands.',
          'The hills looked like green waves that had stopped moving.',
        ],
        ko: [
          '8월의 맑은 아침, 열기구가 마침내 잔디에서 떠올랐어요.',
          '땅이 아래로 멀어지는 동안 미나는 두 손으로 바구니를 붙잡았어요.',
          '언덕은 움직임을 멈춘 초록 파도처럼 보였어요.',
        ],
      },
      {
        index: 3,
        en: [
          'Then a thick fog rolled in from the valley, and the hills disappeared one by one.',
          'Mina could not see the river or the road anymore, so she did not know which way home was.',
          'Her heart was beating fast, but she remembered what her grandfather had told her.',
        ],
        ko: [
          '그때 골짜기에서 짙은 안개가 밀려와 언덕이 하나씩 사라졌어요.',
          '미나는 강도 길도 더 이상 볼 수 없어서 집이 어느 쪽인지 알 수 없었어요.',
          '심장이 빠르게 뛰었지만, 미나는 할아버지가 해 준 말을 떠올렸어요.',
        ],
      },
      {
        index: 4,
        en: [
          '"When you cannot see the ground, listen for it," he had always said.',
          'Mina closed her eyes and heard a dog barking somewhere below the fog.',
          'She pulled the rope gently and let the balloon drop toward the sound.',
        ],
        ko: [
          '"땅이 보이지 않을 때는 소리를 들어라." 할아버지는 늘 그렇게 말했어요.',
          '미나는 눈을 감고 안개 아래 어딘가에서 개가 짖는 소리를 들었어요.',
          '미나는 밧줄을 살며시 당겨 소리가 나는 쪽으로 열기구를 내렸어요.',
        ],
      },
      {
        index: 5,
        en: [
          'The fog opened, and the small yellow lights of her village appeared right below.',
          'Her grandfather was standing in the field, waving both arms above his head.',
          'Mina landed softly beside him and understood that she had not been flying alone.',
        ],
        ko: [
          '안개가 걷히자 마을의 작은 노란 불빛들이 바로 아래에 나타났어요.',
          '할아버지가 들판에 서서 두 팔을 머리 위로 흔들고 있었어요.',
          '미나는 그 옆에 사뿐히 내려앉으며, 자신이 혼자 날았던 게 아니라는 걸 알았어요.',
        ],
      },
    ],
    vocabulary: [
      { word: 'barn', meaning: '헛간', example: 'The old balloon had been sitting in the barn for years.' },
      { word: 'dust', meaning: '먼지', example: 'Its blue cloth was covered with dust.' },
      { word: 'sew', meaning: '바느질하다, 꿰매다', example: 'She sewed every small hole she could find.' },
      { word: 'sore', meaning: '아픈, 쑤시는', example: 'His knees were too sore for climbing.' },
      { word: 'lift off', meaning: '이륙하다, 떠오르다', example: 'The balloon finally lifted off the grass.' },
      { word: 'fog', meaning: '안개', example: 'A thick fog rolled in from the valley.' },
      { word: 'disappear', meaning: '사라지다', example: 'The hills disappeared one by one.' },
      { word: 'gently', meaning: '부드럽게, 살며시', example: 'She pulled the rope gently.' },
      { word: 'appear', meaning: '나타나다', example: 'The small yellow lights of her village appeared right below.' },
    ],
    quiz: [
      {
        question: 'Where did Mina find the old balloon?',
        choices: ['In the barn', 'On the hill', 'By the river', 'In the village'],
        answerIndex: 0,
      },
      {
        question: 'Why did her grandfather watch from the porch?',
        choices: [
          'He was too busy',
          'His knees were too sore for climbing',
          'He did not like the balloon',
          'He was waiting for a visitor',
        ],
        answerIndex: 1,
      },
      {
        question: 'What problem did Mina face while she was flying?',
        choices: [
          'The basket broke',
          'A storm started',
          'A thick fog hid the hills',
          'The balloon ran out of air',
        ],
        answerIndex: 2,
      },
      {
        question: 'What helped Mina find her way home?',
        choices: [
          'The sound of a dog barking',
          'A map in the basket',
          'The light of the moon',
          'Another balloon',
        ],
        answerIndex: 0,
      },
      {
        question: 'What did Mina understand at the end of the story?',
        choices: [
          'She would never fly again',
          'The balloon was too old',
          'She had not been flying alone',
          'The fog would come back',
        ],
        answerIndex: 2,
      },
    ],
  },
];

export function getSampleBook(slug: string): SampleBook | undefined {
  return SAMPLE_BOOKS.find((book) => book.slug === slug);
}

/** 목록 화면·MCP `list_sample_books`가 쓰는 경량 메타(본문 제외). */
export function sampleBookSummaries() {
  return SAMPLE_BOOKS.map(({ slug, title, titleKo, age, cefr, genre, topic, summary, coverImage }) => ({
    slug,
    title,
    titleKo,
    age,
    cefr,
    genre,
    topic,
    summary,
    coverImage,
    url: `/samples/${slug}`,
  }));
}

/** 본문 전체를 한 문자열로 — 글자 수·문장 수 안내 및 검색 인덱싱용. */
export function sampleBookPlainText(book: SampleBook): string {
  return book.passages.flatMap((passage) => passage.en).join(' ');
}
