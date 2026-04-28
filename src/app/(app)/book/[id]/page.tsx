import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Reader } from '@/components/reader';
import { buttonVariants } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { getBookById, listPassagesByBook } from '@/lib/db/queries';
import { getOwnedBookForPage } from '@/lib/auth/session';
import { APP_HOME } from '@/lib/paths';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * SiteHeader는 (app)/layout.tsx가 보유해 페이지 이동 사이 마운트가 유지된다.
 * Reader 본문 우측 상단에 outline `← 책장` 버튼이 있고, EmptyState에도 별도
 * 복귀 CTA를 유지(2026-04-27).
 */
export default async function BookPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const bookId = Number(id);
  if (!Number.isInteger(bookId) || bookId <= 0) {
    notFound();
  }

  // 미로그인 → /login redirect, 비소유/비존재 → 404 (정보 노출 회피).
  const ownership = await getOwnedBookForPage(bookId);
  if (!ownership) notFound();
  const book = await getBookById(bookId);
  if (!book) notFound();

  const passages = await listPassagesByBook(book.id);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      {passages.length === 0 ? (
        <EmptyState
          className="animate-pop-in"
          text="이 책에는 아직 문장이 없습니다."
          action={
            <Link
              href={APP_HOME}
              className={buttonVariants({
                variant: 'outline',
                className: 'rounded-full press-scale',
              })}
            >
              ← 책장으로
            </Link>
          }
        />
      ) : (
        <Reader book={book} passages={passages} />
      )}
    </main>
  );
}
