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

export type ScreenType =
  | 'SESSION_READY'
  | 'BROWSER_LOADING'
  | 'AI_PROGRESS'
  | 'PRODUCT_SELECTION'
  | 'ACCOUNT_SELECTION'
  | 'RECIPIENT_SELECTION'
  | 'TERMS_AGREEMENT'
  | 'ACCOUNT_PASSWORD'
  | 'OTP_INPUT'
  | 'CERTIFICATE_PASSWORD'
  | 'DEPOSIT_CONFIRMATION'
  | 'TRANSFER_CONFIRMATION'
  | 'USER_QUESTION'
  | 'VOICE_PHISHING_WARNING'
  | 'WORKFLOW_COMPLETED'
  | 'WORKFLOW_CANCELLED'
  | 'WORKFLOW_ERROR'
  | 'INITIAL_SCREEN';

export interface FrontendScreenState {
  sessionId: string | null;
  workflowStatus: WorkflowStatus;
  screenType: ScreenType;
  message: string;
  isConnected: boolean;
  isLoading: boolean;
}

export const initialFrontendScreenState: FrontendScreenState = {
  sessionId: null,
  workflowStatus: 'SESSION_CREATED',
  screenType: 'INITIAL_SCREEN',
  message: '',
  isConnected: false,
  isLoading: false
};
