import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  createReadingLog,
  getReadingLogById,
  listLogsByProfile,
  updateReadingLog,
} from '@/lib/db/queries';
import {
  ApiAuthError,
  requireBookOwnershipForApi,
  requireProfileOwnershipForApi,
} from '@/lib/auth/session';
import { handleApiError } from '../_lib/errors';

export const runtime = 'nodejs';

const CreateLogSchema = z.object({
  profileId: z.number().int().positive(),
  bookId: z.number().int().positive(),
});

export async function POST(req: NextRequest) {
  try {
    const body = CreateLogSchema.parse(await req.json());
    // profile + book 둘 다 자기 소유여야 로그 생성 허용 (cross-profile 데이터 주입 차단).
    const { userId } = await requireProfileOwnershipForApi(body.profileId);
    const { userId: bookOwnerId } = await requireBookOwnershipForApi(body.bookId);
    if (bookOwnerId !== userId) {
      throw new ApiAuthError('not_found', 404);
    }
    const log = await createReadingLog(body);
    return NextResponse.json({ log }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}

const PatchLogSchema = z.object({
  id: z.number().int().positive(),
  progressRatio: z.number().min(0).max(1).optional(),
  finishedAtUnix: z.number().int().optional(),
  quizScore: z.number().int().min(0).max(5).optional(),
});

/** 진행률·완독 시각·퀴즈 점수 갱신. */
export async function PATCH(req: NextRequest) {
  try {
    const body = PatchLogSchema.parse(await req.json());
    // 로그 → profileId → user 소유권 확인. 타 user의 로그 PATCH 차단.
    const existing = await getReadingLogById(body.id);
    if (!existing) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    await requireProfileOwnershipForApi(existing.profileId);
    const updated = await updateReadingLog(body.id, {
      progressRatio: body.progressRatio,
      finishedAt: body.finishedAtUnix
        ? new Date(body.finishedAtUnix * 1000)
        : undefined,
      quizScore: body.quizScore,
    });
    if (!updated) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ log: updated });
  } catch (err) {
    return handleApiError(err);
  }
}

const ListLogsQuery = z.object({
  profileId: z.coerce.number().int().positive(),
});

export async function GET(req: NextRequest) {
  try {
    const parsed = ListLogsQuery.parse({
      profileId: new URL(req.url).searchParams.get('profileId'),
    });
    await requireProfileOwnershipForApi(parsed.profileId);
    return NextResponse.json({
      logs: await listLogsByProfile(parsed.profileId),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
