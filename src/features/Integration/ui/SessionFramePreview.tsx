import F2_StreamViewer from '@/features/F2_StreamViewer/ui/F2_StreamViewer';
import { useSessionFrameIntegration } from '@/features/Integration/hooks/useSessionFrameIntegration';
import type { SessionFramePhase } from '@/features/Integration/model/session-frame-state';
import { Button } from '@/shared/ui/Button';
import { NoticeBox } from '@/shared/ui/NoticeBox';
import { Panel } from '@/shared/ui/Panel';
import { StatusBadge, type StatusBadgeVariant } from '@/shared/ui/StatusBadge';
import { Text } from '@/shared/ui/Text';

export const SESSION_FRAME_PREVIEW_SELECTORS = {
  root: 'preview-session-frame-d17',
  notice: 'notice-session-frame-scope',
  phaseStatus: 'status-session-frame-phase',
  messageStatus: 'status-session-frame-message',
  startButton: 'btn-session-frame-start',
  resetButton: 'btn-session-frame-reset'
} as const;

const PHASE_LABELS: Record<SessionFramePhase, string> = {
  IDLE: '시작 전',
  CREATING_SESSION: '세션 생성 중',
  CONNECTING_FRAME: '화면 연결 중',
  WAITING_FIRST_FRAME: '첫 화면 대기',
  FRAME_READY: '첫 화면 수신',
  DISCONNECTED: '연결 종료',
  ERROR: '안전한 오류'
};

const PHASE_VARIANTS: Record<SessionFramePhase, StatusBadgeVariant> = {
  IDLE: 'neutral',
  CREATING_SESSION: 'progress',
  CONNECTING_FRAME: 'progress',
  WAITING_FIRST_FRAME: 'progress',
  FRAME_READY: 'success',
  DISCONNECTED: 'warning',
  ERROR: 'danger'
};

function elementIdentity(id: string) {
  return { id, 'data-testid': id };
}

export default function SessionFramePreview() {
  const integration = useSessionFrameIntegration();
  const isStarting =
    integration.phase === 'CREATING_SESSION' ||
    integration.phase === 'CONNECTING_FRAME' ||
    integration.phase === 'WAITING_FIRST_FRAME';

  return (
    <main
      {...elementIdentity(SESSION_FRAME_PREVIEW_SELECTORS.root)}
      className="mx-auto min-h-screen w-full max-w-7xl space-y-6 bg-slate-50 p-4 text-text-primary sm:p-6 lg:p-8"
    >
      <header>
        <Text as="h1" variant="title">
          D17 실제 세션 화면 Preview
        </Text>
        <Text variant="guide" className="mt-3 text-text-secondary">
          Backend가 연 데모뱅크의 첫 화면을 Viewer에서 확인합니다.
        </Text>
      </header>

      <NoticeBox
        {...elementIdentity(SESSION_FRAME_PREVIEW_SELECTORS.notice)}
        variant="warning"
        announce="polite"
        title="표시 전용 개발 화면입니다."
      >
        <p>계좌 선택 시작 화면만 열며 실제 금융거래는 발생하지 않습니다.</p>
        <p>AI Engine, 사용자 Action, Target, 보안 입력은 연결하지 않았습니다.</p>
      </NoticeBox>

      <Panel
        title="실제 Backend 연결 확인"
        description="사용자가 시작 버튼을 눌러야 세션과 화면 연결을 시작합니다."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Button
            {...elementIdentity(SESSION_FRAME_PREVIEW_SELECTORS.startButton)}
            size="lg"
            isLoading={isStarting}
            disabled={integration.phase !== 'IDLE'}
            onClick={() => void integration.start()}
          >
            실제 화면 연결 시작
          </Button>
          <Button
            {...elementIdentity(SESSION_FRAME_PREVIEW_SELECTORS.resetButton)}
            variant="secondary"
            size="lg"
            disabled={!integration.canReset}
            onClick={() => void integration.reset()}
          >
            연결 초기화
          </Button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div
            {...elementIdentity(SESSION_FRAME_PREVIEW_SELECTORS.phaseStatus)}
            className="rounded-xl border-2 border-border bg-white p-4 text-base leading-relaxed"
          >
            <StatusBadge variant={PHASE_VARIANTS[integration.phase]}>
              {PHASE_LABELS[integration.phase]}
            </StatusBadge>
          </div>
          <p
            {...elementIdentity(SESSION_FRAME_PREVIEW_SELECTORS.messageStatus)}
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className="rounded-xl border-2 border-border bg-white p-4 text-base leading-relaxed"
          >
            {integration.message}
          </p>
        </div>
      </Panel>

      <section aria-label="실제 원격 화면 Viewer">
        <F2_StreamViewer frame={integration.frame} />
      </section>
    </main>
  );
}
