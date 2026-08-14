package com.ddd.backend.ai.gemini;

import com.ddd.backend.ai.AiDecisionClientException;
import com.ddd.backend.ai.AiDecisionRequest;
import com.ddd.backend.ai.AiDecisionResponse;
import com.ddd.backend.automation.BrowserActionType;
import com.ddd.backend.automation.dom.SanitizedDomSnapshot;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class GeminiAiDecisionClientTest {

    private ObjectMapper objectMapper;

    private GeminiProperties properties;

    private RecordingTransport transport;

    private GeminiAiDecisionClient client;

    @BeforeEach
    void setUp() {

        objectMapper =
                JsonMapper
                        .builder()
                        .build();

        properties =
                new GeminiProperties();

        properties.setApiKey(
                "test-api-key"
        );

        properties.setModel(
                "gemini-3.6-flash"
        );

        transport =
                new RecordingTransport();

        client =
                new GeminiAiDecisionClient(
                        transport,
                        properties,
                        objectMapper
                );
    }

    @Test
    void Gemini_Response를_AiDecisionResponse로_변환한다() {

        transport.response =
                """
                {
                  "id": "interaction-test",
                  "status": "completed",
                  "steps": [
                    {
                      "type": "thought"
                    },
                    {
                      "type": "model_output",
                      "content": [
                        {
                          "type": "text",
                          "text": "{\\"actionType\\":\\"CLICK\\",\\"elementId\\":\\"el-a1b2c3d4-001\\",\\"value\\":null,\\"scrollX\\":null,\\"scrollY\\":null,\\"waitMillis\\":null}"
                        }
                      ]
                    }
                  ]
                }
                """;

        AiDecisionResponse response =
                client.decide(
                        createRequest()
                );

        assertThat(
                response.actionType()
        ).isEqualTo(
                BrowserActionType.CLICK
        );

        assertThat(
                response.elementId()
        ).isEqualTo(
                "el-a1b2c3d4-001"
        );
    }

    @Test
    void 요청은_store_false와_Structured_Output을_사용한다()
            throws Exception {

        transport.response =
                """
                {
                  "status": "completed",
                  "steps": [
                    {
                      "type": "model_output",
                      "content": [
                        {
                          "type": "text",
                          "text": "{\\"actionType\\":\\"NONE\\",\\"elementId\\":null,\\"value\\":null,\\"scrollX\\":null,\\"scrollY\\":null,\\"waitMillis\\":null}"
                        }
                      ]
                    }
                  ]
                }
                """;

        client.decide(
                createRequest()
        );

        JsonNode request =
                objectMapper.readTree(
                        transport.requestBody
                );

        assertThat(
                request.path(
                        "model"
                ).asText()
        ).isEqualTo(
                "gemini-3.6-flash"
        );

        assertThat(
                request.path(
                        "store"
                ).asBoolean()
        ).isFalse();

        assertThat(
                request.path(
                                "response_format"
                        )
                        .path(
                                "mime_type"
                        )
                        .asText()
        ).isEqualTo(
                "application/json"
        );

        JsonNode schema =
                request.path(
                                "response_format"
                        )
                        .path(
                                "schema"
                        );

        assertThat(
                schema.path(
                        "additionalProperties"
                ).asBoolean()
        ).isFalse();

        assertThat(
                schema.path(
                                "properties"
                        )
                        .has(
                                "selector"
                        )
        ).isFalse();

        assertThat(
                schema.path(
                                "properties"
                        )
                        .has(
                                "elementId"
                        )
        ).isTrue();
    }

    @Test
    void Prompt에는_Sanitized_elementId가_포함되고_selector는_요구하지_않는다()
            throws Exception {

        transport.response =
                """
                {
                  "status": "completed",
                  "steps": [
                    {
                      "type": "model_output",
                      "content": [
                        {
                          "type": "text",
                          "text": "{\\"actionType\\":\\"NONE\\",\\"elementId\\":null,\\"value\\":null,\\"scrollX\\":null,\\"scrollY\\":null,\\"waitMillis\\":null}"
                        }
                      ]
                    }
                  ]
                }
                """;

        client.decide(
                createRequest()
        );

        JsonNode request =
                objectMapper.readTree(
                        transport.requestBody
                );

        String prompt =
                request.path(
                        "input"
                ).asText();

        assertThat(
                prompt
        ).contains(
                "el-a1b2c3d4-001"
        );

        assertThat(
                prompt
        ).contains(
                "Never create or return a CSS selector"
        );
    }

    @Test
    void 완료되지_않은_Interaction은_실패한다() {

        transport.response =
                """
                {
                  "status": "in_progress",
                  "steps": []
                }
                """;

        assertThatThrownBy(
                () ->
                        client.decide(
                                createRequest()
                        )
        )
                .isInstanceOf(
                        AiDecisionClientException.class
                );
    }

    @Test
    void model_output이_없으면_실패한다() {

        transport.response =
                """
                {
                  "status": "completed",
                  "steps": [
                    {
                      "type": "thought"
                    }
                  ]
                }
                """;

        assertThatThrownBy(
                () ->
                        client.decide(
                                createRequest()
                        )
        )
                .isInstanceOf(
                        AiDecisionClientException.class
                );
    }

    @Test
    void API_Key가_없으면_Gemini를_호출하지_않는다() {

        properties.setApiKey(
                ""
        );

        assertThatThrownBy(
                () ->
                        client.decide(
                                createRequest()
                        )
        )
                .isInstanceOf(
                        IllegalStateException.class
                );

        assertThat(
                transport.requestBody
        ).isNull();
    }

    private AiDecisionRequest createRequest() {

        SanitizedDomSnapshot.ElementSnapshot element =
                new SanitizedDomSnapshot.ElementSnapshot(
                        "el-a1b2c3d4-001",
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
                                100,
                                200,
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
                        "snap-a1b2c3d4",
                        new SanitizedDomSnapshot
                                .PageSnapshot(
                                "http://127.0.0.1:5190/transfer/accounts",
                                "계좌 선택"
                        ),
                        List.of(
                                element
                        )
                );

        return new AiDecisionRequest(
                "다음 단계로 이동해줘",
                snapshot
        );
    }

    private static final class RecordingTransport
            implements GeminiHttpTransport {

        private String response;

        private String requestBody;

        @Override
        public String post(
                String requestBody
        ) {
            this.requestBody =
                    requestBody;

            return response;
        }
    }
}