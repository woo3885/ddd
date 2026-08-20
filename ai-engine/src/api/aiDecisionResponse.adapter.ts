import type {
  StructuredAIResponse,
} from "../output/aiResponse.types.js";

import {
  isProductionStructuredAction,
} from "../output/aiResponse.types.js";

import {
  sanitizeDecisionLabel,
  sanitizeInternalMessage,
} from "../messages/messageSafety.js";

import type {
  ProductionDecisionResponseType,
} from "../workflow/userDecision.types.js";

import {
  isProductionDecisionResponseType,
} from "../workflow/userDecision.types.js";

export interface BackendAiDecisionOption {
  id: string;

  label: string;

  required: boolean;

  checked: boolean | null;
}

export interface BackendAiDecisionResponse {
  actionType: string;

  elementId: string | null;

  value: string | null;

  scrollX: number | null;

  scrollY: number | null;

  waitMillis: number | null;

  status: string | null;

  message: string | null;

  requiresUserAction: boolean | null;

  executionBlocked: boolean | null;

  decisionType: ProductionDecisionResponseType | null;

  sourceSnapshotId: string | null;

  options: readonly BackendAiDecisionOption[];

  terms: readonly BackendAiDecisionOption[];
}

function mapDecisionOptions(
  response: StructuredAIResponse,
): readonly BackendAiDecisionOption[] {
  if (
    response.decisionType === null &&
    response.options === null
  ) {
    return [];
  }

  if (
    response.decisionType === null ||
    !isProductionDecisionResponseType(
      response.decisionType,
    ) ||
    response.options === null ||
    response.options.length === 0
  ) {
    throw new Error(
      "[AI Engine] incomplete decision metadata cannot cross the Backend wire.",
    );
  }

  return response.options.map((option) => {
    const isTermsDecision =
      response.decisionType === "TERMS_AGREEMENT";

    if (
      isTermsDecision &&
      typeof option.checked !== "boolean"
    ) {
      throw new Error(
        "[AI Engine] TERMS_AGREEMENT requires snapshot-backed checked state.",
      );
    }

    return {
      id: option.id,
      label: sanitizeDecisionLabel(
        option.label,
      ),
      required:
        isTermsDecision
          ? "required" in option && option.required
          : false,
      checked:
        typeof option.checked === "boolean"
          ? option.checked
          : null,
    };
  });
}

export function adaptStructuredResponseToBackend(
  response: StructuredAIResponse,
  currentSnapshotId: string | null = null,
): BackendAiDecisionResponse {
  if (!isProductionStructuredAction(response.action)) {
    throw new Error(
      `[AI Engine] Production에서 지원하지 않는 Action입니다: ${response.action}`,
    );
  }

  const decisionItems = mapDecisionOptions(
    response,
  );
  const hasDecision =
    decisionItems.length > 0;
  const isUserDecisionResponse =
    hasDecision ||
    response.action === "WAIT_FOR_USER" ||
    response.status === "USER_DECISION_REQUIRED";

  if (
    isUserDecisionResponse &&
    (
      !hasDecision ||
      response.decisionType === null ||
      response.action !== "WAIT_FOR_USER" ||
      response.status !== "USER_DECISION_REQUIRED" ||
      response.targetElementId !== null ||
      response.inputValue !== null ||
      !response.requiresUserAction ||
      currentSnapshotId === null ||
      currentSnapshotId.trim().length === 0
    )
  ) {
    throw new Error(
      "[AI Engine] decision metadata requires a blocked WAIT_FOR_USER response.",
    );
  }

  const isTermsDecision =
    response.decisionType === "TERMS_AGREEMENT";

  return {
    actionType: response.action,

    elementId:
      response.targetElementId,

    value:
      response.inputValue === null
        ? null
        : String(response.inputValue),

    scrollX: null,

    scrollY: null,

    waitMillis: null,

    status: response.status,

    message: sanitizeInternalMessage(
      response.message,
    ),

    requiresUserAction:
      response.requiresUserAction,

    executionBlocked:
      response.requiresUserAction,

    decisionType:
      isUserDecisionResponse
        ? response.decisionType as ProductionDecisionResponseType
        : null,

    sourceSnapshotId:
      isUserDecisionResponse
        ? currentSnapshotId
        : null,

    options:
      isTermsDecision
        ? []
        : decisionItems,

    terms:
      isTermsDecision
        ? decisionItems
        : [],
  };
}
