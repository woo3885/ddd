import { useEffect } from 'react';

import F2_StreamViewer from '@/features/F2_StreamViewer/ui/F2_StreamViewer';
import F3_SmartOverlay from '@/features/F3_SmartOverlay/ui/F3_SmartOverlay';
import { useSessionFrameIntegration } from '@/features/Integration/hooks/useSessionFrameIntegration';
import { useSessionStatusIntegration } from '@/features/Integration/hooks/useSessionStatusIntegration';
import type { BackendSession } from '@/features/Integration/api/session-rest-client';
import {
  isTargetMatchingFrame,
  isViewerActionAllowed,
  selectVisibleSessionTarget
} from '@/features/Integration/model/session-ui-state';
import { Button } from '@/shared/ui/Button';
import { Panel } from '@/shared/ui/Panel';
import { StatusBadge, type StatusBadgeVariant } from '@/shared/ui/StatusBadge';
import { Text } from '@/shared/ui/Text';
import { WorkflowStatusPanel } from '@/shared/ui/WorkflowStatusPanel';

export const SESSION_INTEGRATION_SELECTORS = {
  root: 'view-session-integration',
  frameConnection: 'status-production-frame-connection',
  uiConnection: 'status-production-ui-connection',
  actionState: 'status-production-viewer-action',
  exitButton: 'btn-session-integration-exit'
} as const;

export interface SessionIntegrationViewProps {
  session: BackendSession;
  onExit: () => void;
}

const UI_PHASE_LABELS = {
  CONNECTING: '상태 연결 중',
  RESYNCING: '상태 동기화 중',
  CONNECTED: '상태 연결됨',
  DISCONNECTED: '상태 복구 중',
  ERROR: '상태 연결 오류'
} as const;

const UI_PHASE_VARIANTS: Record<
  keyof typeof UI_PHASE_LABELS,
  StatusBadgeVariant
> = {
  CONNECTING: 'progress',
  RESYNCING: 'progress',
  CONNECTED: 'success',
  DISCONNECTED: 'warning',
  ERROR: 'danger'
};

function elementIdentity(id: string) {
  return { id, 'data-testid': id };
}

