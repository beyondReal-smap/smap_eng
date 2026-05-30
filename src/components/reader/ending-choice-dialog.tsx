'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Branch } from './shared';

/**
 * 엔딩 분기 선택 Dialog — 2개 라벨 카드 중 하나를 고르면 해당 브랜치의 엔딩 passages로 이동.
 */
export function EndingChoiceDialog({
  open,
  onOpenChange,
  labelA,
  labelB,
  onPick,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  labelA: string;
  labelB: string;
  onPick: (b: Branch) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>결말을 골라봐</DialogTitle>
          <DialogDescription>
            이야기의 마지막이 둘 중 어느 길로 흘러갈까? 언제든 돌아와 다른 결말을 볼 수 있어.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-1 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <ChoiceCard letter="A" label={labelA} onClick={() => onPick('A')} />
          <ChoiceCard letter="B" label={labelB} onClick={() => onPick('B')} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ChoiceCard({
  letter,
  label,
  onClick,
}: {
  letter: Branch;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col items-start gap-2 rounded-2xl border-2 border-border bg-card p-5 text-left transition press-scale sticker-shadow hover:border-primary/50 hover:bg-muted/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
        {letter}
      </span>
      <span className="text-lg font-bold leading-snug">{label}</span>
      <span className="text-xs text-muted-foreground group-hover:text-foreground">
        이 결말로 가기 →
      </span>
    </button>
  );
}
