import Link from 'next/link';
import { VocabDeck } from '@/components/vocab-deck';
import { buttonVariants } from '@/components/ui/button';
import { APP_HOME } from '@/lib/paths';

export const dynamic = 'force-dynamic';

/**
 * SiteHeader는 (app)/layout.tsx가 보유해 페이지 이동 사이 마운트가 유지된다.
 * 책장 복귀 CTA는 본문 우측 상단의 outline `← 책장` 버튼(2026-04-27).
 */
export default function VocabPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            내 단어장
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            동화책에서 만난 단어들을 플래시카드로 복습해 보세요.
          </p>
        </div>
        <Link
          href={APP_HOME}
          className={buttonVariants({
            variant: 'outline',
            size: 'sm',
            className: 'rounded-full press-scale shrink-0',
          })}
        >
          ← 책장
        </Link>
      </header>
      <VocabDeck />
    </main>
  );
}
