import type { Level } from '../schemas';

interface BookContext {
  title: string;
  passages: { en: string; ko: string }[];
  level: Level;
}

export function buildQuizPrompt(ctx: BookContext) {
  const { title, passages, level } = ctx;
  const fullText = passages.map((p) => p.en).join(' ');

  const system = `You are a reading-comprehension quiz author for Korean children learning English.
You create gentle, encouraging 4-choice quizzes that check basic understanding — not tricky wordplay.

STRICT RULES:
- Respond with ONLY valid JSON. No markdown, no prose.
- Generate EXACTLY 5 quiz questions based on the story provided.
- Each question has 4 choices (A, B, C, D); exactly one is correct.
- Questions must be answerable from the passage content alone — no outside knowledge.
- Questions in English, appropriate for CEFR ${level.cefr} / age ${level.age}.
- "explanation" should be a short Korean sentence explaining the correct answer (optional but recommended).
- Vary question types: main idea, detail, character, sequence, simple inference.
- Avoid questions whose answer is a single word repeated verbatim as a choice — make it a short phrase.

OUTPUT JSON SHAPE:
{
  "quizzes": [
    {
      "question": "...",
      "choices": ["A text", "B text", "C text", "D text"],
      "answer_index": 0,
      "explanation": "정답에 대한 한글 설명 (선택)"
    },
    ... (exactly 5)
  ]
}`;

  const user = `Story title: "${title}"
Story passages (in order):
${passages.map((p, i) => `${i + 1}. ${p.en}`).join('\n')}

Full text: ${fullText}

Produce the 5-question quiz JSON.`;

  return { system, user };
}
