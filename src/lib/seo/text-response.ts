/**
 * 평문/마크다운 라우트 공용 응답 헬퍼.
 *
 * `/llms.txt` · `/*.md` 라우트가 6개라 헤더 규칙이 흩어지면 어느 하나만 캐시
 * 정책이나 charset이 어긋나는 사고가 난다. 응답 생성을 한 곳으로 모은다.
 *
 * `charset=utf-8` 필수 — 한국어 본문이라 누락 시 크롤러가 깨진 바이트로 읽는다.
 * 마크다운 미러는 브라우저에서 다운로드가 아니라 바로 보이는 편이 낫고(사람이
 * 확인할 수 있어야 한다), `text/markdown`은 대부분의 브라우저가 인라인 표시한다.
 */

const ONE_HOUR = 3600;

export function textResponse(
  body: string,
  contentType: 'text/plain' | 'text/markdown' = 'text/plain',
): Response {
  return new Response(body, {
    headers: {
      'Content-Type': `${contentType}; charset=utf-8`,
      'Cache-Control': `public, max-age=${ONE_HOUR}`,
      // 크롤러가 이 평문 문서를 색인해도 무방함을 명시(HTML 페이지의 canonical이
      // 원본이므로 중복 색인 걱정 없이 열어 둔다).
      'X-Robots-Tag': 'index, follow',
    },
  });
}
