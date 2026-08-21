import type {
  AiActionRequest,
  BackendSanitizedDomElement,
} from "../api/aiRequest.types.js";

import type {
  StructuredAIResponse,
} from "../output/aiResponse.types.js";

import {
  sanitizeInternalMessage,
} from "../messages/messageSafety.js";

export type DepositScenarioStage =
  | "PRODUCT_LIST"
  | "PRODUCT_DETAIL"
  | "AMOUNT_ENTRY"
  | "TERMS"
  | "SECURE_INPUT"
  | "UNKNOWN";

export const DEPOSIT_GUIDANCE = Object.freeze({
  productSelection:
    "가입할 예금 상품을 직접 선택해 주세요.",
  productDetail:
    "가입 기간과 금리를 확인해 주세요.",
  amount:
    "가입 금액 입력 내용을 확인하고 다음 단계로 이동합니다.",
  amountMissing:
    "가입 금액을 확인하려면 추가 정보가 필요합니다.",
  terms:
    "필수 약관과 선택 약관을 확인한 뒤 직접 선택해 주세요.",
  termsResume:
    "약관 선택 내용을 확인하고 다음 단계로 이동합니다.",
  secureInput:
    "비밀번호는 금융 화면에 직접 입력해 주세요. 입력 내용은 AI가 확인하지 않습니다.",
} as const);

const PRODUCT_KEYWORDS = [
  "정기예금",
  "예금 상품",
  "예금상품",
  "가입 상품",
] as const;

const DETAIL_KEYWORDS = [
  "가입 기간",
  "기간",
  "금리",
  "이율",
  "상품 조건",
] as const;

const AMOUNT_KEYWORDS = [
  "가입 금액",
  "가입금액",
  "예치 금액",
  "예치금액",
] as const;

const TERM_KEYWORDS = [
  "약관",
  "동의",
  "필수",
  "선택",
  "개인정보",
] as const;

const NAVIGATION_KEYWORDS = [
  "가입하기",
  "가입 진행",
  "신청 진행",
  "다음",
  "계속",
  "확인",
] as const;

function normalize(value: string | null | undefined): string {
  return value
    ?.toLowerCase()
    .replace(/\s+/g, " ")
    .trim() ?? "";
}

function elementText(
  element: BackendSanitizedDomElement,
): string {
  return [
    element.ariaLabel,
    element.text,
    element.placeholder,
    element.role,
    element.tag,
  ]
    .map(normalize)
    .filter(Boolean)
    .join(" ");
}

function includesAny(
  value: string,
  keywords: readonly string[],
): boolean {
  return keywords.some((keyword) =>
    value.includes(normalize(keyword)),
  );
}

function isVisible(
  element: BackendSanitizedDomElement,
): boolean {
  return element.visible;
}

function isVisibleEnabled(
  element: BackendSanitizedDomElement,
): boolean {
  return element.visible && element.enabled;
}

function isChoiceControl(
  element: BackendSanitizedDomElement,
): boolean {
  const inputType = normalize(element.inputType);
  const role = normalize(element.role);
  return (
    inputType === "checkbox" ||
    inputType === "radio" ||
    role === "checkbox" ||
    role === "radio"
  );
}

function isNormalClickable(
  element: BackendSanitizedDomElement,
): boolean {
  const tag = normalize(element.tag);
  const role = normalize(element.role);
  return (
    isVisibleEnabled(element) &&
    element.securityPolicy === "NORMAL" &&
    (
      tag === "button" ||
      tag === "a" ||
      role === "button" ||
      role === "link"
    )
  );
}

function isAmountInput(
  element: BackendSanitizedDomElement,
): boolean {
  const tag = normalize(element.tag);
  const role = normalize(element.role);
  const inputType = normalize(element.inputType);
  const text = elementText(element);
  return (
    isVisibleEnabled(element) &&
    element.securityPolicy === "NORMAL" &&
    (
      tag === "input" ||
      tag === "textarea" ||
      role === "textbox"
    ) &&
    !["password", "hidden"].includes(inputType) &&
    includesAny(text, AMOUNT_KEYWORDS)
  );
}

function productChoices(
  request: AiActionRequest,
): BackendSanitizedDomElement[] {
  return request.domSnapshot.elements.filter(
    (element) => {
      const inputType = normalize(element.inputType);
      const role = normalize(element.role);
      return (
      isVisibleEnabled(element) &&
      element.securityPolicy === "USER_DECISION" &&
      inputType !== "checkbox" &&
      role !== "checkbox" &&
      includesAny(elementText(element), PRODUCT_KEYWORDS)
      );
    },
  );
}

function termChoices(
  request: AiActionRequest,
): BackendSanitizedDomElement[] {
  return request.domSnapshot.elements.filter(
    (element) =>
      isVisibleEnabled(element) &&
      element.securityPolicy === "USER_DECISION" &&
      isChoiceControl(element) &&
      includesAny(elementText(element), TERM_KEYWORDS),
  );
}

