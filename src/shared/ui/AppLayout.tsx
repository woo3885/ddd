import type { ReactNode } from 'react';
import type { ScreenType, WorkflowStatus } from '@/types/frontend-state';

export interface AppLayoutProps {
  workflowStatus: WorkflowStatus;
  screenType: ScreenType;
  message: string;
  isConnected: boolean;
  children: ReactNode;
  actions?: ReactNode;
  title?: string;
  isLoading?: boolean;
  tone?: 'default' | 'danger' | 'secure';
}

export default function AppLayout({
  workflowStatus,
  screenType,
  message,
  isConnected,
  children,
  actions,
  title = '금융길잡이 AI',
  isLoading = false,
  tone = 'default'
}: AppLayoutProps) {
  const toneClass =
    tone === 'danger'
      ? 'border-red-700 bg-red-50'
      : tone === 'secure'
        ? 'border-slate-900 bg-slate-100'
        : 'border-slate-400 bg-white';

  return (
    <section
      className={`relative flex aspect-video w-full min-w-0 flex-col overflow-hidden border-2 ${toneClass}`}
      aria-label={`${screenType} Mock 화면`}
    >
      <div className="absolute left-2 top-2 z-20 rounded border border-slate-500 bg-white/95 px-2 py-1 font-mono text-[10px] leading-tight text-slate-800 sm:text-xs">
        <div>WorkflowStatus: {workflowStatus}</div>
        <div>ScreenType: {screenType}</div>
      </div>

      <header className="flex h-[13%] items-center justify-between border-b-2 border-slate-300 bg-slate-100 px-[3%] pl-[28%] sm:pl-[24%]">
        <strong className="text-sm text-slate-900 sm:text-lg lg:text-2xl">{title}</strong>
        <span className="flex items-center gap-2 text-[10px] font-semibold sm:text-sm">
          <span
            className={`inline-block size-2 rounded-full ${
              isConnected ? 'bg-emerald-600' : 'bg-slate-400'
            }`}
          />
          WebSocket {isConnected ? '연결됨' : '연결 안 됨'}
        </span>
      </header>

      <main className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-auto px-[6%] py-[2%]">
        {children}
      </main>

      <div className="border-t border-slate-300 bg-slate-50 px-[4%] py-[1.2%] text-center text-[10px] text-slate-700 sm:text-sm">
        {isLoading ? '처리 중 · ' : ''}
        {message}
      </div>

      <footer className="flex min-h-[12%] items-center justify-end gap-2 border-t-2 border-slate-300 bg-white px-[4%]">
        {actions}
      </footer>
    </section>
  );
}
