import { aiService } from "./services/ai.service.js";

async function main(): Promise<void> {
  console.log("========================================");
  console.log("금융길잡이 AI Engine");
  console.log("상태: STARTING");
  console.log("========================================");

  const result = await aiService.generateText({
    prompt: `
너는 금융 웹사이트 이용을 도와주는 AI 안내 도우미다.

사용자의 요청:
"예금 상품을 찾고 싶어요."

현재는 연결 테스트 단계다.
사용자에게 한 문장으로 간단히 답변해라.
    `.trim(),
  });

  console.log(`[AI Engine] 사용 모델: ${result.model}`);
  console.log(`[AI Engine] 응답: ${result.text}`);
  console.log("[AI Engine] 상태: READY");
}

main().catch((error: unknown) => {
  const message =
    error instanceof Error
      ? error.message
      : "알 수 없는 오류가 발생했습니다.";

  console.error("[AI Engine] 실행 실패");
  console.error(message);

  process.exitCode = 1;
});