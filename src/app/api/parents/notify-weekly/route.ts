import { NextRequest, NextResponse } from 'next/server';
import {
  getParentalReport,
  listUserIdsForWeeklyNotify,
} from '@/lib/db/queries';
import { sendPushToUser } from '@/lib/push/send';
import { handleApiError } from '../../_lib/errors';

export const runtime = 'nodejs';

/**
 * POST /api/parents/notify-weekly
 *
 * Cron 트리거 전용 — 모든 가족(user)을 순회하며 지난 7일 학습 요약 푸시를 보낸다.
 * 인증: `X-Cron-Token` 헤더가 환경변수 CRON_TOKEN과 일치해야 한다(외부 호출 차단).
 *
 * 발송 정책:
 *  - 자식 프로필이 1개 이상 + 지난 주 활동(책 생성/완독)이 1건 이상 → 푸시
 *  - 활동이 0건이면 푸시 생략 — 공허한 알림으로 사용자 피로 누적 방지
 *  - push_tokens가 없는 user는 sendPushToUser가 no-op
 *  - 발송 사이에 에러가 나도 다음 user는 계속 처리
 *
 * 멱등성: 매주 호출되므로 같은 주에 두 번 호출되면 푸시도 두 번 간다. PM2 cron_restart로
 * 1회만 트리거되도록 한다.
 */
export async function POST(req: NextRequest) {
  const expected = process.env.CRON_TOKEN;
  if (!expected) {
    console.error('[notify-weekly] CRON_TOKEN missing');
    return NextResponse.json({ error: 'cron_not_configured' }, { status: 500 });
  }
  const provided = req.headers.get('x-cron-token');
  if (provided !== expected) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const userIds = await listUserIdsForWeeklyNotify();
    const results = {
      total: userIds.length,
      sent: 0,
      skippedNoActivity: 0,
      failed: 0,
    };

    for (const userId of userIds) {
      try {
        const reports = await getParentalReport(userId);
        if (reports.length === 0) {
          results.skippedNoActivity += 1;
          continue;
        }

        const totalBooksThisWeek = reports.reduce(
          (sum, r) => sum + r.booksCreatedWeek,
          0,
        );
        const totalFinishedThisWeek = reports.reduce(
          (sum, r) => sum + r.sessionsFinishedWeek,
          0,
        );
        if (totalBooksThisWeek === 0 && totalFinishedThisWeek === 0) {
          results.skippedNoActivity += 1;
          continue;
        }

        // 메시지: 첫 프로필 이름 기준 + 합산 활동 수. 정확한 통계는 인앱에서 확인.
        const firstName = reports[0]?.name ?? '아이';
        const body =
          totalFinishedThisWeek > 0
            ? `${firstName}이(가) 이번 주 ${totalFinishedThisWeek}회 학습했어요. 보호자 모드에서 자세히 보세요.`
            : `${firstName}의 새 동화 ${totalBooksThisWeek}권이 추가됐어요.`;

        await sendPushToUser(userId, {
          title: '이번 주 학습 리포트가 준비됐어요',
          body,
          sound: 'default',
          custom: { kind: 'weekly_report' },
        });
        results.sent += 1;
      } catch (err) {
        results.failed += 1;
        console.warn('[notify-weekly] user failed', userId, err);
      }
    }

    console.log('[notify-weekly] done', results);
    return NextResponse.json({ ok: true, results });
  } catch (err) {
    return handleApiError(err);
  }
}
