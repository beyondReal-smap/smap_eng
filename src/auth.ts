import NextAuth from 'next-auth';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { and, eq } from 'drizzle-orm';
import {
  createHash,
  randomBytes,
  scrypt as nodeScrypt,
  timingSafeEqual,
} from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  accounts,
  mobileAuthTokens,
  sessions,
  users,
  verificationTokens,
} from '@/lib/db/schema';
import { isAdminEmail } from '@/lib/auth/admin-emails';
import { LoginSchema } from '@/lib/auth/schemas';
import authConfig from './auth.config';

const MOBILE_AUTH_PROVIDERS = ['google', 'kakao'] as const;
const MOBILE_EXCHANGE_CODE_TTL_MS = 5 * 60 * 1000;
const MOBILE_ACCESS_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const PASSWORD_KEY_LENGTH = 64;

type MobileAuthProvider = (typeof MOBILE_AUTH_PROVIDERS)[number];

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function createRawToken(): string {
  return randomBytes(32).toString('base64url');
}

function toUnixSeconds(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function jsonError(error: string, status: number): NextResponse {
  return NextResponse.json({ error }, { status });
}

function parseMobileProvider(raw: string | null): MobileAuthProvider | null {
  if (!raw) return null;
  return MOBILE_AUTH_PROVIDERS.includes(raw as MobileAuthProvider)
    ? (raw as MobileAuthProvider)
    : null;
}

function parseMobileRedirect(raw: string | null): URL | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (
      url.protocol !== 'smapeng:' ||
      url.hostname !== 'auth' ||
      url.pathname !== '/callback'
    ) {
      return null;
    }
    return url;
  } catch {
    return null;
  }
}

/**
 * PKCE code_challenge 형식 검증 (RFC 7636 §4.2):
 *  - base64url로 인코딩된 SHA-256 결과 → 정확히 43자, [A-Za-z0-9_-] only.
 *
 * 앱이 challenge 미전송 시 null 반환 → 기존 흐름 유지(backwards compatible).
 * 형식 오류 시 undefined 반환 → 400으로 거부.
 */
function parsePkceChallenge(raw: string | null): string | null | undefined {
  if (raw === null || raw === '') return null;
  if (!/^[A-Za-z0-9_-]{43}$/.test(raw)) return undefined;
  return raw;
}

function pkceVerifierMatchesChallenge(
  verifier: string,
  challenge: string,
): boolean {
  if (!/^[A-Za-z0-9_\-.~]{43,128}$/.test(verifier)) return false;
  const computed = createHash('sha256')
    .update(verifier)
    .digest('base64url');
  return computed === challenge;
}

function passwordOptions(n: number, r: number, p: number) {
  return {
    N: n,
    r,
    p,
    maxmem: 64 * 1024 * 1024,
  };
}

function scryptAsync(
  password: string,
  salt: string,
  keyLength: number,
  options: ReturnType<typeof passwordOptions>,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    nodeScrypt(password, salt, keyLength, options, (err, derivedKey) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(derivedKey);
    });
  });
}

async function verifyPassword(
  password: string,
  storedHash: string,
): Promise<boolean> {
  const [algorithm, nRaw, rRaw, pRaw, salt, hash] = storedHash.split('$');
  if (algorithm !== 'scrypt' || !salt || !hash) return false;

  const n = Number(nRaw);
  const r = Number(rRaw);
  const p = Number(pRaw);
  if (!Number.isInteger(n) || !Number.isInteger(r) || !Number.isInteger(p)) {
    return false;
  }

  const expected = Buffer.from(hash, 'base64url');
  if (expected.length !== PASSWORD_KEY_LENGTH) return false;

  const actual = await scryptAsync(
    password,
    salt,
    PASSWORD_KEY_LENGTH,
    passwordOptions(n, r, p),
  );
  return timingSafeEqual(actual, expected);
}

