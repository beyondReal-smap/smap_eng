import { notFound } from 'next/navigation';
import { QuizRunner } from '@/components/quiz-runner';
import { getBookById, listPassagesByBook, listQuizzesByBook } from '@/lib/db/queries';
import { getOwnedBookForPage } from '@/lib/auth/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * SiteHeader는 (app)/layout.tsx가 보유해 페이지 이동 사이 마운트가 유지된다.
 * QuizRunner 상단 줄의 ✕가 책 페이지로 돌아가고(결과 화면에선 책장으로),
 * 책장 복귀는 헤더 brand 클릭으로도 가능하다(2026-04-27).
 *
 * "책 속 근거" 카드(그림책 세계 퀴즈, 2026-09-30)용 본문(passages)을 퀴즈와 함께 1회 불러온다.
 * 본문을 못 불러와도 퀴즈는 그대로 진행해야 하므로 실패는 로그만 남기고 카드만 생략한다.
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

  const [quizzes, passages] = await Promise.all([
    listQuizzesByBook(id),
    listPassagesByBook(id).catch((err: unknown) => {
      console.error(`[quiz] passages load failed (book ${id}) — evidence card hidden:`, err);
      return [];
    }),
  ]);

  return (
    <main className="mx-auto w-full max-w-[592px] px-4 pt-3">
      <QuizRunner
        book={book}
        initialQuizzes={quizzes}
        passages={passages.map((p) => ({
          orderIndex: p.orderIndex,
          textEn: p.textEn,
          sceneImagePath: p.sceneImagePath,
        }))}
      />
    </main>
  );
}
