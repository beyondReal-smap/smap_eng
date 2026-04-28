/**
 * 경량 환경변수 파서.
 *
 * LLM config는 `Number(...)` 단순 변환을 쓰지만, 가격/한도처럼 잘못된 값이
 * 매출·정책에 영향을 주는 변수는 NaN·음수를 조기에 차단한다.
 *
 * Next.js의 `NEXT_PUBLIC_*`은 빌드 타임에 소스에 inline되므로,
 * 가격처럼 UI에 노출되는 값은 반드시 해당 접두사를 써야 한다.
 * 변경 후에는 반드시 `pnpm build`로 재빌드 필요.
 */

/** 비음수 정수 env 파싱. 미지정/빈값이면 fallback, 유효하지 않으면 throw. */
export function parseEnvNonNegativeInt(
  name: string,
  fallback: number,
): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const trimmed = raw.trim();
  const n = Number(trimmed);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) {
    throw new Error(
      `Invalid env ${name}="${raw}": non-negative integer required`,
    );
  }
  return n;
}

interface ParseEnvStringOptions {
  /** true면 미지정/빈값에서 throw. false면 undefined 반환. */
  required?: boolean;
  /** 값이 반드시 시작해야 하는 접두사(예: 'test_sk_'). 일치하지 않으면 throw. */
  prefix?: string;
}

/**
 * 시크릿/식별자 문자열 env 파싱.
 *
 * 기본값을 두지 않는다 — 시크릿은 잘못된 값(빈 문자열, 운영 키 오기재 등)이
 * fallback으로 흡수되면 운영 사고로 이어지므로, 호출부에서 명시적으로 처리.
 *
 * `prefix`로 환경 분리(테스트키 vs 운영키)를 강제할 수 있다.
 * 에러 메시지에는 시크릿 본문이 노출되지 않도록 길이만 표시.
 */
export function parseEnvString(
  name: string,
  options: ParseEnvStringOptions = {},
): string | undefined {
  const { required = false, prefix } = options;
  const raw = process.env[name];
  const trimmed = raw?.trim();
  if (!trimmed) {
    if (required) {
      throw new Error(`Invalid env ${name}: required but missing or empty`);
    }
    return undefined;
  }
  if (prefix && !trimmed.startsWith(prefix)) {
    throw new Error(
      `Invalid env ${name}: expected prefix "${prefix}" (got length=${trimmed.length})`,
    );
  }
  return trimmed;
}
