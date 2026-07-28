// contracts/api.ts
// 금융길잡이 AI 공통 API 계약
// D1 공통 개발 규격 기준

// -----------------------------------------------------------------------------
// 1. Common Workflow Types
// -----------------------------------------------------------------------------

export type WorkflowStatus =
  | 'SESSION_CREATED'
  | 'PAGE_LOADING'
  | 'AI_EXECUTING'
  | 'USER_DECISION_REQUIRED'
  | 'SECURE_INPUT_REQUIRED'
  | 'FINAL_CONFIRMATION_REQUIRED'
  | 'ADDITIONAL_INFORMATION_REQUIRED'
  | 'RISK_WARNING'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'ERROR'
  | 'TERMINATED';

export type BrowserActionType =
  | 'NONE'
  | 'CLICK'
  | 'TYPE'
  | 'SELECT'
  | 'SCROLL'
  | 'PRESS_KEY'
  | 'GO_BACK'
  | 'REFRESH'
  | 'WAIT'
  | 'WAIT_FOR_USER'
  | 'PAUSE_FOR_SECURE_INPUT'
  | 'REQUEST_FINAL_CONFIRMATION'
  | 'STOP';

export interface OverlayCoords {
  x: number;
  y: number;
  width: number;
  height: number;
}

// -----------------------------------------------------------------------------
// 2. Browser Session REST API
// -----------------------------------------------------------------------------

export interface CreateSessionRequest {
  siteId: string;
  initialUrl: string;
}

export interface CreateSessionResponse {
  sessionId: string;
  status: WorkflowStatus;
  webSocketUrl: string;
}

export interface NavigateSessionRequest {
  url: string;
}

export type DecisionType =
  | 'PRODUCT_SELECTION'
  | 'SOURCE_ACCOUNT_SELECTION'
  | 'RECIPIENT_SELECTION'
  | 'TERMS_AGREEMENT'
  | 'ADDITIONAL_INFORMATION';

export interface SubmitDecisionRequest {
  decisionType: DecisionType;
  selectedOptionIds: string[];
}

export interface SubmitConfirmationRequest {
  confirmationId: string;
  approved: boolean;
}

export interface SecureInputCompleteRequest {
  completed: boolean;
}

// -----------------------------------------------------------------------------
// 3. Browser DOM and Action Types
// -----------------------------------------------------------------------------

/**
 * Backend 내부에서만 사용할 수 있는 원본 DOM Snapshot.
 * html은 AI Engine으로 직접 전달하지 않는다.
 */
export interface InternalDomSnapshot {
  sessionId: string;
  html: string;
  capturedAt?: number;
}

/**
 * AI에 전달 가능한 정제된 페이지 요소.
 * 실제 input value, 비밀번호, OTP 등 민감정보는 포함하지 않는다.
 */