function appendNoStore(response: NextResponse): NextResponse {
  response.headers.set('cache-control', 'no-store');
  return response;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function renderMobileProviderPicker(reqUrl: URL, redirect: URL): NextResponse {
  const links = MOBILE_AUTH_PROVIDERS.map((provider) => {
    const href = new URL('/api/auth/mobile/start', reqUrl.origin);
    href.searchParams.set('provider', provider);
    href.searchParams.set('redirect', redirect.toString());
    const label = provider === 'google' ? 'Google' : 'Kakao';
    return `<a class="button" href="${escapeHtml(href.toString())}">${label}로 계속하기</a>`;
  }).join('');

  return new NextResponse(
    `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>SMAP English 모바일 로그인</title>
    <style>
      body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #fff7e8; color: #1f2933; font-family: ui-sans-serif, system-ui, sans-serif; }
      main { width: min(420px, calc(100vw - 32px)); border: 1px solid #e8d9bd; border-radius: 28px; background: #fff; padding: 28px; box-shadow: 0 18px 60px rgba(31, 41, 51, 0.12); }
      h1 { margin: 0 0 10px; font-size: 28px; line-height: 1.08; }
      p { color: #6b7280; line-height: 1.55; }
      .actions { display: grid; gap: 12px; margin-top: 22px; }
      .button { display: block; border-radius: 16px; background: #1d5b53; color: #fff; padding: 14px 16px; text-align: center; font-weight: 800; text-decoration: none; }
    </style>
  </head>
  <body>
    <main>
      <h1>모바일 앱으로 로그인</h1>
      <p>보호자 계정으로 로그인하면 앱이 자동으로 열리고 안전한 모바일 세션이 저장됩니다.</p>
      <div class="actions">${links}</div>
    </main>
  </body>
</html>`,
    {
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store',
      },
    },
  );
}

async function insertMobileToken(
  userId: string,
  kind: 'exchange_code' | 'access_token',
  ttlMs: number,
  codeChallenge: string | null = null,
): Promise<{ raw: string; expiresAt: Date }> {
  const raw = createRawToken();
  const expiresAt = new Date(Date.now() + ttlMs);
  await db.insert(mobileAuthTokens).values({
    userId,
    kind,
    tokenHash: sha256(raw),
    codeChallenge,
    expiresAt,
  });
  return { raw, expiresAt };
}

async function handleMobileStart(req: Request): Promise<Response> {
  const reqUrl = new URL(req.url);
  const redirect = parseMobileRedirect(reqUrl.searchParams.get('redirect'));
  if (!redirect) return jsonError('invalid_mobile_redirect', 400);

  const rawProvider = reqUrl.searchParams.get('provider');
  const provider = parseMobileProvider(rawProvider);
  if (rawProvider && !provider) return jsonError('invalid_provider', 400);

  // PKCE: 앱이 보낸 code_challenge를 exchange_code 레코드에 바인딩한다.
  // 형식 오류 시 400으로 거부, 미전송 시 null(legacy 호환).
  const challengeMethod = reqUrl.searchParams.get('code_challenge_method');
  if (challengeMethod && challengeMethod !== 'S256') {
    return jsonError('unsupported_challenge_method', 400);
  }
  const codeChallenge = parsePkceChallenge(
    reqUrl.searchParams.get('code_challenge'),
  );
  if (codeChallenge === undefined) {
    return jsonError('invalid_code_challenge', 400);
  }

  const session = await baseAuth();
  if (!session?.user?.id) {
    if (!provider) return renderMobileProviderPicker(reqUrl, redirect);

    const callbackUrl = new URL('/api/auth/mobile/start', reqUrl.origin);
    callbackUrl.searchParams.set('redirect', redirect.toString());
    if (codeChallenge) {
      callbackUrl.searchParams.set('code_challenge', codeChallenge);
      callbackUrl.searchParams.set('code_challenge_method', 'S256');
    }

    const authRedirect = await baseSignIn(provider, {
      redirect: false,
      redirectTo: callbackUrl.toString(),
    });
    return NextResponse.redirect(authRedirect);
  }

  const code = await insertMobileToken(
    session.user.id,
    'exchange_code',
    MOBILE_EXCHANGE_CODE_TTL_MS,
    codeChallenge,
  );
  redirect.searchParams.set('code', code.raw);
  redirect.searchParams.set('expiresAt', String(toUnixSeconds(code.expiresAt)));
  return NextResponse.redirect(redirect);
}

async function parseJsonBody(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

async function findUserByEmailPassword(input: {
  email: string;
  password: string;
}): Promise<{ id: string } | null> {
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      passwordHash: users.passwordHash,
    })
    .from(users)
    .where(eq(users.email, normalizeEmail(input.email)))
    .limit(10);

  const credentialUser = rows.find((row) => row.email && row.passwordHash);
  if (!credentialUser?.passwordHash) return null;

  const valid = await verifyPassword(input.password, credentialUser.passwordHash);
  return valid ? { id: credentialUser.id } : null;
}

