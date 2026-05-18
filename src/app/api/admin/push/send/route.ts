import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { pushSendLogs, PUSH_SEND_AUDIENCES } from '@/lib/db/schema';
import { assertAdminApi } from '@/lib/auth/session';
import { handleApiError } from '@/app/api/_lib/errors';
import { resolveAudience } from '@/lib/push/audience';
import { sendPushToUsers } from '@/lib/push/send';

export const runtime = 'nodejs';
// 대량 발송은 시간이 오래 걸리지만 Promise.allSettled로 진행되므로 응답 자체는 빠름.
// 다만 세그먼트가 큰 경우 fan-out 도중 응답 타임아웃이 날 수 있어 maxDuration을 늘려둔다.
export const maxDuration = 300;

const SendRequest = z.object({
  audience: z.enum(PUSH_SEND_AUDIENCES),
  /** single audience일 때 대상 식별자(이메일 또는 user id). */
  targetIdentifier: z.string().trim().min(1).max(255).optional(),
  title: z.string().trim().max(200).optional(),
  body: z.string().trim().min(1).max(1000),
  deepLink: z.string().trim().max(500).optional(),
});

/**
 * 관리자가 입력한 메시지를 대상 사용자 디바이스에 발송.
 *
 * 흐름:
 *  1) assertAdminApi — 비관리자 → 401/403
 *  2) audience 해석 → user_id 목록 확보
 *  3) push_send_logs에 'sending' 행 생성 (감사 로그 우선 기록)
 *  4) sendPushToUsers — chunk 단위로 fan-out
 *  5) 결과(성공/실패/dropped 수)로 로그 행 업데이트
 *
 * 단건이면 대상 인원 0(notFound)이라도 200을 반환하되 status='failed'로 기록한다.
 * 호출자(UI)가 audienceCount=0을 보고 "대상 없음" 메시지를 표시.
 */
export async function POST(req: NextRequest) {
  try {
    const admin = await assertAdminApi();
    const { audience, targetIdentifier, title, body, deepLink } = SendRequest.parse(
      await req.json(),
    );

    const resolution = await resolveAudience(audience, { targetIdentifier });

    // 감사 로그 먼저 기록 — 발송 도중 크래시해도 흔적 남기 위해.
    // drizzle mysql2 어댑터의 `$returningId()`는 `{ id: number }[]`를 반환한다.
    //
    // createdAt 을 코드에서 명시적으로 채운다. defaultNow() 의 MySQL CURRENT_TIMESTAMP
    // (서버 SYSTEM=KST 로 발행) 와 completedAt 의 코드 `new Date()` (JS UTC 직렬화) 가
    // drizzle mysql2 어댑터를 거치면서 timezone 처리가 달라져 9시간 어긋난 채 저장되던
    // 문제를 막는다. 두 컬럼 모두 같은 변환 경로(JS Date → drizzle → MySQL) 를 타게
    // 강제해 history 화면 표시도 일치.
    const inserted = await db
      .insert(pushSendLogs)
      .values({
        actorUserId: admin.id,
        audience,
        targetUserId: audience === 'single' ? (resolution.userIds[0] ?? null) : null,
        title: title ?? null,
        body,
        deepLink: deepLink ?? null,
        audienceCount: resolution.audienceCount,
        status: 'sending',
        createdAt: new Date(),
      })
      .$returningId();
    const logId = inserted[0].id;

    if (resolution.userIds.length === 0) {
      await db
        .update(pushSendLogs)
        .set({
          status: 'failed',
          errorMessage: resolution.notFound ? 'target_not_found' : 'audience_empty',
          completedAt: new Date(),
        })
        .where(eq(pushSendLogs.id, logId));
      return NextResponse.json({
        logId,
        audienceCount: 0,
        sendCount: 0,
        success: 0,
        failure: 0,
        dropped: 0,
        status: 'failed' as const,
        reason: resolution.notFound ? 'target_not_found' : 'audience_empty',
      });
    }

    const custom = deepLink ? { deepLink } : undefined;
    const totals = await sendPushToUsers(resolution.userIds, {
      title,
      body,
      custom,
    });

    await db
      .update(pushSendLogs)
      .set({
        status: 'completed',
        sendCount: totals.sendCount,
        successCount: totals.success,
        failureCount: totals.failure + totals.dropped,
        completedAt: new Date(),
      })
      .where(eq(pushSendLogs.id, logId));

    return NextResponse.json({
      logId,
      audienceCount: resolution.audienceCount,
      sendCount: totals.sendCount,
      success: totals.success,
      failure: totals.failure,
      dropped: totals.dropped,
      status: 'completed' as const,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
