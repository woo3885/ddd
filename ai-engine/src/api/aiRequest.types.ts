export type BackendSecurityPolicy =
  | "NORMAL"
  | "USER_DECISION"
  | "SECURE_INPUT"
  | "FINAL_CONFIRMATION"
  | "BLOCKED";

export interface BackendBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BackendSanitizedDomElement {
  elementId: string;

  tag: string;

  role: string | null;

  text: string | null;

  ariaLabel: string | null;

  placeholder: string | null;

  inputType: string | null;

  visible: boolean;

  enabled: boolean;

  boundingBox: BackendBoundingBox | null;

  securityPolicy: BackendSecurityPolicy;
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

/**
 * B Backend -> C AI Engine HTTP 요청 계약
 *
 * Java:
 * AiDecisionRequest(
 *   String userRequest,
 *   SanitizedDomSnapshot snapshot
 * )
 */
export interface BackendAiDecisionRequest {
  userRequest: string;

  snapshot: BackendSanitizedDomSnapshot;

  userDecision?: {
    decisionId: string;
    decisionType:
      | "PRODUCT_SELECTION"
      | "SOURCE_ACCOUNT_SELECTION"
      | "RECIPIENT_SELECTION"
      | "TERMS_AGREEMENT"
      | "ADDITIONAL_INFORMATION";
    selectedOptionIds: string[];
    sourceSnapshotId: string;
  };
}

/**
 * C 내부 Structured Action Service에서 사용하는 요청 형태.
 *
 * Backend HTTP 계약과 AI Engine 내부 계약을 분리한다.
 */
export interface AiActionRequest {
  requestId: string;

  userGoal: {
    rawMessage: string;
    intent: string;
    amount?: number;
    recipient?: string;
    conditions?: string[];
  };

  domSnapshot: BackendSanitizedDomSnapshot;

  userDecision?: BackendAiDecisionRequest["userDecision"];
}
