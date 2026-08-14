package com.ddd.backend.ai.gemini;

import com.ddd.backend.ai.AiDecisionRequest;
import com.ddd.backend.ai.AiDecisionResponse;
import com.ddd.backend.automation.BrowserActionType;
import com.ddd.backend.automation.dom.SanitizedDomSnapshot;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class GeminiLiveSmokeTest {

    @Test
    void 실제_Gemini가_SanitizedDOM에서_elementId를_선택한다() {

        String liveTest =
                System.getenv(
                        "GEMINI_LIVE_TEST"
                );

        String apiKey =
                System.getenv(
                        "GEMINI_API_KEY"
                );

        /*
         * 일반 clean test에서는 실제 Google API를
         * 호출하지 않는다.
         *
         * GEMINI_LIVE_TEST=true일 때만 실행.
         */
        Assumptions.assumeTrue(
                "true".equalsIgnoreCase(
                        liveTest
                ),
                "Gemini Live Test가 활성화되지 않았습니다."
        );

        Assumptions.assumeTrue(
                apiKey != null
                        && !apiKey.isBlank(),
                "GEMINI_API_KEY가 설정되지 않았습니다."
        );

        GeminiProperties properties =
                new GeminiProperties();

        properties.setApiKey(
                apiKey
        );

        String model =
                System.getenv(
                        "GEMINI_MODEL"
                );

        properties.setModel(
                model == null
                        || model.isBlank()
                        ? "gemini-3.6-flash"
                        : model
        );

        GeminiHttpTransport transport =
                new JavaHttpGeminiTransport(
                        properties
                );

        ObjectMapper objectMapper =
                JsonMapper
                        .builder()
                        .build();

        GeminiAiDecisionClient client =
                new GeminiAiDecisionClient(
                        transport,
                        properties,
                        objectMapper
                );

        SanitizedDomSnapshot.ElementSnapshot
                nextButton =
                new SanitizedDomSnapshot
                        .ElementSnapshot(
                        "el-live0001-001",
                        "button",
                        "button",
                        "다음",
                        "다음 단계",
                        null,
                        null,
                        true,
                        true,
                        new SanitizedDomSnapshot
                                .BoundingBoxSnapshot(
                                820,
                                650,
                                120,
                                48
                        ),
                        SanitizedDomSnapshot
                                .SecurityPolicy
                                .NORMAL
                );

        SanitizedDomSnapshot snapshot =
                new SanitizedDomSnapshot(
                        "1.0",
                        "snap-live0001",
                        new SanitizedDomSnapshot
                                .PageSnapshot(
                                "http://127.0.0.1:5190/demo",
                                "안내 페이지"
                        ),
                        List.of(
                                nextButton
                        )
                );

        AiDecisionRequest request =
                new AiDecisionRequest(
                        """
                        화면에 표시된 유일한
                        '다음' 버튼을 클릭해줘.
                        """,
                        snapshot
                );

        AiDecisionResponse response =
                client.decide(
                        request
                );

        System.out.println(
                "Gemini actionType = "
                        + response.actionType()
        );

        System.out.println(
                "Gemini elementId = "
                        + response.elementId()
        );

        /*
         * AI가 CSS selector를 만드는 것이 아니라
         * 우리가 제공한 elementId를 선택해야 한다.
         */
        assertThat(
                response.actionType()
        ).isEqualTo(
                BrowserActionType.CLICK
        );

        assertThat(
                response.elementId()
        ).isEqualTo(
                "el-live0001-001"
        );
    }
}