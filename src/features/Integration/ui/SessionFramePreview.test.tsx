import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  start: vi.fn().mockResolvedValue(undefined),
  reset: vi.fn().mockResolvedValue(undefined),
  state: {
    phase: 'IDLE',
    frame: undefined as
      | {
          metadata: {
            type: 'BROWSER_FRAME';
            sessionId: string;
            timestamp: number;
            width: number;
            height: number;
          };
          imageSrc: string;
        }
      | undefined,
    message: '시작 버튼을 눌러 데모 화면 연결을 확인해 주세요.',
    hasReceivedFirstFrame: false,
    canReset: false
  }
}));

vi.mock('@/features/Integration/hooks/useSessionFrameIntegration', () => ({
  useSessionFrameIntegration: () => ({
    ...mocks.state,
    start: mocks.start,
    reset: mocks.reset
  })
}));

vi.mock('@/features/F2_StreamViewer/ui/F2_StreamViewer', () => ({
  default: ({ frame }: { frame?: { imageSrc: string } }) => (
    <div data-testid="viewer-remote-screen">
      {frame?.imageSrc ?? 'EMPTY_VIEWER'}
    </div>
  )
}));

import SessionFramePreview, {
  SESSION_FRAME_PREVIEW_SELECTORS
} from './SessionFramePreview';

beforeEach(() => {
  mocks.start.mockClear();
  mocks.reset.mockClear();
  Object.assign(mocks.state, {
    phase: 'IDLE',
    frame: undefined,
    message: '시작 버튼을 눌러 데모 화면 연결을 확인해 주세요.',
    hasReceivedFirstFrame: false,
    canReset: false
  });
});

describe('SessionFramePreview', () => {
  it('신규 selector의 id와 data-testid를 동일하게 렌더링한다', () => {
    render(<SessionFramePreview />);

    Object.values(SESSION_FRAME_PREVIEW_SELECTORS).forEach((selector) => {
      expect(screen.getByTestId(selector)).toHaveAttribute('id', selector);
    });
  });

  it('초기 상태에서 자동 연결 없이 start만 활성화한다', () => {
    render(<SessionFramePreview />);

    expect(screen.getByText('시작 전')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '실제 화면 연결 시작' })).toBeEnabled();
    expect(screen.getByRole('button', { name: '연결 초기화' })).toBeDisabled();
    expect(mocks.start).not.toHaveBeenCalled();
    expect(screen.getByTestId('viewer-remote-screen')).toHaveTextContent('EMPTY_VIEWER');
  });

  it('사용자 start와 reset 클릭만 hook 경계로 전달한다', async () => {
    const user = userEvent.setup();
    mocks.state.canReset = true;
    render(<SessionFramePreview />);

    await user.click(screen.getByRole('button', { name: '실제 화면 연결 시작' }));
    await user.click(screen.getByRole('button', { name: '연결 초기화' }));

    expect(mocks.start).toHaveBeenCalledTimes(1);
    expect(mocks.reset).toHaveBeenCalledTimes(1);
  });

  it('실제 수신 ViewerFrame을 F2에 전달하고 sessionId는 UI에 표시하지 않는다', () => {
    mocks.state.phase = 'FRAME_READY';
    mocks.state.frame = {
      metadata: {
        type: 'BROWSER_FRAME',
        sessionId: 'private-session-123',
        timestamp: 1_786_350_000_000,
        width: 1280,
        height: 720
      },
      imageSrc: 'blob:real-frame'
    };
    mocks.state.message = '첫 원격 화면을 안전하게 표시했습니다.';
    mocks.state.hasReceivedFirstFrame = true;
    mocks.state.canReset = true;
    render(<SessionFramePreview />);

    expect(screen.getByTestId('viewer-remote-screen')).toHaveTextContent('blob:real-frame');
    expect(screen.queryByText('private-session-123')).not.toBeInTheDocument();
    expect(screen.getByText('첫 화면 수신')).toBeInTheDocument();
  });

  it('실제 Backend 범위와 AI·Action 미연결을 명확히 안내한다', () => {
    render(<SessionFramePreview />);

    expect(screen.getByTestId('notice-session-frame-scope')).toHaveTextContent(
      '실제 금융거래는 발생하지 않습니다'
    );
    expect(screen.getByTestId('notice-session-frame-scope')).toHaveTextContent(
      'AI Engine, 사용자 Action, Target, 보안 입력은 연결하지 않았습니다'
    );
  });
});
