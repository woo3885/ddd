import { Router } from "express";

import {
  generateStructuredAction,
} from "../services/structuredAction.service.js";

import type {
  AiActionRequest,
} from "./aiRequest.types.js";

export const aiActionRouter = Router();

aiActionRouter.post(
  "/action",
  async (req, res) => {
    try {
      const request =
        req.body as AiActionRequest;

      const result =
        await generateStructuredAction(
          request,
        );

      res.status(200).json(result);
    } catch (error) {
      console.error(
        "[AI Engine] /action 처리 실패",
        error,
      );

      res.status(500).json({
        message:
          "AI Action 처리 중 오류가 발생했습니다.",
      });
    }
  },
);