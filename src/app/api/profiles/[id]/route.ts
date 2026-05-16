import { NextRequest, NextResponse } from 'next/server';
import { softDeleteProfile } from '@/lib/db/queries';
import { requireUserIdForApi } from '@/lib/auth/session';
import { handleApiError } from '../../_lib/errors';

export const runtime = 'nodejs';

function parseId(raw: string): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/**
 * DELETE /api/profiles/[id]
 *
 * 소유권 검증을 통과한 프로필을 soft delete. 책/학습기록은 cascade로 삭제되지 않고 보존.
 * 같은 라우트를 두 번 호출하면 두 번째는 404(이미 삭제됨) — 멱등하게 동작.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const profileId = parseId(id);
    if (profileId === null) {
      return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
    }
    const userId = await requireUserIdForApi();
    const deleted = await softDeleteProfile({ profileId, userId });
    if (!deleted) {
      // 비소유/이미 삭제됨 — 통합 404로 BOLA enumeration 차단.
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ profile: deleted });
  } catch (err) {
    return handleApiError(err);
  }
}
