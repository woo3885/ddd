import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { defaultDashboardSessionClient } from '@/features/F1_Dashboard/api/dashboard-session-client';
import * as orchestratorClient from '@/shared/api/orchestratorClient';
import App, { shouldRenderSessionFramePreview } from './App';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  window.history.replaceState({}, '', '/');
});

describe('App', () => {
  it('DEV에서 정확한 session frame query만 실제 Preview로 진입시킨다', () => {
    window.history.replaceState({}, '', '/?preview=session-frame');
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);

    render(<App />);

    expect(screen.getByTestId('preview-session-frame-d17')).toBeInTheDocument();
    expect(screen.queryByTestId('dashboard-page')).not.toBeInTheDocument();
  });

  it('다른 query는 기존 Dashboard를 유지한다', () => {
    window.history.replaceState({}, '', '/?preview=other');

    render(<App />);

    expect(screen.queryByTestId('preview-session-frame-d17')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('production gate에서는 session frame Preview 진입을 허용하지 않는다', () => {
    expect(shouldRenderSessionFramePreview('?preview=session-frame', false)).toBe(false);
    expect(shouldRenderSessionFramePreview('?preview=session-frame', true)).toBe(true);
    expect(shouldRenderSessionFramePreview('?preview=session-frame&sessionId=x', true)).toBe(false);
  });

  it('F1 Dashboard를 기본 화면으로 렌더링하고 네트워크를 호출하지 않는다', () => {
    const fetchMock = vi.fn();
    const webSocketMock = vi.fn();
    const createSessionSpy = vi.spyOn(
      orchestratorClient,
      'createStreamSession'
    );
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('WebSocket', webSocketMock);

    render(<App />);

    expect(
      screen.getByRole('heading', { name: '금융 업무 시작' })
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText('Mock ScreenType')
    ).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(createSessionSpy).not.toHaveBeenCalled();
    expect(webSocketMock).not.toHaveBeenCalled();
  });

  it('Dashboard 선택을 세션 요청으로 변환하고 로컬 클라이언트를 한 번 호출한다', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn();
    const webSocketMock = vi.fn();
    const initialLocation = window.location.href;
    vi.stubEnv('VITE_DEMO_BANK_BASE_URL', '');
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('WebSocket', webSocketMock);
    const createSessionSpy = vi
      .spyOn(defaultDashboardSessionClient, 'createSession')
      .mockResolvedValue({
        sessionId: 'session-app-test',
        createdAt: '2026-07-31T00:00:00.000Z'
      });
    render(<App />);

    await user.click(
      screen.getByRole('radio', {
        name: /금융길잡이 데모뱅크/
      })
    );
    await user.click(
      screen.getByRole('radio', { name: /예금 가입/ })
    );
    expect(createSessionSpy).not.toHaveBeenCalled();
    await user.click(
      screen.getByRole('button', { name: '선택한 업무 시작' })
    );

    expect(createSessionSpy).toHaveBeenCalledTimes(1);
    expect(createSessionSpy).toHaveBeenCalledWith({
      siteId: 'demo-bank',
      taskType: 'OPEN_DEPOSIT',
      initialUrl: 'http://127.0.0.1:5190/deposit/products',
      userRequest: '예금 가입 절차를 시작해 주세요.'
    });
    expect(
      await screen.findByText('금융 업무 세션이 준비되었습니다.')
    ).toBeInTheDocument();
    expect(screen.getByTestId('dashboard-session-result')).toHaveTextContent(
      'session-app-test'
    );
    expect(fetchMock).not.toHaveBeenCalled();
    expect(webSocketMock).not.toHaveBeenCalled();
    expect(window.location.href).toBe(initialLocation);
  });
});
