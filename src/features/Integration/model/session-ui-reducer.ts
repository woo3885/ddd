import type {
  SessionUiEvent,
  SessionUiSnapshot
} from '@/features/Integration/api/session-status-transport';
import type { WorkflowStatus } from '@/types/frontend-state';
import {
  TERMINAL_WORKFLOW_STATUSES,
  createInitialSessionUiState,
  defaultWorkflowMessage,
  isTargetAllowed,
  statusFromSnapshot,
  type SessionFrameIdentity,
  type SessionUiState
} from './session-ui-state';

export type SessionUiAction =
  | { type: 'RESET'; sessionId: string; initialStatus?: WorkflowStatus }
  | { type: 'SYNC_STARTED' }
  | { type: 'CONNECTED' }
  | { type: 'DISCONNECTED' }
  | { type: 'SAFE_ERROR'; message: string }
  | { type: 'SNAPSHOT_REPLACED'; snapshot: SessionUiSnapshot }
  | { type: 'EVENT_RECEIVED'; event: SessionUiEvent }
  | { type: 'FRAME_OBSERVED'; frame: SessionFrameIdentity | null };

function isSameSession(state: SessionUiState, sessionId: string): boolean {
  return state.sessionId === sessionId;
}

function messageForEvent(
  event: SessionUiEvent,
  status: SessionUiState['workflowStatus']
): string {
  return event.message ?? defaultWorkflowMessage(status);
}

function applyEvent(
  state: SessionUiState,
  event: SessionUiEvent
): SessionUiState {
  if (
    !isSameSession(state, event.sessionId) ||
    (state.lastEventSequence !== null &&
      event.eventSequence <= state.lastEventSequence)
  ) {
    return state;
  }

  const sequenceState = {
    ...state,
    lastEventSequence: event.eventSequence,
    safeError: ''
  };

  switch (event.eventType) {
    case 'STATE': {
      const nextStatus = event.status;
      if (nextStatus === null) return sequenceState;
      if (
        TERMINAL_WORKFLOW_STATUSES.has(state.workflowStatus) &&
        nextStatus !== state.workflowStatus
      ) {
        return sequenceState;
      }
      return {
        ...sequenceState,
        workflowStatus: nextStatus,
        guideMessage: messageForEvent(event, nextStatus),
        target: isTargetAllowed(nextStatus) ? state.target : null
      };
    }
    case 'GUIDE':
      return {
        ...sequenceState,
        guideMessage: messageForEvent(event, state.workflowStatus)
      };
    case 'TARGET':
      return {
        ...sequenceState,
        target: isTargetAllowed(state.workflowStatus) ? event.target : null
      };
    case 'TARGET_CLEAR':
      return { ...sequenceState, target: null };
  }
}

function replaceSnapshot(
  state: SessionUiState,
  snapshot: SessionUiSnapshot
): SessionUiState {
  if (
    !isSameSession(state, snapshot.sessionId) ||
    (state.lastEventSequence !== null &&
      snapshot.latestEventSequence < state.lastEventSequence)
  ) {
    return state;
  }

  let workflowStatus = statusFromSnapshot(snapshot, state.workflowStatus);
  if (
    TERMINAL_WORKFLOW_STATUSES.has(state.workflowStatus) &&
    workflowStatus !== state.workflowStatus
  ) {
    workflowStatus = state.workflowStatus;
  }
  const guideMessage =
    snapshot.guide?.message ??
    snapshot.state?.message ??
    defaultWorkflowMessage(workflowStatus);
  const target =
    isTargetAllowed(workflowStatus) && snapshot.target?.target
      ? snapshot.target.target
      : null;

  return {
    ...state,
    workflowStatus,
    guideMessage,
    lastEventSequence: snapshot.latestEventSequence,
    target,
    safeError: ''
  };
}

export function sessionUiReducer(
  state: SessionUiState,
  action: SessionUiAction
): SessionUiState {
  switch (action.type) {
    case 'RESET':
      return createInitialSessionUiState(
        action.sessionId,
        action.initialStatus ?? 'SESSION_CREATED'
      );
    case 'SYNC_STARTED':
      return {
        ...state,
        connectionPhase: 'RESYNCING',
        target: null,
        safeError: ''
      };
    case 'CONNECTED':
      return { ...state, connectionPhase: 'CONNECTED', safeError: '' };
    case 'DISCONNECTED':
      return {
        ...state,
        connectionPhase: 'DISCONNECTED',
        target: null,
        safeError: '실시간 상태 연결이 끊겼습니다. 자동으로 복구하고 있습니다.'
      };
    case 'SAFE_ERROR':
      return {
        ...state,
        connectionPhase: 'ERROR',
        target: null,
        safeError: action.message
      };
    case 'SNAPSHOT_REPLACED':
      return replaceSnapshot(state, action.snapshot);
    case 'EVENT_RECEIVED':
      return applyEvent(state, action.event);
    case 'FRAME_OBSERVED': {
      const target = state.target;
      if (!target || !action.frame) return state;
      const frameIsNewer = action.frame.sequence > target.frameSequence;
      const sameSequenceDifferentFrame =
        action.frame.sequence === target.frameSequence &&
        action.frame.frameId !== target.frameId;
      return frameIsNewer || sameSequenceDifferentFrame
        ? { ...state, target: null }
        : state;
    }
  }
}
