package com.ddd.backend.conversation.agent;

import com.ddd.backend.conversation.ConversationMessagePolicy;
import org.springframework.stereotype.Component;

import java.util.EnumSet;
import java.util.Objects;
import java.util.Set;

@Component
public final class ConversationAgentContractValidator {

    private static final Set<ConversationInteractionMode> SNAPSHOT_REQUIRED = EnumSet.of(
            ConversationInteractionMode.AUTO_EXECUTE,
            ConversationInteractionMode.GUIDE_USER,
            ConversationInteractionMode.SECURE_INPUT_REQUIRED,
            ConversationInteractionMode.RISK_WARNING,
            ConversationInteractionMode.FINAL_CONFIRMATION_REQUIRED,
            ConversationInteractionMode.COMPLETE
    );

    private final ConversationMessagePolicy messagePolicy;

    public ConversationAgentContractValidator(ConversationMessagePolicy messagePolicy) {
        this.messagePolicy = messagePolicy;
    }

    public ConversationAgentDecision validate(
            ConversationAgentRequest request,
            ConversationAgentDecision decision
    ) {
        Objects.requireNonNull(request, "Agent request는 필수입니다.");
        Objects.requireNonNull(decision, "Agent decision은 필수입니다.");
        if (!request.requestId().equals(decision.requestId())
                || !request.requestMessageId().equals(decision.requestMessageId())
                || !request.goal().goalId().equals(decision.goalId())) {
            throw new IllegalArgumentException("C 응답 identity가 요청과 일치하지 않습니다.");
        }
        if (request.goal().revision() != decision.baseGoalRevision()) {
            throw new IllegalArgumentException("C 응답의 baseGoalRevision이 stale 상태입니다.");
        }
        if (decision.mode() == null || decision.confidence() < 0.0
                || decision.confidence() > 1.0 || !Double.isFinite(decision.confidence())) {
            throw new IllegalArgumentException("C 응답 mode/confidence가 올바르지 않습니다.");
        }
        if (decision.message() != null) {
            messagePolicy.sanitize(decision.message());
        }
        String sourceSnapshotId = decision.sourceSnapshotId();
        if (SNAPSHOT_REQUIRED.contains(decision.mode())) {
            String expected = request.snapshot() == null
                    ? null : request.snapshot().sourceSnapshotId();
            if (expected == null || !expected.equals(sourceSnapshotId)) {
                throw new IllegalArgumentException("DOM 기반 응답의 sourceSnapshotId가 올바르지 않습니다.");
            }
        }
        if (decision.mode() == ConversationInteractionMode.ASK_USER) {
            if (decision.question() == null
                    || decision.question().fieldKey() == null
                    || decision.question().fieldKey().isBlank()) {
                throw new IllegalArgumentException("ASK_USER에는 fieldKey가 필요합니다.");
            }
        } else if (decision.question() != null) {
            throw new IllegalArgumentException("ASK_USER 외 mode에는 question을 사용할 수 없습니다.");
        }
        if (decision.actionCandidate() != null && request.snapshot() == null) {
            throw new IllegalArgumentException("Action 후보에는 sanitized snapshot이 필요합니다.");
        }
        return decision;
    }
}
