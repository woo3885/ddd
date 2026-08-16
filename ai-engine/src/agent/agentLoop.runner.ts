import type {
  AiActionRequest,
  BackendSanitizedDomSnapshot,
} from "../api/aiRequest.types.js";

import type {
  StructuredAIResponse,
} from "../output/aiResponse.types.js";

import type {
  AgentLoopDependencies,
  AgentLoopResult,
  AgentLoopStep,
  AgentLoopUserGoal,
} from "./agentLoop.types.js";

const DEFAULT_MAX_STEPS = 10;

function isUserDecisionRequired(
  response: StructuredAIResponse,
): boolean {
  return (
    response.status ===
      "USER_DECISION_REQUIRED" ||
    response.action ===
      "WAIT_FOR_USER"
  );
}

function isSecureInputRequired(
  response: StructuredAIResponse,
): boolean {
  return (
    response.status ===
      "SECURE_INPUT_REQUIRED" ||
    response.action ===
      "PAUSE_FOR_SECURE_INPUT"
  );
}

function isFinalConfirmationRequired(
  response: StructuredAIResponse,
): boolean {
  return (
    response.status ===
      "FINAL_CONFIRMATION_REQUIRED" ||
    response.action ===
      "REQUEST_FINAL_CONFIRMATION"
  );
}

function isCompleted(
  response: StructuredAIResponse,
): boolean {
  return (
    response.status ===
      "COMPLETED" ||
    response.action ===
      "STOP"
  );
}

function isError(
  response: StructuredAIResponse,
): boolean {
  return (
    response.status ===
    "ERROR"
  );
}

function createRequest(
  requestId: string,
  userGoal: AgentLoopUserGoal,
  domSnapshot: BackendSanitizedDomSnapshot,
): AiActionRequest {
  return {
    requestId,
    userGoal,
    domSnapshot,
  };
}

export async function runAgentLoop(
  userGoal: AgentLoopUserGoal,
  initialSnapshot: BackendSanitizedDomSnapshot,
  dependencies: AgentLoopDependencies,
  maxSteps = DEFAULT_MAX_STEPS,
): Promise<AgentLoopResult> {
  let currentSnapshot =
    initialSnapshot;

  const steps:
    AgentLoopStep[] = [];

  for (
    let stepNumber = 1;
    stepNumber <= maxSteps;
    stepNumber++
  ) {
    const requestId =
      dependencies.createRequestId(
        stepNumber,
      );

    const request =
      createRequest(
        requestId,
        userGoal,
        currentSnapshot,
      );

    const response =
      await dependencies.decide(
        request,
      );

    steps.push({
      stepNumber,
      snapshotId:
        currentSnapshot.snapshotId,
      response,
    });

    /*
     * 사용자 선택이 필요한 경우에는
     * Browser Action을 실행하지 않고
     * Agent Loop를 일시정지합니다.
     */
    if (
      isUserDecisionRequired(
        response,
      )
    ) {
      return {
        status:
          "WAITING_FOR_USER",

        steps,

        finalSnapshot:
          currentSnapshot,

        finalResponse:
          response,
      };
    }

    /*
     * 비밀번호, OTP 등 보안 입력이 필요한 경우
     * AI 자동 실행을 중단합니다.
     */
    if (
      isSecureInputRequired(
        response,
      )
    ) {
      return {
        status:
          "WAITING_FOR_SECURE_INPUT",

        steps,

        finalSnapshot:
          currentSnapshot,

        finalResponse:
          response,
      };
    }

    /*
     * 최종 가입/송금 등 사용자의 최종 승인이
     * 필요한 경우 실행하지 않고 대기합니다.
     */
    if (
      isFinalConfirmationRequired(
        response,
      )
    ) {
      return {
        status:
          "WAITING_FOR_FINAL_CONFIRMATION",

        steps,

        finalSnapshot:
          currentSnapshot,

        finalResponse:
          response,
      };
    }

    if (
      isCompleted(
        response,
      )
    ) {
      return {
        status:
          "COMPLETED",

        steps,

        finalSnapshot:
          currentSnapshot,

        finalResponse:
          response,
      };
    }

    if (
      isError(
        response,
      )
    ) {
      return {
        status:
          "ERROR",

        steps,

        finalSnapshot:
          currentSnapshot,

        finalResponse:
          response,
      };
    }

    /*
     * NONE은 실제 실행할 Browser Action이 없으므로
     * 무한 반복을 막기 위해 종료합니다.
     */
    if (
      response.action ===
      "NONE"
    ) {
      return {
        status:
          "STOPPED",

        steps,

        finalSnapshot:
          currentSnapshot,

        finalResponse:
          response,
      };
    }

    /*
     * 실제 Browser Action은 Backend가 실행합니다.
     */
    await dependencies.execute(
      response,
    );

    /*
     * Action 실행 이후에는 반드시
     * 새로운 Sanitized DOM Snapshot으로 교체합니다.
     */
    currentSnapshot =
      await dependencies
        .getNextSnapshot();
  }

  return {
    status:
      "MAX_STEPS_REACHED",

    steps,

    finalSnapshot:
      currentSnapshot,

    finalResponse:
      steps.at(-1)?.response ??
      null,
  };
}

export async function resumeAgentLoop(
  userGoal: AgentLoopUserGoal,
  resumedSnapshot: BackendSanitizedDomSnapshot,
  dependencies: AgentLoopDependencies,
  maxSteps = DEFAULT_MAX_STEPS,
): Promise<AgentLoopResult> {
  return runAgentLoop(
    userGoal,
    resumedSnapshot,
    dependencies,
    maxSteps,
  );
}