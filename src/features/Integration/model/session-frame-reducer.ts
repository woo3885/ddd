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
  | (ScopedAction & { type: 'DISCONNECTED' })
  | (ScopedAction & { type: 'SAFE_ERROR'; message?: string })
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
      return {
        ...state,
        phase: 'WAITING_FIRST_FRAME',
        message: SESSION_FRAME_MESSAGES.WAITING_FIRST_FRAME,
        canReset: true
      };
    case 'FRAME_RECEIVED':
      return {
        ...state,
        phase: 'FRAME_READY',
        message: SESSION_FRAME_MESSAGES.FRAME_READY,
        frame: action.frame,
        hasReceivedFirstFrame: true,
        canReset: true
      };
    case 'DISCONNECTED':
      return {
        ...state,
        phase: 'DISCONNECTED',
        message: SESSION_FRAME_MESSAGES.DISCONNECTED,
        frame: undefined,
        canReset: true
      };
    case 'SAFE_ERROR':
      return {
        ...state,
        phase: 'ERROR',
        message: safeErrorMessage(action.message),
        frame: undefined,
        canReset: true
      };
    case 'RESET':
      return createInitialSessionFrameState(action.nextRunId);
  }
}
