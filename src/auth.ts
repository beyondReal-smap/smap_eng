import NextAuth from 'next-auth';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { and, eq } from 'drizzle-orm';
import {
  createHash,
  randomBytes,
  randomUUID,
  scrypt as nodeScrypt,
  timingSafeEqual,
} from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  accounts,
  mobileAuthTokens,
  profiles,
  sessions,
  users,
  verificationTokens,
} from '@/lib/db/schema';
import { isAdminEmail } from '@/lib/auth/admin-emails';
import { LoginSchema, SignupSchema } from '@/lib/auth/schemas';
import {
  AppleJwksError,
  verifyAppleIdentityToken,
} from '@/lib/auth/apple-jwks';
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

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('base64url');
  const key = await scryptAsync(
    password,
    salt,
    PASSWORD_KEY_LENGTH,
    passwordOptions(16384, 8, 1),
  );
  return ['scrypt', '16384', '8', '1', salt, key.toString('base64url')].join('$');
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

/**
 * 운영 환경에서는 nginx → 랜딩 프록시(:5027) → Next.js 메인 앱(:5029)을 경유한다.
 * Next.js는 `req.url`을 내부 origin(`http://localhost:5029`)으로 보기 때문에,
 * 외부 사용자에게 노출할 URL은 `x-forwarded-host` + `x-forwarded-proto`로 복원해야 한다.
 * 누락 시 reqUrl의 host/proto로 폴백.
 */
