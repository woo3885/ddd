import type {
  FinalActionDetection,
  FinalActionType,
  FinalConfirmationResult,
} from "./finalAction.types.js";
import { randomUUID } from "node:crypto";

function createConfirmationId(): string {
  return `confirm-${randomUUID()}`;
}

function createMessage(
  type: FinalActionType,
): string {
  switch (type) {
    case "TRANSFER":
      return "송금을 진행할까요?";

    case "SUBSCRIPTION":
      return "상품 가입을 진행할까요?";

    case "CANCELLATION":
      return "상품 해지를 진행할까요?";

    case "LIMIT_CHANGE":
      return "한도 변경을 진행할까요?";

    case "PAYMENT":
      return "결제를 진행할까요?";

    default:
      return "이 금융 거래를 진행할까요?";
  }
}

function createSummary(
  type: FinalActionType,
): string {
  switch (type) {
    case "TRANSFER":
      return "송금이 실행되기 전 마지막 확인이 필요합니다.";

    case "SUBSCRIPTION":
      return "금융상품 가입이 완료되기 전 마지막 확인이 필요합니다.";

    case "CANCELLATION":
      return "금융상품 해지가 실행되기 전 마지막 확인이 필요합니다.";

    case "LIMIT_CHANGE":
      return "이체 한도 변경이 적용되기 전 마지막 확인이 필요합니다.";

    case "PAYMENT":
      return "결제가 실행되기 전 마지막 확인이 필요합니다.";

    default:
      return "금융 거래 실행 전 사용자 확인이 필요합니다.";
  }
}

/**
 * 최종 거래 탐지 결과를 FINAL_CONFIRMATION으로 변환합니다.
 *
 * 이 결과가 생성되더라도 거래를 바로 실행해서는 안 됩니다.
 * B팀 Gate와 사용자 최종 확인을 거쳐야 합니다.
 */
export function createFinalConfirmationResult(
  detection: FinalActionDetection,
): FinalConfirmationResult | null {
  if (
    !detection.detected ||
    !detection.finalActionType
  ) {
    return null;
  }

  return {
    decisionType:
      "FINAL_CONFIRMATION",

    finalActionType:
      detection.finalActionType,

    targetElementId:
      detection.targetElementId,

    requiresUserAction: true,

    executionBlocked: true,

    confirmationId:
      createConfirmationId(),

    message:
      createMessage(
        detection.finalActionType,
      ),

    summary:
      createSummary(
        detection.finalActionType,
      ),

    confidence:
      detection.confidence,

    reason:
      detection.reason,
  };
}

export function stringifyFinalConfirmationResult(
  result: FinalConfirmationResult,
): string {
  return JSON.stringify(
    result,
    null,
    2,
  );
}