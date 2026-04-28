/**
 * smap_eng Service Worker — KILL SWITCH 모드.
 *
 * 이 파일은 다음 목적으로 교체되었다:
 *  1) 이전 버전 SW(v1~v3)가 랜딩/로그인 네비게이션을 intercept해 "클릭 무반응" 현상을 유발했음.
 *  2) 랜딩(5027)과 메인 앱(5029)이 동일 오리진(eng.smap.site)을 공유해 SW scope를
 *     경로로 분리할 수 없고, 기존 사용자 브라우저에 남은 구버전 SW를 확실히 제거할 수단이 필요.
 *
 * 동작:
 *  - install 즉시 skipWaiting.
 *  - activate 시점에 모든 캐시를 삭제하고 SW 등록 자체를 unregister.
 *  - 제어 중인 탭을 navigate()로 리로드 → 이후 네트워크는 SW 없이 직접 서버로.
 *  - fetch 핸들러는 의도적으로 존재하지 않음. 어떤 요청도 intercept하지 않는다.
 *
 * PWA/오프라인 기능은 일시 비활성화. 필요 시 SW scope를 `/app/`로 좁혀 재도입한다.
 */

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      } catch {
        /* 캐시 접근 실패는 무시 — 핵심은 unregister */
      }

      try {
        await self.registration.unregister();
      } catch {
        /* unregister 실패도 치명적이지 않음 — 다음 로드에서 다시 시도 */
      }

      // 현재 SW가 제어 중인 모든 윈도우를 강제 새로고침.
      // 이 시점 이후 요청은 SW 없이 브라우저 → 서버 직통.
      const clients = await self.clients.matchAll({ type: 'window' });
      for (const client of clients) {
        try {
          await client.navigate(client.url);
        } catch {
          /* cross-origin 등 navigate 불가 케이스는 무시 */
        }
      }
    })(),
  );
});

// 의도적으로 fetch 핸들러 미등록.
