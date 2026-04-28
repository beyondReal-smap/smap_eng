import type { DefaultSession } from 'next-auth';
import type { UserRole } from '@/lib/db/schema';

// Auth.js의 기본 Session.user에 id/role을 포함하도록 확장.
// DB 세션 전략에서는 users.id(varchar(255))와 role이 각 요청의 user 객체에 이미 들어오지만,
// 기본 타입엔 포함되지 않아 명시적 augmentation 필요.
// auth.config.ts의 session() 콜백과 쌍을 이룬다.
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: UserRole;
    } & DefaultSession['user'];
  }

  interface User {
    role?: UserRole;
  }
}
