package com.ddd.backend.ai.engine;

import com.ddd.backend.ai.AiDecisionRequest;
import com.ddd.backend.ai.AiDecisionResponse;
import com.ddd.backend.automation.dom.SanitizedDomSnapshot;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class AiEngineLiveSmokeTest {

    @Test
    void realAiEngineHttpRequestTest() {

        /*
         * 1. C AI Engine endpoint 설정
         */
        AiEngineProperties properties =
                new AiEngineProperties();

        properties.setEndpoint(
                "http://127.0.0.1:3001/api/ai/action"
        );

        /*
         * 2. 실제 HTTP Transport 생성
         */
        JavaHttpAiEngineTransport transport =
                new JavaHttpAiEngineTransport(
                        properties
                );

        /*
         * 3. JSON Mapper 생성
         */
        ObjectMapper objectMapper =
                new ObjectMapper();

        /*
         * 4. 실제 B AI Client 생성
         */
        AiEngineDecisionClient client =
                new AiEngineDecisionClient(
                        transport,
                        objectMapper
                );

        /*
         * 5. 실제 Sanitized DOM Snapshot 작성
         */
        SanitizedDomSnapshot snapshot =
                new SanitizedDomSnapshot(
                        "1.0",
                        "snap-live-001",

                        new SanitizedDomSnapshot.PageSnapshot(
                                "https://demo-bank.example/deposit",
                                "예금 상품"
                        ),

                        List.of(
                                new SanitizedDomSnapshot.ElementSnapshot(
                                        "el-live-001",
                                        "input",
                                        "textbox",
                                        null,
                                        "상품 검색",
                                        "상품명을 입력하세요",
                                        "text",
                                        true,
                                        true,

                                        new SanitizedDomSnapshot.BoundingBoxSnapshot(
                                                100,
                                                100,
                                                300,
                                                40
                                        ),

                                        SanitizedDomSnapshot.SecurityPolicy.NORMAL
                                ),

                                new SanitizedDomSnapshot.ElementSnapshot(
                                        "el-live-002",
                                        "button",
                                        "button",
                                        "검색",
                                        null,
                                        null,
                                        null,
                                        true,
                                        true,

                                        new SanitizedDomSnapshot.BoundingBoxSnapshot(
                                                420,
                                                100,
                                                80,
                                                40
                                        ),

                                        SanitizedDomSnapshot.SecurityPolicy.NORMAL
                                )
                        )
                );

        /*
         * 6. B의 실제 AiDecisionRequest 생성
         */
        AiDecisionRequest request =
                new AiDecisionRequest(
                        "금리가 높은 예금 상품을 찾고 싶어요.",
                        snapshot
                );

        /*
         * 7. B -> C 실제 HTTP 호출
         */
        AiDecisionResponse response =
                client.decide(
                        request
                );

        /*
         * 8. 결과 출력
         */
        System.out.println();
        System.out.println(
                "========================================"
        );
        System.out.println(
                "B -> C AI Engine Live Smoke Test"
        );
        System.out.println(
                "========================================"
        );

        System.out.println(
                "actionType: "
                        + response.actionType()
        );

        System.out.println(
                "elementId: "
                        + response.elementId()
        );

        System.out.println(
                "value: "
                        + response.value()
        );

        System.out.println(
                "scrollX: "
                        + response.scrollX()
        );

        System.out.println(
                "scrollY: "
                        + response.scrollY()
        );

        System.out.println(
                "waitMillis: "
                        + response.waitMillis()
        );

        /*
         * 9. 최소 계약 검증
         */
        assertNotNull(
                response
        );

        assertNotNull(
                response.actionType()
        );
    }
}