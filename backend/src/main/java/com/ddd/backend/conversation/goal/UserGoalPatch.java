package com.ddd.backend.conversation.goal;

import java.util.List;

/** C가 제안할 수 있는 필드만 노출한다. goalId/revision은 의도적으로 없다. */
public record UserGoalPatch(
        String status,
        String intent,
        Long amount,
        Integer durationMonths,
        List<String> missingFields,
        String stage,
        String safety
) {
    public UserGoalPatch {
        missingFields = missingFields == null ? null : List.copyOf(missingFields);
        if (amount != null && amount <= 0) {
            throw new IllegalArgumentException("금액은 0보다 커야 합니다.");
        }
        if (durationMonths != null && durationMonths <= 0) {
            throw new IllegalArgumentException("기간은 0개월보다 커야 합니다.");
        }
    }
}
