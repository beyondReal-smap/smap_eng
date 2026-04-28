"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * 세션 상태 — localStorage 영구 저장 (클라이언트 mock).
 *
 * ⚠️ 운영 전 필수 교체:
 *   현재는 UI 연결 검증용 mock입니다. httpOnly 쿠키로 교체 전까지 실제 인증에
 *   의존하면 안 됩니다. 실제 구현 시:
 *     1) 세션: Server Action에서 `cookies().set("session", jwt, { httpOnly: true, secure: true })`
 *     2) 서버 컴포넌트에서 `cookies().get("session")` → `verifySession()` → 사용자 조회
 *     3) 클라이언트는 `/api/me` 로 사용자 정보 조회 후 캐싱
 *   이 store는 UX 프로토타입 전용으로만 사용.
 *
 * 결제/잔액 관련 필드(과거 subscription/subscribedAt)는 별(⭐) 크레딧 모델로
 * 전환되며 제거됨. 별 잔액은 클라이언트 상태가 아니라 서버 권원
 * (`/api/billing/credits`)에서 조회한다.
 */

export type SessionUser = {
  email: string;
  /** 회원가입 시 입력한 아이 이름(또는 별명). 프로필 자동 생성 시 사용 예정. */
  childName?: string;
  /** OAuth / email 로그인 구분 */
  provider: "email" | "google" | "kakao";
};

interface SessionState {
  user: SessionUser | null;
  setUser: (user: SessionUser) => void;
  signOut: () => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
      signOut: () => set({ user: null }),
    }),
    { name: "smap-eng.session" },
  ),
);

/** 편의 셀렉터 — 로그인 여부. */
export const useIsSignedIn = () =>
  useSessionStore((s) => s.user !== null);
