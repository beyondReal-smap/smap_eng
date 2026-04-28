import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

/**
 * 보호자 모드 PIN 관리(모바일) — 웹 `useParentalPin`의 RN 포트.
 *
 * 정책 일관:
 * - COPPA Level-1 ("아이 실수 진입 방지") 수준의 잠금. VPC 아님.
 * - 디바이스 단위 저장. 서버 동기화 없음. 웹/모바일 별도 잠금.
 * - 30분 세션 TTL — 30분 후 자동 잠금.
 *
 * 저장소:
 * - 네이티브(iOS/Android): expo-secure-store (Keychain/Keystore)
 * - 웹(Expo Web): localStorage (웹 훅과 키 분리하여 충돌 방지 — 본 모듈은 모바일 전용 키 사용)
 *
 * 해시:
 * - expo-crypto SHA-256 (네이티브에서 동작 보장).
 * - 포맷 접두사 `sha256:` — 향후 다른 포맷이 필요할 때 구분.
 */

const STORAGE_KEY = 'smap_eng.parental_pin.v1';
const SALT = 'smap-eng:parental-pin:v1';
const UNLOCK_TTL_MS = 30 * 60 * 1000;

async function hashPin(pin: string): Promise<string> {
  // expo-crypto는 web 빌드에서도 SubtleCrypto를 사용하므로 secure context가 필요할 수 있다.
  // 웹 빌드에서 secure context 보장이 깨지면 throw 되므로 try/catch로 감싸 경량 fallback.
  try {
    const hex = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      `${SALT}:${pin}`,
      { encoding: Crypto.CryptoEncoding.HEX },
    );
    return `sha256:${hex}`;
  } catch {
    // 웹 + non-secure context 한정 fallback. COPPA Level-1 목적상 수용 가능.
    const input = `${SALT}:${pin}`;
    let out = '';
    for (let i = 0; i < input.length; i++) {
      out += String.fromCharCode(
        input.charCodeAt(i) ^ SALT.charCodeAt(i % SALT.length),
      );
    }
    const b64 =
      typeof btoa === 'function'
        ? btoa(out)
        : Buffer.from(out, 'binary').toString('base64');
    return `xor:${b64}`;
  }
}

async function loadStoredHash(): Promise<string | null> {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') return null;
    try {
      return window.localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  }
  return await SecureStore.getItemAsync(STORAGE_KEY);
}

async function saveStoredHash(value: string | null): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') return;
    try {
      if (value === null) window.localStorage.removeItem(STORAGE_KEY);
      else window.localStorage.setItem(STORAGE_KEY, value);
    } catch {
      /* ignore */
    }
    return;
  }
  if (value === null) await SecureStore.deleteItemAsync(STORAGE_KEY);
  else await SecureStore.setItemAsync(STORAGE_KEY, value);
}

export interface ParentalPinState {
  /** 저장소 읽기 완료 여부. false 동안은 UI 렌더 보류. */
  ready: boolean;
  /** 저장된 PIN 존재 여부. 없으면 최초 설정 UI를 보여야 한다. */
  hasPin: boolean;
  /** 이번 세션 잠금 해제 상태 (30분 TTL). */
  unlocked: boolean;
  setPin: (pin: string) => Promise<void>;
  verifyPin: (pin: string) => Promise<boolean>;
  lock: () => void;
  /** 저장된 PIN 삭제. 잠금 해제 상태도 초기화. */
  resetPin: () => Promise<void>;
}

export function useParentalPin(): ParentalPinState {
  const [ready, setReady] = useState(false);
  const [hasPin, setHasPin] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;
    void (async () => {
      const stored = await loadStoredHash();
      if (cancelledRef.current) return;
      setHasPin(Boolean(stored));
      setReady(true);
    })();
    return () => {
      cancelledRef.current = true;
    };
  }, []);

  // 30분 TTL 자동 잠금
  useEffect(() => {
    if (!unlocked) return;
    const t = setTimeout(() => setUnlocked(false), UNLOCK_TTL_MS);
    return () => clearTimeout(t);
  }, [unlocked]);

  const setPin = useCallback(async (pin: string) => {
    const h = await hashPin(pin);
    await saveStoredHash(h);
    setHasPin(true);
    setUnlocked(true);
  }, []);

  const verifyPin = useCallback(async (pin: string) => {
    const stored = await loadStoredHash();
    if (!stored) return false;
    const h = await hashPin(pin);
    const ok = h === stored;
    if (ok) setUnlocked(true);
    return ok;
  }, []);

  const lock = useCallback(() => setUnlocked(false), []);

  const resetPin = useCallback(async () => {
    await saveStoredHash(null);
    setHasPin(false);
    setUnlocked(false);
  }, []);

  return { ready, hasPin, unlocked, setPin, verifyPin, lock, resetPin };
}
