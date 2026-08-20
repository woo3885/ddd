import { describe, expect, it } from 'vitest';

import type {
  SessionDecision,
  SessionTarget,
  SessionUiEvent,
  SessionUiSnapshot
} from '@/features/Integration/api/session-status-transport';
import type { WorkflowStatus } from '@/types/frontend-state';
import { sessionUiReducer } from './session-ui-reducer';
import {
  createInitialSessionUiState,
  selectVisibleSessionTarget
} from './session-ui-state';

const SESSION_ID = 'session-001';
const STATUSES: WorkflowStatus[] = [
  'SESSION_CREATED',
  'PAGE_LOADING',
  'AI_EXECUTING',
  'USER_DECISION_REQUIRED',
  'SECURE_INPUT_REQUIRED',
  'FINAL_CONFIRMATION_REQUIRED',
  'ADDITIONAL_INFORMATION_REQUIRED',
  'RISK_WARNING',
  'COMPLETED',
  'CANCELLED',
  'ERROR',
  'TERMINATED'
];

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

const DECISION: SessionDecision = {
  requestId: 'req-001',
  decisionId: 'dec-001',
  decisionType: 'PRODUCT_SELECTION',
  options: [
    {
      id: 'option-001',
      label: '첫 번째 상품',
      required: false,
      checked: false,
      disabled: false
    },
    {
      id: 'option-002',
      label: '두 번째 상품',
      required: false,
      checked: true,
      disabled: false
    }
  ],
  frameId: 'frm-001',
  frameSequence: 3,
  sourceSnapshotId: 'snap-001'
};

function event(
  eventSequence: number,
  eventType: SessionUiEvent['eventType'],
  overrides: Partial<SessionUiEvent> = {}
): SessionUiEvent {
  return {
    eventId: `evt-${eventSequence}`,
    eventSequence,
    eventType,
    sessionId: SESSION_ID,
    status: eventType === 'STATE' ? 'AI_EXECUTING' : null,
    message: '안전한 실시간 안내입니다.',
    actionRequired: false,
    target: eventType === 'TARGET' ? TARGET : null,
    decision: eventType === 'DECISION_REQUIRED' ? DECISION : null,
    occurredAt: '2026-08-19T12:00:00Z',
    ...overrides
  };
}

