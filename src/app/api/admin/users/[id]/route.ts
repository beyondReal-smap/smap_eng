import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { adminFindUserById, adminUpdateUserRole } from '@/lib/db/queries';
import { assertAdminApi, AdminAuthError } from '@/lib/auth/session';
import { USER_ROLES } from '@/lib/db/schema';
import { handleApiError } from '@/app/api/_lib/errors';

export const runtime = 'nodejs';

const UpdateRoleSchema = z.object({
  role: z.enum(USER_ROLES),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: adminId } = await assertAdminApi();
    const { id: targetId } = await params;

    // 자기 자신 강등 방지. 어드민이 실수로 자기를 user로 내리면 복구가 귀찮음.
    const body = UpdateRoleSchema.parse(await req.json());
    if (adminId === targetId && body.role !== 'admin') {
      throw new AdminAuthError('forbidden', 403);
    }

    const target = await adminFindUserById(targetId);
    if (!target) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    await adminUpdateUserRole(targetId, body.role);
    return NextResponse.json({ ok: true, id: targetId, role: body.role });
  } catch (err) {
    return handleApiError(err);
  }
}
