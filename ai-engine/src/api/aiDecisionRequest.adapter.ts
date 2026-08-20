import { randomUUID } from "node:crypto";

import { extractUserGoal } from "../goals/userGoal.extractor.js";

import type {
  AiActionRequest,
  BackendAiDecisionRequest,
} from "./aiRequest.types.js";

export function adaptBackendRequestToAiActionRequest(
  request: BackendAiDecisionRequest,
): AiActionRequest {
  const userGoal =
    extractUserGoal(
      request.userRequest,
    );

  return {
    requestId:
      `req-${randomUUID()}`,

    userGoal: {
      rawMessage:
        request.userRequest,

      intent:
        userGoal.intent,

      amount:
        userGoal.amount ?? undefined,

      recipient:
        userGoal.recipient ?? undefined,

      conditions:
        userGoal.conditions,
    },

    domSnapshot:
      request.snapshot,
  };
}