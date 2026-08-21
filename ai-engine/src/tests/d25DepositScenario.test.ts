import assert from "node:assert/strict";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import test from "node:test";

import express from "express";

import {
  runAgentLoop,
} from "../agent/agentLoop.runner.js";
import {
  createAiActionRouter,
} from "../api/aiAction.route.js";
import {
  adaptBackendRequestToAiActionRequest,
} from "../api/aiDecisionRequest.adapter.js";
import {
  adaptStructuredResponseToBackend,
} from "../api/aiDecisionResponse.adapter.js";
import type {
  AiActionRequest,
  BackendAiUserDecisionContext,
  BackendSanitizedDomElement,
  BackendSanitizedDomSnapshot,
} from "../api/aiRequest.types.js";
import {
  classifyDepositScenarioStage,
  DEPOSIT_GUIDANCE,
  enforceDepositScenarioPolicy,
  finalizeDepositScenarioGuidance,
} from "../deposit/depositScenario.policy.js";
import {
  SAFE_INTERNAL_MESSAGE,
  sanitizeInternalMessage,
} from "../messages/messageSafety.js";
import type {
  StructuredAIResponse,
} from "../output/aiResponse.types.js";
import {
  enforceUserDecisionPolicy,
} from "../policy/userDecision.policy.js";
import {
  generateStructuredAction,
} from "../services/structuredAction.service.js";

const RESPONSE_FIELDS = [
  "actionType",
  "elementId",
  "value",
  "scrollX",
  "scrollY",
  "waitMillis",
  "status",
  "message",
  "requiresUserAction",
  "executionBlocked",
  "decisionType",
  "sourceSnapshotId",
  "options",
  "terms",
] as const;

function element(
  elementId: string,
  label: string,
  overrides: Partial<BackendSanitizedDomElement> = {},
): BackendSanitizedDomElement {
  return {
    elementId,
    tag: "button",
    role: "button",
    text: label,
    ariaLabel: null,
    placeholder: null,
    inputType: null,
    visible: true,
    enabled: true,
    checked: null,
    boundingBox: null,
    securityPolicy: "NORMAL",
    ...overrides,
  };
}

function snapshot(
  snapshotId: string,
  elements: BackendSanitizedDomElement[],
  url = "https://demo.test/deposit/flow",
): BackendSanitizedDomSnapshot {
  return {
    schemaVersion: "1.0",
    snapshotId,
    page: {
      url,
      title: "정기예금 가입",
    },
    elements,
  };
}

function request(
  domSnapshot: BackendSanitizedDomSnapshot,
  overrides: Partial<AiActionRequest> = {},
): AiActionRequest {
  return {
    requestId: "req-d25",
    userGoal: {
      rawMessage:
        "12개월 정기예금에 500만원 가입하고 싶어요.",
      intent: "DEPOSIT",
      amount: 5_000_000,
      duration: {
        value: 12,
        unit: "MONTH",
      },
      conditions: [],
    },
    domSnapshot,
    ...overrides,
  };
}

