'use client';

import { useEffect, useState } from 'react';
import { Progress } from '@/components/ui/progress';

/**
 * 동화 생성 중 4단계 pseudo-progress UI.
 *
 * 왜 pseudo인가: /api/books는 단일 POST로 10~30초에 걸쳐 LLM 응답을 받는다.
 * 토큰 단위 스트리밍을 UI에 그대로 노출하면 스키마(Zod) 미검증 내용이 먼저 보일 위험이 있다
 * (Codex Round 2 안전성 지적). 그래서 서버는 단일 응답을 유지하고, 클라이언트는
 * 실제 경과 시간 대비 예상 시간으로 프로그레스를 채우며 4단계 레이블을 전환한다.
 * 실제 응답이 도착하면 부모 컴포넌트가 이 뷰를 내리고 다음 화면으로 이동한다.
 */

interface Props {
  /** 예상 총 소요 시간(ms). 기본 18s (reasoning_effort=medium 관측치 기준). */
  expectedMs?: number;
}

const STAGES = [
  { label: '제목 짓는 중', hint: '이야기의 제목을 고르고 있어요' },
  { label: '이야기 쓰는 중', hint: 'AI가 문장을 한 줄씩 엮고 있어요' },
  { label: '어휘 정리 중', hint: '어려운 단어를 골라 뜻을 달고 있어요' },
  { label: '책장에 넣는 중', hint: '완성된 책을 책장에 옮기고 있어요' },
];

/** 실제 단계 수와 무관하게 UI 단계 비중(%) — 합 100.  */
const STAGE_WEIGHTS = [15, 50, 20, 15];

function stageIndex(pct: number): number {
  let acc = 0;
  for (let i = 0; i < STAGE_WEIGHTS.length; i++) {
    acc += STAGE_WEIGHTS[i];
    if (pct < acc) return i;
  }
  return STAGE_WEIGHTS.length - 1;
}

export function GenerationProgress({ expectedMs = 18_000 }: Props) {
  const [pct, setPct] = useState(0);

  useEffect(() => {
    const start = Date.now();
    // 95%까지만 채우고, 실제 응답 도착 시 부모가 언마운트.
    const timer = window.setInterval(() => {
      const elapsed = Date.now() - start;
      const next = Math.min(95, (elapsed / expectedMs) * 100);
      setPct(next);
    }, 150);
    return () => window.clearInterval(timer);
  }, [expectedMs]);

  const current = stageIndex(pct);

  return (
    <div className="space-y-5 py-3" role="status" aria-live="polite">
      {/* H3 급 현재 단계 — 본문의 대표 정보. */}
      <div className="space-y-1">
        <p className="text-base font-bold tracking-tight">
          {STAGES[current].label}
        </p>
        <p className="text-sm text-muted-foreground">
          {STAGES[current].hint}
        </p>
      </div>

      {/* 진행 바 */}
      <Progress value={pct} className="h-2 rounded-full" />

      {/* 단계 칩 — 보조 인디케이터. 현재 단계는 숨기고 다른 단계만 칩으로 표시해도 되지만,
          4개 전 단계를 한눈에 보여주는 쪽을 유지하여 "어디쯤 진행 중인지" 맥락을 제공. */}
      <ol className="grid grid-cols-4 gap-1.5 text-[11px]">
        {STAGES.map((s, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <li
              key={s.label}
              className={`flex items-center justify-center rounded-md border px-1.5 py-1 text-center font-medium transition ${
                done
                  ? 'border-transparent bg-[color:var(--level-a1)] text-[color:var(--level-a1-fg)]'
                  : active
                    ? 'border-primary/60 bg-primary/10 text-primary'
                    : 'border-border bg-card text-muted-foreground'
              }`}
              aria-current={active ? 'step' : undefined}
            >
              <span className="mr-1 tabular-nums">{done ? '✓' : i + 1}</span>
              <span>{s.label}</span>
            </li>
          );
        })}
      </ol>

      {/* Meta 안내 */}
      <p className="text-[11px] text-muted-foreground">
        평균 10~30초가 걸려요. 잠시만 기다려 주세요.
      </p>
    </div>
  );
}
