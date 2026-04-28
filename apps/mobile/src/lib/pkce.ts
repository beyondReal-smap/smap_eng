import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const PKCE_VERIFIER_KEY = 'smap_eng.mobile_pkce_verifier.v1';
const VERIFIER_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';

function base64Url(value: string): string {
  return value.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function buildVerifier(): string {
  const bytes = Crypto.getRandomBytes(64);
  let out = '';
  for (const byte of bytes) {
    out += VERIFIER_ALPHABET[byte % VERIFIER_ALPHABET.length];
  }
  return out;
}

async function setStorageValue(key: string, value: string | null): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') return;
    if (value === null) {
      window.sessionStorage.removeItem(key);
      return;
    }
    window.sessionStorage.setItem(key, value);
    return;
  }

  if (value === null) {
    await SecureStore.deleteItemAsync(key);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function getStorageValue(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') return null;
    return window.sessionStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

export async function createPkceChallenge(): Promise<{
  verifier: string;
  challenge: string;
}> {
  const verifier = buildVerifier();
  const digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    verifier,
    { encoding: Crypto.CryptoEncoding.BASE64 },
  );
  return {
    verifier,
    challenge: base64Url(digest),
  };
}

export async function savePendingPkceVerifier(verifier: string): Promise<void> {
  await setStorageValue(PKCE_VERIFIER_KEY, verifier);
}

export async function takePendingPkceVerifier(): Promise<string | null> {
  const verifier = await getStorageValue(PKCE_VERIFIER_KEY);
  await setStorageValue(PKCE_VERIFIER_KEY, null);
  return verifier;
}
