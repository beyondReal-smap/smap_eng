import { NextRequest, NextResponse } from 'next/server';
import { generateQuizSet } from '@/lib/llm';
import {
  getBookById,
  insertQuizzes,
  listPassagesByBook,
  listQuizzesByBook,
} from '@/lib/db/queries';
import { handleApiError } from '../../../_lib/errors';

export const runtime = 'nodejs';

function parseId(raw: string): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** 저장된 퀴즈 조회 (없으면 빈 배열). */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const bookId = parseId(id);
    if (bookId === null) {
      return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
    }
    return NextResponse.json({ quizzes: listQuizzesByBook(bookId) });
  } catch (err) {
    return handleApiError(err);
  }
}

/**
 * 퀴즈 생성(멱등) — 이미 있으면 생성 스킵. 없으면 LLM 호출 + 저장.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const bookId = parseId(id);
    if (bookId === null) {
      return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
    }

    const existing = listQuizzesByBook(bookId);
    if (existing.length > 0) {
      return NextResponse.json({ quizzes: existing, created: false });
    }

    const book = getBookById(bookId);
    if (!book) {
      return NextResponse.json({ error: 'book_not_found' }, { status: 404 });
    }

    const passages = listPassagesByBook(bookId);
    if (passages.length === 0) {
      return NextResponse.json(
        { error: 'no_passages' },
        { status: 409 },
      );
    }

    const quizSet = await generateQuizSet({
      title: book.title,
      passages: passages.map((p) => ({ en: p.textEn, ko: p.textKo })),
      level: { age: book.age, cefr: book.cefr },
    });

    insertQuizzes(
      bookId,
      quizSet.quizzes.map((q, i) => ({
        orderIndex: i + 1,
        question: q.question,
        choices: q.choices,
        answerIndex: q.answer_index,
        explanation: q.explanation,
      })),
    );

    return NextResponse.json(
      { quizzes: listQuizzesByBook(bookId), created: true },
      { status: 201 },
    );
  } catch (err) {
    return handleApiError(err);
  }
}
