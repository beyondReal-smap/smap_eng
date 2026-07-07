import { NextRequest, NextResponse } from 'next/server';
import { generateQuizSet } from '@/lib/llm';
import {
  getBookById,
  insertQuizzes,
  listPassagesByBook,
  listQuizzesByBook,
} from '@/lib/db/queries';
import { requireBookOwnershipForApi } from '@/lib/auth/session';
import { handleApiError } from '../../../_lib/errors';

export const runtime = 'nodejs';

function parseId(raw: string): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

type QuizGenOutcome =
  | { ok: true }
  | { ok: false; error: 'book_not_found' | 'no_passages' };

// 책 단위 in-flight 병합 — 완독 직후 클라이언트 중복 탭/재시도로 POST가 동시에
// 들어오면 사전 멱등 체크(listQuizzesByBook)를 둘 다 통과해 LLM이 두 번 호출되고
// 퀴즈가 중복 insert된다. 같은 책의 동시 생성은 하나의 Promise를 공유한다.
// 단일 프로세스 메모리 기준 — 수평 확장 시 공유 락으로 교체.
const inFlightQuizGen = new Map<number, Promise<QuizGenOutcome>>();

function generateQuizzesOnce(bookId: number): Promise<QuizGenOutcome> {
  const existing = inFlightQuizGen.get(bookId);
  if (existing) return existing;

  const promise = (async (): Promise<QuizGenOutcome> => {
    // 라우트의 사전 체크와 별개로 promise 내부에서 한 번 더 멱등 확인 —
    // 직전 생성이 insert 직후 맵에서 제거된 틈에 도착한 요청이 LLM을
    // 다시 호출해 중복 insert하는 잔여 경합을 차단한다.
    const already = await listQuizzesByBook(bookId);
    if (already.length > 0) return { ok: true };

    const book = await getBookById(bookId);
    if (!book) return { ok: false, error: 'book_not_found' };

    const passages = await listPassagesByBook(bookId);
    if (passages.length === 0) return { ok: false, error: 'no_passages' };

    const quizSet = await generateQuizSet({
      title: book.title,
      passages: passages.map((p) => ({ en: p.textEn, ko: p.textKo })),
      level: { age: book.age, cefr: book.cefr },
    });

    await insertQuizzes(
      bookId,
      quizSet.quizzes.map((q, i) => ({
        orderIndex: i + 1,
        question: q.question,
        choices: q.choices,
        answerIndex: q.answer_index,
        explanation: q.explanation,
      })),
    );
    return { ok: true };
  })();

  inFlightQuizGen.set(bookId, promise);
  // 성공/실패와 무관하게 제거 — 실패 시 다음 요청이 재시도할 수 있게 한다.
  promise.finally(() => inFlightQuizGen.delete(bookId)).catch(() => void 0);
  return promise;
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
    await requireBookOwnershipForApi(bookId);
    return NextResponse.json({ quizzes: await listQuizzesByBook(bookId) });
  } catch (err) {
    return handleApiError(err);
  }
}

/** 퀴즈 생성(멱등) — 이미 있으면 생성 스킵. 없으면 LLM 호출 + 저장. */
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
    await requireBookOwnershipForApi(bookId);

    const existing = await listQuizzesByBook(bookId);
    if (existing.length > 0) {
      return NextResponse.json({ quizzes: existing, created: false });
    }

    const outcome = await generateQuizzesOnce(bookId);
    if (!outcome.ok) {
      return NextResponse.json(
        { error: outcome.error },
        { status: outcome.error === 'book_not_found' ? 404 : 409 },
      );
    }

    return NextResponse.json(
      { quizzes: await listQuizzesByBook(bookId), created: true },
      { status: 201 },
    );
  } catch (err) {
    return handleApiError(err);
  }
}
