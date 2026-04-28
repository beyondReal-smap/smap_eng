import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string | number;
  hint?: string;
  tone?: 'default' | 'warn';
}

export function StatCard({
  label,
  value,
  hint,
  tone = 'default',
}: StatCardProps) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1 px-4">
        <div className="text-xs text-foreground/60">{label}</div>
        <div
          className={cn(
            'text-2xl font-medium tabular-nums',
            tone === 'warn' && 'text-destructive',
          )}
        >
          {value}
        </div>
        {hint ? (
          <div className="text-xs text-foreground/50">{hint}</div>
        ) : null}
      </CardContent>
    </Card>
  );
}
