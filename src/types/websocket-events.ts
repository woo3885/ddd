import type { WorkflowStatus } from '@/types/frontend-state';

export type BrowserActionType =
  | 'CLICK'
  | 'TYPE'
  | 'SELECT'
  | 'SCROLL'
  | 'PRESS_KEY'
  | 'GO_BACK'
  | 'REFRESH';

export interface BrowserFrameEvent {
  type: 'BROWSER_FRAME';
  sessionId: string;
  timestamp: number;
  width: number;
  height: number;
}

export interface WorkflowStatusChangedEvent {
  type: 'WORKFLOW_STATUS_CHANGED';
  sessionId: string;
  status: WorkflowStatus;
  message: string;
}

export interface TargetHighlightEvent {
  type: 'TARGET_HIGHLIGHT';
  sessionId: string;
  target: {
    elementId: string;
    x: number;
    y: number;
    width: number;
    height: number;
  };
  message: string;
}

export interface UserDecisionRequestEvent {
  type: 'USER_DECISION_REQUEST';
  status: 'USER_DECISION_REQUIRED';
  decisionType:
    | 'PRODUCT_SELECTION'
    | 'ACCOUNT_SELECTION'
    | 'RECIPIENT_SELECTION'
    | 'TERMS_AGREEMENT';
  message: string;
  options: Array<{
    id: string;
    label: string;
    required?: boolean;
  }>;
}

export interface SecureInputRequestEvent {
  type: 'SECURE_INPUT_REQUEST';
  status: 'SECURE_INPUT_REQUIRED';
  secureInputType:
    | 'ACCOUNT_PASSWORD'
    | 'OTP_INPUT'
    | 'CERTIFICATE_PASSWORD';
  message: string;
}

export interface FinalConfirmationRequestEvent {
  type: 'FINAL_CONFIRMATION_REQUEST';
  status: 'FINAL_CONFIRMATION_REQUIRED';
  confirmationId: string;
  message: string;
  summary: {
    transactionType: string;
    sourceAccountLabel: string;
    recipient: string;
    amount: number;
  };
}

export type ServerWebSocketEvent =
  | BrowserFrameEvent
  | WorkflowStatusChangedEvent
  | TargetHighlightEvent
  | UserDecisionRequestEvent
  | SecureInputRequestEvent
  | FinalConfirmationRequestEvent;

export interface UserBrowserActionEvent {
  type: 'USER_BROWSER_ACTION';
  sessionId: string;
  action: BrowserActionType;
  x?: number;
  y?: number;
}

export interface PauseWorkflowEvent {
  type: 'PAUSE_WORKFLOW';
  sessionId: string;
}

export interface CancelWorkflowEvent {
  type: 'CANCEL_WORKFLOW';
  sessionId: string;
}

export type ClientWebSocketEvent =
  | UserBrowserActionEvent
  | PauseWorkflowEvent
  | CancelWorkflowEvent;
