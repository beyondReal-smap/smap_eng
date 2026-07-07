'use client';

import { useEffect, useState } from 'react';
import { Medal } from 'lucide-react';
import type { LearningSummary } from '@/lib/db/queries';
import { computePoints, earnedBadges } from '@/lib/rewards';

/**
 * 누적 포인트 + 획득 배지 축하 카드.
 *
 * MonthlyTrace와 같은 "압박 없는" 톤: 이미 획득한 것만 보여준다.
 * 다음 배지 조건이나 "N점 더 모으면" 같은 결핍 프레이밍은 넣지 않는다.
 *
 * "방금 획득" 감지: 원장 테이블 없이 localStorage seen-set과 비교해
 * 새로 나타난 배지에만 1회 bounce 연출을 준다(파생 집계 방식의 클라 보완).
 */
export function PointsCard({
  profileId,
  summary,
}: {
  profileId: number;
  summary: LearningSummary;
}) {
  const badges = earnedBadges(summary);
  const points = computePoints(summary);
  const [freshIds, setFreshIds] = useState<Set<string>>(new Set());

  const seenKey = `rewards:badges-seen:${profileId}`;
  // 배지 목록이 바뀔 때만 재계산되도록 id 문자열로 축약해 의존성에 사용.
  const badgeIds = badges.map((b) => b.id).join(',');

  useEffect(() => {
    if (typeof window === 'undefined' || badgeIds === '') return;
    let cancelled = false;
    const current = badgeIds.split(',');
    try {
      const raw = window.localStorage.getItem(seenKey);
      const seen = new Set(raw ? (JSON.parse(raw) as string[]) : []);
      const fresh = current.filter((id) => !seen.has(id));
      window.localStorage.setItem(seenKey, JSON.stringify(current));
      if (fresh.length > 0) {
        // effect 내 동기 setState 회피(연쇄 렌더 방지) — learning-summary와 동일 패턴.
        window.requestAnimationFrame(() => {
          if (!cancelled) setFreshIds(new Set(fresh));
        });
      }
    } catch {
      /* localStorage 불가 환경(사파리 프라이빗 등) — 연출만 생략 */
    }
    return () => {
      cancelled = true;
    };
  }, [badgeIds, seenKey]);

  // 획득한 것이 아무것도 없으면 카드 자체를 렌더하지 않는다(결핍 강조 방지).
  if (points <= 0 && badges.length === 0) return null;

  return (
    <div className="w-full rounded-2xl border-2 border-border/80 bg-background/70 p-4 sticker-shadow md:ml-auto">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <span
            aria-hidden
            className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-[color:var(--accent)]/15 text-[color:var(--accent)]"
          >
            <Medal className="size-4" />
          </span>
          <div>
            <h3 className="text-lg font-bold tracking-tight sm:text-xl">
              모은 포인트
            </h3>
            <p className="text-xs font-medium text-muted-foreground">
              읽고, 풀고, 외울 때마다 쌓여요
            </p>
          </div>
        </div>
        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-sm font-extrabold tabular-nums text-primary">
          {points.toLocaleString()}P
        </span>
      </div>

      {badges.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {badges.map((b) => (
            <li
              key={b.id}
              title={b.description}
              className={`inline-flex items-center gap-1 rounded-full border border-border/70 bg-card px-2.5 py-1 text-xs font-semibold ${
                freshIds.has(b.id) ? 'animate-bounce-in border-primary/50' : ''
              }`}
            >
              <span aria-hidden>{b.emoji}</span>
              {b.title}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
