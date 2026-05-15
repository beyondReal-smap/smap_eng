import { NextResponse } from 'next/server';
import { unlink } from 'node:fs/promises';
import path from 'node:path';
import { eq, inArray } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { requireUserIdForApi } from '@/lib/auth/session';
import { handleApiError } from '../_lib/errors';

// mysql2 네이티브 모듈이므로 Edge 불가.
export const runtime = 'nodejs';

/**
 * 계정 삭제 — App Store Review Guideline 5.1.1(v) 필수.
 *
 * 흐름:
 *  1) 인증된 user의 책/passage에 연결된 파일 경로를 미리 수집(웹 경로 `/audio/...`, `/images/...`).
 *  2) `users` 행을 삭제 → schema의 onDelete cascade가 profiles, books, passages, quizzes,
 *     reading_logs, credit_balances, credit_transactions, orders, subscriptions,
 *     mobile_auth_tokens, accounts, sessions 자동 정리.
 *  3) 파일 시스템에 남는 wav/png는 best-effort로 unlink. 실패해도 API는 성공으로 응답
 *     (DB 정합성이 우선, 파일은 orphan cleanup 가능). 실제 운영 잔재는 cron으로 별도 정리.
 *
 * 비밀번호 재확인은 클라이언트(인앱 DeleteAccountView)에서 2단계 확인 UI로 처리.
 * 서버는 인증된 토큰만 신뢰 — 토큰 소유자가 곧 본인이라는 가정.
 */
export async function DELETE() {
  try {
    const userId = await requireUserIdForApi();

    const bookRows = await db
      .select({
        id: schema.books.id,
        cover: schema.books.coverImagePath,
      })
      .from(schema.books)
      .innerJoin(schema.profiles, eq(schema.books.profileId, schema.profiles.id))
      .where(eq(schema.profiles.userId, userId));

    const bookIds = bookRows.map((b) => b.id);
    const passageRows =
      bookIds.length > 0
        ? await db
            .select({
              audio: schema.passages.audioPath,
              scene: schema.passages.sceneImagePath,
            })
            .from(schema.passages)
            .where(inArray(schema.passages.bookId, bookIds))
        : [];

    const filesToRemove = new Set<string>();
    for (const b of bookRows) {
      if (b.cover) filesToRemove.add(b.cover);
    }
    for (const p of passageRows) {
      if (p.audio) filesToRemove.add(p.audio);
      if (p.scene) filesToRemove.add(p.scene);
    }

    await db.delete(schema.users).where(eq(schema.users.id, userId));

    await Promise.allSettled(
      [...filesToRemove].map(async (webPath) => {
        // 저장된 경로는 `/audio/xxx.wav` 또는 `/images/xxx.png` 형태. 절대경로로 변환.
        // 경로 traversal 방지: leading `/`만 제거하고 그대로 join(외부 입력이 아니라
        // 우리가 저장한 컬럼이지만 방어적으로 normalize).
        const rel = webPath.replace(/^\/+/, '');
        const abs = path.resolve(process.cwd(), 'public', rel);
        const allowedRoot = path.resolve(process.cwd(), 'public');
        if (!abs.startsWith(allowedRoot + path.sep)) return;
        try {
          await unlink(abs);
        } catch {
          // 이미 없거나 권한 없으면 그냥 패스. cron orphan cleanup으로 보강.
        }
      }),
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
