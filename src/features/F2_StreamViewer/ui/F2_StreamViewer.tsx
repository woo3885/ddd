import { useEffect, useRef } from 'react';
import { useGuideStore } from '@/store/useGuideStore';

export default function F2_StreamViewer() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { status, targetUrl } = useGuideStore();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('F-2 StreamViewer (Placeholder)', 24, 40);
    ctx.font = '14px sans-serif';
    ctx.fillStyle = '#334155';
    ctx.fillText(`status: ${status}`, 24, 70);
    ctx.fillText(`url: ${targetUrl || '미입력'}`, 24, 92);
  }, [status, targetUrl]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-xl font-bold text-slate-800">F-2 StreamViewer</h2>
      <p className="mt-1 text-sm text-slate-600">WebRTC/Canvas 스트림을 렌더링할 영역입니다.</p>

      <div className="relative mt-4 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
        <canvas ref={canvasRef} width={960} height={540} className="h-auto w-full" />
      </div>
    </section>
  );
}
