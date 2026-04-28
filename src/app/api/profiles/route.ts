import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createProfile, listProfiles } from '@/lib/db/queries';
import { requireUserIdForApi } from '@/lib/auth/session';
import { handleApiError } from '../_lib/errors';

// mysql2 네이티브 모듈이므로 Edge 불가 — Node.js 런타임 강제.
export const runtime = 'nodejs';

export async function GET() {
  try {
    const userId = await requireUserIdForApi();
    return NextResponse.json({ profiles: await listProfiles(userId) });
  } catch (err) {
    return handleApiError(err);
  }
}

const CreateProfileSchema = z.object({
  name: z.string().min(1).max(30),
  age: z.number().int().min(5).max(10),
  avatar: z.string().max(10).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = CreateProfileSchema.parse(await req.json());
    const userId = await requireUserIdForApi();
    const created = await createProfile({ ...body, userId });
    return NextResponse.json({ profile: created }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
