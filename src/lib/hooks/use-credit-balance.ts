'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api-client';

export interface CreditBalance {
  /** 사용 가능한 별 잔액 */
  balance: number;
  /** 누적 충전량(환불 제외) */
  totalPurchased: number;
}

interface UseCreditBalanceOptions {
  /**
   * false면 fetch를 건너뛴다(비로그인 사용자에서 401 호출을 막을 때 사용).
   * 기본값 true.
   */
  enabled?: boolean;
}

// ─── 모듈 수준 single-flight 캐시 ────────────────────────────────────────
// 같은 페이지에서 useCreditBalance를 사용하는 컴포넌트가 다수일 때
// (예: AccountMenu + UpgradeBanner) /api/billing/credits를 1회만 호출하고
// 결과를 모든 구독자에게 broadcast 한다. TTL 60s.

const TTL_MS = 60_000;

type Listener = (state: ListenerState) => void;
interface ListenerState {
  credits: CreditBalance | null;
  loading: boolean;
}

let cached: { credits: CreditBalance | null; at: number } | null = null;
let inflight: Promise<CreditBalance | null> | null = null;
const listeners = new Set<Listener>();

function emit(state: ListenerState) {
  for (const fn of listeners) fn(state);
}

async function fetchCredits(force = false): Promise<CreditBalance | null> {
  if (!force && cached && Date.now() - cached.at < TTL_MS) return cached.credits;
  if (inflight) return inflight;

  emit({ credits: cached?.credits ?? null, loading: true });
  inflight = apiFetch<{ credits: CreditBalance }>('/api/billing/credits')
    .then((res) => {
      cached = { credits: res.credits, at: Date.now() };
      emit({ credits: res.credits, loading: false });
      return res.credits;
    })
    .catch(() => {
      // 401(미인증)·네트워크 오류 — 호출자에서 null로 fallback. 토스트는 헤더/배너
      // 진입 시점에 노이즈가 크므로 띄우지 않는다.
      cached = { credits: null, at: Date.now() };
      emit({ credits: null, loading: false });
      return null;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

function invalidate() {
  cached = null;
}

/**
 * 현재 가족(user)의 별 크레딧 잔액을 조회하고, 탭 포커스/visibility 복귀 시
 * 자동 갱신. 책 생성·구매 직후 동기화는 `refresh()` 수동 호출로 처리.
 *
 * 같은 페이지의 모든 인스턴스가 모듈 캐시를 공유하므로 동일 엔드포인트를
 * 중복 페치하지 않는다.
 *
 * 반환값:
 *  - `credits === null` & `loading === true`: 최초 페치 진행 중
 *  - `credits === null` & `loading === false`: 페치 실패(미인증·네트워크) — 호출자에서 fallback
 *  - `credits !== null`: 정상 응답
 */
export function useCreditBalance(options: UseCreditBalanceOptions = {}) {
  const { enabled = true } = options;
  const [credits, setCredits] = useState<CreditBalance | null>(
    () => cached?.credits ?? null,
  );
  const [loading, setLoading] = useState<boolean>(
    () => enabled && !cached,
  );

  const refresh = useCallback(() => {
    if (!enabled) return;
    invalidate();
    void fetchCredits(true);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setCredits(null);
      setLoading(false);
      return;
    }

    const onState: Listener = (state) => {
      setCredits(state.credits);
      setLoading(state.loading);
    };
    listeners.add(onState);

    void fetchCredits(false);

    return () => {
      listeners.delete(onState);
    };
  }, [enabled]);

  // visibilitychange와 focus는 탭 활성화 시 거의 동시에 발화한다. 짧은 디바운스로
  // 같은 활성화 의도로 인한 중복 갱신을 한 번으로 합친다.
  useEffect(() => {
    if (!enabled) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    function scheduleRefresh() {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        refresh();
      }, 100);
    }
    function onVisible() {
      if (document.visibilityState === 'visible') scheduleRefresh();
    }
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', scheduleRefresh);
    return () => {
      if (timer) clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', scheduleRefresh);
    };
  }, [enabled, refresh]);

  return { credits, loading, refresh };
}