describe('sessionUiReducer', () => {
  it.each(STATUSES)('%s 상태를 live event로 반영한다', (status) => {
    const state = sessionUiReducer(createInitialSessionUiState(SESSION_ID), {
      type: 'EVENT_RECEIVED',
      event: event(1, 'STATE', { status })
    });

    expect(state.workflowStatus).toBe(status);
    expect(state.lastEventSequence).toBe(1);
  });

  it('다른 session과 duplicate·stale sequence를 무시한다', () => {
    const initial = createInitialSessionUiState(SESSION_ID);
    const current = sessionUiReducer(initial, {
      type: 'EVENT_RECEIVED',
      event: event(3, 'STATE', { status: 'PAGE_LOADING' })
    });
    const duplicate = sessionUiReducer(current, {
      type: 'EVENT_RECEIVED',
      event: event(3, 'STATE', { status: 'ERROR' })
    });
    const otherSession = sessionUiReducer(current, {
      type: 'EVENT_RECEIVED',
      event: event(4, 'STATE', {
        sessionId: 'session-other',
        status: 'ERROR'
      })
    });

    expect(duplicate).toBe(current);
    expect(otherSession).toBe(current);
  });

  it('terminal 상태 이후 실행 상태 역행을 차단하되 sequence는 소비한다', () => {
    const completed = sessionUiReducer(createInitialSessionUiState(SESSION_ID), {
      type: 'EVENT_RECEIVED',
      event: event(1, 'STATE', { status: 'COMPLETED' })
    });
    const regressed = sessionUiReducer(completed, {
      type: 'EVENT_RECEIVED',
      event: event(2, 'STATE', { status: 'AI_EXECUTING' })
    });

    expect(regressed.workflowStatus).toBe('COMPLETED');
    expect(regressed.lastEventSequence).toBe(2);
  });

  it('snapshot을 원자적으로 교체하고 이후 큰 sequence event만 반영한다', () => {
    const snapshot: SessionUiSnapshot = {
      sessionId: SESSION_ID,
      latestEventSequence: 5,
      state: event(3, 'STATE', { status: 'PAGE_LOADING' }),
      guide: event(4, 'GUIDE', { message: '페이지를 준비하고 있습니다.' }),
      target: event(5, 'TARGET'),
      decision: null
    };
    const replaced = sessionUiReducer(createInitialSessionUiState(SESSION_ID), {
      type: 'SNAPSHOT_REPLACED',
      snapshot
    });
    const stale = sessionUiReducer(replaced, {
      type: 'EVENT_RECEIVED',
      event: event(4, 'TARGET_CLEAR')
    });
    const current = sessionUiReducer(stale, {
      type: 'EVENT_RECEIVED',
      event: event(6, 'TARGET_CLEAR')
    });

    expect(replaced).toMatchObject({
      workflowStatus: 'PAGE_LOADING',
      guideMessage: '페이지를 준비하고 있습니다.',
      lastEventSequence: 5,
      target: TARGET
    });
    expect(stale).toBe(replaced);
    expect(current.target).toBeNull();
  });

  it('Target과 TARGET_CLEAR를 즉시 반영한다', () => {
    const targeted = sessionUiReducer(createInitialSessionUiState(SESSION_ID), {
      type: 'EVENT_RECEIVED',
      event: event(1, 'TARGET')
    });
    const cleared = sessionUiReducer(targeted, {
      type: 'EVENT_RECEIVED',
      event: event(2, 'TARGET_CLEAR')
    });

    expect(targeted.target).toEqual(TARGET);
    expect(cleared.target).toBeNull();
  });

  it.each([
    'SECURE_INPUT_REQUIRED',
    'FINAL_CONFIRMATION_REQUIRED',
    'RISK_WARNING',
    'COMPLETED',
    'CANCELLED',
    'ERROR',
    'TERMINATED'
  ] as WorkflowStatus[])('%s 상태가 되면 Target을 제거한다', (status) => {
    const targeted = sessionUiReducer(createInitialSessionUiState(SESSION_ID), {
      type: 'EVENT_RECEIVED',
      event: event(1, 'TARGET')
    });
    const blocked = sessionUiReducer(targeted, {
      type: 'EVENT_RECEIVED',
      event: event(2, 'STATE', { status })
    });

    expect(blocked.target).toBeNull();
  });

  it('Target 선도착은 보관하고 matching frame에서만 표시한다', () => {
    const state = sessionUiReducer(createInitialSessionUiState(SESSION_ID), {
      type: 'EVENT_RECEIVED',
      event: event(1, 'TARGET')
    });
    const connected = sessionUiReducer(state, { type: 'CONNECTED' });

    expect(
      selectVisibleSessionTarget({
        state: connected,
        frame: { frameId: 'frm-old', sequence: 2 },
        frameReady: true,
        frameReconnecting: false,
        actionPending: false
      })
    ).toBeNull();
    expect(
      selectVisibleSessionTarget({
        state: connected,
        frame: { frameId: 'frm-001', sequence: 3 },
        frameReady: true,
        frameReconnecting: false,
        actionPending: false
      })
    ).toEqual(TARGET);
  });

  it('더 큰 frame이 먼저 도착하면 stale Target을 폐기한다', () => {
    const targeted = sessionUiReducer(createInitialSessionUiState(SESSION_ID), {
      type: 'EVENT_RECEIVED',
      event: event(1, 'TARGET')
    });
    const nextFrame = sessionUiReducer(targeted, {
      type: 'FRAME_OBSERVED',
      frame: { frameId: 'frm-002', sequence: 4 }
    });

    expect(nextFrame.target).toBeNull();
  });

  it('reconnect 시작 시 이전 Target을 제거한다', () => {
    const targeted = sessionUiReducer(createInitialSessionUiState(SESSION_ID), {
      type: 'EVENT_RECEIVED',
      event: event(1, 'TARGET')
    });
    const resyncing = sessionUiReducer(targeted, { type: 'SYNC_STARTED' });

    expect(resyncing.connectionPhase).toBe('RESYNCING');
    expect(resyncing.target).toBeNull();
  });

  it('새 decision의 checked 상태를 초기화하고 같은 decision 갱신에서는 선택을 보존한다', () => {
    const received = sessionUiReducer(createInitialSessionUiState(SESSION_ID), {
      type: 'EVENT_RECEIVED',
      event: event(1, 'DECISION_REQUIRED')
    });
    const selected = sessionUiReducer(received, {
      type: 'DECISION_OPTION_SELECTED',
      decisionId: DECISION.decisionId,
      optionId: 'option-001'
    });
    const duplicatePayload = sessionUiReducer(selected, {
      type: 'EVENT_RECEIVED',
      event: event(2, 'DECISION_REQUIRED', {
        decision: { ...DECISION, options: [...DECISION.options] }
      })
    });

    expect(received.selectedOptionId).toBe('option-002');
    expect(received.decisionSubmitPhase).toBe('SELECTING');
    expect(selected.selectedOptionId).toBe('option-001');
    expect(duplicatePayload.selectedOptionId).toBe('option-001');
  });

  it('약관 checked를 초기 선택으로 보존하고 필수 약관 Gate를 적용한다', () => {
    const terms: SessionDecision = {
      ...DECISION,
      decisionId: 'dec-terms',
      decisionType: 'TERMS_AGREEMENT',
      options: [
        { ...DECISION.options[0], id: 'term-required', required: true },
        { ...DECISION.options[1], id: 'term-optional', checked: true }
      ]
    };
    const received = sessionUiReducer(createInitialSessionUiState(SESSION_ID), {
      type: 'EVENT_RECEIVED',
      event: event(1, 'DECISION_REQUIRED', { decision: terms })
    });
    const selected = sessionUiReducer(received, {
      type: 'DECISION_TERM_TOGGLED',
      decisionId: terms.decisionId,
      optionId: 'term-required',
      selected: true
    });

    expect([...received.selectedTermIds]).toEqual(['term-optional']);
    expect(selected.selectedTermIds).toEqual(
      new Set(['term-required', 'term-optional'])
    );
  });

  it('ACK 후 resume을 기다리고 RESOLVED·CLEAR에서 decision을 제거한다', () => {
    const received = sessionUiReducer(createInitialSessionUiState(SESSION_ID), {
      type: 'EVENT_RECEIVED',
      event: event(1, 'DECISION_REQUIRED')
    });
    const submitting = sessionUiReducer(received, {
      type: 'DECISION_SUBMIT_STARTED',
      decisionId: DECISION.decisionId
    });
    const waiting = sessionUiReducer(submitting, {
      type: 'DECISION_SUBMIT_ACKNOWLEDGED',
      decisionId: DECISION.decisionId
    });
    const resolved = sessionUiReducer(waiting, {
      type: 'EVENT_RECEIVED',
      event: event(2, 'DECISION_RESOLVED')
    });

    expect(submitting.decisionSubmitPhase).toBe('SUBMITTING');
    expect(waiting.decisionSubmitPhase).toBe('WAITING_FOR_RESUME');
    expect(resolved.activeDecision).toBeNull();
    expect(resolved.decisionSubmitPhase).toBe('IDLE');
  });

  it.each([
    'SECURE_INPUT_REQUIRED',
    'FINAL_CONFIRMATION_REQUIRED',
    'RISK_WARNING',
    'COMPLETED',
    'CANCELLED',
    'ERROR',
    'TERMINATED'
  ] as WorkflowStatus[])('%s 상태에서 active decision을 즉시 제거한다', (status) => {
    const received = sessionUiReducer(createInitialSessionUiState(SESSION_ID), {
      type: 'EVENT_RECEIVED',
      event: event(1, 'DECISION_REQUIRED')
    });
    const blocked = sessionUiReducer(received, {
      type: 'EVENT_RECEIVED',
      event: event(2, 'STATE', { status })
    });
    expect(blocked.activeDecision).toBeNull();
  });

  it('decision frame보다 새로운 frame을 관찰하면 stale decision을 폐기한다', () => {
    const received = sessionUiReducer(createInitialSessionUiState(SESSION_ID), {
      type: 'EVENT_RECEIVED',
      event: event(1, 'DECISION_REQUIRED')
    });
    const stale = sessionUiReducer(received, {
      type: 'FRAME_OBSERVED',
      frame: { frameId: 'frm-002', sequence: 4 }
    });
    expect(stale.activeDecision).toBeNull();
  });
});
