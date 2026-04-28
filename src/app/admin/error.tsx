'use client';

import { Button } from '@/components/ui/button';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5">
      <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-destructive">
        Admin Error
      </p>
      <h1 className="mt-2 text-xl font-extrabold">관리자 데이터를 불러오지 못했습니다</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        DB 마이그레이션 상태와 관리자 권한을 확인해야 합니다. 동일 오류가 반복되면
        서버 로그의 digest를 기준으로 원인을 추적하세요.
      </p>
      <div className="mt-4 rounded-xl border border-border bg-background/70 p-3 font-mono text-xs text-muted-foreground">
        {error.digest ?? 'no-digest'}
      </div>
      <Button type="button" className="mt-4" onClick={reset}>
        다시 시도
      </Button>
    </div>
  );
}
