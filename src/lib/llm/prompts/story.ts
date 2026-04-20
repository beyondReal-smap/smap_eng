import type { Level } from '../schemas';

// 레벨별 생성 파라미터 — PROJECT.md의 레벨 체계와 일치해야 함
interface LevelGuideline {
  passageCount: [number, number]; // [min, max]
  wordsPerPassage: [number, number];
  grammar: string;
  examples: string;
}

function levelGuideline(level: Level): LevelGuideline {
  const { age, cefr } = level;

  if (cefr === 'A1' && age <= 6) {
    return {
      passageCount: [8, 12],
      wordsPerPassage: [4, 7],
      grammar: 'present simple only, no contractions, avoid auxiliary verbs',
      examples: '"The cat is small. It likes milk. It runs fast."',
    };
  }
  if (cefr === 'A1' || (cefr === 'A2' && age <= 7)) {
    return {
      passageCount: [12, 18],
      wordsPerPassage: [6, 10],
      grammar: 'present and past simple, simple conjunctions (and, but, so)',
      examples: '"The fox walked into the forest. He saw a little rabbit."',
    };
  }
  if (cefr === 'A2') {
    return {
      passageCount: [14, 20],
      wordsPerPassage: [8, 12],
      grammar: 'past simple, present continuous, basic connectors, simple adjectives',
      examples:
        '"While the sun was setting, Maya climbed up the tall oak tree to look for her friend."',
    };
  }
  // B1
  return {
    passageCount: [18, 25],
    wordsPerPassage: [8, 14],
    grammar:
      'past simple/continuous, relative clauses, feeling/opinion expressions, simple reported speech',
    examples:
      '"Ethan, who had never seen the ocean before, stared in wonder as the waves crashed against the rocks."',
  };
}

export function buildStoryPrompt(level: Level, topic?: string) {
  const { age, cefr } = level;
  const guide = levelGuideline(level);
  const topicLine = topic
    ? `The story must be about: "${topic}".`
    : 'Pick a gentle, kid-friendly topic (animals, family, small adventures). Avoid scary, violent, or sad themes.';

  const system = `You are a bilingual (English/Korean) children's book author.
You write short, cheerful English storybooks for Korean children aged ${age} at CEFR level ${cefr}.

STRICT RULES:
- Respond with ONLY valid JSON. No markdown, no prose, no preamble.
- Use vocabulary strictly appropriate for CEFR ${cefr}.
- Grammar: ${guide.grammar}.
- Use ${guide.passageCount[0]} to ${guide.passageCount[1]} passages (sentences or very short pairs of sentences).
- Each passage should be ${guide.wordsPerPassage[0]}-${guide.wordsPerPassage[1]} English words.
- Provide natural, fluent Korean translation ("ko") for each passage — this is for a Korean child reader.
- Optionally include up to 10 "vocabulary" entries for words a Korean child at this level might need help with.
- Examples of appropriate sentence style: ${guide.examples}

OUTPUT JSON SHAPE:
{
  "title": "short English title",
  "topic": "one-line English topic",
  "passages": [ { "en": "...", "ko": "..." }, ... ],
  "vocabulary": [ { "word": "...", "meaning": "한글 뜻" }, ... ]  // optional
}`;

  const user = `Write one short English storybook for a ${age}-year-old Korean child at CEFR ${cefr}.
${topicLine}
Return the JSON object only.`;

  return { system, user };
}
