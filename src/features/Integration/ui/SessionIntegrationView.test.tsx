import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { BackendSession } from '@/features/Integration/api/session-rest-client';
import type { SessionTarget } from '@/features/Integration/api/session-status-transport';
import SessionIntegrationView, {
  SESSION_INTEGRATION_SELECTORS
} from './SessionIntegrationView';

const mocks = vi.hoisted(() => ({
  frameHook: vi.fn(),
  statusHook: vi.fn(),
  overlayProps: vi.fn()
}));

vi.mock('@/features/Integration/hooks/useSessionFrameIntegration', () => ({
  useSessionFrameIntegration: mocks.frameHook
}));

vi.mock('@/features/Integration/hooks/useSessionStatusIntegration', () => ({
  useSessionStatusIntegration: mocks.statusHook
}));

vi.mock('@/features/F2_StreamViewer/ui/F2_StreamViewer', () => ({
  default: (props: {
    interactionDisabled?: boolean;
    onRemoteAction?: (action: unknown) => void;
    renderOverlay?: (context: {
      displaySize: { width: number; height: number };
      frameStatus: 'READY';
      imageSrc: string;
    }) => React.ReactNode;
  }) => (
    <div
      data-testid="mock-f2-viewer"
      data-interaction-disabled={String(props.interactionDisabled)}
    >
      {props.renderOverlay?.({
        displaySize: { width: 1280, height: 720 },
        frameStatus: 'READY',
        imageSrc: 'blob:frame'
      })}
    </div>
  )
}));

vi.mock('@/features/F3_SmartOverlay/ui/F3_SmartOverlay', () => ({
  default: (props: { target: SessionTarget | null; message: string }) => {
    mocks.overlayProps(props);
    return props.target ? (
      <div data-testid="mock-f3-overlay">{props.message}</div>
    ) : null;
  }
}));

const SESSION: BackendSession = {
  sessionId: 'session-private-001',
  status: 'SESSION_CREATED',
  frameWebSocketPath: '/ws/sessions/session-private-001/frames',
  frameProtocol: 'ddd.browser-frame.v1',
  frameWebSocketUrl:
    'ws://127.0.0.1:8080/ws/sessions/session-private-001/frames'
};

const TARGET: SessionTarget = {
  elementId: 'el-target-001',
  label: '예금 상품 선택',
  x: 10,
  y: 20,
  width: 100,
  height: 50,
  frameId: 'frm-001',
  frameSequence: 3,
  snapshotId: 'snap-001'
};

function frameHook(overrides = {}) {
  return {
    phase: 'FRAME_READY',
    frame: {
      imageSrc: 'blob:frame',
      metadata: {
        type: 'BROWSER_FRAME',
        sessionId: SESSION.sessionId,
        frameId: 'frm-001',
        sequence: 3,
        timestamp: 1_777_000_000_000,
        width: 1280,
        height: 720,
        mimeType: 'image/png',
        byteLength: 100
      }
    },
    message: '원격 화면이 준비되었습니다.',
    recoveryPending: false,
    actionPending: false,
    canSubmitViewerAction: true,
    canReset: true,
    submitViewerAction: vi.fn(),
    reset: vi.fn().mockResolvedValue(undefined),
    ...overrides
  };
}

function statusHook(overrides = {}) {
  return {
    sessionId: SESSION.sessionId,
    workflowStatus: 'AI_EXECUTING',
    guideMessage: 'AI가 화면을 확인하고 있습니다.',
    lastEventSequence: 3,
    target: TARGET,
    connectionPhase: 'CONNECTED',
    safeError: '',
    observeFrame: vi.fn(),
    ...overrides
  };
}

beforeEach(() => {
  mocks.frameHook.mockReturnValue(frameHook());
  mocks.statusHook.mockReturnValue(statusHook());
  mocks.overlayProps.mockClear();
});

describe('SessionIntegrationView', () => {
  it('동일 session을 Frame·Status Hook에 전달하고 live 상태를 표시한다', () => {
    render(<SessionIntegrationView session={SESSION} onExit={vi.fn()} />);

    expect(mocks.frameHook).toHaveBeenCalledWith({ existingSession: SESSION });
    expect(mocks.statusHook).toHaveBeenCalledWith({
      sessionId: SESSION.sessionId,
      initialStatus: 'SESSION_CREATED'
    });
    expect(screen.getByText('AI 안내 작업 진행 중')).toBeInTheDocument();
    expect(screen.getByText('AI가 화면을 확인하고 있습니다.')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
    expect(screen.queryByText(SESSION.sessionId)).not.toBeInTheDocument();
  });

  it('현재 frame과 일치하는 production Target만 F3에 표시한다', () => {
    render(<SessionIntegrationView session={SESSION} onExit={vi.fn()} />);

    expect(screen.getByTestId('mock-f3-overlay')).toHaveTextContent(
      '예금 상품 선택'
    );
    expect(mocks.overlayProps).toHaveBeenLastCalledWith(
      expect.objectContaining({ target: TARGET, message: TARGET.label })
    );
    expect(screen.getByTestId('mock-f2-viewer')).toHaveAttribute(
      'data-interaction-disabled',
      'false'
    );
  });

  it('Target frame mismatch와 resync 중에는 Overlay와 Viewer Action을 차단한다', () => {
    mocks.statusHook.mockReturnValue(
      statusHook({
        connectionPhase: 'RESYNCING',
        target: { ...TARGET, frameId: 'frm-stale' }
      })
    );
    render(<SessionIntegrationView session={SESSION} onExit={vi.fn()} />);

    expect(screen.queryByTestId('mock-f3-overlay')).not.toBeInTheDocument();
    expect(screen.getByTestId('mock-f2-viewer')).toHaveAttribute(
      'data-interaction-disabled',
      'true'
    );
  });

  it.each([
    'SECURE_INPUT_REQUIRED',
    'FINAL_CONFIRMATION_REQUIRED',
    'RISK_WARNING',
    'COMPLETED',
    'CANCELLED',
    'ERROR',
    'TERMINATED'
  ] as const)('%s 상태에서는 일반 Viewer Action을 차단한다', (workflowStatus) => {
    mocks.statusHook.mockReturnValue(statusHook({ workflowStatus, target: null }));
    render(<SessionIntegrationView session={SESSION} onExit={vi.fn()} />);

    expect(screen.getByTestId('mock-f2-viewer')).toHaveAttribute(
      'data-interaction-disabled',
      'true'
    );
  });

  it('종료 버튼은 session reset 후 Dashboard 복귀 경계만 호출한다', async () => {
    const user = userEvent.setup();
    const reset = vi.fn().mockResolvedValue(undefined);
    const onExit = vi.fn();
    mocks.frameHook.mockReturnValue(frameHook({ reset }));
    render(<SessionIntegrationView session={SESSION} onExit={onExit} />);

    const button = screen.getByTestId(
      SESSION_INTEGRATION_SELECTORS.exitButton
    );
    expect(button).toHaveAttribute('id', SESSION_INTEGRATION_SELECTORS.exitButton);
    await user.click(button);

    expect(reset).toHaveBeenCalledTimes(1);
    expect(onExit).toHaveBeenCalledTimes(1);
    expect(reset.mock.invocationCallOrder[0]).toBeLessThan(
      onExit.mock.invocationCallOrder[0]
    );
  });
});
