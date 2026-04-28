import type { BookGenre } from '@/lib/db/schema';
import type { Level } from '../schemas';

interface BuildIntakeQuestionsPromptArgs {
  genre: BookGenre;
  level: Level;
}

/**
 * 마법사 step 3에서 LLM에 던질 질문 2~3개를 만들어내는 프롬프트.
 *
 * 출력은 IntakeQuestionsSchema 와 일치하도록:
 *   - 영문 slug id (a-z0-9- )
 *   - 한국어 본문 question (1~120자)
 *   - 선택적 placeholder, suggestionChips
 *
 * 디자인 의도:
 *   - 답변은 모두 선택. 비어 있어도 책 생성이 가능해야 한다 ("must NOT be required").
 *   - 한 답변 = 한 줄 ~ 두 줄. 보호자가 빠르게 답하도록.
 *   - 픽션은 인물·배경·감정 중심, 논픽션은 호기심·분야·이유 중심으로 다양화.
 */
export function buildIntakeQuestionsPrompt({
  genre,
  level,
}: BuildIntakeQuestionsPromptArgs) {
  const { age, cefr } = level;
  const isFiction = genre === 'fiction';

  const focus = isFiction
    ? 'Mix among these themes (cover at least 2 different ones): the child\'s mood today, a setting/place idea, a main character idea, a special object or item, an emotion they want the story to explore.'
    : 'Mix among these themes (cover at least 2 different ones): something the child was curious about today, a subject area they like (animals, space, history, science, etc.), a "why" question they have, a place or thing they want to know more about.';

  const system = `You are a friendly Korean parent-facing assistant for a Korean kids' English storybook app called "하루책".
Your job: generate 2-3 short Korean questions to ask a Korean parent before generating a ${isFiction ? 'fiction storybook' : 'non-fiction knowledge book'} for their ${age}-year-old at CEFR ${cefr}.

STRICT RULES:
- Respond with ONLY valid JSON. No markdown, no prose, no preamble.
- All "text" fields must be in natural Korean, friendly and warm (존댓말).
- Each question must be answerable in 1-2 short sentences and must NOT be required (parent may skip every one of them).
- Do NOT ask the child's name, age, English level, or anything we already know.
- Do NOT ask multiple questions inside one "text" field.
- ${focus}
- Each question's "id" must be a short English slug (a-z, 0-9, hyphen only), descriptive of what is being asked. Example slugs: "today-mood", "favorite-place", "main-character", "curious-about", "subject-area".
- "placeholder": a Korean example answer (max ~30자), like "반짝이는 별, 무지개". Optional.
- "suggestionChips": up to 4 short Korean chips (max ~12자 each) that a parent can tap to auto-fill. Use them especially for questions where common answers exist (e.g., subject area, mood, place type). Optional.

OUTPUT JSON SHAPE:
{
  "questions": [
    { "id": "slug-id", "text": "질문 본문?", "placeholder": "예시 답변", "suggestionChips": ["칩1", "칩2"] },
    ...
  ]
}
Length: exactly 2 or 3 questions.`;

  const user = `Generate 2-3 ${isFiction ? 'fiction-themed' : 'non-fiction-themed'} intake questions for a parent of a ${age}-year-old at CEFR ${cefr}. Return only the JSON object.`;

  return { system, user };
}
