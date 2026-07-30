import { describe, expect, it } from 'vitest';
import type {
  ClientWebSocketEvent,
  ServerWebSocketEvent,
  UserBrowserActionEvent
} from '@/types/websocket-events';

describe('WebSocket event types', () => {
  it('주요 서버 이벤트 예시를 허용한다', () => {
    const events = [
      {
        type: 'BROWSER_FRAME',
        sessionId: 'bs-20260727-001',
        timestamp: 1785140000000,
        width: 1280,
        height: 720
      },
      {
        type: 'WORKFLOW_STATUS_CHANGED',
        sessionId: 'bs-20260727-001',
        status: 'AI_EXECUTING',
        message: '예금 메뉴로 이동하고 있습니다.'
      },
      {
        type: 'TARGET_HIGHLIGHT',
        sessionId: 'bs-20260727-001',
        target: {
          elementId: 'el-31',
          x: 420,
          y: 310,
          width: 180,
          height: 60
        },
        message: '정기예금 메뉴를 선택하겠습니다.'
      },
      {
        type: 'USER_DECISION_REQUEST',
        status: 'USER_DECISION_REQUIRED',
        decisionType: 'TERMS_AGREEMENT',
        message: '동의할 약관을 직접 선택해 주세요.',
        options: [
          {
            id: 'term-1',
            label: '서비스 이용약관',
            required: true
          }
        ]
      },
      {
        type: 'SECURE_INPUT_REQUEST',
        status: 'SECURE_INPUT_REQUIRED',
        secureInputType: 'ACCOUNT_PASSWORD',
        message: '계좌 비밀번호를 직접 입력해 주세요.'
      },
      {
        type: 'FINAL_CONFIRMATION_REQUEST',
        status: 'FINAL_CONFIRMATION_REQUIRED',
        confirmationId: 'confirm-001',
        message: '홍길동에게 10만 원을 송금합니다. 진행할까요?',
        summary: {
          transactionType: '계좌이체',
          sourceAccountLabel: '생활비 계좌',
          recipient: '홍길동',
          amount: 100000
        }
      }
    ] satisfies ServerWebSocketEvent[];

    expect(events.map(({ type }) => type)).toEqual([
      'BROWSER_FRAME',
      'WORKFLOW_STATUS_CHANGED',
      'TARGET_HIGHLIGHT',
      'USER_DECISION_REQUEST',
      'SECURE_INPUT_REQUEST',
      'FINAL_CONFIRMATION_REQUEST'
    ]);
  });

  it('클라이언트 이벤트 예시를 허용한다', () => {
    const events = [
      {
        type: 'USER_BROWSER_ACTION',
        sessionId: 'bs-20260727-001',
        action: 'CLICK',
        x: 510,
        y: 340
      },
      {
        type: 'PAUSE_WORKFLOW',
        sessionId: 'bs-20260727-001'
      },
      {
        type: 'CANCEL_WORKFLOW',
        sessionId: 'bs-20260727-001'
      }
    ] satisfies ClientWebSocketEvent[];

    expect(events).toHaveLength(3);
  });

  it('허용되지 않은 브라우저 Action을 거부한다', () => {
    const event: UserBrowserActionEvent = {
      type: 'USER_BROWSER_ACTION',
      sessionId: 'bs-20260727-001',
      // @ts-expect-error STOP은 프론트 사용자 동작으로 허용되지 않는다.
      action: 'STOP'
    };

    expect(event.action).toBe('STOP');
  });
});
