import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import * as orchestratorClient from '@/shared/api/orchestratorClient';
import App from './App';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
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
});
