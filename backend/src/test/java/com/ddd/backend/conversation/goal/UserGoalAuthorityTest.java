package com.ddd.backend.conversation.goal;

import com.ddd.backend.conversation.ConversationError;
import com.ddd.backend.conversation.ConversationException;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class UserGoalAuthorityTest {

    @Test
    void backend가_goalId를_유지하고_patch_적용시에만_revision을_증가시킨다() {
        UserGoalAuthority authority = new UserGoalAuthority();
        UserGoal initial = authority.snapshot();

        UserGoal updated = authority.apply(0, "turn-1",
                new UserGoalPatch(null, "DEPOSIT", 1_000_000L,
                        null, List.of("durationMonths"), null, null));

        assertThat(updated.goalId()).isEqualTo(initial.goalId());
        assertThat(updated.revision()).isEqualTo(1);
        assertThat(updated.intent()).isEqualTo("DEPOSIT");
        assertThat(updated.amount()).isEqualTo(1_000_000L);
        assertThat(updated.missingFields()).containsExactly("durationMonths");
        assertThat(updated.lastAppliedTurnId()).isEqualTo("turn-1");
    }

    @Test
    void stale_base_revision의_patch는_적용하지_않는다() {
        UserGoalAuthority authority = new UserGoalAuthority();
        authority.apply(0, "turn-1",
                new UserGoalPatch(null, "DEPOSIT", null, null,
                        List.of("durationMonths"), null, null));

        assertThatThrownBy(() -> authority.apply(0, "turn-2",
                new UserGoalPatch(null, null, null, 12,
                        List.of(), null, null)))
                .isInstanceOf(ConversationException.class)
                .extracting(error -> ((ConversationException) error).error())
                .isEqualTo(ConversationError.STALE_GOAL_REVISION);
        assertThat(authority.snapshot().revision()).isEqualTo(1);
    }
}
