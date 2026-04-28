'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * 보호자 모드 PIN 관리 — COPPA Level-1 "아이 실수 진입 방지" 수준.
 *
 * 주의: 이 PIN은 FTC가 정의한 "검증 가능한 보호자 동의(VPC)"가 아니다.
 *       오디오 서버 업로드 등 아동 개인정보가 수집되는 기능에는 이 훅만으로 부족하며,
 *       별도 VPC 방식(Level-2)을 확정해야 한다.
 *
 * 저장소: localStorage만. 서버 전송 없음. 해시 + salt로 단순 난독화.
 */

const STORAGE_KEY = 'parental-pin:hash';
const SALT = 'smap-eng:parental-pin:v1';
const UNLOCK_TTL_MS = 30 * 60 * 1000; // 30분 세션

/**
 * PIN을 문자열로 압축한다.
 *
 * Web Crypto(SHA-256)는 **Secure Context**(HTTPS 또는 localhost)에서만 동작한다.
 * HTTP로 퍼블릭 IP에 접속한 경우 `crypto.subtle`이 undefined여서 해시가 실패해
 * Dialog가 조용히 멈추는 문제가 있었다. 그래서 환경에 따라 2-tier로 동작:
 *
 *  1) secure context: SHA-256 (표준·권장)
 *  2) non-secure: 경량 XOR + base64 (UX 잠금 수준의 난독화)
 *
 * 두 결과는 접두사(`sha256:` / `xor:`)로 구분해 저장·검증 시 포맷 충돌을 막는다.
 * COPPA Level-1(아이 실수 진입 방지) 목적상 후자도 수용 가능.
 */
async function hashPin(pin: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      const data = new TextEncoder().encode(`${SALT}:${pin}`);
      const hash = await crypto.subtle.digest('SHA-256', data);
      const hex = Array.from(new Uint8Array(hash))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
      return `sha256:${hex}`;
    } catch {
      // 일부 브라우저가 예외를 던지는 경우(레거시 보안 정책 등) fallback으로 진행
    }
  }
  // Fallback: XOR + base64. 순수 JS, Secure Context 불필요.
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

function loadStoredHash(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function saveStoredHash(value: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (value === null) window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, value);
  } catch {
    /* ignore */
  }
}

export interface ParentalPinState {
  /** 저장소 읽기 완료 여부. false일 동안은 UI를 렌더하지 않아야 깜빡임이 없다. */
  ready: boolean;
  /** 저장된 PIN이 있는가. 없으면 최초 설정 UI를 보여야 한다. */
  hasPin: boolean;
  /** 이번 세션에서 PIN으로 잠금 해제되었는가(30분 TTL). */
  unlocked: boolean;
  setPin: (pin: string) => Promise<void>;
  verifyPin: (pin: string) => Promise<boolean>;
  lock: () => void;
  /** 저장된 PIN을 지운다. 잠금도 해제된다. */
  resetPin: () => void;
}

export function useParentalPin(): ParentalPinState {
  const [ready, setReady] = useState(false);
  const [hasPin, setHasPin] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    const stored = loadStoredHash();
    setHasPin(Boolean(stored));
    // 세션 메모리만 유지 — 새로고침 시 재입력 필요(현재 훅 수명은 페이지 단위).
    setReady(true);
  }, []);

  // 잠금 자동 해제 타이머 (TTL 만료).
  useEffect(() => {
    if (!unlocked) return;
    const t = window.setTimeout(() => setUnlocked(false), UNLOCK_TTL_MS);
    return () => window.clearTimeout(t);
  }, [unlocked]);

  const setPin = useCallback(async (pin: string) => {
    const h = await hashPin(pin);
    saveStoredHash(h);
    setHasPin(true);
    setUnlocked(true);
  }, []);

  const verifyPin = useCallback(async (pin: string) => {
    const stored = loadStoredHash();
    if (!stored) return false;
    const h = await hashPin(pin);
    const ok = h === stored;
    if (ok) setUnlocked(true);
    return ok;
  }, []);

  const lock = useCallback(() => setUnlocked(false), []);

  const resetPin = useCallback(() => {
    saveStoredHash(null);
    setHasPin(false);
    setUnlocked(false);
  }, []);

  return { ready, hasPin, unlocked, setPin, verifyPin, lock, resetPin };
}
