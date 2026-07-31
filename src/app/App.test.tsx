import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { defaultDashboardSessionClient } from '@/features/F1_Dashboard/api/dashboard-session-client';
import * as orchestratorClient from '@/shared/api/orchestratorClient';
import App from './App';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('App', () => {
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
