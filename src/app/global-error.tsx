'use client';

/**
 * Next.js 16의 default `_global-error`는 root layout 바깥에서 prerender되는데,
 * 우리 layout.tsx가 `<AuthSessionProvider>`로 children을 감싸기 때문에 default 구현이
 * SessionProvider context에 접근하려다 `Cannot destructure property 'data'` 로 prerender가
 * 실패한다(2026-04-26). 결과적으로 `.next/prerender-manifest.json`이 만들어지지 않아 PM2
 * 부팅 시 ENOENT가 떨어졌다.
 *
 * 자체 fallback을 정의해 prerender를 통과시킨다. global-error는 root layout 바깥이므로
 * 자체 `<html>`/`<body>`를 직접 그려야 한다.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ko">
      <body
        style={{
          margin: 0,
          minHeight: '100dvh',
          display: 'grid',
          placeItems: 'center',
          background: '#faf6ea',
          color: '#1f1b16',
          fontFamily: 'system-ui, -apple-system, "Apple SD Gothic Neo", sans-serif',
        }}
      >
        <div style={{ maxWidth: 420, padding: 24, textAlign: 'center' }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>
            앱에 문제가 생겼어요
          </h1>
          <p
            style={{
              marginTop: 12,
              fontSize: 14,
              lineHeight: 1.6,
              color: '#5a5249',
            }}
          >
            잠시 후 다시 시도해 주세요. 문제가 계속되면 새로고침하거나 다시
            로그인해 주세요.
          </p>
          {error?.digest ? (
            <p
              style={{
                marginTop: 8,
                fontSize: 12,
                color: '#8a7e6e',
                fontFamily: 'ui-monospace, SFMono-Regular, monospace',
              }}
            >
              {error.digest}
            </p>
          ) : null}
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 20,
              padding: '10px 18px',
              borderRadius: 9999,
              border: 'none',
              background: '#3b82f6',
              color: '#fff',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            다시 시도
          </button>
        </div>
      </body>
    </html>
  );
}
