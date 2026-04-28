'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { EmptyState } from '@/components/ui/empty-state';
import { apiFetch } from '@/lib/api-client';
import type { ParentalProfileReport } from '@/lib/db/queries';

/**
 * 보호자 주간 리포트.
 * 표시: 프로필별 이번 주 생성 책 수 / 완독 세션 / 평균 정답률 / 활동 요일,
 *       누적 책 수 / 만점 수.
 * 비표시(의도): 아동의 개별 답변, 실패한 질문, 음성 — 개인정보 최소화.
 */
export function WeeklyReport() {
  const [report, setReport] = useState<ParentalProfileReport[] | null>(null);

  const reload = useCallback(() => {
    apiFetch<{ report: ParentalProfileReport[] }>('/api/parents/report')
      .then((res) => setReport(res.report))
      .catch((err) => toast.error(`리포트 로드 실패: ${err.message}`));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  if (!report) {
    return (
      <div className="space-y-3">
        {[0, 1].map((i) => (
          <div key={i} className="shimmer h-28 w-full rounded-2xl" />
        ))}
      </div>
    );
  }
  if (report.length === 0) {
    return <EmptyState text="아직 프로필이 없어요. 먼저 자녀 프로필을 만들어 주세요." />;
  }

  return (
    <div className="space-y-4">
      {report.map((r) => (
        <ProfileCard key={r.profileId} data={r} onChanged={reload} />
      ))}
    </div>
  );
}

function ProfileCard({
  data,
  onChanged,
}: {
  data: ParentalProfileReport;
  onChanged: () => void;
}) {
  const weekDays = lastSevenYMDs();
  return (
    <article className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-lg">
            {data.avatar ?? '👤'}
          </span>
          <div>
            <h3 className="text-lg font-bold">{data.name}</h3>
            <p className="text-xs text-muted-foreground">
              누적 {data.totalBooks}권 · 만점 {data.totalPerfect}회
            </p>
          </div>
        </div>
      </header>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Stat
          label="이번 주 생성"
          value={data.booksCreatedWeek}
          unit="권"
        />
        <Stat
          label="이번 주 완독"
          value={data.sessionsFinishedWeek}
          unit="회"
        />
        <Stat
          label="평균 정답률"
          value={
            data.averageAccuracyWeek !== null
              ? Math.round(data.averageAccuracyWeek * 100)
              : null
          }
          unit="%"
        />
      </div>

      <div className="mt-4">
        <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          최근 7일 활동
        </p>
        <div className="flex gap-1.5">
          {weekDays.map((ymd) => {
            const active = data.activeDays.includes(ymd);
            const label = new Date(ymd).toLocaleDateString('ko-KR', {
              weekday: 'short',
            });
            return (
              <div key={ymd} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className={`h-8 w-full rounded-md ${
                    active
                      ? 'bg-primary/80'
                      : 'bg-muted'
                  }`}
                  title={`${ymd}${active ? ' · 활동' : ''}`}
                  aria-label={`${ymd}${active ? ' 활동 있음' : ' 활동 없음'}`}
                />
                <span className="text-[10px] text-muted-foreground">{label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {data.flaggedBooks.length > 0 ? (
        <FlaggedList items={data.flaggedBooks} onChanged={onChanged} />
      ) : null}
    </article>
  );
}

/** 신고된 책 리스트 — 보호자만 확인. 철회(복원)/완전 삭제 액션 제공. */
function FlaggedList({
  items,
  onChanged,
}: {
  items: ParentalProfileReport['flaggedBooks'];
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState<number | null>(null);

  async function unflag(id: number) {
    if (busy !== null) return;
    setBusy(id);
    try {
      await apiFetch(`/api/books/${id}/flag`, { method: 'DELETE' });
      toast.success('책장으로 되돌렸어요');
      onChanged();
    } catch (err) {
      toast.error(`실패: ${(err as Error).message}`);
    } finally {
      setBusy(null);
    }
  }

  async function remove(id: number, title: string) {
    if (busy !== null) return;
    if (!window.confirm(`"${title}"를 완전히 지울까요? (되돌릴 수 없어요)`)) {
      return;
    }
    setBusy(id);
    try {
      await apiFetch(`/api/books/${id}`, { method: 'DELETE' });
      toast.success('완전히 지웠어요');
      onChanged();
    } catch (err) {
      toast.error(`실패: ${(err as Error).message}`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-5 rounded-lg border border-[color:var(--destructive)]/30 bg-[color:var(--destructive)]/5 p-3">
      <p className="text-xs font-bold text-[color:var(--destructive)]">
        검토 대기 · 신고된 책 {items.length}권
      </p>
      <ul className="mt-2 space-y-2">
        {items.map((b) => (
          <li
            key={b.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-background px-3 py-2 text-sm"
          >
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{b.title}</p>
              <p className="text-xs text-muted-foreground">
                사유: {b.reason ?? '미기재'}
              </p>
            </div>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => unflag(b.id)}
                disabled={busy === b.id}
                className="rounded-md border border-border/60 bg-card px-2.5 py-1 text-xs font-medium hover:bg-muted disabled:opacity-50"
              >
                책장으로
              </button>
              <button
                type="button"
                onClick={() => remove(b.id, b.title)}
                disabled={busy === b.id}
                className="rounded-md border border-[color:var(--destructive)]/40 bg-[color:var(--destructive)]/10 px-2.5 py-1 text-xs font-medium text-[color:var(--destructive)] hover:bg-[color:var(--destructive)]/20 disabled:opacity-50"
              >
                완전 삭제
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Stat({
  label,
  value,
  unit,
}: {
  label: string;
  value: number | null;
  unit: string;
}) {
  return (
    <div className="rounded-md border border-border/60 bg-background px-3 py-2">
      <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 text-lg font-bold tabular-nums">
        {value ?? '—'}
        <span className="ml-0.5 text-xs font-medium text-muted-foreground">
          {unit}
        </span>
      </div>
    </div>
  );
}

/** 오늘 포함 최근 7일을 오래된 날부터 나열한 YYYY-MM-DD 배열. */
function lastSevenYMDs(): string[] {
  const out: string[] = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}
