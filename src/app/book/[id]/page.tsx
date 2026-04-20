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
        <div className="animate-pop-in space-y-4 rounded-3xl border border-dashed border-border/80 bg-card/50 p-12 text-center glass-card">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-4xl animate-float-soft">
            📭
          </div>
          <p className="text-sm text-muted-foreground">
            이 책에는 아직 문장이 없습니다.
          </p>
          <Link
            href="/"
            className={buttonVariants({
              variant: 'outline',
              className: 'rounded-full press-scale',
            })}
          >
            ← 책장으로
          </Link>
        </div>
      ) : (
        <Reader book={book} passages={passages} />
      )}
    </main>
  );
}
