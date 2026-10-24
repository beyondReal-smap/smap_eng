// 실제로 접속하지 않는 기준 origin. 상대 경로로 해석한 결과가 이 origin 안에 머물면 내부 경로다.
const BASE_ORIGIN = 'http://internal.invalid';

/**
 * `callbackUrl` 쿼리 값을 앱 내부 경로로만 좁힌다(open redirect 방지). 아니면 null.
 *
 * `startsWith('/') && !startsWith('//')` 같은 문자열 검사는 `/\t/evil.example`처럼
 * URL 파서가 지우는 탭·개행으로 우회된다(브라우저·Next 라우터에서는 `//evil.example`).
 * 그래서 같은 WHATWG URL 파서로 해석한 결과의 origin을 비교하고, 통과하면
 * path+search+hash만 돌려준다. 서버(proxy)와 클라이언트 컴포넌트 모두에서 쓴다.
 */
export function toInternalPath(raw: string | null): string | null {
  if (!raw || !raw.startsWith('/')) return null;
  let url: URL;
  try {
    url = new URL(raw, BASE_ORIGIN);
  } catch {
    return null;
  }
  if (url.origin !== BASE_ORIGIN) return null;
  // `/.//evil.example`은 점 세그먼트 정리 후 pathname이 `//evil.example`이 된다 —
  // 그대로 돌려주면 protocol-relative URL이므로 앞 슬래시를 하나로 줄인다.
  return `${url.pathname.replace(/^\/{2,}/, '/')}${url.search}${url.hash}`;
}
