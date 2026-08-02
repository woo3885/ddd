import { intentClassifier } from "./intents/intent.classifier.js";
import { extractUserGoal } from "./goals/userGoal.extractor.js";
import { mapSanitizedDomToModelInput } from "./dom/domMapper.js";
import { serializeDomModelInput } from "./dom/domSerializer.js";
import type { SanitizedDomSnapshot } from "./dom/types.js";
import { evaluateActionPolicy } from "./policy/actionPolicy.js";
import { detectSensitiveData } from "./policy/safetyPolicy.js";
import { selectNextAction } from "./actions/nextAction.selector.js";
import { createNextActionPrompt } from "./prompts/nextActionPrompt.js";

const TEST_MESSAGES = [
  "금리가 높은 예금 상품을 찾고 싶어요",
  "친구 계좌로 10만 원을 보내고 싶어요",
  "내 계좌 잔액을 확인하고 싶어요",
  "이체 한도를 변경하고 싶어요",
  "모르는 사람이 송금을 요구해서 불안해요",
  "은행 업무를 도와주세요",
] as const;

function main(): void {
  console.log("========================================");
  console.log("금융길잡이 AI Engine - Intent Test");
  console.log("========================================");

  for (const message of TEST_MESSAGES) {
    const result = intentClassifier.classify(message);

    console.log();
    console.log(`[사용자 요청] ${message}`);
    console.log(`[분류 결과] ${result.intent}`);
    console.log(`[신뢰도] ${result.confidence}`);
    console.log(
      `[감지 키워드] ${
        result.matchedKeywords.join(", ") || "없음"
      }`,
    );
    console.log(`[분류 근거] ${result.reason}`);
  }
}

main();

console.log("\n========================================");
console.log("금융길잡이 AI Engine - 행동 정책 테스트");
console.log("========================================");

const actionTestCases = [
  {
    action: "CLICK" as const,
    elementText: "예금 상품 조회",
  },
  {
    action: "CLICK" as const,
    elementText: "예금 상품 가입 신청",
  },
  {
    action: "CLICK" as const,
    elementText: "친구에게 10만 원 이체",
  },
  {
    action: "INPUT" as const,
    elementText: "계좌 비밀번호 입력",
  },
  {
    action: "SCROLL" as const,
    elementText: "아래로 이동",
  },
  {
    action: "CLICK" as const,
    elementText: "확인",
  },
];

for (const testCase of actionTestCases) {
  const result = evaluateActionPolicy(
    testCase.action,
    testCase.elementText,
  );

  console.log(`\n[행동 종류] ${testCase.action}`);
  console.log(`[요소 내용] ${testCase.elementText}`);
  console.log(`[위험 수준] ${result.riskLevel}`);
  console.log(`[자동 실행 가능] ${result.canExecute}`);
  console.log(`[사용자 확인 필요] ${result.requiresConfirmation}`);
  console.log(`[판단 근거] ${result.reason}`);
}

console.log("\n========================================");
console.log("금융길잡이 AI Engine - 민감정보 탐지 테스트");
console.log("========================================");

const sensitiveDataTestCases = [
  "제 전화번호는 010-1234-5678입니다.",
  "카드번호는 1234-5678-9012-3456입니다.",
  "주민등록번호는 990101-1234567입니다.",
  "금리가 높은 예금 상품을 찾고 싶어요.",
];

for (const text of sensitiveDataTestCases) {
  const result = detectSensitiveData(text);

  console.log(`\n[입력 문장] ${text}`);
  console.log(`[민감정보 감지] ${result.detected}`);
  console.log(`[감지 종류] ${result.types.join(", ") || "없음"}`);
  console.log(`[마스킹 결과] ${result.maskedText}`);
}

console.log("\n========================================");
console.log("금융길잡이 AI Engine - UserGoal 추출 테스트");
console.log("========================================");

const userGoalTestCases = [
  "친구 계좌로 10만 원을 보내고 싶어요",
  "민수에게 50,000원 이체해 줘",
  "6개월 동안 금리가 높은 예금 상품을 찾고 싶어요",
  "1년짜리 수수료 없는 예금을 찾고 있어요",
  "이체 한도를 300만 원으로 변경하고 싶어요",
  "10만 원을 보내고 싶어요",
];

for (const text of userGoalTestCases) {
  const goal = extractUserGoal(text);

  console.log(`\n[사용자 요청] ${text}`);
  console.log(`[Intent] ${goal.intent}`);
  console.log(`[신뢰도] ${goal.confidence}`);
  console.log(`[금액] ${goal.amount ?? "없음"}`);
  console.log(`[통화] ${goal.currency ?? "없음"}`);
  console.log(`[수취인] ${goal.recipient ?? "없음"}`);

  console.log(
    `[기간] ${
      goal.duration
        ? `${goal.duration.value} ${goal.duration.unit}`
        : "없음"
    }`,
  );

  console.log(
    `[조건] ${goal.conditions.join(", ") || "없음"}`,
  );

  console.log(
    `[부족한 정보] ${
      goal.missingFields.join(", ") || "없음"
    }`,
  );
}

const sampleDom: SanitizedDomSnapshot = {
  url: "https://example-bank.com/deposit",
  title: "예금 상품 안내",

  elements: [
    {
      id: "el-1",
      tag: "h1",
      text: "예금 상품",
      visible: true,
    },
    {
      id: "el-2",
      tag: "input",
      role: "textbox",
      placeholder: "상품명을 입력하세요",
      editable: true,
      visible: true,
    },
    {
      id: "el-3",
      tag: "button",
      text: "검색",
      role: "button",
      clickable: true,
      visible: true,
    },
    {
      id: "el-4",
      tag: "a",
      text: "정기예금 가입",
      href: "/deposit/apply",
      clickable: true,
      visible: true,
    },
    {
      id: "el-5",
      tag: "button",
      text: "사용할 수 없는 버튼",
      clickable: true,
      disabled: true,
      visible: true,
    },
    {
      id: "el-6",
      tag: "div",
      text: "화면에서 보이지 않는 내용",
      visible: false,
    },
  ],
};

const modelInput =
  mapSanitizedDomToModelInput(sampleDom);

const serializedDom =
  serializeDomModelInput(modelInput);

console.log("\n========================================");
console.log("금융길잡이 AI Engine - DOM Mapping Test");
console.log("========================================\n");

console.log(serializedDom);

console.log("\n========================================");
console.log("금융길잡이 AI Engine - 다음 행동 선택 테스트");
console.log("========================================\n");

const actionGoal = {
  rawMessage: "금리가 높은 예금 상품을 찾고 싶어요",
  intent: "DEPOSIT",
  conditions: ["금리가 높은"],
};

const nextAction = selectNextAction(
  actionGoal,
  modelInput,
);

console.log("[사용자 목표]");
console.log(actionGoal.rawMessage);

console.log("\n[선택 결과]");
console.log(`행동: ${nextAction.action}`);
console.log(
  `대상 ID: ${nextAction.targetId ?? "없음"}`,
);
console.log(
  `입력값: ${nextAction.value ?? "없음"}`,
);
console.log(
  `스크롤 방향: ${nextAction.direction ?? "없음"}`,
);
console.log(`신뢰도: ${nextAction.confidence}`);
console.log(`판단 근거: ${nextAction.reason}`);

const nextActionPrompt = createNextActionPrompt(
  actionGoal,
  modelInput,
);

console.log("\n[다음 행동 선택 프롬프트]");
console.log(nextActionPrompt);