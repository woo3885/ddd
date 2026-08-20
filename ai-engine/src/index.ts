import { intentClassifier } from "./intents/intent.classifier.js";

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