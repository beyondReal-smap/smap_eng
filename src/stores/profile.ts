'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ProfileState {
  currentProfileId: number | null;
  setCurrentProfile: (id: number | null) => void;
}

/**
 * 현재 선택된 가족 프로필 — localStorage 영구 저장.
 * 앱 재접속 시에도 마지막 프로필 유지.
 */
export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      currentProfileId: null,
      setCurrentProfile: (id) => set({ currentProfileId: id }),
    }),
    { name: 'smap-eng.current-profile' },
  ),
);
