package com.ddd.backend.ai.engine;

import com.ddd.backend.ai.AiDecisionClientException;
import com.ddd.backend.ai.AiDecisionRequest;
import com.ddd.backend.ai.AiDecisionResponse;
import com.ddd.backend.ai.AiUserDecisionContext;
import com.ddd.backend.domain.session.DecisionType;
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

class AiEngineDecisionClientTest {

    private ObjectMapper objectMapper;

    private RecordingTransport transport;

    private AiEngineDecisionClient client;

    @BeforeEach
    void setUp() {

        objectMapper =
                JsonMapper
                        .builder()
                        .build();

        transport =
                new RecordingTransport();

        client =
                new AiEngineDecisionClient(
                        transport,
                        objectMapper
                );
    }

    @Test
    void C_AI_Engine의_응답을_AiDecisionResponse로_변환한다() {

        transport.response =
                """
                {
                  "actionType": "CLICK",
                  "elementId": "el-a1b2c3d4-001",
                  "value": null,
                  "scrollX": null,
                  "scrollY": null,
                  "waitMillis": null
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
    void B는_userRequest와_SanitizedSnapshot만_C에_보낸다()
            throws Exception {

        transport.response =
                """
                {
                  "actionType": "NONE",
                  "elementId": null,
                  "value": null,
                  "scrollX": null,
                  "scrollY": null,
                  "waitMillis": null
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
                request.has(
                        "userRequest"
                )
        ).isTrue();

        assertThat(
                request.has(
                        "snapshot"
                )
        ).isTrue();

        assertThat(
                request.has(
                        "sessionId"
                )
        ).isFalse();

        assertThat(
                request.has(
                        "selector"
                )
        ).isFalse();
    }

    @Test
    void 재개_요청은_userDecision을_실제_JSON으로_C에_전달한다()
            throws Exception {
        transport.response = """
                {"actionType":"NONE"}
                """;
        AiDecisionRequest base = createRequest();
        client.decide(new AiDecisionRequest(
                base.userRequest(), base.snapshot(),
                new AiUserDecisionContext(
                        "dec-001", DecisionType.TERMS_AGREEMENT,
                        List.of("term-001"), "snap-before")));

        JsonNode decision = objectMapper.readTree(transport.requestBody)
                .get("userDecision");
        assertThat(decision.get("decisionId").asText()).isEqualTo("dec-001");
        assertThat(decision.get("decisionType").asText())
                .isEqualTo("TERMS_AGREEMENT");
        assertThat(decision.get("selectedOptionIds").get(0).asText())
                .isEqualTo("term-001");
        assertThat(decision.get("sourceSnapshotId").asText())
                .isEqualTo("snap-before");
    }

    @Test
    void Snapshot에는_B가_발급한_elementId가_포함된다()
            throws Exception {

        transport.response =
                """
                {
                  "actionType": "NONE",
                  "elementId": null,
                  "value": null,
                  "scrollX": null,
                  "scrollY": null,
                  "waitMillis": null
                }
                """;

        client.decide(
                createRequest()
        );

        JsonNode request =
                objectMapper.readTree(
                        transport.requestBody
                );

        String json =
                request.toString();

        assertThat(
                json
        ).contains(
                "el-a1b2c3d4-001"
        );

        assertThat(
                json
        ).doesNotContain(
                "\"selector\""
        );
    }

    @Test
    void 잘못된_AI_Engine_JSON은_실패한다() {

        transport.response =
                """
                {
                  "unexpected": true
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
    void AI_Engine_통신오류는_공통예외로_전달한다() {

        transport.failure =
                new AiDecisionClientException(
                        "AI Engine unavailable"
                );

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

    private AiDecisionRequest createRequest() {

        SanitizedDomSnapshot.ElementSnapshot element =
                new SanitizedDomSnapshot.ElementSnapshot(
                        "el-a1b2c3d4-001",
                        "button",
                        "button",
                        "생활비 계좌",
                        "생활비 계좌 선택",
                        null,
                        null,
                        true,
                        true,
                        new SanitizedDomSnapshot
                                .BoundingBoxSnapshot(
                                100,
                                200,
                                160,
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
                "생활비 계좌를 선택해줘",
                snapshot
        );
    }

    private static final class RecordingTransport
            implements AiEngineHttpTransport {

        private String requestBody;

        private String response;

        private RuntimeException failure;

        @Override
        public String post(
                String requestBody
        ) {

            this.requestBody =
                    requestBody;

            if (failure != null) {
                throw failure;
            }

            return response;
        }
    }
}
