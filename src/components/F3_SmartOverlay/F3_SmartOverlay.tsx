import { useGuideStore } from '@/store/useGuideStore';

export default function F3_SmartOverlay() {
  const { overlayCoords } = useGuideStore();

  return (
    <div className="pointer-events-none absolute inset-0">
      {overlayCoords ? (
        <>
          <div
            className="absolute rounded-lg border-4 border-amber-400 bg-amber-100/20 shadow-[0_0_0_9999px_rgba(15,23,42,0.35)]"
            style={{
              left: `${overlayCoords.x}px`,
              top: `${overlayCoords.y}px`,
              width: `${overlayCoords.width}px`,
              height: `${overlayCoords.height}px`
            }}
          />
          <svg className="absolute inset-0 h-full w-full">
            <text x={overlayCoords.x} y={Math.max(24, overlayCoords.y - 8)} fill="#f59e0b" fontSize="16" fontWeight="700">
              안내 대상
            </text>
          </svg>
        </>
      ) : (
        <div className="absolute right-4 top-4 rounded-md bg-slate-900/70 px-3 py-2 text-xs text-white">
          F-3 SmartOverlay 대기 중
        </div>
      )}
    </div>
  );
}
