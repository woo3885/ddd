import type {
  AiActionRequest,
} from "../api/aiRequest.types.js";

import type {
  StructuredAIResponse,
} from "../output/aiResponse.types.js";

import {
  sanitizeInternalMessage,
} from "../messages/messageSafety.js";

const USER_DECISION_MESSAGE =
  "사용자가 직접 선택해야 하는 항목입니다.";

function targetsProtectedUserDecision(
  response: StructuredAIResponse,
  request: AiActionRequest,
): boolean {
  if (!response.targetElementId) {
    return false;
  }

  const target = request.domSnapshot.elements.find(
    (element) =>
      element.elementId === response.targetElementId,
  );

  return target?.securityPolicy === "USER_DECISION";
}

function createSafeWaitResponse(
  response: StructuredAIResponse,
): StructuredAIResponse {
  return {
    ...response,
    status: "USER_DECISION_REQUIRED",
    action: "WAIT_FOR_USER",
    targetElementId: null,
    inputValue: null,
    message: USER_DECISION_MESSAGE,
    requiresUserAction: true,
    decisionType: null,
    secureInputType: null,
    riskType: null,
    options: null,
    confirmationId: null,
    summary: null,
  };
}

/**
 * Applies C's D24 safety boundary after model parsing.
 *
 * Model-provided decision metadata is never authoritative. Backend-verified
 * selections enter the agent only through UserDecisionContextStore.
 */
export function enforceUserDecisionPolicy(
  response: StructuredAIResponse,
  request: AiActionRequest,
): StructuredAIResponse {
  if (
    response.action === "WAIT_FOR_USER" ||
    response.status === "USER_DECISION_REQUIRED" ||
    targetsProtectedUserDecision(response, request)
  ) {
    return createSafeWaitResponse(response);
  }

  return {
    ...response,
    message: sanitizeInternalMessage(response.message),
  };
}
