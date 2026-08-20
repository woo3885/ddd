import type {
  SessionTarget,
  SessionUiSnapshot
} from '@/features/Integration/api/session-status-transport';
import { getWorkflowStatusPresentation } from '@/shared/model/workflow-status-presentation';
import type { WorkflowStatus } from '@/types/frontend-state';

export type SessionUiConnectionPhase =
  | 'CONNECTING'
  | 'RESYNCING'
  | 'CONNECTED'
  | 'DISCONNECTED'
  | 'ERROR';

export interface SessionUiState {
  sessionId: string;
  workflowStatus: WorkflowStatus;
  guideMessage: string;
  lastEventSequence: number | null;
  target: SessionTarget | null;
  connectionPhase: SessionUiConnectionPhase;
  safeError: string;
}

export const TARGET_BLOCKED_STATUSES: ReadonlySet<WorkflowStatus> = new Set([
  'SECURE_INPUT_REQUIRED',
  'FINAL_CONFIRMATION_REQUIRED',
  'RISK_WARNING',
  'COMPLETED',
  'CANCELLED',
  'ERROR',
  'TERMINATED'
]);

export const VIEWER_ACTION_BLOCKED_STATUSES = TARGET_BLOCKED_STATUSES;

export const TERMINAL_WORKFLOW_STATUSES: ReadonlySet<WorkflowStatus> = new Set([
  'COMPLETED',
  'CANCELLED',
  'TERMINATED'
]);

export function defaultWorkflowMessage(status: WorkflowStatus): string {
  return getWorkflowStatusPresentation(status).description;
}

export function createInitialSessionUiState(
  sessionId: string,
  initialStatus: WorkflowStatus = 'SESSION_CREATED'
): SessionUiState {
  return {
    sessionId,
    workflowStatus: initialStatus,
    guideMessage: defaultWorkflowMessage(initialStatus),
    lastEventSequence: null,
    target: null,
    connectionPhase: 'CONNECTING',
    safeError: ''
  };
}

export function isTargetAllowed(status: WorkflowStatus): boolean {
  return !TARGET_BLOCKED_STATUSES.has(status);
}

export function isViewerActionAllowed(status: WorkflowStatus): boolean {
  return !VIEWER_ACTION_BLOCKED_STATUSES.has(status);
}

export interface SessionFrameIdentity {
  frameId: string;
  sequence: number;
}

export function isTargetMatchingFrame(
  target: SessionTarget | null,
  frame: SessionFrameIdentity | null
): boolean {
  if (target === null) return true;
  return (
    frame !== null &&
    target.frameId === frame.frameId &&
    target.frameSequence === frame.sequence
  );
}

export function selectVisibleSessionTarget(input: {
  state: SessionUiState;
  frame: SessionFrameIdentity | null;
  frameReady: boolean;
  frameReconnecting: boolean;
  actionPending: boolean;
}): SessionTarget | null {
  const { state, frame, frameReady, frameReconnecting, actionPending } = input;
  if (
    state.connectionPhase !== 'CONNECTED' ||
    !frameReady ||
    frameReconnecting ||
    actionPending ||
    !isTargetAllowed(state.workflowStatus) ||
    !isTargetMatchingFrame(state.target, frame)
  ) {
    return null;
  }
  return state.target;
}

export function statusFromSnapshot(
  snapshot: SessionUiSnapshot,
  fallback: WorkflowStatus
): WorkflowStatus {
  return snapshot.state?.status ?? fallback;
}