export default function SessionIntegrationView({
  session,
  onExit
}: SessionIntegrationViewProps) {
  const frameIntegration = useSessionFrameIntegration({
    existingSession: session
  });
  const statusIntegration = useSessionStatusIntegration({
    sessionId: session.sessionId,
    initialStatus: session.status
  });
  const frameIdentity = frameIntegration.frame
    ? {
        frameId: frameIntegration.frame.metadata.frameId,
        sequence: frameIntegration.frame.metadata.sequence
      }
    : null;
  const frameReconnecting =
    frameIntegration.phase === 'RECONNECTING' ||
    frameIntegration.recoveryPending;

  useEffect(() => {
    statusIntegration.observeFrame(frameIdentity);
  }, [
    frameIdentity?.frameId,
    frameIdentity?.sequence,
    statusIntegration.observeFrame
  ]);

  const targetMatchesFrame = isTargetMatchingFrame(
    statusIntegration.target,
    frameIdentity
  );
  const visibleTarget = selectVisibleSessionTarget({
    state: statusIntegration,
    frame: frameIdentity,
    frameReady: frameIntegration.phase === 'FRAME_READY',
    frameReconnecting,
    actionPending: frameIntegration.actionPending
  });
  const statusTransportReady =
    statusIntegration.connectionPhase === 'CONNECTED';
  const canSubmitViewerAction =
    frameIntegration.canSubmitViewerAction &&
    statusTransportReady &&
    isViewerActionAllowed(statusIntegration.workflowStatus) &&
    targetMatchesFrame;
  const busy =
    frameIntegration.recoveryPending ||
    frameIntegration.actionPending ||
    statusIntegration.connectionPhase === 'CONNECTING' ||
    statusIntegration.connectionPhase === 'RESYNCING';

  const handleExit = async () => {
    await frameIntegration.reset();
    onExit();
  };

  return (
    <main
      {...elementIdentity(SESSION_INTEGRATION_SELECTORS.root)}
      aria-busy={busy}
      className="mx-auto min-h-screen w-full max-w-7xl space-y-6 bg-slate-50 p-4 text-text-primary sm:p-6 lg:p-8"
    >
      <header>
        <Text as="h1" variant="title">
          금융 업무 실시간 안내
        </Text>
        <Text variant="guide" className="mt-3 text-text-secondary">
          현재 업무 상태와 원격 화면의 안내 대상을 함께 확인해 주세요.
        </Text>
      </header>

      <Panel title="실시간 연결 상태">
        <div className="grid gap-3 sm:grid-cols-2">
          <div
            {...elementIdentity(SESSION_INTEGRATION_SELECTORS.frameConnection)}
            className="rounded-xl border-2 border-border bg-white p-4"
          >
            <StatusBadge
              variant={
                frameIntegration.phase === 'FRAME_READY'
                  ? 'success'
                  : frameIntegration.phase === 'ERROR'
                    ? 'danger'
                    : 'progress'
              }
            >
              {frameIntegration.phase === 'FRAME_READY'
                ? '화면 연결됨'
                : frameIntegration.message}
            </StatusBadge>
          </div>
          <div
            {...elementIdentity(SESSION_INTEGRATION_SELECTORS.uiConnection)}
            className="rounded-xl border-2 border-border bg-white p-4"
          >
            <StatusBadge
              variant={
                UI_PHASE_VARIANTS[statusIntegration.connectionPhase]
              }
            >
              {UI_PHASE_LABELS[statusIntegration.connectionPhase]}
            </StatusBadge>
            {statusIntegration.safeError ? (
              <Text variant="caption" className="mt-2 text-danger">
                {statusIntegration.safeError}
              </Text>
            ) : null}
          </div>
        </div>
      </Panel>

      <WorkflowStatusPanel
        status={statusIntegration.workflowStatus}
        message={statusIntegration.guideMessage}
      />

      <section aria-label="실시간 원격 화면">
        <F2_StreamViewer
          frame={frameIntegration.frame}
          interactionDisabled={!canSubmitViewerAction}
          interactionBusy={frameIntegration.actionPending}
          onRemoteAction={(action) =>
            void frameIntegration.submitViewerAction(action)
          }
          renderOverlay={({ displaySize, frameStatus, imageSrc }) => (
            <F3_SmartOverlay
              target={visibleTarget}
              serverSize={{ width: 1280, height: 720 }}
              displaySize={displaySize}
              message={visibleTarget?.label ?? ''}
              visible={visibleTarget !== null}
              focusEffectsEnabled
              magnifierImageSrc={imageSrc}
              frameStatus={frameStatus}
            />
          )}
        />
      </section>

      <Panel
        {...elementIdentity(SESSION_INTEGRATION_SELECTORS.actionState)}
        title="원격 화면 조작 상태"
      >
        <Text variant="body">
          {canSubmitViewerAction
            ? '현재 화면을 직접 클릭하거나 스크롤할 수 있습니다.'
            : '상태와 화면이 안전하게 일치할 때까지 조작이 차단됩니다.'}
        </Text>
        <Text variant="caption" className="mt-2 text-text-secondary">
          Target 안내는 위치만 표시하며 자동으로 화면을 조작하지 않습니다.
        </Text>
      </Panel>

      <div className="flex justify-end">
        <Button
          {...elementIdentity(SESSION_INTEGRATION_SELECTORS.exitButton)}
          variant="danger"
          size="lg"
          type="button"
          disabled={!frameIntegration.canReset}
          onClick={() => void handleExit()}
        >
          세션 종료 후 대시보드로
        </Button>
      </div>
    </main>
  );
}
