import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { BackendSession } from '@/features/Integration/api/session-rest-client';
import type { SessionTarget } from '@/features/Integration/api/session-status-transport';
import { SECURE_INPUT_PANEL_SELECTORS } from '@/shared/ui/SecureInputPanel';
import { WORKFLOW_STATUS_PANEL_SELECTORS } from '@/shared/ui/WorkflowStatusPanel';
import SessionIntegrationView, {
  SESSION_INTEGRATION_SELECTORS
} from './SessionIntegrationView';

const mocks = vi.hoisted(() => ({
  frameHook: vi.fn(),
  statusHook: vi.fn(),
  decisionHook: vi.fn(),
  secureInputHook: vi.fn(),
  overlayProps: vi.fn()
}));

vi.mock('@/features/Integration/hooks/useSessionFrameIntegration', () => ({
  useSessionFrameIntegration: mocks.frameHook
}));

vi.mock('@/features/Integration/hooks/useSessionStatusIntegration', () => ({
  useSessionStatusIntegration: mocks.statusHook
}));

vi.mock('@/features/Integration/hooks/useSessionDecisionIntegration', () => ({
  useSessionDecisionIntegration: mocks.decisionHook
}));

vi.mock('@/features/Integration/hooks/useSessionSecureInputIntegration', () => ({
  useSessionSecureInputIntegration: mocks.secureInputHook
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
    activeDecision: null,
    selectedOptionId: null,
    selectedTermIds: new Set<string>(),
    decisionSubmitPhase: 'IDLE',
    safeDecisionError: '',
    activeSecureInput: null,
    secureInputSubmitPhase: 'IDLE',
    safeSecureInputError: '',
    connectionPhase: 'CONNECTED',
    safeError: '',
    observeFrame: vi.fn(),
    selectDecisionOption: vi.fn(),
    toggleDecisionTerm: vi.fn(),
    markDecisionSubmitStarted: vi.fn(),
    markDecisionSubmitAcknowledged: vi.fn(),
    markDecisionSubmitFailed: vi.fn(),
    markDecisionSubmitAborted: vi.fn(),
    markSecureInputSubmitStarted: vi.fn(),
    markSecureInputSubmitAcknowledged: vi.fn(),
    markSecureInputSubmitFailed: vi.fn(),
    markSecureInputSubmitAborted: vi.fn(),
    ...overrides
  };
}

function decisionHook(overrides = {}) {
  return {
    canSubmit: true,
    controlsDisabled: false,
    isBusy: false,
    selectOption: vi.fn(),
    toggleTerm: vi.fn(),
    confirmOption: vi.fn(),
    confirmTerms: vi.fn(),
    abort: vi.fn(),
    ...overrides
  };
}

function secureInputHook(overrides = {}) {
  return {
    canSubmit: false,
    controlsDisabled: true,
    isBusy: false,
    completionRequested: false,
    requestCompletion: vi.fn(),
    abort: vi.fn(),
    ...overrides
  };
}

beforeEach(() => {
  mocks.frameHook.mockReturnValue(frameHook());
  mocks.statusHook.mockReturnValue(statusHook());
  mocks.decisionHook.mockReturnValue(decisionHook());
  mocks.secureInputHook.mockReturnValue(secureInputHook());
  mocks.overlayProps.mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
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

  it('SECURE_INPUT_REQUIRED에서는 보호 Panel만 발표하고 Action과 Target을 차단한다', () => {
    const fetchMock = vi.fn();
    const submitViewerAction = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    mocks.frameHook.mockReturnValue(
      frameHook({ submitViewerAction })
    );
    mocks.statusHook.mockReturnValue(
      statusHook({
        workflowStatus: 'SECURE_INPUT_REQUIRED',
        guideMessage: '비밀번호 원문을 입력해 주세요.',
        target: TARGET
      })
    );

    const { container } = render(
      <SessionIntegrationView session={SESSION} onExit={vi.fn()} />
    );

    expect(
      screen.getByTestId(SECURE_INPUT_PANEL_SELECTORS.panel)
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId(WORKFLOW_STATUS_PANEL_SELECTORS.panel)
    ).not.toBeInTheDocument();
    expect(screen.getAllByRole('status')).toHaveLength(1);
    expect(
      screen.getByTestId(SECURE_INPUT_PANEL_SELECTORS.completeButton)
    ).toBeDisabled();
    expect(container.querySelector('input')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mock-f3-overlay')).not.toBeInTheDocument();
    expect(screen.getByTestId('mock-f2-viewer')).toHaveAttribute(
      'data-interaction-disabled',
      'true'
    );
    expect(submitViewerAction).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.queryByText(/인증 성공|가입 성공/)).not.toBeInTheDocument();
  });

  it('live secure metadata가 준비되면 Panel 완료 버튼을 안전한 hook 경계에 연결한다', async () => {
    const user = userEvent.setup();
    const requestCompletion = vi.fn();
    mocks.secureInputHook.mockReturnValue(
      secureInputHook({ controlsDisabled: false, canSubmit: true, requestCompletion })
    );
    mocks.statusHook.mockReturnValue(
      statusHook({
        workflowStatus: 'SECURE_INPUT_REQUIRED',
        target: null,
        activeSecureInput: {
          secureRequestId: 'secure-request-private',
          secureInputType: 'ACCOUNT_PASSWORD',
          frameId: 'frm-001',
          frameSequence: 3,
          message: '원격 금융 화면에서 보안 정보를 직접 입력해 주세요.'
        },
        secureInputSubmitPhase: 'WAITING_FOR_USER'
      })
    );

    render(<SessionIntegrationView session={SESSION} onExit={vi.fn()} />);
    const button = screen.getByTestId(
      SECURE_INPUT_PANEL_SELECTORS.completeButton
    );
    expect(button).toBeEnabled();
    await user.click(button);
    expect(requestCompletion).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('secure-request-private')).not.toBeInTheDocument();
  });

  it('secure 요청 중·ACK 후 버튼을 disabled로 유지하고 안전 오류 하나만 알린다', () => {
    mocks.secureInputHook.mockReturnValue(
      secureInputHook({
        controlsDisabled: true,
        isBusy: false,
        completionRequested: true
      })
    );
    mocks.statusHook.mockReturnValue(
      statusHook({
        workflowStatus: 'SECURE_INPUT_REQUIRED',
        activeSecureInput: {
          secureRequestId: 'secure-request-private',
          secureInputType: 'OTP',
          frameId: 'frm-001',
          frameSequence: 3,
          message: '원격 금융 화면에서 보안 정보를 직접 입력해 주세요.'
        },
        secureInputSubmitPhase: 'WAITING_FOR_RESUME',
        safeSecureInputError: '최신 화면을 확인한 뒤 다시 요청해 주세요.'
      })
    );

    render(<SessionIntegrationView session={SESSION} onExit={vi.fn()} />);
    expect(
      screen.getByTestId(SECURE_INPUT_PANEL_SELECTORS.completeButton)
    ).toBeDisabled();
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(screen.getByRole('alert')).toHaveTextContent(
      '최신 화면을 확인한 뒤 다시 요청해 주세요.'
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

  it.each([
    ['PRODUCT_SELECTION', '상품 선택'],
    ['SOURCE_ACCOUNT_SELECTION', '출금 계좌 선택'],
    ['RECIPIENT_SELECTION', '수취인 선택']
  ] as const)('%s production options를 단일 선택 Panel에 표시한다', (decisionType, title) => {
    mocks.statusHook.mockReturnValue(
      statusHook({
        workflowStatus: 'USER_DECISION_REQUIRED',
        activeDecision: {
          requestId: 'req-private',
          decisionId: 'dec-private',
          decisionType,
          options: [
            {
              id: 'option-private',
              label: '사용자가 확인할 선택 항목',
              required: false,
              checked: false,
              disabled: false
            }
          ],
          frameId: 'frm-001',
          frameSequence: 3,
          sourceSnapshotId: 'snap-private'
        }
      })
    );
    render(<SessionIntegrationView session={SESSION} onExit={vi.fn()} />);

    expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /사용자가 확인할 선택 항목/ })).toBeInTheDocument();
    expect(screen.queryByText('option-private')).not.toBeInTheDocument();
    expect(screen.queryByText('req-private')).not.toBeInTheDocument();
    expect(screen.getByTestId('mock-f2-viewer')).toHaveAttribute(
      'data-interaction-disabled',
      'true'
    );
  });

  it('상품 option 순서를 유지하고 직접 선택과 확인을 분리한다', async () => {
    const user = userEvent.setup();
    const selectOption = vi.fn();
    const confirmOption = vi.fn();
    mocks.decisionHook.mockReturnValue(
      decisionHook({ selectOption, confirmOption })
    );
    mocks.statusHook.mockReturnValue(
      statusHook({
        workflowStatus: 'USER_DECISION_REQUIRED',
        activeDecision: {
          requestId: 'req-products',
          decisionId: 'dec-products',
          decisionType: 'PRODUCT_SELECTION',
          options: [
            {
              id: 'product-12m',
              label: '12개월 정기예금 선택',
              required: false,
              checked: false,
              disabled: false
            },
            {
              id: 'product-preferred',
              label: '우대금리 정기예금 선택',
              required: false,
              checked: false,
              disabled: false
            }
          ],
          frameId: 'frm-001',
          frameSequence: 3,
          sourceSnapshotId: 'snap-products'
        },
        selectedOptionId: null
      })
    );

    const { rerender } = render(
      <SessionIntegrationView session={SESSION} onExit={vi.fn()} />
    );
    const radios = screen.getAllByRole('radio');

    expect(radios).toHaveLength(2);
    expect(radios[0]).toHaveAccessibleName(/12개월 정기예금 선택/);
    expect(radios[1]).toHaveAccessibleName(/우대금리 정기예금 선택/);
    expect(radios[0]).not.toBeChecked();
    expect(radios[1]).not.toBeChecked();
    expect(
      screen.getByRole('button', { name: '선택 확인' })
    ).toBeDisabled();

    await user.click(radios[1]);
    expect(selectOption).toHaveBeenCalledWith('product-preferred');
    expect(confirmOption).not.toHaveBeenCalled();

    mocks.statusHook.mockReturnValue(
      statusHook({
        workflowStatus: 'USER_DECISION_REQUIRED',
        activeDecision: {
          requestId: 'req-products',
          decisionId: 'dec-products',
          decisionType: 'PRODUCT_SELECTION',
          options: [
            {
              id: 'product-12m',
              label: '12개월 정기예금 선택',
              required: false,
              checked: false,
              disabled: false
            },
            {
              id: 'product-preferred',
              label: '우대금리 정기예금 선택',
              required: false,
              checked: false,
              disabled: false
            }
          ],
          frameId: 'frm-001',
          frameSequence: 3,
          sourceSnapshotId: 'snap-products'
        },
        selectedOptionId: 'product-preferred'
      })
    );
    rerender(<SessionIntegrationView session={SESSION} onExit={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: '선택 확인' }));
    expect(confirmOption).toHaveBeenCalledTimes(1);
    expect(confirmOption).toHaveBeenCalledWith('product-preferred');
  });

  it('약관의 checked 초기 상태를 controlled checkbox로 표시하고 확인을 분리한다', async () => {
    const user = userEvent.setup();
    const confirmTerms = vi.fn();
    mocks.decisionHook.mockReturnValue(decisionHook({ confirmTerms }));
    mocks.statusHook.mockReturnValue(
      statusHook({
        workflowStatus: 'USER_DECISION_REQUIRED',
        activeDecision: {
          requestId: 'req-terms',
          decisionId: 'dec-terms',
          decisionType: 'TERMS_AGREEMENT',
          options: [
            {
              id: 'term-required',
              label: '필수 약관 확인',
              required: true,
              checked: true,
              disabled: false
            }
          ],
          frameId: 'frm-001',
          frameSequence: 3,
          sourceSnapshotId: 'snap-terms'
        },
        selectedTermIds: new Set(['term-required'])
      })
    );
    render(<SessionIntegrationView session={SESSION} onExit={vi.fn()} />);

    expect(screen.getByRole('checkbox', { name: /필수 약관 확인/ })).toBeChecked();
    expect(confirmTerms).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: '약관 선택 확인' }));
    expect(confirmTerms).toHaveBeenCalledWith(['term-required']);
  });

  it('약관 순서와 기존 checked를 유지하고 필수 약관 Gate를 적용한다', () => {
    mocks.statusHook.mockReturnValue(
      statusHook({
        workflowStatus: 'USER_DECISION_REQUIRED',
        activeDecision: {
          requestId: 'req-terms-order',
          decisionId: 'dec-terms-order',
          decisionType: 'TERMS_AGREEMENT',
          options: [
            {
              id: 'term-privacy',
              label: '개인정보 필수 약관',
              required: true,
              checked: false,
              disabled: false
            },
            {
              id: 'term-marketing',
              label: '마케팅 선택 약관',
              required: false,
              checked: true,
              disabled: false
            }
          ],
          frameId: 'frm-001',
          frameSequence: 3,
          sourceSnapshotId: 'snap-terms-order'
        },
        selectedTermIds: new Set(['term-marketing'])
      })
    );

    render(<SessionIntegrationView session={SESSION} onExit={vi.fn()} />);
    const checkboxes = screen.getAllByRole('checkbox');

    expect(checkboxes).toHaveLength(2);
    expect(checkboxes[0]).toHaveAccessibleName(/개인정보 필수 약관/);
    expect(checkboxes[1]).toHaveAccessibleName(/마케팅 선택 약관/);
    expect(checkboxes[0]).not.toBeChecked();
    expect(checkboxes[1]).toBeChecked();
    expect(
      screen.getByRole('button', { name: '약관 선택 확인' })
    ).toBeDisabled();
  });

  it('ACK 대기 상태와 안전한 제출 오류를 고정 selector로 안내한다', () => {
    mocks.statusHook.mockReturnValue(
      statusHook({
        workflowStatus: 'USER_DECISION_REQUIRED',
        activeDecision: {
          requestId: 'req-001',
          decisionId: 'dec-001',
          decisionType: 'PRODUCT_SELECTION',
          options: [
            { id: 'option-001', label: '상품 하나', required: false, checked: false, disabled: false }
          ],
          frameId: 'frm-001',
          frameSequence: 3,
          sourceSnapshotId: 'snap-001'
        },
        decisionSubmitPhase: 'WAITING_FOR_RESUME',
        safeDecisionError: '최신 화면을 다시 확인해 주세요.'
      })
    );
    render(<SessionIntegrationView session={SESSION} onExit={vi.fn()} />);

    const status = screen.getByTestId(
      SESSION_INTEGRATION_SELECTORS.decisionSubmitState
    );
    expect(status).toHaveAttribute(
      'id',
      SESSION_INTEGRATION_SELECTORS.decisionSubmitState
    );
    expect(screen.getByText(/다음 업무 상태를 기다리고/).parentElement).toHaveAttribute(
      'role',
      'status'
    );
    expect(screen.getByRole('alert')).toHaveTextContent(
      '최신 화면을 다시 확인해 주세요.'
    );
  });
});
