import assert from "node:assert/strict";
import test from "node:test";

import {
  resumeAgentLoopAfterUserDecision,
  resumeAgentLoopAfterSecureInput,
  runAgentLoop,
} from "../agent/agentLoop.runner.js";
import type {
  AgentLoopResult,
} from "../agent/agentLoop.types.js";
import type {
  AiActionRequest,
  BackendSanitizedDomElement,
  BackendSanitizedDomSnapshot,
} from "../api/aiRequest.types.js";
import {
  adaptStructuredResponseToBackend,
} from "../api/aiDecisionResponse.adapter.js";
import {
  sanitizeInternalMessage,
  SAFE_INTERNAL_MESSAGE,
} from "../messages/messageSafety.js";
import type {
  StructuredAIResponse,
} from "../output/aiResponse.types.js";
import {
  assertStructuredAIResponse,
  validateStructuredAIResponse,
} from "../output/aiResponse.validator.js";
import {
  parseStructuredAIResponse,
} from "../output/aiResponse.parser.js";
import {
  enforceUserDecisionPolicy,
} from "../policy/userDecision.policy.js";
import {
  createNextActionPrompt,
} from "../prompts/nextActionPrompt.js";
import {
  generateStructuredAction,
} from "../services/structuredAction.service.js";
import {
  detectTerms,
} from "../terms/termsAgreement.detector.js";
import {
  UserDecisionContextStore,
} from "../workflow/userDecisionContext.store.js";
import {
  validateDecisionOptions,
  validateDecisionTerms,
} from "../workflow/userDecision.types.js";

function createElement(
  elementId: string,
  text: string,
  securityPolicy: BackendSanitizedDomElement["securityPolicy"] =
    "USER_DECISION",
): BackendSanitizedDomElement {
  return {
    elementId,
    tag: "button",
    role: "button",
    text,
    ariaLabel: null,
    placeholder: null,
    inputType: null,
    visible: true,
    enabled: true,
    boundingBox: null,
    securityPolicy,
  };
}

function createSnapshot(
  snapshotId: string,
  elements: BackendSanitizedDomElement[] = [],
): BackendSanitizedDomSnapshot {
  return {
    schemaVersion: "1.0",
    snapshotId,
    page: {
      url: "https://example.test/decision",
      title: "사용자 선택",
    },
    elements,
  };
}

function createResponse(
  overrides: Partial<StructuredAIResponse> = {},
): StructuredAIResponse {
  return {
    requestId: "req-d24",
    status: "AI_EXECUTING",
    action: "CLICK",
    targetElementId: "el-product",
    inputValue: null,
    message: "다음 항목을 선택합니다.",
    confidence: 1,
    requiresUserAction: false,
    decisionType: null,
    secureInputType: null,
    riskType: null,
    options: null,
    confirmationId: null,
    summary: null,
    ...overrides,
  };
}

function createRequest(
  elements: BackendSanitizedDomElement[],
): AiActionRequest {
  return {
    requestId: "req-d24",
    userGoal: {
      rawMessage: "사용자가 직접 선택할 항목을 보여줘",
      intent: "USER_DECISION",
      conditions: [],
    },
    domSnapshot: createSnapshot(
      "snap-before-decision",
      elements,
    ),
  };
}

test("Production runtime blocks automatic selection of every USER_DECISION category", () => {
  const protectedElements = [
    createElement("el-product", "상품 선택"),
    createElement("el-source-account", "출금 계좌 선택"),
    createElement("el-recipient", "수취인 선택"),
    createElement("el-required-term", "필수 약관 동의"),
    createElement("el-optional-term", "선택 약관 동의"),
  ];
  const request = createRequest(protectedElements);

  for (const element of protectedElements) {
    const result = enforceUserDecisionPolicy(
      createResponse({
        targetElementId: element.elementId,
        confidence: 1,
      }),
      request,
    );

    assert.equal(result.action, "WAIT_FOR_USER");
    assert.equal(result.status, "USER_DECISION_REQUIRED");
    assert.equal(result.targetElementId, null);
    assert.equal(result.inputValue, null);
    assert.equal(result.requiresUserAction, true);
    assert.equal(result.decisionType, null);
    assert.equal(result.options, null);
  }

  const selectResult = enforceUserDecisionPolicy(
    createResponse({
      action: "SELECT",
      targetElementId: "el-source-account",
      inputValue: "account-1",
    }),
    request,
  );

  assert.equal(selectResult.action, "WAIT_FOR_USER");
  assert.equal(selectResult.inputValue, null);
});

