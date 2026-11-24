import {
  jsonLdGraph,
  organizationSchema,
  webSiteSchema,
  type JsonLdNode,
} from '@/lib/seo/json-ld';

/**
 * JSON-LD 구조화 데이터를 페이지에 심는 서버 컴포넌트.
 *
 * Next.js 16 공식 가이드(`node_modules/next/dist/docs/01-app/02-guides/json-ld.md`)
 * 권고대로 native `<script type="application/ld+json">`을 쓴다. `next/script`는
 * 실행 가능한 JS를 위한 컴포넌트라 구조화 데이터에는 맞지 않는다.
 *
 * **사이트 컨텍스트 자동 주입**: Organization·WebSite 노드를 항상 맨 앞에 붙인다.
 * 페이지가 넘긴 노드들은 `{ '@id': '.../#organization' }` 형태로 발행자를 참조하는데,
 * 참조 대상이 같은 문서 안에 없으면 크롤러가 그 참조를 버린다(발행자 미상 처리).
 * 루트 layout에서 따로 심는 방식은 script가 두 개로 갈라져 같은 문제가 생기므로,
 * "페이지당 하나의 `@graph`"를 이 컴포넌트가 보장한다.
 *
 * XSS 방어: `JSON.stringify`는 `</script>` 같은 문자열을 이스케이프하지 않아
 * script 컨텍스트를 탈출시킬 수 있다. `<`를 유니코드 `<`로 치환해 차단한다
 * (JSON 파서가 `<`로 되돌려 읽으므로 데이터 의미는 보존된다).
 * 프로젝트 보안 규칙의 "dangerouslySetInnerHTML + DOMPurify"는 HTML 삽입 케이스를
 * 겨냥한 것으로, HTML이 아닌 JSON 페이로드에는 DOMPurify가 적용 대상이 아니다.
 */
export function JsonLd({ nodes }: { nodes: JsonLdNode[] }) {
  const graph = jsonLdGraph([organizationSchema(), webSiteSchema(), ...nodes]);
  const payload = JSON.stringify(graph).replace(/</g, '\\u003c');

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: payload }} />;
}
