import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { assertAdminApi } from '@/lib/auth/session';
import { adminFindUserById, adminGetCreditSummary } from '@/lib/db/queries';
import {
  InvalidCreditDeltaError,
  grantCredits,
} from '@/lib/billing/credits';
import { handleApiError } from '@/app/api/_lib/errors';

export const runtime = 'nodejs';

const GrantSchema = z.object({
  delta: z.number().int().positive().max(1_000_000),
});

/** GET /api/admin/credits/[userId] — 잔액 + 최근 원장 50건. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    await assertAdminApi();
    const { userId } = await params;
    const summary = await adminGetCreditSummary(userId);
    if (!summary) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ summary });
  } catch (err) {
    return handleApiError(err);
  }
}

/** POST /api/admin/credits/[userId] — 크레딧 수동 지급(grant). */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    await assertAdminApi();
    const { userId } = await params;
    const exists = await adminFindUserById(userId);
    if (!exists) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    const { delta } = GrantSchema.parse(await req.json());
    try {
      const result = await grantCredits(userId, delta);
      return NextResponse.json({ result });
    } catch (e) {
      if (e instanceof InvalidCreditDeltaError) {
        return NextResponse.json(
          { error: 'invalid_delta' },
          { status: 400 },
        );
      }
      throw e;
    }
  } catch (err) {
    return handleApiError(err);
  }
}
