import { aiService } from "../services/ai.service.js";

async function testGeminiApi() {
  console.log("========================================");
  console.log("Gemini API 연결 테스트");
  console.log("========================================");

  const prompt =
    "사용자가 '금리가 높은 예금 상품을 찾고 싶어요'라고 말했습니다. 사용자의 목적을 한 문장으로 설명해주세요.";

  console.log("\n[요청]");
  console.log(prompt);

  try {
    const result = await aiService.generateText({
      prompt,
    });

    console.log("\n[사용 모델]");
    console.log(result.model);

    console.log("\n[Gemini 응답]");
    console.log(result.text);

    console.log("\n[API 연결 상태]");
    console.log("SUCCESS");
  } catch (error) {
    console.error("\n[API 연결 상태]");
    console.error("FAILED");
    console.error(error);
  }
}

testGeminiApi();