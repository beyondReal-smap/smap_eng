import { Bookshelf } from '@/components/bookshelf';
import { ProfileSwitcher } from '@/components/profile-switcher';

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-6xl space-y-8 px-4 py-8 sm:px-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            📚 smap_eng
          </h1>
          <p className="text-sm text-muted-foreground">
            아이와 함께 읽는 AI 영어 동화책
          </p>
        </div>
        <ProfileSwitcher />
      </header>

      <Bookshelf />
    </main>
  );
}
