package com.ddd.backend.conversation.goal;

import com.ddd.backend.conversation.ConversationError;
import com.ddd.backend.conversation.ConversationException;

import java.util.List;
import java.util.UUID;

/** goal identity와 revision을 Backend만 변경하도록 고정하는 aggregate. */
public final class UserGoalAuthority {

    private UserGoal goal;

    public UserGoalAuthority() {
        goal = new UserGoal(
                UUID.randomUUID().toString(), 0, "COLLECTING",
                null, null, null, List.of(), "STARTED", "SAFE", null);
    }

    public synchronized UserGoal snapshot() {
        return goal;
    }

    public synchronized UserGoal apply(
            String expectedGoalId,
            long expectedRevision,
            String turnId,
            UserGoalPatch patch
    ) {
        if (expectedGoalId == null || !goal.goalId().equals(expectedGoalId)) {
            throw new IllegalArgumentException("Goal ID가 현재 세션 Goal과 일치하지 않습니다.");
        }
        if (turnId != null && turnId.equals(goal.lastAppliedTurnId())) {
            return goal;
        }
        if (goal.revision() != expectedRevision) {
            throw new ConversationException(ConversationError.STALE_GOAL_REVISION);
        }
        if (turnId == null || turnId.isBlank() || patch == null) {
            throw new IllegalArgumentException("Goal patch와 turnId는 필수입니다.");
        }
        goal = new UserGoal(
                goal.goalId(),
                goal.revision() + 1,
                choose(patch.status(), goal.status()),
                choose(patch.intent(), goal.intent()),
                patch.amount() != null ? patch.amount() : goal.amount(),
                patch.durationMonths() != null ? patch.durationMonths() : goal.durationMonths(),
                patch.missingFields() != null ? patch.missingFields() : goal.missingFields(),
                choose(patch.stage(), goal.stage()),
                choose(patch.safety(), goal.safety()),
                turnId.trim()
        );
        return goal;
    }

    public synchronized UserGoal apply(
            long expectedRevision,
            String turnId,
            UserGoalPatch patch
    ) {
        return apply(goal.goalId(), expectedRevision, turnId, patch);
    }

    private String choose(String candidate, String current) {
        return candidate == null || candidate.isBlank() ? current : candidate.trim();
    }
}
