import { NextResponse } from 'next/server';
import { z } from 'zod';
import { LLMError } from '@/lib/llm';
import { InsufficientCreditsError } from '@/lib/billing/credits';
import { STAR_COPY } from '@/lib/billing/terminology';
import { AdminAuthError, ApiAuthError } from '@/lib/auth/session';

/**
 * Next.js의 `redirect()`가 던지는 NEXT_REDIRECT 에러를 식별.
 * Route Handler에서 잡으면 안 됨 — 그대로 재전파해야 Next.js 런타임이
 * 307 응답을 생성한다.
 */
function isNextRedirectError(err: unknown): boolean {
  return (
    err instanceof Error &&
    'digest' in err &&
    typeof (err as { digest?: unknown }).digest === 'string' &&
    (err as { digest: string }).digest.startsWith('NEXT_REDIRECT')
  );
}

/** API 라우트 공용 에러 변환기. 경계에서 HTTP 코드로 맵핑. */
export function handleApiError(err: unknown): NextResponse {
  // NEXT_REDIRECT는 Next.js 런타임이 처리하므로 절대 가로채면 안 됨.
  if (isNextRedirectError(err)) throw err;
  if (err instanceof ApiAuthError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  if (err instanceof z.ZodError) {
    // 어디서 검증 실패했는지 운영 로그에 남긴다 — issue.path + message로 즉시 디버깅 가능.
    console.warn('[api-validation]', err.issues.map((i) => ({ path: i.path, code: i.code, message: i.message })));
    return NextResponse.json(
      { error: 'validation', issues: err.issues },
      { status: 400 },
    );
  }
  if (err instanceof SyntaxError) {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  if (err instanceof AdminAuthError) {
    return NextResponse.json(
      { error: err.message },
      { status: err.status },
    );
  }
  if (err instanceof InsufficientCreditsError) {
    return NextResponse.json(
      {
        error: 'insufficient_credits',
        message: STAR_COPY.insufficient,
        credits: { balance: err.balance, required: err.required },
      },
      { status: 402 },
    );
  }
  if (err instanceof LLMError) {
    return NextResponse.json(
      { error: 'llm', message: err.message, upstream_status: err.status },
      { status: 502 },
    );
  }
  console.error('[api]', err);
  return NextResponse.json({ error: 'internal' }, { status: 500 });
}
