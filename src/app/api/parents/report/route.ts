import { NextResponse } from 'next/server';
import { getParentalReport } from '@/lib/db/queries';
import { requireUserIdForApi } from '@/lib/auth/session';
import { handleApiError } from '../../_lib/errors';

export const runtime = 'nodejs';

/**
 * GET /api/parents/report
 *
 * 현재 가족(user)의 전체 자녀 프로필 최근 7일 집계.
 * PIN 검증은 클라이언트에서 수행되며, 집계 데이터만 반환(개인정보 없음).
 */
export async function GET() {
  try {
    const userId = await requireUserIdForApi();
    return NextResponse.json({ report: await getParentalReport(userId) });
  } catch (err) {
    return handleApiError(err);
  }
}
