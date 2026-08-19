import type {
  StructuredAIResponse,
} from "../output/aiResponse.types.js";

import {
  isProductionStructuredAction,
} from "../output/aiResponse.types.js";

export interface BackendAiDecisionResponse {
  actionType: string;

  elementId: string | null;

  value: string | null;

  scrollX: number | null;

  scrollY: number | null;

  waitMillis: number | null;
}

export function adaptStructuredResponseToBackend(
  response: StructuredAIResponse,
): BackendAiDecisionResponse {
  if (!isProductionStructuredAction(response.action)) {
    throw new Error(
      `[AI Engine] Production에서 지원하지 않는 Action입니다: ${response.action}`,
    );
  }

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
  };
}