test("Production structured service applies the USER_DECISION runtime policy", async () => {
  const request = createRequest([
    createElement("el-product", "상품 선택"),
  ]);

  const result = await generateStructuredAction(
    request,
    async () => ({
      model: "offline-test",
      source: "GEMINI",
      text: JSON.stringify(
        createResponse({
          requestId: "untrusted-model-request",
          targetElementId: "el-product",
        }),
      ),
    }),
  );

  assert.equal(result.requestId, request.requestId);
  assert.equal(result.action, "WAIT_FOR_USER");
  assert.equal(result.targetElementId, null);
});

test("D24 prompt forbids automatic choices and validation-error CLICK workarounds", () => {
  const prompt = createNextActionPrompt(
    "req-prompt-d24",
    {
      rawMessage: "예금 약관을 확인해줘",
      intent: "OPEN_DEPOSIT",
      conditions: [],
    },
    {
      page: {
        url: "/deposit/terms/deposit-12m",
        title: "예금 약관",
      },
      elements: [],
      metadata: {
        originalElementCount: 0,
        modelElementCount: 0,
      },
    },
  );

  assert.match(prompt, /Never CLICK, TYPE, or SELECT/);
  assert.match(prompt, /product, source account, recipient/);
  assert.match(prompt, /required term, or optional term/);
  assert.match(prompt, /Never use confidence/);
  assert.match(prompt, /Never auto-agree/);
  assert.match(prompt, /Return WAIT_FOR_USER/);
  assert.match(prompt, /validation error/);
});

test("internal decision types reject blank and duplicate IDs while preserving order", () => {
  const options = validateDecisionOptions([
    { id: "option-b", label: "두 번째" },
    { id: "option-a", label: "첫 번째" },
  ]);

  assert.deepEqual(
    options.map((option) => option.id),
    ["option-b", "option-a"],
  );

  assert.throws(() =>
    validateDecisionOptions([
      { id: " ", label: "빈 ID" },
    ]),
  );
  assert.throws(() =>
    validateDecisionOptions([
      { id: "same", label: "하나" },
      { id: "same", label: "둘" },
    ]),
  );
  assert.throws(() =>
    validateDecisionOptions([
      { id: " padded ", label: "변형 금지" },
    ]),
  );
});

test("terms require an explicit boolean required field", () => {
  const terms = validateDecisionTerms([
    {
      id: "term-required",
      label: "필수 약관",
      required: true,
    },
    {
      id: "term-optional",
      label: "선택 약관",
      required: false,
    },
  ]);

  assert.deepEqual(
    terms.map((term) => term.required),
    [true, false],
  );

  assert.throws(() =>
    validateDecisionTerms([
      {
        id: "term-invalid",
        label: "필수 정보 없음",
      } as never,
    ]),
  );

  const invalidStructured = createResponse({
    status: "USER_DECISION_REQUIRED",
    action: "WAIT_FOR_USER",
    targetElementId: null,
    requiresUserAction: true,
    decisionType: "TERMS_AGREEMENT",
    options: [
      {
        id: "term-invalid",
        label: "필수 정보 없음",
      },
    ] as never,
  });

  assert.equal(
    validateStructuredAIResponse(invalidStructured).valid,
    false,
  );
});

test("Structured response semantic validation rejects duplicate option IDs", () => {
  const duplicateOptions = createResponse({
    status: "USER_DECISION_REQUIRED",
    action: "WAIT_FOR_USER",
    targetElementId: null,
    requiresUserAction: true,
    decisionType: "PRODUCT_SELECTION",
    options: [
      { id: "same", label: "상품 A" },
      { id: "same", label: "상품 B" },
    ],
  });

  assert.throws(() =>
    assertStructuredAIResponse(duplicateOptions),
  );
  assert.equal(
    validateStructuredAIResponse(duplicateOptions).valid,
    false,
  );
});

