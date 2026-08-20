import { Router } from "express";

import {
  generateStructuredAction,
} from "../services/structuredAction.service.js";

import {
  adaptBackendRequestToAiActionRequest,
} from "./aiDecisionRequest.adapter.js";

import {
  adaptStructuredResponseToBackend,
} from "./aiDecisionResponse.adapter.js";

export const aiActionRouter =
  Router();

aiActionRouter.post(
  "/action",

  async (req, res) => {
    try {
      const internalRequest =
        adaptBackendRequestToAiActionRequest(
          req.body,
        );

      const structuredResponse =
        await generateStructuredAction(
          internalRequest,
        );

      const backendResponse =
        adaptStructuredResponseToBackend(
          structuredResponse,
        );

      res
        .status(200)
        .json(backendResponse);
    } catch {
      console.error(
        "[AI Engine] /action request failed.",
      );

      res.status(500).json({
        message:
          "AI Action 처리 중 오류가 발생했습니다.",
      });
    }
  },
);
