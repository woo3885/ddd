export const aiResponseSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://financial-guide.local/schemas/ai-response.json",

  title: "AIResponse",
  type: "object",
  additionalProperties: false,

  required: [
    "requestId",
    "status",
    "action",
    "targetElementId",
    "inputValue",
    "message",
    "confidence",
    "requiresUserAction",
    "decisionType",
    "secureInputType",
    "riskType",
    "options",
    "confirmationId",
    "summary",
  ],

  properties: {
    requestId: {
      type: "string",
      minLength: 1,
    },

    status: {
      type: "string",
      enum: [
        "SESSION_CREATED",
        "PAGE_LOADING",
        "AI_EXECUTING",
        "USER_DECISION_REQUIRED",
        "SECURE_INPUT_REQUIRED",
        "FINAL_CONFIRMATION_REQUIRED",
        "ADDITIONAL_INFORMATION_REQUIRED",
        "RISK_WARNING",
        "COMPLETED",
        "CANCELLED",
        "ERROR",
        "TERMINATED",
      ],
    },

    action: {
      type: "string",
      enum: [
        "NONE",
        "CLICK",
        "TYPE",
        "SELECT",
        "SCROLL",
        "PRESS_KEY",
        "GO_BACK",
        "REFRESH",
        "WAIT",
        "WAIT_FOR_USER",
        "PAUSE_FOR_SECURE_INPUT",
        "REQUEST_FINAL_CONFIRMATION",
        "STOP",
      ],
    },

    targetElementId: {
      type: ["string", "null"],
    },

    inputValue: {
      type: ["string", "number", "null"],
    },

    message: {
      type: "string",
      minLength: 1,
    },

    confidence: {
      type: ["number", "null"],
      minimum: 0,
      maximum: 1,
    },

    requiresUserAction: {
      type: "boolean",
    },

    decisionType: {
      type: ["string", "null"],
    },

    secureInputType: {
      type: ["string", "null"],
    },

    riskType: {
      type: ["string", "null"],
    },

    options: {
      type: ["array", "null"],
    },

    confirmationId: {
      type: ["string", "null"],
    },

    summary: {
      type: ["object", "null"],
    },
  },

  allOf: [
    {
      if: {
        properties: {
          action: {
            const: "CLICK",
          },
        },
        required: ["action"],
      },
      then: {
        properties: {
          targetElementId: {
            type: "string",
            minLength: 1,
          },
          inputValue: {
            type: "null",
          },
        },
      },
    },

    {
      if: {
        properties: {
          action: {
            const: "TYPE",
          },
        },
        required: ["action"],
      },
      then: {
        properties: {
          targetElementId: {
            type: "string",
            minLength: 1,
          },
          inputValue: {
            type: ["string", "number"],
          },
        },
      },
    },

    {
      if: {
        properties: {
          action: {
            enum: [
              "NONE",
              "SCROLL",
              "WAIT",
              "WAIT_FOR_USER",
              "GO_BACK",
              "REFRESH",
              "STOP",
            ],
          },
        },
        required: ["action"],
      },
      then: {
        properties: {
          targetElementId: {
            type: "null",
          },
          inputValue: {
            type: "null",
          },
        },
      },
    },
  ],
} as const;