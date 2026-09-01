package com.ddd.backend.conversation.agent;

import com.ddd.backend.conversation.ConversationMessagePolicy;
import com.ddd.backend.conversation.goal.UserGoalAuthority;
import com.ddd.backend.conversation.goal.UserGoalPatch;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ConversationAgentContractValidatorTest {

    private final ConversationAgentContractValidator validator =
            new ConversationAgentContractValidator(new ConversationMessagePolicy());

    @Test
    void ask_user는_snapshot없이_fieldKey만_후보로_반환할_수_있다() {
        var request = request(null);
        var decision = new ConversationAgentDecision(
                "req-1", "msg-1", request.goal().goalId(), 0,
                ConversationInteractionMode.ASK_USER,
                "기간을 알려주세요.", 0.9, "MISSING_FIELD", "USER_ANSWER",
                null,
                new UserGoalPatch(null, "DEPOSIT", 1_000_000L,
                        null, List.of("durationMonths"), null, null),
                new ConversationAgentDecision.QuestionCandidate("durationMonths"),
                null);

        assertThat(validator.validate(request, decision)).isSameAs(decision);
    }

    @Test
    void dom기반_mode는_동일_sourceSnapshotId가_필수다() {
        var request = request(new ConversationAgentRequest.SnapshotContext(
                "snap-1", "page-1", null));
        var decision = new ConversationAgentDecision(
                "req-1", "msg-1", request.goal().goalId(), 0,
                ConversationInteractionMode.GUIDE_USER,
                "버튼을 직접 눌러주세요.", 0.8, "USER_ACTION_REQUIRED", "DOM_CHANGE",
                null, null, null,
                new ConversationAgentDecision.ActionCandidate("CLICK", "el-1", null));

        assertThatThrownBy(() -> validator.validate(request, decision))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("sourceSnapshotId");
    }

    @Test
    void c가_goal_identity나_base_revision을_바꾸면_거부한다() {
        var request = request(null);
        var decision = new ConversationAgentDecision(
                "req-1", "msg-1", "c-created-goal", 1,
                ConversationInteractionMode.STOP,
                "중단합니다.", 1.0, "POLICY_STOP", "NONE",
                null, null, null, null);

        assertThatThrownBy(() -> validator.validate(request, decision))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("identity");
    }

    private ConversationAgentRequest request(
            ConversationAgentRequest.SnapshotContext snapshot
    ) {
        return new ConversationAgentRequest(
                "session-1", "req-1", "msg-1", 1,
                new UserGoalAuthority().snapshot(),
                new ConversationAgentRequest.UserMessage("100만원 예금", null),
                snapshot);
    }
}
