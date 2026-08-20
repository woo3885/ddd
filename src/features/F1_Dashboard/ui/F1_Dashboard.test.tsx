import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import F1_Dashboard from './F1_Dashboard';
import { useGuideStore } from '@/store/useGuideStore';

describe('F1_Dashboard', () => {
  it('빈 URL에서 안내 시작 시 에러 멘트를 저장한다', async () => {
    const user = userEvent.setup();
    render(<F1_Dashboard />);

    await user.click(screen.getByRole('button', { name: '안내 시작' }));

    expect(useGuideStore.getState().guideMessage).toBe('URL을 먼저 입력해 주세요.');
    expect(useGuideStore.getState().status).toBe('IDLE');
  });

  it('유효 URL 입력 후 안내 시작 시 상태와 이력을 갱신한다', async () => {
    const user = userEvent.setup();
    render(<F1_Dashboard />);

    await user.type(screen.getByPlaceholderText('https://example.com'), 'https://example.com');
    await user.click(screen.getByRole('button', { name: '안내 시작' }));

    const state = useGuideStore.getState();
    expect(state.targetUrl).toBe('https://example.com');
    expect(state.status).toBe('LOADING');
    expect(state.recentUrls[0]).toBe('https://example.com');
  });
});
