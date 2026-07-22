export type SystemStatus = 'IDLE' | 'LOADING' | 'GUIDING' | 'SECURITY_MODE';

export interface OverlayCoords {
  x: number;
  y: number;
  width: number;
  height: number;
}

// 2. Backend Orchestrator API
export interface CreateSessionRequest {
  targetUrl: string;
}

export interface CreateSessionResponse {
  sessionId: string;
  status: SystemStatus;
}

export interface DomSnapshotResponse {
  sessionId: string;
  html: string;
  clickableElements: Array<{
    id: string;
    tag: string;
    text: string;
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
}

export interface RemoteActionRequest {
  sessionId: string;
  action: 'CLICK' | 'INPUT' | 'SCROLL' | 'BACK';
  payload?: Record<string, unknown>;
}

// 3. AI Agent API
export interface IntentClassifyRequest {
  sessionId: string;
  userInput: string;
}

export interface IntentClassifyResponse {
  intent: string;
  confidence: number;
}

export interface NextTargetRequest {
  sessionId: string;
  intent: string;
  dom: DomSnapshotResponse;
}

export interface NextTargetResponse {
  coords: OverlayCoords;
  guideMessage: string;
}

// 4. Security & Session API
export interface SecuritySignal {
  sessionId: string;
  hasPasswordField: boolean;
  hasSensitivePattern: boolean;
}

export interface SecurityModeResponse {
  status: SystemStatus;
  reason?: string;
}

export interface SessionHeartbeat {
  sessionId: string;
  expiresAt: string;
}
