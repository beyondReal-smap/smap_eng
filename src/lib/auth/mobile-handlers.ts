import { randomUUID, timingSafeEqual } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { mobileAuthTokens, profiles, users } from '@/lib/db/schema';
import { grantSignupBonus } from '@/lib/billing/credits';
import { LoginSchema, SignupSchema } from '@/lib/auth/schemas';
import {
  AppleJwksError,
  verifyAppleIdentityToken,
} from '@/lib/auth/apple-jwks';
import { baseAuth, baseSignIn } from './next-auth-instance';
import { hashPassword, verifyPassword } from './password';
import {
  appendNoStore,
  createRawToken,
  getPublicOrigin,
  jsonError,
  MOBILE_ACCESS_TOKEN_TTL_MS,
  MOBILE_EXCHANGE_CODE_TTL_MS,
  normalizeEmail,
  parseMobileProvider,
  parseMobileRedirect,
  parsePkceChallenge,
  pkceVerifierMatchesChallenge,
  renderMobileProviderPicker,
  sha256,
  toUnixSeconds,
} from './mobile-shared';

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

export async function handleMobileStart(req: Request): Promise<Response> {
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

/**
 * 개발/QA 전용 — 이메일로 모바일 access_token을 발급한다.
 *
 * iOS `--mock-auth` 런치 아규먼트로 진입한 시뮬레이터/UITest가 OAuth WebView를 우회하여
 * 실제 사용자 계정으로 인증된 것과 동일한 세션을 얻기 위한 진입점.
 *
 * 가드 3중 — 셋 모두 충족해야 토큰 발급. 하나라도 어긋나면 404로 응답해
 * 엔드포인트의 존재 자체를 운영 클라이언트에 노출하지 않는다.
 *   1. `ALLOW_DEV_AUTH=1` env (운영 기본값 미설정)
 *   2. `DEV_AUTH_EMAILS` 콤마 화이트리스트에 요청 이메일 포함
 *   3. `X-Dev-Auth-Secret` 헤더 == `DEV_AUTH_SECRET` env (timing-safe 비교)
 */
export async function handleMobileDevIssue(req: Request): Promise<Response> {
  if (process.env.ALLOW_DEV_AUTH !== '1') {
    return jsonError('not_found', 404);
  }

  const expectedSecret = process.env.DEV_AUTH_SECRET ?? '';
  const providedSecret = req.headers.get('x-dev-auth-secret') ?? '';
  if (expectedSecret.length === 0) return jsonError('not_found', 404);

  const expectedBuf = Buffer.from(expectedSecret);
  const providedBuf = Buffer.from(providedSecret);
  // timingSafeEqual은 길이 다르면 예외 — 사전 비교로 가드.
  if (expectedBuf.length !== providedBuf.length) {
    return jsonError('not_found', 404);
  }
  if (!timingSafeEqual(expectedBuf, providedBuf)) {
    return jsonError('not_found', 404);
  }

  const allowList = (process.env.DEV_AUTH_EMAILS ?? '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry.length > 0);

  const body = await parseJsonBody(req);
  const rawEmail = body && typeof body === 'object' && 'email' in body
    ? String((body as { email: unknown }).email ?? '')
    : '';
  const email = normalizeEmail(rawEmail);
  if (!email) return jsonError('invalid_email', 400);
  if (!allowList.includes(email)) return jsonError('not_found', 404);

  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (!user) return jsonError('user_not_found', 404);

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

export async function handleMobilePassword(req: Request): Promise<Response> {
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
export async function handleMobileSignup(req: Request): Promise<Response> {
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
  let isNewUser = false;

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
    isNewUser = !linkedUser;
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

  // 신규 가입자에게만 웰컴 보너스. 멱등이라 안전하지만 기존 계정 연결에는 불필요.
  if (isNewUser) {
    try {
      await grantSignupBonus(userId);
    } catch (err) {
      console.error('[signup-bonus] mobile signup grant failed', userId, err);
    }
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

export async function handleMobileExchange(req: Request): Promise<Response> {
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
export async function handleMobileApple(req: Request): Promise<Response> {
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
  let isNewUser = false;

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
    isNewUser = true;
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

  // 신규 Apple 가입자에게만 웰컴 보너스. 기존 이메일 계정 자동 연결 시에는 미지급.
  if (isNewUser) {
    try {
      await grantSignupBonus(userId);
    } catch (err) {
      console.error('[signup-bonus] apple signup grant failed', userId, err);
    }
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
