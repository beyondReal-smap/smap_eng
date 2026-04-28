import { notFound } from 'next/navigation';
import { QuizRunner } from '@/components/quiz-runner';
import { getBookById, listQuizzesByBook } from '@/lib/db/queries';
import { getOwnedBookForPage } from '@/lib/auth/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * SiteHeader는 (app)/layout.tsx가 보유해 페이지 이동 사이 마운트가 유지된다.
 * QuizRunner 본문 헤더에 이미 `← 돌아가기`(책 페이지로) 링크가 있고, 책장
 * 복귀는 헤더 brand 클릭으로 일관되게 처리(2026-04-27).
 */
export default async function QuizPage({
  params,
}: {
  params: Promise<{ bookId: string }>;
}) {
  const { bookId } = await params;
  const id = Number(bookId);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const ownership = await getOwnedBookForPage(id);
  if (!ownership) notFound();
  const book = await getBookById(id);
  if (!book) notFound();

  const quizzes = await listQuizzesByBook(id);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <QuizRunner book={book} initialQuizzes={quizzes} />
    </main>
  );
}