export interface PageElement {
  elementId: string;
  tag: string;
  role?: string | null;
  text?: string | null;
  ariaLabel?: string | null;
  visible: boolean;
  enabled: boolean;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

export interface SanitizedPageSnapshot {
  url: string;
  title: string;
  elements: PageElement[];
}

export interface RemoteActionRequest {
  sessionId: string;
  action: BrowserActionType;
  targetElementId?: string | null;
  inputValue?: string | number | null;
  payload?: Record<string, unknown>;
}

// -----------------------------------------------------------------------------
// 4. AI Intent and Request Types
// -----------------------------------------------------------------------------

export type IntentType =
  | 'OPEN_DEPOSIT'
  | 'TRANSFER_MONEY'
  | 'POSSIBLE_VOICE_PHISHING'
  | 'NAVIGATE_MENU'
  | 'REQUEST_PRODUCT_INFO'
  | 'CANCEL_WORKFLOW'
  | 'PAUSE_WORKFLOW'
  | 'UNKNOWN';

export interface UserGoal {
  intent: IntentType;
  originalText: string;
  amount?: number | null;
  periodMonths?: number | null;
  recipientText?: string | null;
  sourceAccountText?: string | null;
}

export interface PreviousAction {
  action: BrowserActionType;
  targetElementId?: string | null;
}

export interface WorkflowContext {
  status: WorkflowStatus;
  currentStep: number;
  previousActions: PreviousAction[];
}

export interface AIRequest {
  requestId: string;
  sessionId: string;
  userGoal: UserGoal;
  workflowContext: WorkflowContext;
  page: SanitizedPageSnapshot;
}

// -----------------------------------------------------------------------------
// 5. AI Response Types
// -----------------------------------------------------------------------------

export type SecureInputType =
  | 'PASSWORD'
  | 'ACCOUNT_PASSWORD'
  | 'OTP'
  | 'SMS_CODE'
  | 'SECURITY_CARD'
  | 'CERTIFICATE_PASSWORD'
  | 'CARD_PASSWORD'
  | 'BIOMETRIC_AUTH';

export type RiskType =
  | 'POSSIBLE_VOICE_PHISHING'
  | 'SUSPICIOUS_TRANSFER_REQUEST';

export interface AIResponseOption {
  id: string;
  label: string;
  required?: boolean;
}

export interface TransactionSummary {
  transactionType?: string;
  sourceAccountLabel?: string;
  recipient?: string;
  amount?: number;
  productName?: string;
  periodMonths?: number;
  [key: string]: unknown;
}

export interface AIResponse {
  requestId: string;
  status: WorkflowStatus;
  action: BrowserActionType;
  targetElementId?: string | null;
  inputValue?: string | number | null;
  message: string;
  confidence?: number | null;
  requiresUserAction: boolean;
  decisionType?: DecisionType | null;
  secureInputType?: SecureInputType | null;
  riskType?: RiskType | null;
  options?: AIResponseOption[] | null;
  confirmationId?: string | null;
  summary?: TransactionSummary | null;
}

// -----------------------------------------------------------------------------
// 6. WebSocket Events: Backend -> Frontend
// -----------------------------------------------------------------------------

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
  } & OverlayCoords;
  message: string;
}

export interface UserDecisionRequestEvent {
  type: 'USER_DECISION_REQUEST';
  sessionId: string;
  status: 'USER_DECISION_REQUIRED';
  decisionType: DecisionType;
  message: string;
  options: AIResponseOption[];
}

export interface SecureInputRequestEvent {
  type: 'SECURE_INPUT_REQUEST';
  sessionId: string;
  status: 'SECURE_INPUT_REQUIRED';
  secureInputType: SecureInputType;
  message: string;
}

export interface FinalConfirmationRequestEvent {
  type: 'FINAL_CONFIRMATION_REQUEST';
  sessionId: string;
  status: 'FINAL_CONFIRMATION_REQUIRED';
  confirmationId: string;
  message: string;
  summary: TransactionSummary;
}

export type BackendToFrontendEvent =
  | BrowserFrameEvent
  | WorkflowStatusChangedEvent
  | TargetHighlightEvent
  | UserDecisionRequestEvent
  | SecureInputRequestEvent
  | FinalConfirmationRequestEvent;

// -----------------------------------------------------------------------------
// 7. WebSocket Events: Frontend -> Backend
// -----------------------------------------------------------------------------

export interface UserBrowserActionEvent {
  type: 'USER_BROWSER_ACTION';
  sessionId: string;
  action: 'CLICK' | 'SCROLL';
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

export type FrontendToBackendEvent =
  | UserBrowserActionEvent
  | PauseWorkflowEvent
  | CancelWorkflowEvent;

// -----------------------------------------------------------------------------
// 8. Security and Session Types
// -----------------------------------------------------------------------------

export interface SecuritySignal {
  sessionId: string;
  hasPasswordField: boolean;
  hasSensitivePattern: boolean;
  secureInputType?: SecureInputType;
}

export interface SecurityModeResponse {
  status: 'SECURE_INPUT_REQUIRED';
  reason?: string;
}

export interface SessionHeartbeat {
  sessionId: string;
  expiresAt: string;
}