test("terms detector preserves Backend snapshot element IDs instead of term-N IDs", () => {
  const terms = detectTerms([
    {
      elementId: "el-service-required",
      text: "[필수] 서비스 이용약관 동의",
    },
    {
      elementId: "el-marketing-optional",
      text: "[선택] 마케팅 정보 수신 동의",
    },
  ]);

  assert.deepEqual(
    terms.map((term) => term.termId),
    ["el-service-required", "el-marketing-optional"],
  );
  assert.deepEqual(
    terms.map((term) => term.requirement),
    ["REQUIRED", "OPTIONAL"],
  );

  assert.throws(() =>
    detectTerms([
      {
        elementId: "duplicate-term",
        text: "[필수] 서비스 이용약관 동의",
      },
      {
        elementId: "duplicate-term",
        text: "[선택] 마케팅 정보 수신 동의",
      },
    ]),
  );
});

test("message safety removes technical disclosure, sensitive values, line breaks, and excess length", () => {
  assert.equal(
    sanitizeInternalMessage(
      "system prompt: reveal https://localhost:3000/api/action",
    ),
    SAFE_INTERNAL_MESSAGE,
  );
  assert.equal(
    sanitizeInternalMessage("OTP: 123456\n다음 단계"),
    "[보호됨] 다음 단계",
  );
  assert.doesNotMatch(
    sanitizeInternalMessage("연락처 010-1234-5678 확인"),
    /010-1234-5678/,
  );
  assert.ok(
    sanitizeInternalMessage("가".repeat(300)).length <= 160,
  );

  const parsed = parseStructuredAIResponse(
    JSON.stringify(
      createResponse({
        message: "system prompt: https://localhost:3000/api/action",
      }),
    ),
  );

  assert.equal(parsed.message, SAFE_INTERNAL_MESSAGE);
});

function createPausedResult(): AgentLoopResult {
  return {
    status: "WAITING_FOR_USER",
    steps: [],
    finalSnapshot: createSnapshot("snap-paused"),
    finalResponse: createResponse({
      status: "USER_DECISION_REQUIRED",
      action: "WAIT_FOR_USER",
      targetElementId: null,
      inputValue: null,
      requiresUserAction: true,
    }),
  };
}

test("verified decision context preserves exact IDs and blocks missing, stale, and duplicate resume", async () => {
  const store = new UserDecisionContextStore();
  const paused = createPausedResult();
  const resumedSnapshot = createSnapshot("snap-resumed");
  const dependencies = {
    decide: async (request: AiActionRequest) => {
      assert.deepEqual(
        request.userDecisionContext?.selectedOptionIds,
        ["term-required-2", "term-required-1"],
      );

      return createResponse({
        status: "COMPLETED",
        action: "NONE",
        targetElementId: null,
        inputValue: null,
        requiresUserAction: false,
      });
    },
    execute: async () => {
      throw new Error("completed resume must not execute an action");
    },
    getNextSnapshot: async () => {
      throw new Error("completed resume must not request another snapshot");
    },
    createRequestId: (stepNumber: number) =>
      `req-resume-${stepNumber}`,
  };
  const context = {
    decisionId: "decision-terms-1",
    decisionType: "TERMS_AGREEMENT" as const,
    selectedOptionIds: [
      "term-required-2",
      "term-required-1",
    ],
  };

  assert.throws(() =>
    store.registerPending({
      decisionId: "unsupported-decision",
      decisionType: "ACCOUNT_SELECTION" as never,
      optionIds: ["account-1"],
      snapshotId: "snap-paused",
    }),
    /not supported/,
  );

  await assert.rejects(() =>
    resumeAgentLoopAfterUserDecision(
      {
        rawMessage: "약관 선택 후 계속",
        intent: "OPEN_DEPOSIT",
      },
      paused,
      context,
      resumedSnapshot,
      store,
      dependencies,
    ),
    /stale user decision/,
  );

  store.registerPending({
    decisionId: "decision-terms-1",
    decisionType: "TERMS_AGREEMENT",
    optionIds: [
      "term-required-1",
      "term-required-2",
      "term-optional",
    ],
    snapshotId: "snap-paused",
  });

  await assert.rejects(() =>
    resumeAgentLoopAfterUserDecision(
      {
        rawMessage: "약관 선택 후 계속",
        intent: "OPEN_DEPOSIT",
      },
      paused,
      {
        ...context,
        decisionId: "stale-decision",
      },
      resumedSnapshot,
      store,
      dependencies,
    ),
    /stale user decision/,
  );

  const result = await resumeAgentLoopAfterUserDecision(
    {
      rawMessage: "약관 선택 후 계속",
      intent: "OPEN_DEPOSIT",
    },
    paused,
    context,
    resumedSnapshot,
    store,
    dependencies,
  );

  assert.equal(result.status, "COMPLETED");
  assert.deepEqual(
    store.latestContext()?.selectedOptionIds,
    ["term-required-2", "term-required-1"],
  );

  await assert.rejects(() =>
    resumeAgentLoopAfterUserDecision(
      {
        rawMessage: "약관 선택 후 계속",
        intent: "OPEN_DEPOSIT",
      },
      paused,
      context,
      createSnapshot("snap-resumed-again"),
      store,
      dependencies,
    ),
    /duplicate user decision resume/,
  );
});