function response(
  overrides: Partial<StructuredAIResponse> = {},
): StructuredAIResponse {
  return {
    requestId: "req-model",
    status: "AI_EXECUTING",
    action: "NONE",
    targetElementId: null,
    inputValue: null,
    message: "모델의 임시 안내",
    confidence: 0.9,
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

function productChoice(
  id: string,
  label: string,
): BackendSanitizedDomElement {
  return element(id, label, {
    securityPolicy: "USER_DECISION",
  });
}

function termChoice(
  id: string,
  label: string,
  checked: boolean,
): BackendSanitizedDomElement {
  return element(id, label, {
    tag: "input",
    role: "checkbox",
    inputType: "checkbox",
    securityPolicy: "USER_DECISION",
    checked,
  });
}

function amountInput(): BackendSanitizedDomElement {
  return element("el-amount", "가입 금액", {
    tag: "input",
    role: "textbox",
    inputType: "text",
  });
}

function secureInput(): BackendSanitizedDomElement {
  return element("el-password", "계좌 비밀번호", {
    tag: "input",
    role: "textbox",
    inputType: "password",
    securityPolicy: "SECURE_INPUT",
  });
}

function applyPolicies(
  candidate: StructuredAIResponse,
  currentRequest: AiActionRequest,
): StructuredAIResponse {
  const stage = classifyDepositScenarioStage(
    currentRequest,
  );
  const depositChecked =
    enforceDepositScenarioPolicy(
      candidate,
      currentRequest,
    );
  return finalizeDepositScenarioGuidance(
    enforceUserDecisionPolicy(
      depositChecked,
      currentRequest,
    ),
    depositChecked,
    stage,
  );
}

test("existing UserGoal parser preserves the requested 12 months and 5,000,000 won", () => {
  const adapted = adaptBackendRequestToAiActionRequest({
    userRequest:
      "12개월 정기예금에 500만원 가입하고 싶어요.",
    snapshot: snapshot("snap-goal", []),
  });

  assert.equal(adapted.userGoal.intent, "DEPOSIT");
  assert.equal(adapted.userGoal.amount, 5_000_000);
  assert.deepEqual(adapted.userGoal.duration, {
    value: 12,
    unit: "MONTH",
  });
});

test("stage classifier uses semantic DOM and never classifies from URL alone", () => {
  assert.equal(
    classifyDepositScenarioStage(
      request(snapshot(
        "snap-url-only",
        [],
        "https://demo.test/deposit/terms/product-12m",
      )),
    ),
    "UNKNOWN",
  );

  assert.equal(
    classifyDepositScenarioStage(
      request(snapshot(
        "snap-semantic-terms",
        [termChoice("el-term", "[필수] 서비스 약관", false)],
        "https://demo.test/unrelated",
      )),
    ),
    "TERMS",
  );

  assert.equal(
    classifyDepositScenarioStage(
      request(snapshot("snap-secure-priority", [
        termChoice("el-term", "[필수] 서비스 약관", false),
        secureInput(),
      ])),
    ),
    "SECURE_INPUT",
  );
});

test("product list creates PRODUCT_SELECTION without automatic product selection", () => {
  const currentRequest = request(snapshot("snap-products", [
    productChoice("el-product-12m", "12개월 정기예금"),
    productChoice("el-product-preferred", "우대금리 정기예금"),
  ]));
  const safe = applyPolicies(
    response({
      action: "CLICK",
      targetElementId: "el-product-preferred",
      message: "가장 좋은 추천 상품을 자동 선택합니다.",
    }),
    currentRequest,
  );
  const wire = adaptStructuredResponseToBackend(
    safe,
    currentRequest.domSnapshot.snapshotId,
  );

  assert.equal(wire.actionType, "WAIT_FOR_USER");
  assert.equal(wire.status, "USER_DECISION_REQUIRED");
  assert.equal(wire.requiresUserAction, true);
  assert.equal(wire.executionBlocked, true);
  assert.equal(wire.decisionType, "PRODUCT_SELECTION");
  assert.equal(wire.message, DEPOSIT_GUIDANCE.productSelection);
  assert.deepEqual(
    wire.options.map((option) => option.id),
    ["el-product-12m", "el-product-preferred"],
  );
  assert.equal(wire.elementId, null);
  assert.equal(wire.value, null);
});

test("verified product resume preserves context and clicks only a new NORMAL navigation target", () => {
  const currentRequest = request(snapshot("snap-products-resumed", [
    productChoice("el-new-product", "다른 정기예금"),
    element("el-product-next", "다음"),
  ]), {
    userDecisionContext: {
      decisionId: "dec-product",
      decisionType: "PRODUCT_SELECTION",
      selectedOptionIds: ["el-old-product"],
      sourceSnapshotId: "snap-products",
    },
  });
  const safe = applyPolicies(
    response({
      action: "CLICK",
      targetElementId: "el-old-product",
    }),
    currentRequest,
  );

  assert.equal(safe.action, "CLICK");
  assert.equal(safe.targetElementId, "el-product-next");
  assert.notEqual(
    safe.targetElementId,
    currentRequest.userDecisionContext?.selectedOptionIds[0],
  );
  assert.equal(safe.decisionType, null);
  assert.equal(safe.message, DEPOSIT_GUIDANCE.productDetail);
  assert.deepEqual(
    currentRequest.userDecisionContext?.selectedOptionIds,
    ["el-old-product"],
  );
});

test("product detail allows only a semantic NORMAL navigation action", () => {
  const currentRequest = request(snapshot("snap-detail", [
    element("el-rate", "금리 연 3.2%", {
      tag: "div",
      role: null,
    }),
    element("el-period", "가입 기간 12개월", {
      tag: "div",
      role: null,
    }),
    element("el-join", "가입하기"),
  ]), {
    userDecisionContext: {
      decisionId: "dec-product",
      decisionType: "PRODUCT_SELECTION",
      selectedOptionIds: ["el-product-12m"],
      sourceSnapshotId: "snap-products",
    },
  });
  const safe = applyPolicies(
    response({
      action: "CLICK",
      targetElementId: "el-join",
      message: "추천 상품 가입이 완료되었습니다.",
    }),
    currentRequest,
  );

  assert.equal(
    classifyDepositScenarioStage(currentRequest),
    "PRODUCT_DETAIL",
  );
  assert.equal(safe.action, "CLICK");
  assert.equal(safe.targetElementId, "el-join");
  assert.equal(safe.message, DEPOSIT_GUIDANCE.productDetail);
  assert.doesNotMatch(safe.message, /추천|완료|성공/);
});

test("amount entry uses only the amount from UserGoal and never a model recommendation", () => {
  const currentRequest = request(snapshot("snap-amount", [
    amountInput(),
  ]));
  const safe = applyPolicies(
    response({
      action: "TYPE",
      targetElementId: "el-amount",
      inputValue: "10000000",
      message: "추천 금액을 입력합니다.",
    }),
    currentRequest,
  );

  assert.equal(
    classifyDepositScenarioStage(currentRequest),
    "AMOUNT_ENTRY",
  );
  assert.equal(safe.action, "TYPE");
  assert.equal(safe.targetElementId, "el-amount");
  assert.equal(safe.inputValue, "5000000");
  assert.equal(safe.message, DEPOSIT_GUIDANCE.amount);
});

test("missing amount and secure fields never receive an amount TYPE", () => {
  const noAmountRequest = request(snapshot("snap-no-amount", [
    amountInput(),
  ]));
  noAmountRequest.userGoal.amount = undefined;
  const missing = applyPolicies(
    response({
      action: "TYPE",
      targetElementId: "el-amount",
      inputValue: "5000000",
    }),
    noAmountRequest,
  );

  assert.equal(missing.action, "NONE");
  assert.equal(missing.inputValue, null);
  assert.equal(missing.message, DEPOSIT_GUIDANCE.amountMissing);

  const secureRequest = request(snapshot("snap-password", [
    secureInput(),
  ]));
  const secure = applyPolicies(
    response({
      action: "TYPE",
      targetElementId: "el-password",
      inputValue: "5000000",
    }),
    secureRequest,
  );
  assert.equal(secure.action, "PAUSE_FOR_SECURE_INPUT");
  assert.equal(secure.inputValue, null);
});

test("terms keep snapshot order, required markers, and authoritative checked values", () => {
  const currentRequest = request(snapshot("snap-terms", [
    termChoice("el-term-service", "[필수] 서비스 약관", true),
    termChoice("el-term-privacy", "[필수] 개인정보 약관", false),
    termChoice("el-term-marketing", "[선택] 마케팅 동의", false),
  ]));
  const safe = applyPolicies(
    response({
      action: "CLICK",
      targetElementId: "el-term-marketing",
    }),
    currentRequest,
  );
  const wire = adaptStructuredResponseToBackend(
    safe,
    currentRequest.domSnapshot.snapshotId,
  );

  assert.equal(wire.actionType, "WAIT_FOR_USER");
  assert.equal(wire.decisionType, "TERMS_AGREEMENT");
  assert.equal(wire.message, DEPOSIT_GUIDANCE.terms);
  assert.deepEqual(wire.options, []);
  assert.deepEqual(
    wire.terms.map((term) => ({
      id: term.id,
      required: term.required,
      checked: term.checked,
    })),
    [
      { id: "el-term-service", required: true, checked: true },
      { id: "el-term-privacy", required: true, checked: false },
      { id: "el-term-marketing", required: false, checked: false },
    ],
  );
});

test("verified terms resume never replays terms and uses only the new NORMAL next target", () => {
  const currentRequest = request(snapshot("snap-terms-resumed", [
    termChoice("el-new-service", "[필수] 서비스 약관", true),
    termChoice("el-new-marketing", "[선택] 마케팅 동의", false),
    element("el-terms-next", "다음"),
  ]), {
    userDecisionContext: {
      decisionId: "dec-terms",
      decisionType: "TERMS_AGREEMENT",
      selectedOptionIds: [
        "el-old-service",
        "el-old-privacy",
      ],
      sourceSnapshotId: "snap-terms",
    },
  });
  const safe = applyPolicies(
    response({
      action: "CLICK",
      targetElementId: "el-old-service",
    }),
    currentRequest,
  );

  assert.equal(safe.action, "CLICK");
  assert.equal(safe.targetElementId, "el-terms-next");
  assert.equal(safe.decisionType, null);
  assert.equal(safe.options, null);
  assert.equal(safe.message, DEPOSIT_GUIDANCE.termsResume);
  assert.deepEqual(
    currentRequest.userDecisionContext?.selectedOptionIds,
    ["el-old-service", "el-old-privacy"],
  );
});

test("secure input produces the exact 14-field blocked response and ends the Agent Loop", async () => {
  const currentSnapshot = snapshot("snap-secure", [
    secureInput(),
  ]);
  const currentRequest = request(currentSnapshot);
  const safe = applyPolicies(
    response({
      action: "TYPE",
      targetElementId: "el-password",
      inputValue: "synthetic-value",
      message: "인증 성공",
    }),
    currentRequest,
  );
  const wire = adaptStructuredResponseToBackend(
    safe,
    currentSnapshot.snapshotId,
  );

  assert.deepEqual(Object.keys(wire), RESPONSE_FIELDS);
  assert.deepEqual(wire, {
    actionType: "PAUSE_FOR_SECURE_INPUT",
    elementId: null,
    value: null,
    scrollX: null,
    scrollY: null,
    waitMillis: null,
    status: "SECURE_INPUT_REQUIRED",
    message: DEPOSIT_GUIDANCE.secureInput,
    requiresUserAction: true,
    executionBlocked: true,
    decisionType: null,
    sourceSnapshotId: null,
    options: [],
    terms: [],
  });

  let executeCount = 0;
  let snapshotCount = 0;
  const result = await runAgentLoop(
    currentRequest.userGoal,
    currentSnapshot,
    {
      decide: async () => safe,
      execute: async () => {
        executeCount++;
      },
      getNextSnapshot: async () => {
        snapshotCount++;
        return currentSnapshot;
      },
      createRequestId: () => "req-secure-loop",
    },
  );

  assert.equal(result.status, "WAITING_FOR_SECURE_INPUT");
  assert.equal(executeCount, 0);
  assert.equal(snapshotCount, 0);
});

test("Agent Loop stops before repeating an action when no new snapshot arrives", async () => {
  const currentSnapshot = snapshot("snap-unchanged", [
    element("el-next", "다음"),
  ]);
  let decideCount = 0;
  let executeCount = 0;
  const result = await runAgentLoop(
    request(currentSnapshot).userGoal,
    currentSnapshot,
    {
      decide: async () => {
        decideCount++;
        return response({
          action: "CLICK",
          targetElementId: "el-next",
        });
      },
      execute: async () => {
        executeCount++;
      },
      getNextSnapshot: async () => currentSnapshot,
      createRequestId: () => "req-no-new-snapshot",
    },
  );

  assert.equal(result.status, "ERROR");
  assert.equal(decideCount, 1);
  assert.equal(executeCount, 1);
});

test("Gemini failure has no financial action while secure DOM still fails closed", async () => {
  const amountRequest = request(snapshot("snap-fallback-amount", [
    amountInput(),
  ]));
  const amountFallback = await generateStructuredAction(
    amountRequest,
    async () => ({
      model: "offline-test",
      source: "FALLBACK",
      text: "",
    }),
  );
  assert.equal(amountFallback.status, "ERROR");
  assert.equal(amountFallback.action, "NONE");

  const secureRequest = request(snapshot("snap-fallback-secure", [
    secureInput(),
  ]));
  const secureFallback = await generateStructuredAction(
    secureRequest,
    async () => ({
      model: "offline-test",
      source: "FALLBACK",
      text: "",
    }),
  );
  assert.equal(secureFallback.status, "SECURE_INPUT_REQUIRED");
  assert.equal(secureFallback.action, "PAUSE_FOR_SECURE_INPUT");
  assert.equal(secureFallback.inputValue, null);
});

test("guidance messages are TTS-safe and suppress completion, recommendation, and technical disclosure", () => {
  for (const message of Object.values(DEPOSIT_GUIDANCE)) {
    assert.equal(message.includes("\n"), false);
    assert.ok(message.length <= 80);
    assert.doesNotMatch(
      message,
      /elementId|selector|raw dom|추천 상품|자동 선택|가입 완료|인증 성공/i,
    );
  }

  for (const unsafe of [
    "가입이 완료되었습니다.",
    "인증 성공 결과입니다.",
    "추천 상품을 자동 선택합니다.",
    "elementId el-secret selector #password",
  ]) {
    assert.equal(
      sanitizeInternalMessage(unsafe),
      SAFE_INTERNAL_MESSAGE,
    );
  }
});

test("POST /api/ai/action validates the deterministic D25 production scenario through secure pause", async () => {
  const app = express();
  app.use(express.json());
  app.use(
    "/api/ai",
    createAiActionRouter((input) =>
      generateStructuredAction(
        input,
        async () => {
          const candidates: Record<
            string,
            StructuredAIResponse
          > = {
            "snap-route-products": response({
              action: "CLICK",
              targetElementId: "el-product-12m",
            }),
            "snap-route-detail": response({
              action: "CLICK",
              targetElementId: "el-detail-next",
            }),
            "snap-route-amount": response({
              action: "TYPE",
              targetElementId: "el-amount",
              inputValue: "1",
            }),
            "snap-route-terms": response({
              action: "CLICK",
              targetElementId: "el-term-service",
            }),
            "snap-route-terms-resumed": response({
              action: "CLICK",
              targetElementId: "el-terms-next",
            }),
            "snap-route-secure": response({
              action: "TYPE",
              targetElementId: "el-password",
              inputValue: "synthetic-ignored",
            }),
          };
          const candidate = candidates[
            input.domSnapshot.snapshotId
          ];
          assert.ok(candidate);
          return {
            model: "offline-test",
            source: "GEMINI" as const,
            text: JSON.stringify({
              ...candidate,
              requestId: "untrusted-model-id",
            }),
          };
        },
      )),
  );

  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");

  try {
    const address = server.address() as AddressInfo;
    const endpoint =
      `http://127.0.0.1:${address.port}/api/ai/action`;
    const post = async (
      currentSnapshot: BackendSanitizedDomSnapshot,
      userDecision?: BackendAiUserDecisionContext,
    ) => {
      const result = await fetch(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          userRequest:
            "12개월 정기예금에 500만원 가입하고 싶어요.",
          snapshot: currentSnapshot,
          ...(userDecision
            ? { userDecision }
            : {}),
        }),
      });
      assert.equal(result.status, 200);
      return result.json() as Promise<
        Record<string, unknown>
      >;
    };

    const products = await post(snapshot(
      "snap-route-products",
      [
        productChoice("el-product-12m", "12개월 정기예금"),
        productChoice("el-product-other", "다른 정기예금"),
      ],
    ));
    assert.equal(products.actionType, "WAIT_FOR_USER");
    assert.equal(products.decisionType, "PRODUCT_SELECTION");
    assert.equal(products.sourceSnapshotId, "snap-route-products");

    const detail = await post(snapshot(
      "snap-route-detail",
      [
        element("el-rate", "금리 연 3.2%", {
          tag: "div",
          role: null,
        }),
        element("el-detail-next", "가입하기"),
      ],
    ), {
      decisionId: "dec-route-product",
      decisionType: "PRODUCT_SELECTION",
      selectedOptionIds: ["el-product-12m"],
      sourceSnapshotId: "snap-route-products",
    });
    assert.equal(detail.actionType, "CLICK");
    assert.equal(detail.elementId, "el-detail-next");

    const amount = await post(snapshot(
      "snap-route-amount",
      [amountInput()],
    ), {
      decisionId: "dec-route-product",
      decisionType: "PRODUCT_SELECTION",
      selectedOptionIds: ["el-product-12m"],
      sourceSnapshotId: "snap-route-products",
    });
    assert.equal(amount.actionType, "TYPE");
    assert.equal(amount.value, "5000000");

    const terms = await post(snapshot(
      "snap-route-terms",
      [
        termChoice("el-term-service", "[필수] 서비스 약관", false),
        termChoice("el-term-marketing", "[선택] 마케팅 동의", false),
      ],
    ), {
      decisionId: "dec-route-product",
      decisionType: "PRODUCT_SELECTION",
      selectedOptionIds: ["el-product-12m"],
      sourceSnapshotId: "snap-route-products",
    });
    assert.equal(terms.actionType, "WAIT_FOR_USER");
    assert.equal(terms.decisionType, "TERMS_AGREEMENT");

    const termsResumed = await post(snapshot(
      "snap-route-terms-resumed",
      [
        termChoice("el-new-service", "[필수] 서비스 약관", true),
        termChoice("el-new-marketing", "[선택] 마케팅 동의", false),
        element("el-terms-next", "다음"),
      ],
    ), {
      decisionId: "dec-route-terms",
      decisionType: "TERMS_AGREEMENT",
      selectedOptionIds: ["el-term-service"],
      sourceSnapshotId: "snap-route-terms",
    });
    assert.equal(termsResumed.actionType, "CLICK");
    assert.equal(termsResumed.elementId, "el-terms-next");

    const secure = await post(snapshot(
      "snap-route-secure",
      [secureInput()],
    ), {
      decisionId: "dec-route-terms",
      decisionType: "TERMS_AGREEMENT",
      selectedOptionIds: ["el-term-service"],
      sourceSnapshotId: "snap-route-terms",
    });
    assert.deepEqual(Object.keys(secure), RESPONSE_FIELDS);
    assert.equal(secure.actionType, "PAUSE_FOR_SECURE_INPUT");
    assert.equal(secure.status, "SECURE_INPUT_REQUIRED");
    assert.equal(secure.executionBlocked, true);
    assert.equal(secure.elementId, null);
    assert.equal(secure.value, null);
    assert.deepEqual(secure.options, []);
    assert.deepEqual(secure.terms, []);
  } finally {
    server.close();
    await once(server, "close");
  }
});
