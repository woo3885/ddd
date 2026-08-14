import type {
  StructuredAIResponse,
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