function getPublicOrigin(req: Request, reqUrl: URL): string {
  const forwardedHost = req.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  const forwardedProto = req.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
  const host = forwardedHost && forwardedHost.length > 0 ? forwardedHost : reqUrl.host;
  const proto = forwardedProto && forwardedProto.length > 0
    ? forwardedProto
    : reqUrl.protocol.replace(':', '');
  return `${proto}://${host}`;
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

    // 외부 도메인(예: https://eng.smap.site)으로 복원. 내부 origin(localhost:5029)이면
    // OAuth callback 후 사용자가 도달 못 한다.
    const publicOrigin = getPublicOrigin(req, reqUrl);
    const callbackUrl = new URL('/api/auth/mobile/start', publicOrigin);
    callbackUrl.searchParams.set('redirect', redirect.toString());
    if (codeChallenge) {
      callbackUrl.searchParams.set('code_challenge', codeChallenge);
      callbackUrl.searchParams.set('code_challenge_method', 'S256');
    }

    const authRedirect = await baseSignIn(provider, {
      redirect: false,
      redirectTo: callbackUrl.toString(),
    });

    // Auth.js v5의 `redirectTo`가 OAuth callback 후 `callback-url` 쿠키와 동기화되지
    // 않아 root로 fallback 되는 사례가 있어 명시적으로 mobile/start URL을 set.
    // HTTPS는 forwarded proto 기준 — 운영은 nginx가 https로 받아 내부에 http로 프록시.
    const response = NextResponse.redirect(authRedirect);
    const isHttps = publicOrigin.startsWith('https://');
    response.cookies.set({
      name: isHttps ? '__Secure-authjs.callback-url' : 'authjs.callback-url',
      value: callbackUrl.toString(),
      httpOnly: true,
      secure: isHttps,
      sameSite: 'lax',
      path: '/',
    });
    return response;
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

/**
 * 모바일 회원가입 — 웹 `signupAction`의 트랜잭션 로직을 REST로 노출.
 *
 * 입력: `SignupSchema` JSON ({ childName, email, password, agreeAge, agreeTerms, agreePrivacy }).
 * 동의 필드는 모바일에서 boolean true로 전송 (SignupSchema가 boolean true도 허용).
 *
 * 성공: access_token 직접 발급 (exchange 절차 생략). 응답 형태는
 * `handleMobilePassword`와 동일하여 iOS `MobileExchangeResponse`로 디코딩 가능.
 * 가입 직후 별도 로그인 단계가 없도록 가입+로그인을 한 번에 처리한다.
 *
 * 충돌: 이미 동일 이메일로 비밀번호 가입된 경우 409 + duplicate_email.
 */
async function handleMobileSignup(req: Request): Promise<Response> {
  const body = await parseJsonBody(req);
  const parsed = SignupSchema.safeParse(body);
  if (!parsed.success) {
    return appendNoStore(
      NextResponse.json(
        {
          error: 'invalid_signup_payload',
          message: '입력값을 확인해 주세요.',
          fields: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      ),
    );
  }

  const email = normalizeEmail(parsed.data.email);
  const passwordHash = await hashPassword(parsed.data.password);
  let userId = '';
  let duplicateEmail = false;

  await db.transaction(async (tx) => {
    const existingUsers = await tx
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        passwordHash: users.passwordHash,
      })
      .from(users)
      .where(eq(users.email, email))
      .limit(10);

    if (existingUsers.some((row) => row.passwordHash)) {
      duplicateEmail = true;
      return;
    }

    const linkedUser = existingUsers[0];
    userId = linkedUser?.id ?? randomUUID();
    const displayName = linkedUser?.name ?? `${parsed.data.childName} 보호자`;

    if (linkedUser) {
      await tx
        .update(users)
        .set({ name: displayName, passwordHash })
        .where(eq(users.id, userId));
    } else {
      await tx.insert(users).values({
        id: userId,
        name: displayName,
        email,
        passwordHash,
      });
    }

    const existingProfiles = await tx
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1);

    if (existingProfiles.length === 0) {
      await tx.insert(profiles).values({
        userId,
        name: parsed.data.childName,
        age: 7,
        avatar: '⭐',
      });
    }
  });

  if (duplicateEmail) {
    return appendNoStore(
      NextResponse.json(
        {
          error: 'duplicate_email',
          message: '이미 가입된 이메일입니다.',
        },
        { status: 409 },
      ),
    );
  }

  if (!userId) {
    return jsonError('signup_failed', 500);
  }

  const token = await insertMobileToken(
    userId,
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

/**
 * Sign in with Apple — `ASAuthorizationAppleIDCredential.identityToken`을 받아
 * Apple JWKS로 서명 검증 후 user 매핑 + access_token 발급.
 *
 * App Store 4.8: 다른 소셜 로그인을 제공할 때 SiwA가 필수.
 *
 * 매핑 정책 (D9 채택):
 *   - 같은 이메일이 이미 가입(비밀번호 또는 OAuth)되어 있으면 **자동 연결**.
 *     Apple이 검증한 이메일이라는 가정. accounts 테이블에 provider=`apple` 행을 추가하지는
 *     않음 — 모바일 인증은 mobileAuthTokens만으로 충분.
 *   - 신규 user: `users` insert + 기본 ⭐ 프로필 자동 생성 (signupAction과 동일 정책).
 *   - email이 누락된 경우(Apple은 옵션): displayName만 채우고 진행.
 *
 * 요청 본문 (JSON):
 *   identityToken: string (필수, JWT)
 *   nonce: string (옵션, raw nonce. iOS가 보냈으면 SHA256 후 payload.nonce와 비교)
 *   fullName: { givenName?: string, familyName?: string } (옵션, 첫 가입 시에만)
 *   email: string (옵션, identityToken에 없으면 클라이언트가 보낸 값 사용)
 */
async function handleMobileApple(req: Request): Promise<Response> {
  const clientId = process.env.APPLE_SIGN_IN_CLIENT_ID;
  if (!clientId) {
    return jsonError('apple_not_configured', 500);
  }

  const body = (await parseJsonBody(req)) as {
    identityToken?: unknown;
    nonce?: unknown;
    fullName?: { givenName?: unknown; familyName?: unknown };
    email?: unknown;
  } | null;

  const identityToken =
    typeof body?.identityToken === 'string' ? body.identityToken : '';
  if (!identityToken) {
    return jsonError('missing_identity_token', 400);
  }
  const nonce = typeof body?.nonce === 'string' ? body.nonce : undefined;

  let claims;
  try {
    claims = await verifyAppleIdentityToken(identityToken, clientId, nonce);
  } catch (err) {
    if (err instanceof AppleJwksError) {
      console.warn('[apple-signin] verify failed', err.code);
      return jsonError(err.code, 401);
    }
    console.error('[apple-signin] unexpected', err);
    return jsonError('verify_failed', 500);
  }

  const appleSub = claims.sub;
  const tokenEmail =
    typeof claims.email === 'string' ? normalizeEmail(claims.email) : null;
  const fallbackEmail =
    typeof body?.email === 'string' ? normalizeEmail(body.email) : null;
  const email = tokenEmail ?? fallbackEmail;

  const givenName =
    typeof body?.fullName?.givenName === 'string'
      ? body.fullName.givenName.trim()
      : '';
  const familyName =
    typeof body?.fullName?.familyName === 'string'
      ? body.fullName.familyName.trim()
      : '';
  const fullName = `${familyName}${givenName}`.trim();

  let userId = '';

  await db.transaction(async (tx) => {
    // 1) email 일치하는 기존 user — 자동 연결.
    if (email) {
      const existing = await tx
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
      if (existing[0]) {
        userId = existing[0].id;
        return;
      }
    }

    // 2) 신규 user 생성 + 기본 프로필.
    userId = randomUUID();
    const displayName = fullName.length > 0 ? `${fullName} 보호자` : '하루책 보호자';
    await tx.insert(users).values({
      id: userId,
      name: displayName,
      email,
    });

    const childName = givenName.length > 0 ? givenName : '하루';
    await tx.insert(profiles).values({
      userId,
      name: childName,
      age: 7,
      avatar: '⭐',
    });

    // Apple sub은 별도 컬럼이 아직 없어 저장하지 않는다 — 다음 로그인은 같은 email로 자동 매칭.
    // private relay email(@privaterelay.appleid.com)도 일관 작동.
    void appleSub;
  });

  if (!userId) {
    return jsonError('signup_failed', 500);
  }

  const token = await insertMobileToken(
    userId,
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
    if (isMobileAuthPath(req, 'signup')) return handleMobileSignup(req);
    if (isMobileAuthPath(req, 'apple')) return handleMobileApple(req);
    if (isMobileAuthPath(req, 'exchange')) return handleMobileExchange(req);
    return baseHandlers.POST(req);
  },
};

export const auth = baseAuth;
export const signIn = baseSignIn;
export { signOut };
