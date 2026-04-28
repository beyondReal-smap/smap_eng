import { requireAdminUser } from '@/lib/auth/session';
import { adminListUsersWithProfileCount } from '@/lib/db/queries';
import { UsersTable } from '@/components/admin/users-table';

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: Promise<{ q?: string }>;
}

export default async function AdminUsersPage({ searchParams }: Props) {
  const [{ id: currentAdminId }, { q }] = await Promise.all([
    requireAdminUser(),
    searchParams,
  ]);
  const rows = await adminListUsersWithProfileCount(q);

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-2xl font-medium tracking-tight">사용자</h1>
        <p className="mt-1 text-sm text-foreground/60">
          부모 계정 + 자녀 프로필 수. 이메일로 검색.
        </p>
      </header>

      <form
        method="get"
        className="flex gap-2"
        action="/admin/users"
      >
        <input
          type="search"
          name="q"
          defaultValue={q ?? ''}
          placeholder="이메일 일부 검색"
          className="flex h-9 w-full max-w-sm rounded-md border border-foreground/15 bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
        />
        <button
          type="submit"
          className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          검색
        </button>
        {q ? (
          <a
            href="/admin/users"
            className="inline-flex h-9 items-center rounded-md border border-foreground/15 px-4 text-sm hover:bg-foreground/5"
          >
            초기화
          </a>
        ) : null}
      </form>

      <p className="text-xs text-foreground/50">총 {rows.length}건 (최대 200)</p>

      <UsersTable rows={rows} currentAdminId={currentAdminId} />
    </div>
  );
}
