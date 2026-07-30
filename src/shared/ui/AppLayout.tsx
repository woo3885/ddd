import type { ReactNode } from 'react';
import type { ScreenType, WorkflowStatus } from '@/types/frontend-state';
import { NoticeBox, type NoticeBoxVariant } from './NoticeBox';
import {
  StatusBadge,
  type StatusBadgeVariant
} from './StatusBadge';
import { Text } from './Text';

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

function getWorkflowBadgeVariant(
  workflowStatus: WorkflowStatus
): StatusBadgeVariant {
  switch (workflowStatus) {
    case 'PAGE_LOADING':
    case 'AI_EXECUTING':
      return 'progress';
    case 'SECURE_INPUT_REQUIRED':
      return 'secure';
    case 'RISK_WARNING':
    case 'ERROR':
      return 'danger';
    case 'COMPLETED':
      return 'success';
    default:
      return 'neutral';
  }
}

function getNoticeVariant(
  workflowStatus: WorkflowStatus,
  tone: AppLayoutProps['tone'],
  isLoading: boolean
): NoticeBoxVariant {
  if (tone === 'danger' || workflowStatus === 'RISK_WARNING' || workflowStatus === 'ERROR') {
    return 'danger';
  }

  if (tone === 'secure' || workflowStatus === 'SECURE_INPUT_REQUIRED') {
    return 'secure';
  }

  return isLoading ? 'progress' : 'info';
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
  const workflowBadgeVariant = getWorkflowBadgeVariant(workflowStatus);
  const noticeVariant = getNoticeVariant(workflowStatus, tone, isLoading);
  const noticeTitle =
    noticeVariant === 'danger'
      ? '위험 안내'
      : noticeVariant === 'secure'
        ? '보안 안내'
        : isLoading
          ? '처리 중'
          : '사용자 안내';

  return (
    <section
      className={`relative flex aspect-video w-full min-w-0 flex-col overflow-hidden border-2 ${toneClass}`}
      aria-label={`${screenType} Mock 화면`}
    >
      <div className="absolute left-2 top-2 z-20 flex flex-col items-start gap-1">
        <StatusBadge
          variant={workflowBadgeVariant}
          className="min-h-0 font-mono"
        >
          WorkflowStatus: {workflowStatus}
        </StatusBadge>
        <StatusBadge variant="neutral" className="min-h-0 font-mono">
          ScreenType: {screenType}
        </StatusBadge>
      </div>

      <header className="flex h-[13%] items-center justify-between border-b-2 border-slate-300 bg-slate-100 px-[3%] pl-[28%] sm:pl-[24%]">
        <Text
          as="h1"
          variant="heading"
          className="text-lg sm:text-xl lg:text-2xl"
        >
          {title}
        </Text>
        <StatusBadge variant={isConnected ? 'success' : 'danger'}>
          WebSocket {isConnected ? '연결됨' : '연결 안 됨'}
        </StatusBadge>
      </header>

      <main className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-auto px-[6%] py-[2%]">
        {children}
      </main>

      <NoticeBox
        variant={noticeVariant}
        title={noticeTitle}
        announce={noticeVariant === 'danger' ? 'assertive' : 'polite'}
        className="rounded-none border-x-0 border-b-0 px-[4%] py-[1.2%] text-center"
      >
        {message}
      </NoticeBox>

      <footer className="flex min-h-[12%] items-center justify-end gap-3 border-t-2 border-slate-300 bg-white px-[4%]">
        {actions}
      </footer>
    </section>
  );
}
