'use client';

import { useEffect, useRef, useState } from 'react';
import { apiFetch } from '@/lib/api-client';
import { logKey } from './shared';

/**
 * 서버 진도 로그 세션 + 진도율 PATCH 관리. 부수효과 전용(반환값 없음).
 *
 *  - 세션 확보: localStorage에 진행 중 log id가 있으면 재사용, 없으면 POST /api/logs로
 *    새 세션 생성 후 id 저장. 네트워크 실패해도 Reader UX에는 영향 없음(진도 저장만 누락).
 *  - 진도 업데이트: idx 변경 후 200ms debounce로 서버 PATCH → "읽은 만큼" 빠르게 반영.
 *  - 이탈 보정: Reader를 떠날 때 아직 안 날아간 PATCH가 있으면 cleanup에서
 *    `fetch keepalive: true`로 한 번 더 fire — 책장 진도 갱신 누락 방지.
 */
export function useReadingLog(params: {
  profileId: number | null;
  bookId: number;
  idx: number;
  commonCount: number;
  isEndingStep: boolean;
}): void {
  const { profileId, bookId, idx, commonCount, isEndingStep } = params;
  const [logId, setLogId] = useState<number | null>(null);
  // latestRatioRef는 최신 ratio를 컴포넌트 수명 내내 보관해 unmount 시 참조한다.
  const latestRatioRef = useRef(0);
  const ratioDirtyRef = useRef(false);

  useEffect(() => {
    if (!profileId) return;
    let cancelled = false;
    const key = logKey(profileId, bookId);
    try {
      const cached = window.localStorage.getItem(key);
      if (cached) {
        const n = Number(cached);
        if (Number.isFinite(n)) {
          setLogId(n);
          return;
        }
      }
    } catch {
      /* ignore */
    }
    apiFetch<{ log: { id: number } }>('/api/logs', {
      method: 'POST',
      body: JSON.stringify({ profileId, bookId }),
    })
      .then((res) => {
        if (cancelled) return;
        setLogId(res.log.id);
        try {
          window.localStorage.setItem(key, String(res.log.id));
        } catch {
          /* ignore */
        }
      })
      .catch(() => void 0);
    return () => {
      cancelled = true;
    };
  }, [profileId, bookId]);

  useEffect(() => {
    if (!logId) return;
    const ratio = isEndingStep
      ? 1
      : commonCount > 0
        ? Math.min(1, (idx + 1) / commonCount)
        : 0;
    latestRatioRef.current = ratio;
    ratioDirtyRef.current = true;
    const t = window.setTimeout(() => {
      apiFetch('/api/logs', {
        method: 'PATCH',
        body: JSON.stringify({ id: logId, progressRatio: ratio }),
      })
        .then(() => {
          ratioDirtyRef.current = false;
        })
        .catch(() => void 0);
    }, 200);
    return () => window.clearTimeout(t);
  }, [logId, idx, commonCount, isEndingStep]);

  // 뒤로가기 등 unmount 시 — 아직 전송 안 된 PATCH가 있으면 keepalive로 한 번 더.
  useEffect(() => {
    return () => {
      if (!logId || !ratioDirtyRef.current) return;
      try {
        fetch('/api/logs', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            id: logId,
            progressRatio: latestRatioRef.current,
          }),
          keepalive: true,
        }).catch(() => void 0);
      } catch {
        /* unmount race — 무시 */
      }
    };
  }, [logId]);
}
