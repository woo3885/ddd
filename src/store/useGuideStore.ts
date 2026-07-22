import { create } from 'zustand';
import type { OverlayCoords, SystemStatus } from '@/types/guide';

interface GuideState {
  targetUrl: string;
  status: SystemStatus;
  overlayCoords: OverlayCoords | null;
  guideMessage: string;
  recentUrls: string[];
  setTargetUrl: (url: string) => void;
  setStatus: (status: SystemStatus) => void;
  setOverlayCoords: (coords: OverlayCoords | null) => void;
  setGuideMessage: (message: string) => void;
  addRecentUrl: (url: string) => void;
  setGuideData: (payload: {
    status?: SystemStatus;
    coords?: OverlayCoords | null;
    message?: string;
  }) => void;
  resetGuideState: () => void;
}

export const initialGuideState = {
  targetUrl: '',
  status: 'IDLE' as SystemStatus,
  overlayCoords: null,
  guideMessage: '안내를 시작하려면 URL을 입력하세요.',
  recentUrls: []
};

export const useGuideStore = create<GuideState>((set) => ({
  ...initialGuideState,
  setTargetUrl: (url) => set({ targetUrl: url }),
  setStatus: (status) => set({ status }),
  setOverlayCoords: (coords) => set({ overlayCoords: coords }),
  setGuideMessage: (message) => set({ guideMessage: message }),
  addRecentUrl: (url) =>
    set((state) => {
      const normalized = url.trim();

      if (!normalized) {
        return state;
      }

      const deduped = state.recentUrls.filter((item) => item !== normalized);
      return {
        recentUrls: [normalized, ...deduped].slice(0, 5)
      };
    }),
  setGuideData: ({ status, coords, message }) =>
    set((state) => ({
      status: status ?? state.status,
      overlayCoords: coords ?? state.overlayCoords,
      guideMessage: message ?? state.guideMessage
    })),
  resetGuideState: () => set({ ...initialGuideState })
}));