async function handleMobilePassword(req: Request): Promise<Response> {
  const body = await parseJsonBody(req);
  const parsed = LoginSchema.safeParse(body);
  if (!parsed.success) {
    return appendNoStore(
      NextResponse.json(
        {
          error: 'invalid_credentials_payload',
          message: '이메일과 비밀번호를 확인해 주세요.',
          fields: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      ),
    );
  }

  const user = await findUserByEmailPassword(parsed.data);
  if (!user) {
    return appendNoStore(
      NextResponse.json(
        {
          error: 'invalid_credentials',
          message: '이메일 또는 비밀번호가 올바르지 않습니다.',
        },
        { status: 401 },
      ),
    );
  }

  const token = await insertMobileToken(
    user.id,
    'access_token',
    MOBILE_ACCESS_TOKEN_TTL_MS,
  );

  const now = new Date();
  return appendNoStore(
    NextResponse.json({
      accessToken: token.raw,
      expiresAtUnix: toUnixSeconds(token.expiresAt),
      issuedAtUnix: toUnixSeconds(now),
    }),
  );
}

async function handleMobileExchange(req: Request): Promise<Response> {
  const body = await parseJsonBody(req);
  const code =
    typeof body === 'object' && body !== null && 'code' in body
      ? String(body.code)
      : '';
  if (code.length < 20 || code.length > 256) {
    return jsonError('invalid_code', 400);
  }

  // PKCE code_verifier (RFC 7636 §4.1): 43~128자, [A-Za-z0-9_-.~]
  // 미전송 시 ''로 처리. start 시점에 challenge가 저장되어 있으면 verifier 필수.
  const verifier =
    typeof body === 'object' && body !== null && 'code_verifier' in body
      ? String((body as { code_verifier: unknown }).code_verifier)
      : '';

  const now = new Date();
  const codeHash = sha256(code);

  const result = await db.transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(mobileAuthTokens)
      .where(
        and(
          eq(mobileAuthTokens.tokenHash, codeHash),
          eq(mobileAuthTokens.kind, 'exchange_code'),
        ),
      )
      .limit(1)
      .for('update');

    if (
      !row ||
      row.expiresAt <= now ||
      row.consumedAt !== null ||
      row.revokedAt !== null
    ) {
      return { kind: 'invalid' as const };
    }

    // PKCE 검증 — challenge가 저장되어 있으면 verifier 필수.
    if (row.codeChallenge) {
      if (!verifier) {
        return { kind: 'pkce_required' as const };
      }
      if (!pkceVerifierMatchesChallenge(verifier, row.codeChallenge)) {
        // 잘못된 verifier로 시도된 코드는 즉시 소비 처리해 재시도 차단(브루트포스 방어).
        await tx
          .update(mobileAuthTokens)
          .set({ consumedAt: now, revokedAt: now })
          .where(eq(mobileAuthTokens.id, row.id));
        return { kind: 'pkce_mismatch' as const };
      }
    }

    await tx
      .update(mobileAuthTokens)
      .set({ consumedAt: now })
      .where(eq(mobileAuthTokens.id, row.id));

    const raw = createRawToken();
    const expiresAt = new Date(Date.now() + MOBILE_ACCESS_TOKEN_TTL_MS);
    await tx.insert(mobileAuthTokens).values({
      userId: row.userId,
      kind: 'access_token',
      tokenHash: sha256(raw),
      expiresAt,
    });

    return { kind: 'ok' as const, raw, expiresAt };
  });

  if (result.kind === 'pkce_required') {
    return jsonError('pkce_verifier_required', 400);
  }
  if (result.kind === 'pkce_mismatch' || result.kind === 'invalid') {
    return jsonError('invalid_code', 401);
  }

  return appendNoStore(
    NextResponse.json({
      accessToken: result.raw,
      expiresAtUnix: toUnixSeconds(result.expiresAt),
      issuedAtUnix: toUnixSeconds(now),
    }),
  );
}

function isMobileAuthPath(req: Request, pathname: string): boolean {
  return new URL(req.url).pathname === `/api/auth/mobile/${pathname}`;
}

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
    async signIn({ user }) {
      if (user?.id && isAdminEmail(user.email)) {
        await db
          .update(users)
          .set({ role: 'admin' })
          .where(eq(users.id, user.id));
      }
    },
  },
  ...authConfig,
});

const {
  handlers: baseHandlers,
  auth: baseAuth,
  signIn: baseSignIn,
  signOut,
} = nextAuth;

export const handlers = {
  async GET(req: NextRequest) {
    if (isMobileAuthPath(req, 'start')) return handleMobileStart(req);
    return baseHandlers.GET(req);
  },
  async POST(req: NextRequest) {
    if (isMobileAuthPath(req, 'password')) return handleMobilePassword(req);
    if (isMobileAuthPath(req, 'exchange')) return handleMobileExchange(req);
    return baseHandlers.POST(req);
  },
};

export const auth = baseAuth;
export const signIn = baseSignIn;
export { signOut };
