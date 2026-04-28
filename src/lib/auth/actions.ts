"use server";

import { randomBytes, randomUUID, scrypt as nodeScrypt, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { profiles, sessions, users } from "@/lib/db/schema";
import {
  LoginSchema,
  SignupSchema,
  type LoginFormState,
  type SignupFormState,
} from "./schemas";

const PASSWORD_KEY_LENGTH = 64;
const AUTH_SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
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
  const salt = randomBytes(16).toString("base64url");
  const key = await scryptAsync(
    password,
    salt,
    PASSWORD_KEY_LENGTH,
    passwordOptions(16384, 8, 1),
  );
  return ["scrypt", "16384", "8", "1", salt, key.toString("base64url")].join("$");
}

async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [algorithm, nRaw, rRaw, pRaw, salt, hash] = storedHash.split("$");
  if (algorithm !== "scrypt" || !salt || !hash) return false;

  const n = Number(nRaw);
  const r = Number(rRaw);
  const p = Number(pRaw);
  if (!Number.isInteger(n) || !Number.isInteger(r) || !Number.isInteger(p)) {
    return false;
  }

  const expected = Buffer.from(hash, "base64url");
  if (expected.length !== PASSWORD_KEY_LENGTH) return false;

  const actual = await scryptAsync(
    password,
    salt,
    PASSWORD_KEY_LENGTH,
    passwordOptions(n, r, p),
  );
  return timingSafeEqual(actual, expected);
}

function inferSecureCookie(headerList: Headers): boolean {
  const forwardedProto = headerList.get("x-forwarded-proto")?.split(",")[0]?.trim();
  if (forwardedProto === "https") return true;
  if (forwardedProto === "http") return false;

  const authUrl = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL;
  if (authUrl?.startsWith("https://")) return true;
  if (authUrl?.startsWith("http://")) return false;

  return process.env.NODE_ENV === "production";
}

async function createDatabaseSession(userId: string): Promise<void> {
  const headerList = await headers();
  const secure = inferSecureCookie(headerList);
  const sessionToken = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + AUTH_SESSION_MAX_AGE_SECONDS * 1000);

  await db.insert(sessions).values({
    sessionToken,
    userId,
    expires,
  });

  const cookieStore = await cookies();
  cookieStore.set(`${secure ? "__Secure-" : ""}authjs.session-token`, sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    expires,
  });
}

async function findCredentialUser(email: string) {
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      passwordHash: users.passwordHash,
    })
    .from(users)
    .where(eq(users.email, normalizeEmail(email)))
    .limit(10);
  return rows.find((row) => row.passwordHash && row.email) ?? null;
}

/**
 * 로그인 Server Action.
 */
export async function loginAction(
  _prevState: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const parsed = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const email = normalizeEmail(parsed.data.email);
  const credentialUser = await findCredentialUser(email);
  if (
    !credentialUser?.passwordHash ||
    !(await verifyPassword(parsed.data.password, credentialUser.passwordHash))
  ) {
    return {
      ok: false,
      message: "이메일 또는 비밀번호가 올바르지 않습니다.",
    };
  }

  await createDatabaseSession(credentialUser.id);
  return { ok: true, email };
}

/**
 * 회원가입 Server Action.
 */
export async function signupAction(
  _prevState: SignupFormState,
  formData: FormData,
): Promise<SignupFormState> {
  const parsed = SignupSchema.safeParse({
    childName: formData.get("childName"),
    email: formData.get("email"),
    password: formData.get("password"),
    agreeAge: formData.get("agreeAge"),
    agreeTerms: formData.get("agreeTerms"),
    agreePrivacy: formData.get("agreePrivacy"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const email = normalizeEmail(parsed.data.email);
  const passwordHash = await hashPassword(parsed.data.password);
  let userId = "";

  try {
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
        throw new Error("duplicate_email");
      }

      const linkedUser = existingUsers[0];
      userId = linkedUser?.id ?? randomUUID();
      const displayName = linkedUser?.name ?? `${parsed.data.childName} 보호자`;

      if (linkedUser) {
        await tx
          .update(users)
          .set({
            name: displayName,
            passwordHash,
          })
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
          avatar: "⭐",
        });
      }
    });
  } catch (err) {
    if (err instanceof Error && err.message === "duplicate_email") {
      return {
        ok: false,
        errors: {
          email: ["이미 가입된 이메일입니다."],
        },
      };
    }
    throw err;
  }

  if (!userId) throw new Error("회원가입 세션 생성에 실패했습니다.");
  await createDatabaseSession(userId);

  return {
    ok: true,
    email,
    childName: parsed.data.childName,
  };
}

/**
 * OAuth 시작 Server Action (구글/카카오).
 *
 * TODO(oauth): provider별 authorization URL로 redirect.
 *   - Google: https://accounts.google.com/o/oauth2/v2/auth?...
 *   - Kakao:  https://kauth.kakao.com/oauth/authorize?...
 *   각각 `state` 쿠키 발급 + callback 라우트(`/api/auth/callback/[provider]`)에서 토큰 교환.
 */
export async function startOAuth(provider: "google" | "kakao"): Promise<void> {
  // 현재는 stub — 클라이언트에서 toast로 안내.
  console.log("[oauth-stub] start", provider);
}
