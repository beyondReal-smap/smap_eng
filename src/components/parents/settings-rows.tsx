import Link from 'next/link';
import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/*
 * 보호자 화면 그룹 카드·행 — 네이티브 설정 9차(SettingsRows)와 같은 정리 원칙:
 * 그룹 제목(ExtraBold 14) + 흰 카드(radius 20) 안에 행(아이콘 36 파스텔 상자 + 제목 16 + 부제 12.5).
 */

export type RowTone = 'coral' | 'gold' | 'sky' | 'mint' | 'stone';

const TONE: Record<RowTone, string> = {
  coral: 'bg-haru-coral-soft text-haru-coral-ink',
  gold: 'bg-[#fcedc1] text-[#8a6300]',
  sky: 'bg-[#e2f0fb] text-[#1e4c66]',
  mint: 'bg-haru-success-soft text-haru-success-ink',
  stone: 'bg-[#f2f0ed] text-haru-muted',
};

export function SettingsGroup({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const id = `group-${title}`;
  return (
    <section aria-labelledby={id} className="space-y-2">
      <h2 id={id} className="px-1.5 text-sm font-extrabold tracking-normal text-haru-ink">
        {title}
      </h2>
      <div className="overflow-hidden rounded-[20px] bg-white shadow-[0_6px_16px_rgb(168_111_63/0.08)] [&>*+*]:border-t [&>*+*]:border-[#f3e7da]">
        {children}
      </div>
    </section>
  );
}

function RowBody({
  icon,
  tone,
  title,
  subtitle,
  trailing,
}: {
  icon: ReactNode;
  tone: RowTone;
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
}) {
  return (
    <>
      <span aria-hidden className={cn('flex size-9 shrink-0 items-center justify-center rounded-xl', TONE[tone])}>
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-base font-bold text-haru-ink">{title}</span>
        {subtitle ? (
          <span className="mt-0.5 block text-[12.5px] font-bold leading-snug text-haru-muted">{subtitle}</span>
        ) : null}
      </span>
      {trailing ?? <ChevronRight aria-hidden className="size-4 shrink-0 text-haru-muted" />}
    </>
  );
}

const ROW =
  'flex min-h-[62px] w-full items-center gap-3 px-3.5 py-3 text-left transition-colors hover:bg-haru-paper focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring';

/** 다른 화면·외부(mailto)로 가는 행. */
export function SettingsLinkRow({
  href,
  external = false,
  ...body
}: {
  href: string;
  external?: boolean;
  icon: ReactNode;
  tone: RowTone;
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
}) {
  if (external) {
    return (
      <a href={href} className={ROW}>
        <RowBody {...body} />
      </a>
    );
  }
  return (
    <Link href={href} className={ROW}>
      <RowBody {...body} />
    </Link>
  );
}
