import express from "express";

import {
  aiActionRouter,
} from "./aiAction.route.js";

export function createServer() {
  const app = express();

  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.status(200).json({
      status: "OK",
      service: "ai-engine",
    });
  });

  app.use(
    "/api/ai",
    aiActionRouter,
  );

  return app;
}