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
    expect(screen.getByRole('status')).toHaveTextContent(
      '서비스를 시작할 준비가 되었습니다.'
    );
    expect(screen.getByText('WebSocket 연결됨')).toHaveClass(
      'bg-emerald-50'
    );
    expect(screen.getByText('WorkflowStatus: SESSION_CREATED')).toBeInTheDocument();
    expect(screen.getByText('ScreenType: SESSION_READY')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '시작' })).toBeInTheDocument();
  });

  it('위험 상태의 안내와 연결 끊김을 텍스트와 의미 있는 역할로 표시한다', () => {
    render(
      <AppLayout
        workflowStatus="RISK_WARNING"
        screenType="VOICE_PHISHING_WARNING"
        message="위험 표현이 감지되어 작업을 중단했습니다."
        isConnected={false}
        tone="danger"
      >
        <p>위험 안내 화면</p>
      </AppLayout>
    );

    expect(screen.getByRole('alert')).toHaveTextContent(
      '위험 표현이 감지되어 작업을 중단했습니다.'
    );
    expect(screen.getByText('WebSocket 연결 안 됨')).toHaveClass('bg-red-50');
  });
});
