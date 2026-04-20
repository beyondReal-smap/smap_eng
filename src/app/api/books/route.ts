import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { LevelSchema, generateStory } from '@/lib/llm';
import { insertBookWithPassages, listBooks } from '@/lib/db/queries';
import { CEFR_LEVELS } from '@/lib/db/schema';
import { handleApiError } from '../_lib/errors';

export const runtime = 'nodejs';

const GenerateBookSchema = z.object({
  profileId: z.number().int().positive(),
  level: LevelSchema,
  topic: z.string().min(1).max(80).optional(),
});

/** 동화 1편 생성 — LLM 호출 + DB 일괄 저장. */
export async function POST(req: NextRequest) {
  try {
    const body = GenerateBookSchema.parse(await req.json());
    const story = await generateStory(body.level, body.topic);

    const book = insertBookWithPassages(
      {
        profileId: body.profileId,
        title: story.title,
        age: body.level.age,
        cefr: body.level.cefr,
        topic: story.topic,
      },
      story.passages.map((p, i) => ({
        orderIndex: i,
        textEn: p.en,
        textKo: p.ko,
      })),
    );

    return NextResponse.json(
      { book, passages: story.passages, vocabulary: story.vocabulary ?? [] },
      { status: 201 },
    );
  } catch (err) {
    return handleApiError(err);
  }
}

const ListBooksQuery = z.object({
  profileId: z.coerce.number().int().positive(),
  age: z.coerce.number().int().min(5).max(10).optional(),
  cefr: z.enum(CEFR_LEVELS).optional(),
});

/** 책장: 프로필별 책 목록 (연령·CEFR 필터 가능). */
export async function GET(req: NextRequest) {
  try {
    const params = Object.fromEntries(new URL(req.url).searchParams);
    const parsed = ListBooksQuery.parse(params);
    return NextResponse.json({ books: listBooks(parsed) });
  } catch (err) {
    return handleApiError(err);
  }
}
