package com.ddd.backend.conversation.goal;

import java.util.List;

public record UserGoal(
        String goalId,
        long revision,
        String status,
        String intent,
        Long amount,
        Integer durationMonths,
        List<String> missingFields,
        String stage,
        String safety,
        String lastAppliedTurnId
) {
    public UserGoal {
        missingFields = missingFields == null ? List.of() : List.copyOf(missingFields);
    }
}
