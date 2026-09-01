package com.ddd.backend.conversation.agent;

import com.ddd.backend.conversation.goal.UserGoalPatch;

/** C의 후보 응답. assistantMessageId/questionId/eventId는 Backend가 검증 후 생성한다. */
public record ConversationAgentDecision(
        String requestId,
        String requestMessageId,
        String goalId,
        long baseGoalRevision,
        ConversationInteractionMode mode,
        String message,
        double confidence,
        String reasonCode,
        String nextCondition,
        String sourceSnapshotId,
        UserGoalPatch goalPatch,
        QuestionCandidate question,
        ActionCandidate actionCandidate
) {
    public record QuestionCandidate(String fieldKey) { }

    /** snapshotElementRef는 C가 생성하는 ID가 아니라 B가 준 snapshot reference의 echo다. */
    public record ActionCandidate(
            String actionType,
            String snapshotElementRef,
            String value
    ) { }
}
