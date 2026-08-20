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

function targetsResolvedUserDecision(
  response: StructuredAIResponse,
  request: AiActionRequest,
): boolean {
  return Boolean(
    response.targetElementId &&
    request.userDecisionContext
      ?.selectedOptionIds.includes(
        response.targetElementId,
      ),
  );
}

function assertProtectedStateConsistency(
  response: StructuredAIResponse,
): void {
  const secureSignal =
    response.status === "SECURE_INPUT_REQUIRED" ||
    response.action === "PAUSE_FOR_SECURE_INPUT" ||
    response.secureInputType !== null;
  const securePair =
    response.status === "SECURE_INPUT_REQUIRED" &&
    response.action === "PAUSE_FOR_SECURE_INPUT";

  const finalSignal =
    response.status === "FINAL_CONFIRMATION_REQUIRED" ||
    response.action === "REQUEST_FINAL_CONFIRMATION" ||
    response.confirmationId !== null;
  const finalPair =
    response.status === "FINAL_CONFIRMATION_REQUIRED" &&
    response.action === "REQUEST_FINAL_CONFIRMATION";

  if (
    (secureSignal && !securePair) ||
    (finalSignal && !finalPair) ||
    response.status === "RISK_WARNING" ||
    response.riskType !== null
  ) {
    throw new Error(
      "[AI Engine] protected workflow state cannot be bypassed.",
    );
  }
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
 * selections enter Production through the request-scoped decision context.
 * UserDecisionContextStore remains an internal Agent Loop utility.
 */
export function enforceUserDecisionPolicy(
  response: StructuredAIResponse,
  request: AiActionRequest,
): StructuredAIResponse {
  assertProtectedStateConsistency(response);

  if (targetsResolvedUserDecision(response, request)) {
    throw new Error(
      "[AI Engine] a resolved user selection cannot be executed again.",
    );
  }

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
