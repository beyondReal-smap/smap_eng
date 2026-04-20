import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createProfile, listProfiles } from '@/lib/db/queries';
import { handleApiError } from '../_lib/errors';

// better-sqlite3 is a native module — force Node.js runtime
export const runtime = 'nodejs';

export async function GET() {
  try {
    return NextResponse.json({ profiles: listProfiles() });
  } catch (err) {
    return handleApiError(err);
  }
}

const CreateProfileSchema = z.object({
  name: z.string().min(1).max(30),
  avatar: z.string().max(10).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = CreateProfileSchema.parse(await req.json());
    const created = createProfile(body);
    return NextResponse.json({ profile: created }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
