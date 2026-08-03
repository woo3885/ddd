export type WorkflowStatus =
  | "SESSION_CREATED"
  | "PAGE_LOADING"
  | "AI_EXECUTING"
  | "USER_DECISION_REQUIRED"
  | "SECURE_INPUT_REQUIRED"
  | "FINAL_CONFIRMATION_REQUIRED"
  | "ADDITIONAL_INFORMATION_REQUIRED"
  | "RISK_WARNING"
  | "COMPLETED"
  | "CANCELLED"
  | "ERROR"
  | "TERMINATED";

export type BrowserActionType =
  | "NONE"
  | "CLICK"
  | "TYPE"
  | "SELECT"
  | "SCROLL"
  | "PRESS_KEY"
  | "GO_BACK"
  | "REFRESH"
  | "WAIT"
  | "WAIT_FOR_USER"
  | "PAUSE_FOR_SECURE_INPUT"
  | "REQUEST_FINAL_CONFIRMATION"
  | "STOP";

export interface StructuredAIResponse {
  requestId: string;
  status: WorkflowStatus;
  action: BrowserActionType;

  targetElementId: string | null;
  inputValue: string | number | null;

  message: string;
  confidence: number | null;
  requiresUserAction: boolean;

  decisionType: string | null;
  secureInputType: string | null;
  riskType: string | null;
  options: unknown[] | null;
  confirmationId: string | null;
  summary: Record<string, unknown> | null;
}