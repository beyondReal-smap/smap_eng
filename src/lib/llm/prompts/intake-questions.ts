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

  // 답변이 책의 도입부에 직접 녹아들 수 있도록 "구체성"을 강하게 요구. 추상적인 답
  // (예: "행복한 이야기")은 LLM이 책에 못 녹인다 — 구체적 사물/장소/감정/궁금증이 필요.
  const focus = isFiction
    ? [
        'These answers will be woven into the storybook\'s opening passages (1-2) as the protagonist\'s mood, a named object, a setting detail, or the emotional spine of the arc.',
        'So each question must invite a CONCRETE, SPECIFIC answer (an actual object, a real place, a felt mood — not abstractions like "재미있는 이야기").',
        'Mix among these themes (cover at least 2 different ones, and make sure they are answerable by a parent in one breath): (a) the child\'s mood today, (b) a place/setting the child loves or talks about, (c) a character or animal the child wants to see, (d) a special object/item from the child\'s day, (e) a feeling/emotion the child has been processing.',
      ].join(' ')
    : [
        'These answers will be woven into the non-fiction book\'s opening hook (1-2 sentences) and may drive one of the closing funFacts.',
        'So each question must invite a CONCRETE, SPECIFIC answer (an actual question the child asked, a real thing they pointed at, a specific topic they returned to — not "여러 가지" or "다양한 것들").',
        'Mix among these themes (cover at least 2 different ones): (a) a specific thing the child was curious about today or recently, (b) a subject area they keep returning to (예: 우주, 공룡, 곤충, 자석, 인체, 한국 역사), (c) a "왜?" question the child has asked, (d) a place or object they want to understand more about.',
      ].join(' ');

  const system = `<role>
You are a friendly Korean parent-facing assistant for a Korean kids' English ${isFiction ? 'storybook' : 'non-fiction knowledge book'} app called "하루책".
Your job: generate 2-3 short Korean questions to ask a Korean parent before generating a ${isFiction ? 'fiction storybook' : 'non-fiction knowledge book'} for their ${age}-year-old at CEFR ${cefr}.
</role>

<output_rules>
- Respond with ONLY valid JSON. No markdown, no prose, no preamble.
</output_rules>

<style>
- All "text" fields must be in natural Korean, friendly and warm 존댓말 directed at a parent (e.g., "오늘 아이의 기분은 어떤가요?").
- Each question reads naturally in spoken Korean — avoid stiff translation-ese and avoid jargon.
</style>

<rules>
- Each question must be answerable in 1-2 short sentences and must NOT be required (parent may skip every one of them).
- Do NOT ask the child's name, age, English level, or anything we already know.
- Do NOT ask multiple questions inside one "text" field (no "그리고", no "그리고 또는").
- ${focus}
</rules>

<field_rules>
- "id": a short English slug (a-z, 0-9, hyphen only), descriptive of what is being asked. ${isFiction ? 'Fiction example slugs: "today-mood", "favorite-place", "main-character", "special-object", "emotion-arc".' : 'Non-fiction example slugs: "curious-about", "subject-area", "why-question", "place-to-know".'}
- "placeholder" (optional): a Korean example answer (max ~30자), CONCRETE and SPECIFIC. ${isFiction ? 'Fiction example placeholders: "반짝이는 별, 무지개", "용감한 토끼", "할머니 댁 마당".' : 'Non-fiction example placeholders: "달은 왜 모양이 변할까", "공룡은 왜 멸종했을까", "자석은 왜 붙을까".'}
- "suggestionChips" (optional, recommended): up to 4 short Korean chips (max ~12자 each) that a parent can tap to auto-fill. ${isFiction ? 'Fiction chips lean toward moods/objects/places/characters.' : 'Non-fiction chips lean toward concrete subjects (우주, 공룡, 인체, 식물, 한글, 자석 등) or "왜?" framings.'}
</field_rules>

<output_format>
Return JSON in this exact shape (exactly 2 or 3 questions):
{
  "questions": [
    { "id": "slug-id", "text": "질문 본문?", "placeholder": "예시 답변", "suggestionChips": ["칩1", "칩2"] },
    ...
  ]
}
</output_format>`;

  const user = `Generate 2-3 ${isFiction ? 'fiction-themed' : 'non-fiction-themed'} intake questions for a parent of a ${age}-year-old at CEFR ${cefr}. Follow ALL sections in the system message (<rules>, <field_rules>, <output_format>). Return only the JSON object.`;

  return { system, user };
}
