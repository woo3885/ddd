export interface BackendUserGoal {
  rawMessage: string;
  intent: string;
  amount?: number;
  recipient?: string;
  conditions?: string[];
}

export interface BackendSanitizedDomElement {
  elementId: string;
  tag: string;
  role?: string | null;
  text?: string | null;
  ariaLabel?: string | null;
  placeholder?: string | null;
  inputType?: string | null;
  visible: boolean;
  enabled: boolean;
}

export interface BackendSanitizedDomSnapshot {
  schemaVersion: string;
  snapshotId: string;

  page: {
    url: string;
    title: string;
  };

  elements: BackendSanitizedDomElement[];
}

export interface AiActionRequest {
  requestId: string;
  sessionId: string;
  userGoal: BackendUserGoal;
  domSnapshot: BackendSanitizedDomSnapshot;
}