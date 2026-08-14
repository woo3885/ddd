package com.ddd.backend.ai.gemini;

import com.ddd.backend.ai.AiDecisionClient;
import com.ddd.backend.ai.AiDecisionClientException;
import com.ddd.backend.ai.AiDecisionRequest;
import com.ddd.backend.ai.AiDecisionResponse;
import com.ddd.backend.automation.BrowserActionType;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Service
@ConditionalOnProperty(
        prefix = "ddd.ai.gemini",
        name = "enabled",
        havingValue = "true"
)
public final class GeminiAiDecisionClient
        implements AiDecisionClient {

    private final GeminiHttpTransport transport;

    private final GeminiProperties properties;

    private final ObjectMapper objectMapper;

    public GeminiAiDecisionClient(
            GeminiHttpTransport transport,
            GeminiProperties properties,
            ObjectMapper objectMapper
    ) {
        this.transport =
                Objects.requireNonNull(
                        transport,
                        "GeminiHttpTransport는 필수입니다."
                );

        this.properties =
                Objects.requireNonNull(
                        properties,
                        "GeminiProperties는 필수입니다."
                );

        this.objectMapper =
                Objects.requireNonNull(
                        objectMapper,
                        "ObjectMapper는 필수입니다."
                );
    }

    @Override
    public AiDecisionResponse decide(
            AiDecisionRequest request
    ) {
        Objects.requireNonNull(
                request,
                "AI Decision Request는 필수입니다."
        );

        properties.validate();

        try {

            String requestBody =
                    buildRequestBody(
                            request
                    );

            String responseBody =
                    transport.post(
                            requestBody
                    );

            String outputJson =
                    extractOutputText(
                            responseBody
                    );

            return objectMapper.readValue(
                    outputJson,
                    AiDecisionResponse.class
            );

        } catch (AiDecisionClientException exception) {

            throw exception;

        } catch (Exception exception) {

            throw new AiDecisionClientException(
                    "Gemini AI Decision 응답 처리에 실패했습니다.",
                    exception
            );
        }
    }

    String buildRequestBody(
            AiDecisionRequest request
    ) {
        try {

            Map<String, Object> payload =
                    new LinkedHashMap<>();

            payload.put(
                    "model",
                    properties.getModel()
            );

            /*
             * Interactions API 기본값은
             * server-side 저장이므로
             * 금융 DOM 요청은 저장하지 않는다.
             */
            payload.put(
                    "store",
                    false
            );

            payload.put(
                    "input",
                    buildPrompt(
                            request
                    )
            );

            Map<String, Object> responseFormat =
                    new LinkedHashMap<>();

            responseFormat.put(
                    "type",
                    "text"
            );

            responseFormat.put(
                    "mime_type",
                    "application/json"
            );

            responseFormat.put(
                    "schema",
                    decisionSchema()
            );

            payload.put(
                    "response_format",
                    responseFormat
            );

            return objectMapper
                    .writeValueAsString(
                            payload
                    );

        } catch (Exception exception) {

            throw new AiDecisionClientException(
                    "Gemini 요청 생성에 실패했습니다.",
                    exception
            );
        }
    }

    private String buildPrompt(
            AiDecisionRequest request
    ) {
        try {

            String snapshotJson =
                    objectMapper
                            .writeValueAsString(
                                    request.snapshot()
                            );

            return """
                    You are the browser decision engine for a financial web assistant.

                    Choose exactly one next browser action.

                    Security rules:
                    - Use only elementId values included in the provided sanitized snapshot.
                    - Never invent an elementId.
                    - Never create or return a CSS selector.
                    - Never infer hidden DOM values.
                    - Do not bypass SECURE_INPUT, USER_DECISION, FINAL_CONFIRMATION, or BLOCKED policies.
                    - If user interaction is required, return the appropriate WAIT_FOR_USER, PAUSE_FOR_SECURE_INPUT, or REQUEST_FINAL_CONFIRMATION action.
                    - TYPE and SELECT may include value.
                    - CLICK, TYPE, and SELECT must reference a provided elementId.
                    - SCROLL uses scrollX and scrollY.
                    - WAIT uses waitMillis.
                    - Return only the structured response.

                    User request:
                    %s

                    Sanitized DOM snapshot:
                    %s
                    """.formatted(
                    request.userRequest(),
                    snapshotJson
            );

        } catch (Exception exception) {

            throw new AiDecisionClientException(
                    "Gemini Prompt 생성에 실패했습니다.",
                    exception
            );
        }
    }

    private Map<String, Object> decisionSchema() {

        List<String> actionTypes =
                Arrays.stream(
                                BrowserActionType
                                        .values()
                        )
                        .map(
                                Enum::name
                        )
                        .toList();

        Map<String, Object> actionType =
                new LinkedHashMap<>();

        actionType.put(
                "type",
                "string"
        );

        actionType.put(
                "enum",
                actionTypes
        );

        actionType.put(
                "description",
                "실행할 브라우저 Action 유형"
        );

        Map<String, Object> elementId =
                nullableType(
                        "string",
                        "Sanitized Snapshot에 포함된 elementId"
                );

        Map<String, Object> value =
                nullableType(
                        "string",
                        "TYPE 또는 SELECT에 사용할 값"
                );

        Map<String, Object> scrollX =
                nullableType(
                        "integer",
                        "수평 스크롤 거리"
                );

        Map<String, Object> scrollY =
                nullableType(
                        "integer",
                        "수직 스크롤 거리"
                );

        Map<String, Object> waitMillis =
                nullableType(
                        "integer",
                        "WAIT 시간(ms)"
                );

        Map<String, Object> propertiesMap =
                new LinkedHashMap<>();

        propertiesMap.put(
                "actionType",
                actionType
        );

        propertiesMap.put(
                "elementId",
                elementId
        );

        propertiesMap.put(
                "value",
                value
        );

        propertiesMap.put(
                "scrollX",
                scrollX
        );

        propertiesMap.put(
                "scrollY",
                scrollY
        );

        propertiesMap.put(
                "waitMillis",
                waitMillis
        );

        Map<String, Object> schema =
                new LinkedHashMap<>();

        schema.put(
                "type",
                "object"
        );

        schema.put(
                "properties",
                propertiesMap
        );

        schema.put(
                "required",
                List.of(
                        "actionType",
                        "elementId",
                        "value",
                        "scrollX",
                        "scrollY",
                        "waitMillis"
                )
        );

        schema.put(
                "additionalProperties",
                false
        );

        return schema;
    }

    private Map<String, Object> nullableType(
            String type,
            String description
    ) {
        Map<String, Object> schema =
                new LinkedHashMap<>();

        schema.put(
                "type",
                List.of(
                        type,
                        "null"
                )
        );

        schema.put(
                "description",
                description
        );

        return schema;
    }

    /*
     * REST Interactions API는
     * Interaction resource의 steps 안에
     * model_output을 반환한다.
     */
    private String extractOutputText(
            String responseBody
    ) {
        try {

            JsonNode root =
                    objectMapper
                            .readTree(
                                    responseBody
                            );

            /*
             * 방어적 fallback.
             */
            if (root.has(
                    "actionType"
            )) {
                return responseBody;
            }

            String status =
                    root.path(
                            "status"
                    ).asText();

            if (!"completed".equals(
                    status
            )) {

                throw new AiDecisionClientException(
                        "Gemini Interaction이 완료되지 않았습니다."
                );
            }

            JsonNode steps =
                    root.path(
                            "steps"
                    );

            if (!steps.isArray()) {

                throw new AiDecisionClientException(
                        "Gemini 응답에 steps가 없습니다."
                );
            }

            StringBuilder output =
                    new StringBuilder();

            for (JsonNode step :
                    steps) {

                if (!"model_output".equals(
                        step.path(
                                "type"
                        ).asText()
                )) {
                    continue;
                }

                JsonNode contents =
                        step.path(
                                "content"
                        );

                if (!contents.isArray()) {
                    continue;
                }

                for (JsonNode content :
                        contents) {

                    if (!"text".equals(
                            content.path(
                                    "type"
                            ).asText()
                    )) {
                        continue;
                    }

                    String text =
                            content.path(
                                    "text"
                            ).asText();

                    if (text != null
                            && !text.isBlank()) {

                        output.append(
                                text
                        );
                    }
                }
            }

            if (output.isEmpty()) {

                throw new AiDecisionClientException(
                        "Gemini 응답에 model output text가 없습니다."
                );
            }

            return output.toString();

        } catch (AiDecisionClientException exception) {

            throw exception;

        } catch (Exception exception) {

            throw new AiDecisionClientException(
                    "Gemini 응답 JSON을 해석할 수 없습니다.",
                    exception
            );
        }
    }
}