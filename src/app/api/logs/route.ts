import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  createReadingLog,
  listLogsByProfile,
  updateReadingLog,
} from '@/lib/db/queries';
import { handleApiError } from '../_lib/errors';

export const runtime = 'nodejs';

const CreateLogSchema = z.object({
  profileId: z.number().int().positive(),
  bookId: z.number().int().positive(),
});

export async function POST(req: NextRequest) {
  try {
    const body = CreateLogSchema.parse(await req.json());
    const log = createReadingLog(body);
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
    const updated = updateReadingLog(body.id, {
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
    return NextResponse.json({ logs: listLogsByProfile(parsed.profileId) });
  } catch (err) {
    return handleApiError(err);
  }
}
