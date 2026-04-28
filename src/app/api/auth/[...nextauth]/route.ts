import { handlers } from '@/auth';

// Auth.js v5 동적 라우트 핸들러 — /api/auth/callback/google, /api/auth/callback/kakao 등.
// mysql2 네이티브 모듈이므로 Node.js 런타임 강제.
export const runtime = 'nodejs';

export const { GET, POST } = handlers;
