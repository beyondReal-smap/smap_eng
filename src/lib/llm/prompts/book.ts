import type { BookGenre } from '@/lib/db/schema';
import type { BookIntakeInput, Level } from '../schemas';

interface LevelGuideline {
  passageCount: [number, number];
  /** passage 1개당 문장 수 범위 — 한 화면이 미니 장면(mini-scene)이 되도록. */
  sentencesPerPassage: [number, number];
  /** passage 1개 전체의 영어 단어 수 범위(문장 합산). */
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
      passageCount: [12, 16],
      sentencesPerPassage: [3, 4],
      wordsPerPassage: [12, 22],
      // passage당 1~2개 어휘가 나오도록 상향
      vocabCount: [18, 28],
      grammar: 'present simple only, no contractions, avoid auxiliary verbs',
      style: 'very short, cheerful sentences a 5-year-old can read aloud',
      examples: '"The cat is small. It likes milk. It runs fast. It naps in the warm sun."',
    };
  }
  if (cefr === 'A1' || (cefr === 'A2' && age <= 7)) {
    return {
      passageCount: [14, 20],
      sentencesPerPassage: [3, 4],
      wordsPerPassage: [18, 32],
      // passage당 2개 내외
      vocabCount: [30, 42],
      grammar: 'present and past simple, simple conjunctions (and, but, so)',
      style: 'simple storybook rhythm with repetition and clear cause-effect',
      examples:
        '"The fox walked into the forest. He saw a little rabbit. The rabbit looked sad, so the fox stopped."',
    };
  }
  if (cefr === 'A2') {
    return {
      passageCount: [18, 24],
      sentencesPerPassage: [3, 5],
      wordsPerPassage: [30, 50],
      // passage당 2~3개
      vocabCount: [42, 60],
      grammar:
        'past simple/continuous, present perfect, time and reason conjunctions (when, while, because, so that), descriptive adjectives/adverbs, compound sentences',
      style:
        'richer narration with sensory details (sight, sound, smell), short compound sentences, a touch of dialogue',
      examples:
        '"While the golden sun was setting behind the mountains, Maya carefully climbed the tall oak tree. She wanted to find her lost kite before dark. Far below, her little brother held his breath and watched."',
    };
  }
  if (cefr === 'B1') {
    return {
      passageCount: [20, 28],
      sentencesPerPassage: [3, 5],
      wordsPerPassage: [45, 70],
      // passage당 2~3개
      vocabCount: [58, 80],
      grammar:
        'past simple/continuous/perfect, relative clauses (who/which/that/where), reported speech, first/second conditionals, linking adverbs (however, suddenly, meanwhile), varied adjectives/adverbs',
      style:
        'vivid middle-grade storytelling: scene transitions, a small emotional arc, characters with clear feelings and motives, natural dialogue',
      examples:
        '"Ethan, who had never seen the ocean before, stared in wonder as the enormous waves crashed against the black rocks. The air filled with a salty mist that tasted of adventure. Somewhere beyond the fog, a lighthouse blinked slowly, as if it were calling his name."',
    };
  }
  // B2 — 9~10세 상위 도전 단계
  return {
    passageCount: [22, 30],
    sentencesPerPassage: [4, 6],
    wordsPerPassage: [60, 95],
    // passage당 3개 내외 — 가장 풍부한 어휘 노출
    vocabCount: [75, 100],
    grammar:
      'full range of past and present tenses including past perfect continuous, mixed conditionals, passive voice where natural, complex relative clauses, participle phrases, advanced linking (nevertheless, despite, in spite of, as a result), idiomatic expressions used sparingly',
    style:
      'upper-middle-grade literary storytelling: layered description, foreshadowing, figurative language (simple metaphors and similes), nuanced character emotions, short moments of introspection, tight paragraph pacing',
    examples:
      '"Having waited for what felt like an eternity at the edge of the whispering forest, Ellie finally took a deep breath and stepped inside. Her heart pounded like a drum while the silver leaves shivered above her, as if the trees themselves were watching. Somewhere deeper among the shadows, something answered her arrival with a low, patient hum."',
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

  const hasTopic = !!topic;
  const hasIntake = intakePairs.length > 0;

  // topic 과 intake 가 동시에 주어졌을 때가 가장 중요한 케이스 — 둘이 어떻게 결합되는지
  // 명시적 지시가 없으면 LLM이 topic만 따르고 intake를 무시하는 경향이 있다. 픽션은 "topic은
  // 무대/세계관, intake는 주인공의 개인성"으로, 논픽션은 "topic은 주제, intake는 도입부 훅"
  // 으로 결합 패턴을 강제한다.
  let topicLine: string;
  if (isFiction) {
    if (hasTopic && hasIntake) {
      topicLine = [
        `The TOPIC of this story is: "${topic}". Use it as the world, setting, or central situation.`,
        'The USER INTAKE answers below define the personal flavor — the protagonist\'s mood/motivation today, a special object they care about, OR a concrete sensory detail of the scene.',
        'Weave at least one intake answer into the story\'s setup (passages 1-3) so the child\'s voice is felt early — but ONLY if it fits naturally inside the topic\'s world. If an intake answer would feel forced, jarring, or off-topic, place it later in the story or skip that specific answer entirely. A natural omission is far better than an awkward insertion that breaks immersion.',
        'Do NOT quote intake answers verbatim; translate them into narrative action, dialogue, or description.',
        'Do NOT save intake details for the ending only — they should shape the opening when they fit.',
      ].join(' ');
    } else if (hasTopic) {
      topicLine = `The story must be about: "${topic}".`;
    } else if (hasIntake) {
      topicLine =
        'Let the USER INTAKE answers below drive the topic, the protagonist, and the emotional arc of the story. Choose ONE intake answer as the spine of the story and build outward from it.';
    } else {
      topicLine =
        'Pick a gentle, kid-friendly topic (animals, family, small adventures, curiosity, friendship). Avoid scary, violent, or sad themes.';
    }
  } else {
    if (hasTopic && hasIntake) {
      topicLine = [
        `The TOPIC this book teaches about is: "${topic}".`,
        'The USER INTAKE answers below reflect the child\'s actual curiosity or interest today.',
        'Open passage 1 with a short hook (1-2 sentences) that ties at least one intake answer to the topic — make the child feel personally invited into the subject.',
        'Use the intake to decide WHICH facet of the topic to emphasize (e.g., if a child is curious about color, lean into the color aspects of the topic).',
        'If possible, include one entry in funFacts that directly answers an intake-driven curiosity.',
        'Do NOT quote intake verbatim; weave it naturally into the narration.',
      ].join(' ');
    } else if (hasTopic) {
      topicLine = `The book must teach about: "${topic}".`;
    } else if (hasIntake) {
      topicLine =
        'Let the USER INTAKE answers below drive the choice of subject and the angle of explanation. Pick a non-fiction subject most directly connected to the intake.';
    } else {
      topicLine =
        'Pick an age-appropriate non-fiction subject from these areas: animals, space, the human body, weather, plants, history, simple science. Make it factually accurate.';
    }
  }

  const intakeSection =
    intakePairs.length > 0
      ? `\n<user_intake>\nUse the following parent-provided answers as soft hints. Do NOT quote them verbatim — translate them into action, dialogue, or detail. If a specific answer would feel forced inside the topic's world, skip that one rather than jamming it in.\n${intakePairs
          .map((p, i) => `${i + 1}. Q: ${p.q}\n   A: ${p.a}`)
          .join('\n')}\n</user_intake>`
      : '';

  const fictionEndingsBlock = `<alternate_endings>
- After the main passages end at a choice point, provide TWO alternate endings under "alternateEnding".
- Each ending is 2-3 short passages that resolve the story in a meaningfully different way.
- "labelA" and "labelB" are 1-3 word English titles for the choice. The two endings should illustrate DIFFERENT but BOTH-VALUABLE virtues or approaches (e.g., "Brave choice" vs "Kind choice"; "Help alone" vs "Ask a friend"; "Share now" vs "Save for later"; "Speak up" vs "Listen first"). Avoid pairing one obviously "right" choice against an obviously "wrong" one — the child should learn that thoughtful, caring choices can take different shapes.
- Both endings must be positive in tone and age-appropriate. Avoid scary, violent, or sad conclusions.
- Each ending should make the story's lesson/virtue visible through what the character DOES, not through a narrator explaining the moral.
- Use the same CEFR/grammar/style rules as the main passages.
- Ending continuity (critical): each ending must directly answer the choice point set up in the LAST main passage. The first ending passage names or echoes the chosen action so the reader knows the choice took effect. Do not introduce a brand-new character, setting, or problem inside the ending.
- Ending resolution: by the final ending passage, the protagonist's original goal/problem from the setup is clearly resolved — no dangling threads.
- Do NOT output a "funFacts" field for fiction.
</alternate_endings>`;

  const missionsBlock = `<in_book_missions>
- Output a "missions" array with 3-4 mini-game entries spread across the book (never two missions on adjacent passages; none on the first or last passage).
- Each entry: { "passageIndex": 0-based index into "passages", "wordHunt"?: { "targetWord", "hintKo" }, "check"?: { "question", "choices": [two options], "answerIndex": 0 or 1 } }.
- Each mission has EITHER wordHunt OR check, not both. Use 2-3 wordHunt and 1-2 check missions.
- wordHunt.targetWord MUST be a word that (a) appears verbatim in that passage's "en" text AND (b) is one of the book's "vocabulary" entries. hintKo is one playful Korean sentence telling the child what to find WITHOUT saying the English word itself (e.g., "'용감한'이라는 뜻의 단어를 찾아 눌러 봐!").
- check.question is a simple Korean comprehension question answerable ONLY from that passage (or earlier ones). Both choices are short Korean phrases; exactly one is correct. Keep it easy and encouraging — this is a fun checkpoint, not a test.
- Missions must never spoil events that happen AFTER their passage.
</in_book_missions>`;

  const nonFictionFunFactsBlock = `<fun_facts>
- After the main passages, output a "funFacts" array with 2-3 short additional facts that extend the topic.
- Each entry: { "title": short English headline (1-7 words), "body": one short Korean sentence (한 문장, 30~140자) explaining the fact in kid-friendly Korean }.
- Each fact must be factually accurate and verifiable in general reference materials. If unsure, omit it.
- Do NOT output an "alternateEnding" field for non-fiction.
</fun_facts>`;

  const genreToneFiction =
    "You are a bilingual (English/Korean) children's book author. You write engaging English storybooks for Korean children.";
  const genreToneNonFiction =
    "You are a bilingual (English/Korean) children's non-fiction author. You write factually accurate, kid-friendly English knowledge books for Korean children. Use real-world facts only — no made-up creatures, no fantasy, no anthropomorphism beyond what is conventional in popular science writing.";

  const narrativeQualityBlock = isFiction
    ? `<theme_and_lesson>
- Every story must quietly embody ONE age-appropriate virtue or life lesson a ${age}-year-old can recognize — for example: kindness, honesty, courage, patience, curiosity, sharing, keeping a promise, listening to others, trying again after failure, gratitude, empathy, taking responsibility for a small mistake, or friendship across differences.
- Pick the lesson WHEN you plan the problem so the two fit together naturally. The lesson must arise FROM the story's problem, not be bolted on at the end.
- SHOW the lesson through the protagonist's choice, action, or feeling — do NOT state it ("And the moral is...", "She learned that..."). No didactic narrator voice, no adult moralizing, no preachy dialogue. A young reader should feel the lesson, not be lectured.
</theme_and_lesson>

<narrative_coherence>
- The story must have a clear beginning (setup) and middle (challenge or discovery). Stop the main "passages" array just BEFORE the resolution — the main array ends at a meaningful choice point.
- Write a single continuous story:
  1. Open by naming the protagonist and the setting in passage 1 or 2.
  2. Introduce ONE clear problem, goal, or curiosity. Do NOT switch problems halfway.
  3. Every passage must follow from the previous one through cause→effect, "and then", or the character's reaction. No sudden time jumps, no characters appearing out of nowhere, no objects vanishing.
  4. The character's motivation must stay consistent — if they fear something in passage 3, they cannot calmly ignore it in passage 5 without an in-story reason.
  5. The LAST main passage must set up a real, concrete choice the reader can answer (e.g., "Should Mia open the door or call for help?"). Do not end the main array mid-thought.
  6. No absurd or out-of-place elements: every character, object, and event must make sense within the story's own rules. If a detail (a flying chair, a sudden new character, a magical wish) appears, it must be either set up earlier OR plausible in the established world. Do not insert random "fun" elements that have nothing to do with the protagonist's problem.
  7. Earned solution: the protagonist must move toward solving the problem through their OWN choice, effort, kindness, or insight — NOT through a sudden magical fix, a stranger appearing at the last moment to do the work, or pure coincidence. The choice point at the end of the main passages should feel like the protagonist's own decision, not a deus ex machina.
- Realism for the age: events should feel plausible for a ${age}-year-old's world. A talking animal is fine in a fantasy frame; a 6-year-old driving a car is not. Magic is allowed only if it is established by passage 3 at the latest.
- No filler: every passage must advance plot, character, or setting. Remove decorative sentences that don't move the story forward — especially sentences added only to surface a vocabulary word.
</narrative_coherence>`
    : `<arc>
- The book must have a clear arc: introduce the subject, explain key facts in a logical order (cause→effect or general→specific), and end the main "passages" with a memorable closing fact or reflection.
</arc>

<factual_coherence>
- Every claim must be a fact a Korean child can verify in a general encyclopedia. No anthropomorphism beyond conventional science writing. No invented species, no made-up statistics.
- Logical flow: each passage must build on the previous one. Do not jump between unrelated subtopics; group related facts together.
- Curiosity over cuteness: a vivid, accurate, kid-friendly explanation beats a cute-but-vague analogy. Use concrete numbers, real species names, and real places when relevant.
</factual_coherence>`;

  const system = `<role>
${isFiction ? genreToneFiction : genreToneNonFiction}
You are writing for Korean children aged ${age} at CEFR level ${cefr}.
</role>

<output_rules>
- Respond with ONLY valid JSON. No markdown, no prose, no preamble.
</output_rules>

<language_rules>
- Use vocabulary strictly appropriate for CEFR ${cefr}; do NOT dumb the content down below this level.
- Grammar: ${guide.grammar}.
- Writing style: ${guide.style}.
- Example of appropriate English sentence style: ${guide.examples}
</language_rules>

<length_rules>
- Produce ${guide.passageCount[0]} to ${guide.passageCount[1]} passages.
- Each passage is a mini-scene of ${guide.sentencesPerPassage[0]}-${guide.sentencesPerPassage[1]} connected sentences, approximately ${guide.wordsPerPassage[0]}-${guide.wordsPerPassage[1]} English words in total. Single-sentence passages are NOT acceptable.
- Use the extra sentences to DEEPEN the scene — a character's feeling or reaction, one concrete sensory detail, or a short line of dialogue — never to repeat information already stated or to pad with decoration.
- Vary sentence length within each passage to avoid a monotonous rhythm.
</length_rules>

${narrativeQualityBlock}

<korean_translation>
- Provide natural, fluent Korean translation ("ko") for each passage — this is for a Korean child reader.
- Use warm, age-appropriate Korean children's-book voice (어린이 동화체). Friendly sentence endings such as "~했어요 / 했지요 / 하더래요 / 했답니다" feel natural for younger readers; ${age >= 9 ? 'for this age, a slightly more mature middle-grade Korean tone is acceptable too.' : 'keep the tone soft and warm.'}
- AVOID stiff translation-ese (번역투): no rigid "그것은 ~이다" constructions, no overuse of "그는/그녀는" where Korean would drop the pronoun, no direct English syntax conversions. The ko text should read as if originally written for a Korean children's picture book — natural rhythm, natural omissions of pronouns and articles, natural word order.
- AVOID over-formal 격식체 (~합니다 narration) inside the storybook passages, unless ${isFiction ? 'a character is speaking that way for in-story reasons' : 'it fits an encyclopedic/expository tone naturally'}.
</korean_translation>

<vocabulary_rules>
- Include ${guide.vocabCount[0]} to ${guide.vocabCount[1]} "vocabulary" entries for words a Korean child at this level might need help with (key nouns, strong verbs, descriptive adjectives, idioms).
- Density: target about 2–3 vocabulary entries per passage so the reader sees multiple underlined words on every screen. Fewer than 1 per passage is not acceptable; if a passage has fewer candidate words, still pick its most meaningful noun/verb.
- Narrative quality wins over density: NEVER invent or pad a passage just to surface a vocabulary word. If a naturally short passage has only one strong candidate, pick that one — do NOT add filler content for the word's sake. The story/explanation comes first; vocabulary entries are drawn FROM it, not the other way around.
- Distribution: distribute entries evenly from the first passage to the last. Do not cluster them in the opening or ending.
- Verbatim: each "word" must appear EXACTLY in one of the passages' "en" text (case-insensitive; simple surface form is fine). Do not invent variants or Korean-only entries.
- Duplicate: each distinct word appears only once in the vocabulary list even if it recurs in multiple passages. Pick a different word for each entry slot.
- Exclude trivial function words (the, a, an, is, are, was, were, and, or, but, to, of, in, on, at, it, he, she, they, we, you, I, etc). Also avoid including numbers and the child's name.
</vocabulary_rules>

${isFiction ? fictionEndingsBlock : nonFictionFunFactsBlock}

${missionsBlock}${intakeSection}

<output_format>
Return JSON in this exact shape:
{
  "title": "short English title",
  "topic": "one-line English topic",
  "passages": [ { "en": "...", "ko": "..." }, ... ],
  "vocabulary": [ { "word": "...", "meaning": "한글 뜻" }, ... ],
  "missions": [ { "passageIndex": 2, "wordHunt": { "targetWord": "...", "hintKo": "..." } }, { "passageIndex": 5, "check": { "question": "...", "choices": ["...", "..."], "answerIndex": 0 } }, ... 3-4 items ]${
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
}
</output_format>`;

  const planningLine = (() => {
    if (isFiction) {
      const base =
        'Before writing, silently plan: (1) who is the protagonist, (2) what is the ONE problem or goal, (3) which age-appropriate virtue or lesson the story will quietly embody — chosen so it fits the problem naturally, not bolted on, (4) how the protagonist will work toward solving the problem through their own choice/effort (not magic or coincidence), (5) what concrete choice ends the main passages, (6) how each of the two endings resolves that exact choice while showing different valid facets of the chosen virtue';
      const fusionStep = hasIntake
        ? `, (7) which intake answer(s) fit naturally into passages 1-3 and HOW (as the protagonist's feeling, a named object, or a setting detail)${hasTopic ? `, and how that intake answer fits inside the "${topic}" world — if it would feel forced, skip it instead of jamming it in` : ''}`
        : '';
      return `${base}${fusionStep}. Then write the JSON so it matches that plan with no gaps.\n`;
    }
    // 논픽션도 사일런트 플래닝을 강제 — intake가 있으면 도입 훅을 미리 설계.
    const baseNf =
      'Before writing, silently plan: (1) what is the single main subject, (2) what 4-6 facts you will teach in what order (general → specific or cause → effect), (3) what the closing reflection is';
    const fusionStepNf = hasIntake
      ? `, (4) which intake answer becomes the opening hook (1-2 sentence personal bridge), (5) which funFact responds to an intake-driven curiosity`
      : '';
    return `${baseNf}${fusionStepNf}. Then write the JSON so it matches that plan with no gaps.\n`;
  })();

  const user = `Write one engaging English ${isFiction ? 'storybook' : 'non-fiction knowledge book'} for a ${age}-year-old Korean child at CEFR ${cefr}.
${topicLine}
Follow ALL rules in the system message — especially <length_rules> (passage count, sentences per passage), ${isFiction ? '<theme_and_lesson>, <narrative_coherence>' : '<arc>, <factual_coherence>'}, <vocabulary_rules>, <in_book_missions>, and <korean_translation>.
${planningLine}Return the JSON object only.`;

  return { system, user };
}

// Backward-compat: 기존 호출처(`buildStoryPrompt(level, topic?)`)가 새 인터페이스로
// 옮겨가는 동안 유지. 새 코드는 buildBookPrompt를 직접 사용한다.
export function buildStoryPrompt(level: Level, topic?: string) {
  return buildBookPrompt({ level, genre: 'fiction', topic });
}