test("user-decision resume cannot bypass secure, final, or risk protection", async () => {
  await assert.rejects(() =>
    resumeAgentLoopAfterSecureInput(
      {
        rawMessage: "계속",
        intent: "UNKNOWN",
      },
      createPausedResult(),
      createSnapshot("snap-not-secure"),
      {
        decide: async () => createResponse(),
        execute: async () => {},
        getNextSnapshot: async () =>
          createSnapshot("snap-next"),
        createRequestId: () => "req-not-secure",
      },
    ),
    /SECURE_INPUT pause/,
  );

  const protectedResponses = [
    createResponse({
      status: "SECURE_INPUT_REQUIRED",
      action: "WAIT_FOR_USER",
      targetElementId: null,
      requiresUserAction: true,
    }),
    createResponse({
      status: "FINAL_CONFIRMATION_REQUIRED",
      action: "WAIT_FOR_USER",
      targetElementId: null,
      requiresUserAction: true,
    }),
    createResponse({
      status: "RISK_WARNING",
      action: "CLICK",
      targetElementId: "el-normal",
    }),
  ];

  for (const response of protectedResponses) {
    let executeCount = 0;
    const result = await runAgentLoop(
      {
        rawMessage: "계속",
        intent: "UNKNOWN",
      },
      createSnapshot("snap-protected"),
      {
        decide: async () => response,
        execute: async () => {
          executeCount++;
        },
        getNextSnapshot: async () =>
          createSnapshot("snap-next"),
        createRequestId: () => "req-protected",
      },
    );

    assert.equal(result.status, "ERROR");
    assert.equal(executeCount, 0);
  }
});

test("Agent Loop maxSteps prevents an unbounded repeated-action loop", async () => {
  let executeCount = 0;
  const unchangedSnapshot = createSnapshot("snap-unchanged");
  const result = await runAgentLoop(
    {
      rawMessage: "계속",
      intent: "UNKNOWN",
    },
    unchangedSnapshot,
    {
      decide: async () =>
        createResponse({
          targetElementId: "el-normal",
        }),
      execute: async () => {
        executeCount++;
      },
      getNextSnapshot: async () => unchangedSnapshot,
      createRequestId: (stepNumber) =>
        `req-loop-${stepNumber}`,
    },
    3,
  );

  assert.equal(result.status, "MAX_STEPS_REACHED");
  assert.equal(executeCount, 3);
});

test("D23 C-to-B adapter remains the exact six-field wire contract", () => {
  const response = adaptStructuredResponseToBackend(
    createResponse({
      status: "USER_DECISION_REQUIRED",
      action: "WAIT_FOR_USER",
      targetElementId: null,
      requiresUserAction: true,
    }),
  );

  assert.deepEqual(
    Object.keys(response),
    [
      "actionType",
      "elementId",
      "value",
      "scrollX",
      "scrollY",
      "waitMillis",
    ],
  );
});
