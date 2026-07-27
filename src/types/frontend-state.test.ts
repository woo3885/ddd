import { describe, expect, it } from 'vitest';
import { initialFrontendScreenState } from '@/types/frontend-state';

describe('initialFrontendScreenState', () => {
  it('세션 시작 전 최초 화면 상태를 제공한다', () => {
    expect(initialFrontendScreenState).toEqual({
      sessionId: null,
      workflowStatus: 'SESSION_CREATED',
      screenType: 'INITIAL_SCREEN',
      message: '',
      isConnected: false,
      isLoading: false
    });
  });
});
