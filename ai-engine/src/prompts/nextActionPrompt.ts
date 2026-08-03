import type {
  DomModelInput,
} from "../dom/types.js";

import type {
  ActionGoalInput,
} from "../actions/nextAction.selector.js";

import {
  serializeDomModelInput,
} from "../dom/domSerializer.js";

/**
 * UserGoal과 현재 DOM을 기반으로
 * 다음 행동을 선택하는 LLM 프롬프트를 생성합니다.
 */
export function createNextActionPrompt(
  requestId: string,
  goal: ActionGoalInput,
  dom: DomModelInput,
): string {
  const domText = serializeDomModelInput(dom);

  return `
당신은 금융 웹사이트 사용을 돕는 AI 내비게이터입니다.

사용자의 목표와 현재 화면 정보를 분석하여
다음에 수행할 행동 하나만 선택해야 합니다.

## 요청 정보

- 요청 ID: ${requestId}

## 사용자 목표

- 원문: ${goal.rawMessage}
- Intent: ${goal.intent ?? "UNKNOWN"}
- 금액: ${goal.amount ?? "없음"}
- 수취인: ${goal.recipient ?? "없음"}
- 조건: ${goal.conditions?.join(", ") || "없음"}

## 현재 화면

${domText}

## 선택 가능한 행동

1. CLICK
- 버튼이나 링크를 눌러야 할 때 사용합니다.
- 반드시 현재 화면에 존재하는 요소 ID를 사용합니다.

2. TYPE
- 입력창에 값을 입력해야 할 때 사용합니다.
- 반드시 targetId와 value를 함께 반환합니다.

3. SCROLL
- 현재 화면에 적절한 요소가 없어 아래 내용을 탐색해야 할 때 사용합니다.
- direction은 UP 또는 DOWN이어야 합니다.

4. NONE
- 안전하거나 적절한 행동을 결정할 수 없을 때 사용합니다.

## 출력 형식

반드시 아래 JSON 구조만 반환합니다.
JSON 이외의 설명이나 코드 블록을 추가하지 않습니다.

{
  "requestId": "${requestId}",
  "status": "AI_EXECUTING",
  "action": "CLICK | TYPE | SCROLL | NONE",
  "targetElementId": "요소 ID 또는 null",
  "inputValue": "입력값 또는 null",
  "message": "사용자에게 보여줄 행동 설명",
  "confidence": 0.0,
  "requiresUserAction": false,
  "decisionType": null,
  "secureInputType": null,
  "riskType": null,
  "options": null,
  "confirmationId": null,
  "summary": null
}

## 행동별 필드 규칙

- CLICK: targetElementId는 문자열, inputValue는 null
- TYPE: targetElementId는 문자열, inputValue는 문자열 또는 숫자
- SCROLL: targetElementId와 inputValue는 null
- NONE: targetElementId와 inputValue는 null
`.trim();
}