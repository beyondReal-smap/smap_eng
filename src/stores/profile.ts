'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ProfileState {
  currentProfileId: number | null;
  /** 현재 프로필의 연령(5~10). 책 생성 시 CreateBookDialog가 자동으로 사용. */
  currentProfileAge: number | null;
  /**
   * zustand persist의 localStorage 비동기 hydration 완료 여부.
   * 첫 렌더에서는 항상 false → 컴포넌트는 이 동안 스켈레톤만 노출해야 한다.
   * 이전엔 mount 직후 currentProfileId=null이라 "누가 볼 거예요?" EmptyState가
   * 짧게 노출됐다가 hydration된 값으로 바뀌며 콘텐츠 점프를 일으켰다
   * (2026-04-27 피드백 — "박스 안에 컨텐츠가 없다가 생기면서 화면이 움직임").
   */
  hasHydrated: boolean;
  setCurrentProfile: (id: number | null, age?: number | null) => void;
  setHasHydrated: (v: boolean) => void;
}

/**
 * 현재 선택된 가족 프로필 — localStorage 영구 저장.
 * id와 함께 age를 저장해 새 동화 생성 시 연령을 중복 입력받지 않게 한다.
 */
export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      currentProfileId: null,
      currentProfileAge: null,
      hasHydrated: false,
      setCurrentProfile: (id, age = null) =>
        set({ currentProfileId: id, currentProfileAge: age }),
      setHasHydrated: (v) => set({ hasHydrated: v }),
    }),
    {
      name: 'smap-eng.current-profile',
      // localStorage 읽기 완료 후 호출. SSR/첫 CSR mount 시점에는 false이므로
      // 컴포넌트가 hasHydrated 분기로 스켈레톤을 띄우면 hydration mismatch도 없다.
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
