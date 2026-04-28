'use client';

import { useEffect } from 'react';

/**
 * Service Worker 등록 — 일시 비활성화.
 *
 * 기존 sw.js는 랜딩(5027)과 메인 앱(5029)이 동일 오리진을 공유하는 구조에서
 * 랜딩 네비게이션을 잘못 가로채는 문제가 있었다. 이를 근본 해결하려면 SW scope를
 * `/app/` 이하로 좁혀야 하지만 별도 헤더/라우팅 구성이 필요하다.
 *
 * 그 준비가 끝날 때까지 신규 등록은 중단하고, 기존에 등록된 SW는 kill-switch
 * 형태의 sw.js(캐시 삭제 + unregister + 리로드)가 스스로 제거하도록 둔다.
 * 브라우저는 현재 등록된 SW의 업데이트 check 주기(보통 24h 또는 페이지 로드마다)
 * 에 따라 새 sw.js를 가져가고, activate 단계에서 자기 자신을 unregister한다.
 *
 * 이 컴포넌트가 여기서 추가로 취하는 안전장치:
 *  - 혹시 update check가 아직 안 일어난 경우를 대비해, 명시적으로 `/sw.js`를
 *    다시 fetch하여 업데이트 트리거.
 *  - 이후 getRegistrations로 SW 존재 확인 후, 남아있으면 한 번 더 update 요청.
 */
export function PwaRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

    if (process.env.NODE_ENV !== 'production') {
      navigator.serviceWorker
        .getRegistrations()
        .then((regs) => regs.forEach((r) => r.unregister()))
        .catch(() => void 0);
      return;
    }

    // 기존 등록 SW들에 update를 강제 — kill-switch sw.js가 activate되면
    // 자기 자신을 unregister + 탭을 navigate()로 리로드한다.
    navigator.serviceWorker
      .getRegistrations()
      .then((regs) => {
        regs.forEach((r) => {
          try { r.update(); } catch { /* ignore */ }
        });
      })
      .catch(() => void 0);
  }, []);

  return null;
}
