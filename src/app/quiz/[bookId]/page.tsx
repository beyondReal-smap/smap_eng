import { notFound } from 'next/navigation';
import { QuizRunner } from '@/components/quiz-runner';
import { getBookById, listQuizzesByBook } from '@/lib/db/queries';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function QuizPage({
  params,
}: {
  params: Promise<{ bookId: string }>;
}) {
  const { bookId } = await params;
  const id = Number(bookId);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const book = getBookById(id);
  if (!book) notFound();

  const quizzes = listQuizzesByBook(id);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <QuizRunner book={book} initialQuizzes={quizzes} />
    </main>
  );
}
