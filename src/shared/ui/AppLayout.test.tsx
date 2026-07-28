import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import AppLayout from './AppLayout';

describe('AppLayout', () => {
  it('공통 상태와 콘텐츠, 안내 및 Action 영역을 표시한다', () => {
    render(
      <AppLayout
        workflowStatus="SESSION_CREATED"
        screenType="SESSION_READY"
        message="서비스를 시작할 준비가 되었습니다."
        isConnected
        title="테스트 금융길잡이"
        actions={<button type="button">시작</button>}
      >
        <p>공통 레이아웃 콘텐츠</p>
      </AppLayout>
    );

    expect(screen.getByText('테스트 금융길잡이')).toBeInTheDocument();
    expect(screen.getByText('공통 레이아웃 콘텐츠')).toBeInTheDocument();
    expect(screen.getByText('서비스를 시작할 준비가 되었습니다.')).toBeInTheDocument();
    expect(screen.getByText('WebSocket 연결됨')).toBeInTheDocument();
    expect(screen.getByText('WorkflowStatus: SESSION_CREATED')).toBeInTheDocument();
    expect(screen.getByText('ScreenType: SESSION_READY')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '시작' })).toBeInTheDocument();
  });
});
