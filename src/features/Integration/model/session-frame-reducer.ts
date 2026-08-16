import {
  createInitialSessionFrameState,
  SESSION_FRAME_MESSAGES,
  type SessionFrameState
} from '@/features/Integration/model/session-frame-state';
import type { SessionViewerFrame } from '@/features/Integration/api/session-frame-transport';

type ScopedAction = { runId: number };

export type SessionFrameAction =
  | (ScopedAction & { type: 'START_REQUESTED' })
  | (ScopedAction & { type: 'SESSION_CREATED' })
  | (ScopedAction & { type: 'FRAME_CONNECTED' })
  | (ScopedAction & { type: 'FRAME_RECEIVED'; frame: SessionViewerFrame })
  | (ScopedAction & {
      type: 'DISCONNECTED';
      message?: string;
      canRetryManually?: boolean;
    })
  | (ScopedAction & {
      type: 'RECONNECT_SCHEDULED';
      attempt: number;
      maxAttempts: number;
    })
  | (ScopedAction & { type: 'MANUAL_RETRY_STARTED' })
  | (ScopedAction & { type: 'RECOVERY_FAILED'; message?: string })
  | (ScopedAction & {
      type: 'SAFE_ERROR';
      message?: string;
      canRetryManually?: boolean;
    })
  | { type: 'RESET'; nextRunId: number };

function isStale(state: SessionFrameState, action: SessionFrameAction): boolean {
  if (action.type === 'RESET') return false;
  if (action.type === 'START_REQUESTED') return action.runId <= state.runId;
  return action.runId !== state.runId;
}

function safeErrorMessage(message?: string): string {
  const normalized = message?.trim();
  return normalized || SESSION_FRAME_MESSAGES.ERROR;
}

export function sessionFrameReducer(
  state: SessionFrameState,
  action: SessionFrameAction
): SessionFrameState {
  if (isStale(state, action)) return state;

  switch (action.type) {
    case 'START_REQUESTED':
      return {
        ...createInitialSessionFrameState(action.runId),
        phase: 'CREATING_SESSION',
        message: SESSION_FRAME_MESSAGES.CREATING_SESSION,
        canReset: true
      };
    case 'SESSION_CREATED':
      return {
        ...state,
        phase: 'CONNECTING_FRAME',
        message: SESSION_FRAME_MESSAGES.CONNECTING_FRAME,
        canReset: true
      };
    case 'FRAME_CONNECTED':
      if (state.phase === 'RECONNECTING') {
        return {
          ...state,
          message: SESSION_FRAME_MESSAGES.RECONNECTING,
          recoveryPending: true,
          canRetryManually: false
        };
      }
      return {
        ...state,
        phase: 'WAITING_FIRST_FRAME',
        message: SESSION_FRAME_MESSAGES.WAITING_FIRST_FRAME,
        canReset: true,
        recoveryPending: false,
        canRetryManually: false
      };
    case 'FRAME_RECEIVED':
      return {
        ...state,
        phase: 'FRAME_READY',
        message: SESSION_FRAME_MESSAGES.FRAME_READY,
        frame: action.frame,
        hasReceivedFirstFrame: true,
        canReset: true,
        recoveryAttempt: 0,
        canRetryManually: false,
        recoveryPending: false
      };
    case 'DISCONNECTED':
      return {
        ...state,
        phase: 'DISCONNECTED',
        message: safeErrorMessage(action.message ?? SESSION_FRAME_MESSAGES.DISCONNECTED),
        frame: undefined,
        canReset: true,
        canRetryManually: action.canRetryManually ?? false,
        recoveryPending: false
      };
    case 'RECONNECT_SCHEDULED':
      return {
        ...state,
        phase: 'RECONNECTING',
        message: SESSION_FRAME_MESSAGES.RECONNECTING,
        frame: undefined,
        canReset: true,
        recoveryAttempt: action.attempt,
        recoveryMaxAttempts: action.maxAttempts,
        canRetryManually: false,
        recoveryPending: true
      };
    case 'MANUAL_RETRY_STARTED':
      return {
        ...state,
        phase: 'RECONNECTING',
        message: SESSION_FRAME_MESSAGES.RECONNECTING,
        frame: undefined,
        canReset: true,
        canRetryManually: false,
        recoveryPending: true
      };
    case 'RECOVERY_FAILED':
      return {
        ...state,
        phase: 'ERROR',
        message: safeErrorMessage(
          action.message ?? '원격 화면 연결을 복구하지 못했습니다. 다시 연결해 주세요.'
        ),
        frame: undefined,
        canReset: true,
        canRetryManually: true,
        recoveryPending: false
      };
    case 'SAFE_ERROR':
      return {
        ...state,
        phase: 'ERROR',
        message: safeErrorMessage(action.message),
        frame: undefined,
        canReset: true,
        canRetryManually: action.canRetryManually ?? false,
        recoveryPending: false
      };
    case 'RESET':
      return createInitialSessionFrameState(action.nextRunId);
  }
}
