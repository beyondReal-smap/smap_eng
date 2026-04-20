import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Reader } from '@/components/reader';
import { buttonVariants } from '@/components/ui/button';
import { getBookById, listPassagesByBook } from '@/lib/db/queries';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

  const book = getBookById(bookId);
  if (!book) notFound();

  const passages = listPassagesByBook(book.id);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      {passages.length === 0 ? (
        <div className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground">
            이 책에는 아직 문장이 없습니다.
          </p>
          <Link href="/" className={buttonVariants({ variant: 'outline' })}>
            ← 책장으로
          </Link>
        </div>
      ) : (
        <Reader book={book} passages={passages} />
      )}
    </main>
  );
}