function navigationTargets(
  request: AiActionRequest,
): BackendSanitizedDomElement[] {
  return request.domSnapshot.elements.filter(
    (element) =>
      isNormalClickable(element) &&
      includesAny(elementText(element), NAVIGATION_KEYWORDS),
  );
}

function hasSecureInput(
  request: AiActionRequest,
): boolean {
  return request.domSnapshot.elements.some((element) => {
    if (!isVisible(element)) {
      return false;
    }
    const inputType = normalize(element.inputType);
    const tag = normalize(element.tag);
    const role = normalize(element.role);
    const text = elementText(element);
    const isInputLike =
      tag === "input" ||
      tag === "textarea" ||
      role === "textbox";
    return (
      element.securityPolicy === "SECURE_INPUT" ||
      (
        isInputLike &&
        (
          inputType === "password" ||
          includesAny(text, [
            "비밀번호",
            "pin",
            "otp",
            "인증번호",
          ])
        )
      )
    );
  });
}

function isDepositRequest(
  request: AiActionRequest,
): boolean {
  return (
    request.userGoal.intent === "DEPOSIT" ||
    includesAny(normalize(request.userGoal.rawMessage), [
      "정기예금",
      "예금 가입",
    ])
  );
}

export function classifyDepositScenarioStage(
  request: AiActionRequest,
): DepositScenarioStage {
  if (!isDepositRequest(request)) {
    return "UNKNOWN";
  }

  if (hasSecureInput(request)) {
    return "SECURE_INPUT";
  }

  if (termChoices(request).length > 0) {
    return "TERMS";
  }

  if (
    request.domSnapshot.elements.some(isAmountInput)
  ) {
    return "AMOUNT_ENTRY";
  }

  if (productChoices(request).length > 0) {
    return "PRODUCT_LIST";
  }

  const visibleText = request.domSnapshot.elements
    .filter(isVisible)
    .map(elementText)
    .join(" ");
  const hasDetailSemantics =
    includesAny(visibleText, DETAIL_KEYWORDS);
  const hasProductResume =
    request.userDecisionContext?.decisionType ===
    "PRODUCT_SELECTION";
  const urlHint = normalize(
    request.domSnapshot.page.url,
  ).includes("/deposit/");

  if (
    navigationTargets(request).length > 0 &&
    (
      hasDetailSemantics ||
      (hasProductResume && urlHint)
    )
  ) {
    return "PRODUCT_DETAIL";
  }

  return "UNKNOWN";
}

function clearDecisionMetadata(
  response: StructuredAIResponse,
): StructuredAIResponse {
  return {
    ...response,
    decisionType: null,
    options: null,
    confirmationId: null,
    summary: null,
  };
}

function createNoneResponse(
  response: StructuredAIResponse,
  message: string,
): StructuredAIResponse {
  return {
    ...clearDecisionMetadata(response),
    status: "AI_EXECUTING",
    action: "NONE",
    targetElementId: null,
    inputValue: null,
    message,
    confidence: 1,
    requiresUserAction: true,
    secureInputType: null,
    riskType: null,
  };
}

function hasProtectedModelSignal(
  response: StructuredAIResponse,
): boolean {
  return (
    response.status === "RISK_WARNING" ||
    response.riskType !== null ||
    response.status === "FINAL_CONFIRMATION_REQUIRED" ||
    response.action === "REQUEST_FINAL_CONFIRMATION" ||
    response.confirmationId !== null ||
    response.status === "SECURE_INPUT_REQUIRED" ||
    response.action === "PAUSE_FOR_SECURE_INPUT" ||
    response.secureInputType !== null
  );
}

function createDecisionResponse(
  response: StructuredAIResponse,
  decisionType: "PRODUCT_SELECTION" | "TERMS_AGREEMENT",
  choices: readonly BackendSanitizedDomElement[],
  message: string,
): StructuredAIResponse {
  return {
    ...response,
    status: "USER_DECISION_REQUIRED",
    action: "WAIT_FOR_USER",
    targetElementId: null,
    inputValue: null,
    message,
    confidence: 1,
    requiresUserAction: true,
    decisionType,
    secureInputType: null,
    riskType: null,
    options: choices.map((choice) => ({
      id: choice.elementId,
      label: elementText(choice),
      ...(decisionType === "TERMS_AGREEMENT"
        ? { required: false }
        : {}),
    })),
    confirmationId: null,
    summary: null,
  };
}

function chooseNavigationTarget(
  response: StructuredAIResponse,
  request: AiActionRequest,
): BackendSanitizedDomElement | null {
  const targets = navigationTargets(request);
  const modelTarget = targets.find(
    (target) =>
      response.action === "CLICK" &&
      response.targetElementId === target.elementId,
  );

  if (modelTarget) {
    return modelTarget;
  }

  return targets.length === 1
    ? targets[0] ?? null
    : null;
}

function createNavigationResponse(
  response: StructuredAIResponse,
  target: BackendSanitizedDomElement,
  message: string,
): StructuredAIResponse {
  return {
    ...clearDecisionMetadata(response),
    status: "AI_EXECUTING",
    action: "CLICK",
    targetElementId: target.elementId,
    inputValue: null,
    message,
    confidence: 1,
    requiresUserAction: false,
    secureInputType: null,
    riskType: null,
  };
}

