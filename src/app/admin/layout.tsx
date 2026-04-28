import type { Metadata } from 'next';
import { requireAdminUser } from '@/lib/auth/session';
import { AdminNav } from '@/components/admin/admin-nav';

export const metadata: Metadata = {
  title: '관리자 · 하루책',
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 모든 /admin/* 진입 시 최우선으로 권한 체크.
  // 비로그인 → /login, 일반 유저 → / 로 redirect.
  await requireAdminUser();

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="md:sticky md:top-0 md:h-screen">
        <AdminNav />
      </aside>
      <main className="flex-1 p-4 md:p-8">
        <div className="mx-auto w-full max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
