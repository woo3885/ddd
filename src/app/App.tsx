import { useEffect } from 'react';
import F1_Dashboard from '@/features/F1_Dashboard/ui/F1_Dashboard';
import F2_StreamViewer from '@/features/F2_StreamViewer/ui/F2_StreamViewer';
import F3_SmartOverlay from '@/features/F3_SmartOverlay/ui/F3_SmartOverlay';
import F4_VoiceController from '@/features/F4_VoiceController/ui/F4_VoiceController';
import F5_MainController from '@/features/F5_MainController/ui/F5_MainController';
import { useGuideStore } from '@/store/useGuideStore';

export default function App() {
  const { status, guideMessage, setOverlayCoords } = useGuideStore();

  useEffect(() => {
    if (status === 'GUIDING') {
      setOverlayCoords({ x: 120, y: 90, width: 260, height: 120 });
      return;
    }

    setOverlayCoords(null);
  }, [status, setOverlayCoords]);

  return (
    <div className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-6 rounded-2xl border border-sky-100 bg-white/85 p-5 shadow-sm backdrop-blur">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">디지털 소외계층 웹 탐색 지원 서비스</h1>
        <p className="mt-2 text-sm text-slate-600">공통 Zustand 상태를 기반으로 F-1 ~ F-5 기능 모듈이 동작합니다.</p>
        <div className="mt-3 rounded-lg bg-slate-900 px-3 py-2 text-sm text-white">
          현재 안내 멘트: {guideMessage}
        </div>
      </header>

      <main className="grid gap-5 lg:grid-cols-12">
        <div className="space-y-5 lg:col-span-4">
          <F1_Dashboard />
          <F4_VoiceController />
          <F5_MainController />
        </div>

        <div className="space-y-5 lg:col-span-8">
          <div className="relative">
            <F2_StreamViewer />
            <F3_SmartOverlay />
          </div>
        </div>
      </main>
    </div>
  );
}
