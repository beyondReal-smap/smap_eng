/**
 * 외부에 노출되는 경로 상수.
 *
 * 메인 앱(smap-eng-next)은 자기 자신의 `/`가 책장이지만, apps/landing의 catch-all
 * 프록시(`apps/landing/src/app/[...path]/route.ts`)가 외부 트래픽을 다음과 같이 매핑한다:
 *   외부 URL `/`        → 랜딩 페이지(apps/landing)
 *   외부 URL `/app`     → 메인 앱의 `/` (책장)
 *
 * 따라서 메인 앱 내부에서 `<Link href="/">`를 쓰면 외부 사용자는 책장이 아닌 랜딩으로
 * 가버린다. 책장으로 돌아가는 모든 링크는 이 상수를 사용해야 한다.
 *
 * `NEXT_PUBLIC_APP_HOME`은 빌드 시점에 client bundle에 인라인되므로
 *  - 운영(.env.production): `/app`
 *  - 개발(.env.local 미설정 → default `/`): `/` (메인 앱 단독 실행 시 책장이 `/`)
 */
export const APP_HOME = process.env.NEXT_PUBLIC_APP_HOME || "/";