function enforceProductList(
  response: StructuredAIResponse,
  request: AiActionRequest,
): StructuredAIResponse {
  if (
    request.userDecisionContext?.decisionType ===
    "PRODUCT_SELECTION"
  ) {
    const target = chooseNavigationTarget(
      response,
      request,
    );
    return target
      ? createNavigationResponse(
          response,
          target,
          DEPOSIT_GUIDANCE.productDetail,
        )
      : createNoneResponse(
          response,
          DEPOSIT_GUIDANCE.productDetail,
        );
  }

  return createDecisionResponse(
    response,
    "PRODUCT_SELECTION",
    productChoices(request),
    DEPOSIT_GUIDANCE.productSelection,
  );
}

function enforceTerms(
  response: StructuredAIResponse,
  request: AiActionRequest,
): StructuredAIResponse {
  if (
    request.userDecisionContext?.decisionType ===
    "TERMS_AGREEMENT"
  ) {
    const target = chooseNavigationTarget(
      response,
      request,
    );
    return target
      ? createNavigationResponse(
          response,
          target,
          DEPOSIT_GUIDANCE.termsResume,
        )
      : createNoneResponse(
          response,
          DEPOSIT_GUIDANCE.terms,
        );
  }

  return createDecisionResponse(
    response,
    "TERMS_AGREEMENT",
    termChoices(request),
    DEPOSIT_GUIDANCE.terms,
  );
}

function enforceAmountEntry(
  response: StructuredAIResponse,
  request: AiActionRequest,
): StructuredAIResponse {
  const amount = request.userGoal.amount;
  if (
    amount === undefined ||
    !Number.isSafeInteger(amount) ||
    amount <= 0
  ) {
    return createNoneResponse(
      response,
      DEPOSIT_GUIDANCE.amountMissing,
    );
  }

  const amountInputs = request.domSnapshot.elements
    .filter(isAmountInput);
  const modelInput = amountInputs.find(
    (input) =>
      response.action === "TYPE" &&
      response.targetElementId === input.elementId,
  );
  const input = modelInput ??
    (amountInputs.length === 1
      ? amountInputs[0] ?? null
      : null);

  if (!input) {
    return createNoneResponse(
      response,
      DEPOSIT_GUIDANCE.amountMissing,
    );
  }

  return {
    ...clearDecisionMetadata(response),
    status: "AI_EXECUTING",
    action: "TYPE",
    targetElementId: input.elementId,
    inputValue: String(amount),
    message: DEPOSIT_GUIDANCE.amount,
    confidence: 1,
    requiresUserAction: false,
    secureInputType: null,
    riskType: null,
  };
}

function enforceSecureInput(
  response: StructuredAIResponse,
): StructuredAIResponse {
  return {
    ...clearDecisionMetadata(response),
    status: "SECURE_INPUT_REQUIRED",
    action: "PAUSE_FOR_SECURE_INPUT",
    targetElementId: null,
    inputValue: null,
    message: DEPOSIT_GUIDANCE.secureInput,
    confidence: 1,
    requiresUserAction: true,
    secureInputType: "PASSWORD",
    riskType: null,
  };
}

export function enforceDepositScenarioPolicy(
  response: StructuredAIResponse,
  request: AiActionRequest,
): StructuredAIResponse {
  const stage = classifyDepositScenarioStage(
    request,
  );

  if (stage === "SECURE_INPUT") {
    return enforceSecureInput(response);
  }

  if (hasProtectedModelSignal(response)) {
    return response;
  }

  switch (stage) {
    case "PRODUCT_LIST":
      return enforceProductList(response, request);
    case "PRODUCT_DETAIL": {
      const target = chooseNavigationTarget(
        response,
        request,
      );
      return target
        ? createNavigationResponse(
            response,
            target,
            DEPOSIT_GUIDANCE.productDetail,
          )
        : createNoneResponse(
            response,
            DEPOSIT_GUIDANCE.productDetail,
          );
    }
    case "AMOUNT_ENTRY":
      return enforceAmountEntry(response, request);
    case "TERMS":
      return enforceTerms(response, request);
    case "UNKNOWN":
      return {
        ...response,
        message: sanitizeInternalMessage(
          response.message,
        ),
      };
  }
}

/**
 * D24 canonicalizes decision items and deliberately replaces model-authored
 * wait text. D25 decision text is not model-authored, so restore only the
 * static guidance produced for a semantically classified deposit stage after
 * D24 validation has completed.
 */
export function finalizeDepositScenarioGuidance(
  response: StructuredAIResponse,
  depositChecked: StructuredAIResponse,
  stage: DepositScenarioStage,
): StructuredAIResponse {
  if (
    response.action === "WAIT_FOR_USER" &&
    (
      stage === "PRODUCT_LIST" ||
      stage === "TERMS"
    )
  ) {
    return {
      ...response,
      message: depositChecked.message,
    };
  }

  return response;
}
