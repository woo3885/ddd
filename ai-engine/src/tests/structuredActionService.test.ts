import {
  generateStructuredAction,
} from "../services/structuredAction.service.js";

async function runTest() {
  const request = {
    requestId: "req-d18-bc-001",
    sessionId: "session-test-001",

    userGoal: {
      rawMessage:
        "금리가 높은 예금 상품을 찾고 싶어요.",
      intent: "DEPOSIT",
      conditions: ["금리가 높은"],
    },

    domSnapshot: {
      schemaVersion: "1.0",
      snapshotId: "snap-a1b2c3d4",

      page: {
        url:
          "https://demo-bank.example/deposit",
        title: "예금 상품",
      },

      elements: [
        {
          elementId:
            "el-a1b2c3d4-001",
          tag: "input",
          role: "textbox",
          text: null,
          ariaLabel: "상품 검색",
          placeholder:
            "상품명을 입력하세요",
          inputType: "text",
          visible: true,
          enabled: true,
        },

        {
          elementId:
            "el-a1b2c3d4-002",
          tag: "button",
          role: "button",
          text: "검색",
          ariaLabel: "검색",
          placeholder: null,
          inputType: null,
          visible: true,
          enabled: true,
        },
      ],
    },
  };

  const result =
    await generateStructuredAction(
      request,
    );

  console.log(
    JSON.stringify(result, null, 2),
  );
}

runTest().catch(console.error);