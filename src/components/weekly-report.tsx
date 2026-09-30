'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Star } from 'lucide-react';
import { AvatarGlyph, Mascot } from '@/components/haru';
import { cn } from '@/lib/utils';
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
      <div aria-hidden className="space-y-3">
        {[0, 1].map((i) => (
          <div key={i} className="h-44 w-full animate-pulse rounded-[18px] bg-haru-paper motion-reduce:animate-none" />
        ))}
      </div>
    );
  }
  if (report.length === 0) {
    return (
      <div role="status" className="flex flex-col items-center py-6 text-center">
        <Mascot pose="normal" size={88} />
        <p className="mt-2 text-sm font-bold text-haru-muted">아직 프로필이 없어요. 먼저 자녀 프로필을 만들어 주세요.</p>
      </div>
    );
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
    <article className="rounded-[18px] bg-haru-paper p-4">
      <header className="flex items-center gap-3">
        <span className="flex size-[52px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#b8d9f0] text-2xl ring-[3px] ring-white">
          {data.avatar ? <AvatarGlyph emoji={data.avatar} size={52} decorative /> : <span aria-hidden>👤</span>}
        </span>
        <div className="min-w-0">
          <h3 className="truncate text-lg font-extrabold tracking-normal text-haru-ink">{data.name}</h3>
          <p className="text-[13px] font-bold text-haru-muted">
            누적 {data.totalBooks}권 · 만점 {data.totalPerfect}회
          </p>
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
        <p className="mb-1.5 text-xs font-extrabold text-haru-muted">최근 7일 칭찬 도장</p>
        {/* 학습한 날 = 코랄 ★ 도장(통계 도장판과 같은 모양), 안 한 날 = 옅은 원. */}
        <ol className="grid grid-cols-7 gap-1.5">
          {weekDays.map((ymd) => {
            const active = data.activeDays.includes(ymd);
            const label = new Date(ymd).toLocaleDateString('ko-KR', {
              weekday: 'short',
            });
            return (
              <li key={ymd} className="flex flex-col items-center gap-1" title={`${ymd}${active ? ' · 활동' : ''}`}>
                <span
                  aria-hidden
                  className={cn(
                    'flex aspect-square w-full max-w-10 items-center justify-center rounded-full',
                    active
                      ? 'border-2 border-white/55 bg-[radial-gradient(circle_at_35%_30%,#ff9e7a,#e8633d)] shadow-[0_2px_3px_rgb(232_99_61/0.3)]'
                      : 'bg-[#f4e7d6]',
                  )}
                >
                  {active ? <Star className="size-[45%] fill-white text-white" /> : null}
                </span>
                <span className="text-[11px] font-bold text-haru-muted">
                  {label}
                  <span className="sr-only">{active ? ' 활동 있음' : ' 활동 없음'}</span>
                </span>
              </li>
            );
          })}
        </ol>
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
    <div className="mt-4 rounded-[14px] bg-[#fbebd3] p-3">
      <p className="text-xs font-extrabold text-[#8f5200]">
        검토 대기 · 신고된 책 {items.length}권
      </p>
      <ul className="mt-2 space-y-2">
        {items.map((b) => (
          <li
            key={b.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 text-sm"
          >
            <div className="min-w-0 flex-1">
              <p className="font-reading font-bold text-haru-ink">{b.title}</p>
              <p className="text-xs font-bold text-haru-muted">
                사유: {b.reason ?? '미기재'}
              </p>
            </div>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => unflag(b.id)}
                disabled={busy === b.id}
                className="min-h-11 rounded-full border-2 border-haru-line bg-white px-3 text-xs font-extrabold text-haru-ink hover:bg-haru-paper disabled:opacity-50"
              >
                책장으로
              </button>
              <button
                type="button"
                onClick={() => remove(b.id, b.title)}
                disabled={busy === b.id}
                className="min-h-11 rounded-full border-2 border-[#f3c6bb] bg-[#fde2dd] px-3 text-xs font-extrabold text-[#a93318] hover:bg-[#fbd3cb] disabled:opacity-50"
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
    <div className="rounded-[14px] bg-white px-3 py-2.5 shadow-[0_3px_8px_rgb(168_111_63/0.06)]">
      <div className="text-[11px] font-bold text-haru-muted">
        {label}
      </div>
      <div className="mt-0.5 text-xl font-extrabold tabular-nums text-haru-ink">
        {value ?? '—'}
        <span className="ml-0.5 text-xs font-bold text-haru-muted">
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
