import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { z } from 'zod';

const SESSION_KEY = 'smap_eng.mobile_session.v1';

export const MobileSessionSchema = z.object({
  accessToken: z.string().min(20),
  expiresAtUnix: z.number().int().positive(),
  issuedAtUnix: z.number().int().positive(),
});

export type MobileSession = z.infer<typeof MobileSessionSchema>;

function nowUnix(): number {
  return Math.floor(Date.now() / 1000);
}

function getWebSessionStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  return window.sessionStorage;
}

export function isSessionExpired(session: MobileSession): boolean {
  return session.expiresAtUnix <= nowUnix() + 30;
}

export async function getStoredMobileSession(): Promise<MobileSession | null> {
  if (Platform.OS === 'web') {
    const raw = getWebSessionStorage()?.getItem(SESSION_KEY);
    if (!raw) return null;

    let payload: unknown;
    try {
      payload = JSON.parse(raw);
    } catch (err) {
      console.warn('[mobile-session] clearing invalid web session payload', err);
      await clearStoredMobileSession();
      return null;
    }

    const parsed = MobileSessionSchema.safeParse(payload);
    if (!parsed.success || isSessionExpired(parsed.data)) {
      await clearStoredMobileSession();
      return null;
    }
    return parsed.data;
  }

  const raw = await SecureStore.getItemAsync(SESSION_KEY);
  if (!raw) return null;

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch (err) {
    console.warn('[mobile-session] clearing invalid stored session payload', err);
    await clearStoredMobileSession();
    return null;
  }

  const parsed = MobileSessionSchema.safeParse(payload);
  if (!parsed.success || isSessionExpired(parsed.data)) {
    await clearStoredMobileSession();
    return null;
  }
  return parsed.data;
}

export async function getMobileAccessToken(): Promise<string | null> {
  const session = await getStoredMobileSession();
  return session?.accessToken ?? null;
}

export async function saveMobileSession(session: MobileSession): Promise<void> {
  if (Platform.OS === 'web') {
    if (isSessionExpired(session)) {
      throw new Error('Cannot save expired mobile session');
    }
    getWebSessionStorage()?.setItem(SESSION_KEY, JSON.stringify(session));
    return;
  }

  if (isSessionExpired(session)) {
    throw new Error('Cannot save expired mobile session');
  }
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
}

export async function clearStoredMobileSession(): Promise<void> {
  if (Platform.OS === 'web') {
    getWebSessionStorage()?.removeItem(SESSION_KEY);
    return;
  }

  await SecureStore.deleteItemAsync(SESSION_KEY);
}

export function createSessionFromCallback(
  token: string,
  expiresAtUnix: number,
): MobileSession {
  return MobileSessionSchema.parse({
    accessToken: token,
    expiresAtUnix,
    issuedAtUnix: nowUnix(),
  });
}
