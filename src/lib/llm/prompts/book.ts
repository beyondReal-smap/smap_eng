import type { BookGenre } from '@/lib/db/schema';
import type { BookIntakeInput, Level } from '../schemas';

interface LevelGuideline {
  passageCount: [number, number];
  wordsPerPassage: [number, number];
  /** 책 전체 vocabulary 엔트리 수 범위. 레벨이 높을수록 더 많이. */
  vocabCount: [number, number];
  grammar: string;
  style: string;
  examples: string;
}

function levelGuideline(level: Level): LevelGuideline {
  const { age, cefr } = level;

  if (cefr === 'A1' && age <= 6) {
    return {
      passageCount: [8, 12],
      wordsPerPassage: [4, 7],
      // passage당 1~2개 어휘가 나오도록 상향
      vocabCount: [12, 20],
      grammar: 'present simple only, no contractions, avoid auxiliary verbs',
      style: 'very short, cheerful sentences a 5-year-old can read aloud',
      examples: '"The cat is small. It likes milk. It runs fast."',
    };
  }
  if (cefr === 'A1' || (cefr === 'A2' && age <= 7)) {
    return {
      passageCount: [12, 18],
      wordsPerPassage: [6, 10],
      // passage당 2개 내외
      vocabCount: [22, 32],
      grammar: 'present and past simple, simple conjunctions (and, but, so)',
      style: 'simple storybook rhythm with repetition and clear cause-effect',
      examples: '"The fox walked into the forest. He saw a little rabbit."',
    };
  }
  if (cefr === 'A2') {
    return {
      passageCount: [16, 22],
      wordsPerPassage: [10, 16],
      // passage당 2~3개
      vocabCount: [32, 48],
      grammar:
        'past simple/continuous, present perfect, time and reason conjunctions (when, while, because, so that), descriptive adjectives/adverbs, compound sentences',
      style:
        'richer narration with sensory details (sight, sound, smell), short compound sentences, a touch of dialogue',
      examples:
        '"While the golden sun was setting behind the mountains, Maya carefully climbed the tall oak tree because she wanted to find her lost kite."',
    };
  }
  if (cefr === 'B1') {
    return {
      passageCount: [22, 30],
      wordsPerPassage: [12, 22],
      // passage당 2~3개
      vocabCount: [45, 65],
      grammar:
        'past simple/continuous/perfect, relative clauses (who/which/that/where), reported speech, first/second conditionals, linking adverbs (however, suddenly, meanwhile), varied adjectives/adverbs',
      style:
        'vivid middle-grade storytelling: scene transitions, a small emotional arc, characters with clear feelings and motives, natural dialogue',
      examples:
        '"Ethan, who had never seen the ocean before, stared in wonder as the enormous waves crashed against the black rocks, filling the air with a salty mist that tasted of adventure."',
    };
  }
  // B2 — 9~10세 상위 도전 단계
  return {
    passageCount: [24, 30],
    wordsPerPassage: [16, 28],
    // passage당 3개 내외 — 가장 풍부한 어휘 노출
    vocabCount: [60, 85],
    grammar:
      'full range of past and present tenses including past perfect continuous, mixed conditionals, passive voice where natural, complex relative clauses, participle phrases, advanced linking (nevertheless, despite, in spite of, as a result), idiomatic expressions used sparingly',
    style:
      'upper-middle-grade literary storytelling: layered description, foreshadowing, figurative language (simple metaphors and similes), nuanced character emotions, short moments of introspection, tight paragraph pacing',
    examples:
      '"Having waited for what felt like an eternity at the edge of the whispering forest, Ellie finally took a deep breath and stepped inside, her heart pounding like a drum while the silver leaves shivered above her, as if the trees themselves were watching."',
  };
}

interface BuildBookPromptArgs {
  level: Level;
  /** 'fiction' | 'non_fiction'. 미지정 시 'fiction' 기본. */
  genre?: BookGenre;
  /** 자유 토픽 1줄 — 기존 흐름 호환용. intake와 동시 지정 가능. */
  topic?: string;
  /** 마법사 인테이크 — LLM에 soft hint로 주입. 답변이 null/빈 문자열이면 무시. */
  intake?: BookIntakeInput;
}

