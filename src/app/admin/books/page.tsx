import Link from 'next/link';
import { adminListAllBooks, type AdminBookFilter } from '@/lib/db/queries';
import { requireAdminUser } from '@/lib/auth/session';
import { BooksTable } from '@/components/admin/books-table';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const FILTERS: { value: AdminBookFilter; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'normal', label: '정상' },
  { value: 'flagged', label: '신고됨' },
  { value: 'deleted', label: '삭제됨' },
];

function normalizeFilter(raw: string | undefined): AdminBookFilter {
  const match = FILTERS.find((f) => f.value === raw);
  return match?.value ?? 'all';
}

interface Props {
  searchParams: Promise<{ filter?: string }>;
}

export default async function AdminBooksPage({ searchParams }: Props) {
  // Next.js 16: layout 가드는 partial rendering으로 우회 가능 → 페이지 단위 재확인.
  await requireAdminUser();
  const { filter } = await searchParams;
  const active = normalizeFilter(filter);
  const rows = await adminListAllBooks(active);

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-2xl font-medium tracking-tight">책 모니터링</h1>
        <p className="mt-1 text-sm text-foreground/60">
          모든 책을 조회하고 신고/복원/삭제 처리. 최대 200건.
        </p>
      </header>

      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <Link
            key={f.value}
            href={f.value === 'all' ? '/admin/books' : `/admin/books?filter=${f.value}`}
            className={cn(
              'rounded-md border px-3 py-1.5 text-sm',
              active === f.value
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-foreground/15 hover:bg-foreground/5',
            )}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <p className="text-xs text-foreground/50">총 {rows.length}건</p>

      <BooksTable rows={rows} />
    </div>
  );
}
