import NextAuth from 'next-auth';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  accounts,
  profiles,
  sessions,
  users,
  verificationTokens,
} from '@/lib/db/schema';
import { isAdminEmail } from '@/lib/auth/admin-emails';
import { grantSignupBonus } from '@/lib/billing/credits';
import authConfig from '@/auth.config';

/**
 * Auth.js v5 엔트리 — Node.js 런타임 전용(mysql2 native).
 * proxy.ts는 Edge 호환이 필요한 경우 auth.config.ts만 별도 사용.
 */
const nextAuth = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  // DB 세션 — 로그아웃 즉시 세션 무효화 가능, 가족 다기기 접속 추적에 유리.
  session: { strategy: 'database' },
  // 어드민 부트스트랩 — ADMIN_EMAILS 화이트리스트에 포함된 이메일은
  // 매 로그인 시 role='admin'으로 sync. 첫 로그인 시 자동 승격 + 이후 강등 방지.
  // DB에서 role을 직접 'user'로 바꾸고 싶다면 먼저 화이트리스트에서 제거해야 함.
  events: {
    // OAuth(Google/Kakao) 신규 가입 — Adapter가 users 행을 만드는 이 시점에만 1회 발생.
    // 웹 이메일·모바일 가입은 Adapter를 거치지 않으므로 각 핸들러에서 직접 grantSignupBonus를
    // 호출한다. grantSignupBonus는 멱등이라 중복 호출돼도 1회만 지급된다.
    async createUser({ user }) {
      if (!user?.id) return;
      try {
        await grantSignupBonus(user.id);
      } catch (err) {
        // 보너스 누락은 가입을 막지 않는다(가입 성공 > 보너스). 추적용으로만 로깅.
        console.error('[signup-bonus] createUser grant failed', user.id, err);
      }
    },
    async signIn({ user }) {
      if (!user?.id) return;

      if (isAdminEmail(user.email)) {
        await db
          .update(users)
          .set({ role: 'admin' })
          .where(eq(users.id, user.id));
      }

      // OAuth(Google/Kakao)는 NextAuth Adapter가 users 행만 만들고 프로필을 만들지 않는다.
      // 이메일 가입/Apple Sign In과 동일하게 첫 ⭐ 프로필을 자동 생성해 가입 흐름을 통일.
      // 기존 user(프로필 1개 이상)에는 영향 없음. soft-deleted 행도 검사에 포함해
      // "한 번 만든 적 있는" user에게는 다시 ⭐를 추가하지 않는다.
      const existing = await db
        .select({ id: profiles.id })
        .from(profiles)
        .where(eq(profiles.userId, user.id))
        .limit(1);

      if (existing.length === 0) {
        const firstName = (user.name ?? '').trim().split(/\s+/)[0];
        const childName = firstName.length > 0 ? firstName : '하루';
        await db.insert(profiles).values({
          userId: user.id,
          name: childName,
          age: 7,
          avatar: '⭐',
        });
      }
    },
  },
  ...authConfig,
});

export const {
  handlers: baseHandlers,
  auth: baseAuth,
  signIn: baseSignIn,
  signOut,
} = nextAuth;
