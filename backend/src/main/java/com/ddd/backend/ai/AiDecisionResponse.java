package com.ddd.backend.ai;

import com.ddd.backend.automation.BrowserActionType;
import com.ddd.backend.domain.session.DecisionType;

import java.util.List;
import java.util.Objects;

public record AiDecisionResponse(
        BrowserActionType actionType,
        String elementId,
        String value,
        Integer scrollX,
        Integer scrollY,
        Integer waitMillis,
        String status,
        String message,
        Boolean requiresUserAction,
        Boolean executionBlocked,
        DecisionType decisionType,
        List<AiDecisionOption> options,
        List<AiDecisionOption> terms
) {

    public AiDecisionResponse {

        Objects.requireNonNull(
                actionType,
                "AI Action 유형은 필수입니다."
        );

        elementId =
                normalizeNullable(
                        elementId
                );

        value =
                normalizeNullable(
                        value
                );
        options = options == null ? List.of() : List.copyOf(options);
        terms = terms == null ? List.of() : List.copyOf(terms);
    }

    public AiDecisionResponse(
            BrowserActionType actionType, String elementId, String value,
            Integer scrollX, Integer scrollY, Integer waitMillis
    ) {
        this(actionType, elementId, value, scrollX, scrollY, waitMillis,
                null, null, null, null, null, List.of(), List.of());
    }

    /*
     * 여기서는 의도적으로
     * Action별 field validation을 하지 않는다.
     *
     * 예:
     * CLICK에 elementId 필수
     * SCROLL에 elementId 금지
     * SECURE_INPUT 대상 TYPE 금지
     *
     * 이런 검증은 D19 AI Response Validator에서
     * 한 곳에 모아 처리한다.
     */

    private static String normalizeNullable(
            String value
    ) {
        if (value == null
                || value.isBlank()) {

            return null;
        }

        return value.trim();
    }
}
