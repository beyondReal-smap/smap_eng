import { NextResponse } from 'next/server';
import { z } from 'zod';
import { LLMError } from '@/lib/llm';

/** API 라우트 공용 에러 변환기. 경계에서 HTTP 코드로 맵핑. */
export function handleApiError(err: unknown): NextResponse {
  if (err instanceof z.ZodError) {
    return NextResponse.json(
      { error: 'validation', issues: err.issues },
      { status: 400 },
    );
  }
  if (err instanceof SyntaxError) {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
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
