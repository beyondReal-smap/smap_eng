import { NextResponse } from 'next/server';
import { getCreditBalance } from '@/lib/billing/credits';
import { requireUserId } from '@/lib/auth/session';
import { handleApiError } from '../../_lib/errors';

export const runtime = 'nodejs';
// 매 요청마다 최신 잔액을 반환해야 함 — 캐싱 금지.
export const dynamic = 'force-dynamic';

/**
 * 현재 로그인 가족(user)의 별 크레딧 잔액 조회.
 * 행이 없으면 {balance: 0, totalPurchased: 0} 반환.
 *
 * 호출 시점:
 *  - 헤더 계정 메뉴 진입(잔액 노출)
 *  - 홈 진입 시 업그레이드 배너 노출 판단
 *  - 책 생성 후 토스트("남은 별 N개")
 */
export async function GET() {
  try {
    const userId = await requireUserId();
    const credits = await getCreditBalance(userId);
    return NextResponse.json({ credits });
  } catch (err) {
    return handleApiError(err);
  }
}
