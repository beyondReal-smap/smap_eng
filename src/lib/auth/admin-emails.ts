/**
 * ADMIN_EMAILS 환경변수 파싱 — 어드민 부트스트랩용 이메일 화이트리스트.
 * 형식: "a@b.com,c@d.com" (콤마 구분, 공백 허용, 대소문자 구분 없음)
 *
 * 이 파일의 역할은 "첫 로그인 시 role='admin'을 자동 부여"하는 부트스트랩 트리거.
 * 이후 승격/강등은 DB(users.role)에서 관리하는 하이브리드 모델(C).
 */

let cached: Set<string> | null = null;

export function getAdminEmails(): Set<string> {
  if (cached) return cached;
  const raw = process.env.ADMIN_EMAILS ?? '';
  cached = new Set(
    raw
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
  return cached;
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return getAdminEmails().has(email.toLowerCase());
}