/**
 * 픽션/논픽션 분기 프롬프트.
 *
 * 픽션:
 *  - 어린이 이야기책 톤(현재 storybook author).
 *  - alternateEnding 필수(2개 결말). funFacts 출력 금지.
 *
 * 논픽션:
 *  - 어린이 지식책(non-fiction storybook) 톤 — 사실 기반·정보 전달.
 *  - alternateEnding 출력 금지. 마지막에 funFacts 2~3개로 후속 호기심 자극.
 *  - vocabulary 규칙은 동일(어휘 학습이 핵심).
 *
 * intake가 있으면 system 프롬프트 끝에 "USER INTAKE" 섹션을 추가해 답변을 soft hint로
 * 주입한다. 답변이 비거나 null이면 해당 행을 통째로 생략(LLM이 "(skipped)" 같은 표현을
 * 책에 반영하지 않도록).
 */
export function buildBookPrompt({
  level,
  genre = 'fiction',
  topic,
  intake,
}: BuildBookPromptArgs) {
  const { age, cefr } = level;
  const guide = levelGuideline(level);
  const isFiction = genre === 'fiction';

  // intake → 사용 가능한 Q&A 페어로 정규화(빈 답변 제외).
  const intakePairs: Array<{ q: string; a: string }> = [];
  if (intake) {
    const qById = new Map(intake.questions.map((q) => [q.id, q.text]));
    for (const ans of intake.answers) {
      const q = qById.get(ans.questionId);
      const a = ans.text?.trim();
      if (q && a) intakePairs.push({ q, a });
    }
  }

  const topicLine = isFiction
    ? topic
      ? `The story must be about: "${topic}".`
      : intakePairs.length > 0
        ? 'Let the user intake answers below guide the topic.'
        : 'Pick a gentle, kid-friendly topic (animals, family, small adventures, curiosity, friendship). Avoid scary, violent, or sad themes.'
    : topic
      ? `The book must teach about: "${topic}".`
      : intakePairs.length > 0
        ? 'Let the user intake answers below guide the subject.'
        : 'Pick an age-appropriate non-fiction subject from these areas: animals, space, the human body, weather, plants, history, simple science. Make it factually accurate.';

  const intakeSection =
    intakePairs.length > 0
      ? `\n\nUSER INTAKE (use these as soft hints, do not quote verbatim):\n${intakePairs
          .map((p, i) => `${i + 1}. Q: ${p.q}\n   A: ${p.a}`)
          .join('\n')}`
      : '';

  const fictionEndingsBlock = `
ALTERNATE ENDINGS (required):
- After the main passages end at a choice point, provide TWO alternate endings under "alternateEnding".
- Each ending is 2-3 short passages that resolve the story in a meaningfully different way.
- "labelA" and "labelB" are 1-3 word English titles for the choice (e.g., "Brave choice" vs "Kind choice"; "Go home" vs "Keep exploring"; "Share the treasure" vs "Hide the treasure").
- Both endings must be positive in tone and age-appropriate. Avoid scary, violent, or sad conclusions.
- Use the same CEFR/grammar/style rules as the main passages.
- Do NOT output a "funFacts" field for fiction.`;

  const nonFictionFunFactsBlock = `
FUN FACTS (required for non-fiction):
- After the main passages, output a "funFacts" array with 2-3 short additional facts that extend the topic.
- Each entry: { "title": short English headline (1-7 words), "body": one short Korean sentence (한 문장, 30~140자) explaining the fact in kid-friendly Korean }.
- Each fact must be factually accurate and verifiable in general reference materials. If unsure, omit it.
- Do NOT output an "alternateEnding" field for non-fiction.`;

  const genreToneFiction =
    "You are a bilingual (English/Korean) children's book author. You write engaging English storybooks for Korean children.";
  const genreToneNonFiction =
    "You are a bilingual (English/Korean) children's non-fiction author. You write factually accurate, kid-friendly English knowledge books for Korean children. Use real-world facts only — no made-up creatures, no fantasy, no anthropomorphism beyond what is conventional in popular science writing.";

  const system = `${isFiction ? genreToneFiction : genreToneNonFiction}
You are writing for Korean children aged ${age} at CEFR level ${cefr}.

STRICT RULES:
- Respond with ONLY valid JSON. No markdown, no prose, no preamble.
- Use vocabulary strictly appropriate for CEFR ${cefr}; do NOT dumb the content down below this level.
- Grammar: ${guide.grammar}.
- Writing style: ${guide.style}.
- Produce ${guide.passageCount[0]} to ${guide.passageCount[1]} passages. A passage may be one sentence or a short pair of connected sentences.
- Each passage should be approximately ${guide.wordsPerPassage[0]}-${guide.wordsPerPassage[1]} English words. Vary sentence length within the range to avoid a monotonous rhythm.
${
  isFiction
    ? '- The story must have a clear beginning (setup) and middle (challenge or discovery). Stop the main "passages" array just BEFORE the resolution — the main array ends at a meaningful choice point.'
    : '- The book must have a clear arc: introduce the subject, explain key facts in a logical order (cause→effect or general→specific), and end the main "passages" with a memorable closing fact or reflection.'
}
- Provide natural, fluent Korean translation ("ko") for each passage — this is for a Korean child reader. Use age-appropriate native Korean, not literal word-for-word translation.
- Include ${guide.vocabCount[0]} to ${guide.vocabCount[1]} "vocabulary" entries for words a Korean child at this level might need help with (key nouns, strong verbs, descriptive adjectives, idioms).
- **Density rule**: target about **2–3 vocabulary entries per passage** so the reader sees multiple underlined words on every screen. Fewer than 1 per passage is not acceptable; if a passage has fewer candidate words, still pick its most meaningful noun/verb.
- **Distribution rule**: distribute entries evenly from the first passage to the last. Do not cluster them in the opening or ending.
- **Verbatim rule**: each "word" must appear EXACTLY in one of the passages' "en" text (case-insensitive; simple surface form is fine). Do not invent variants or Korean-only entries.
- **Duplicate rule**: each distinct word appears only once in the vocabulary list even if it recurs in multiple passages. Pick a different word for each entry slot.
- **Exclude** trivial function words (the, a, an, is, are, was, were, and, or, but, to, of, in, on, at, it, he, she, they, we, you, I, etc). Also avoid including numbers and the child's name.
- Examples of appropriate sentence style: ${guide.examples}
${isFiction ? fictionEndingsBlock : nonFictionFunFactsBlock}${intakeSection}

OUTPUT JSON SHAPE:
{
  "title": "short English title",
  "topic": "one-line English topic",
  "passages": [ { "en": "...", "ko": "..." }, ... ],
  "vocabulary": [ { "word": "...", "meaning": "한글 뜻" }, ... ]${
    isFiction
      ? `,
  "alternateEnding": {
    "labelA": "short English choice label",
    "labelB": "short English choice label",
    "passagesA": [ { "en": "...", "ko": "..." }, ... 2-3 items ],
    "passagesB": [ { "en": "...", "ko": "..." }, ... 2-3 items ]
  }`
      : `,
  "funFacts": [ { "title": "short English headline", "body": "한 문장 한국어 설명" }, ... 2-3 items ]`
  }
}`;

  const user = `Write one engaging English ${isFiction ? 'storybook' : 'non-fiction knowledge book'} for a ${age}-year-old Korean child at CEFR ${cefr}.
${topicLine}
Follow all STRICT RULES above — especially the passage count and word-per-passage range, which define the difficulty for this reader.
Return the JSON object only.`;

  return { system, user };
}

// Backward-compat: 기존 호출처(`buildStoryPrompt(level, topic?)`)가 새 인터페이스로
// 옮겨가는 동안 유지. 새 코드는 buildBookPrompt를 직접 사용한다.
export function buildStoryPrompt(level: Level, topic?: string) {
  return buildBookPrompt({ level, genre: 'fiction', topic });
}
