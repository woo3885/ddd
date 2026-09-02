package com.ddd.backend.conversation.agent;

import com.ddd.backend.conversation.*;
import com.ddd.backend.conversation.goal.UserGoal;
import com.ddd.backend.domain.session.AutomationSession;
import com.ddd.backend.domain.session.AutomationSessionRepository;
import com.ddd.backend.domain.session.WorkflowStatus;
import java.time.Instant;
import java.util.UUID;
import org.springframework.stereotype.Service;

/** Day 1 ASK_USER orchestration. It never invokes Browser Action execution. */
@Service
public final class ConversationAgentCoordinator {
    private final ConversationService conversations;
    private final SessionMessageMailbox mailbox;
    private final AutomationSessionRepository sessions;
    private final ConversationAgentClient client;
    private final ConversationAgentContractValidator validator;

    public ConversationAgentCoordinator(ConversationService conversations, SessionMessageMailbox mailbox,
            AutomationSessionRepository sessions, ConversationAgentClient client,
            ConversationAgentContractValidator validator) {
        this.conversations = conversations; this.mailbox = mailbox; this.sessions = sessions;
        this.client = client; this.validator = validator;
    }

    public ConversationAgentDecision process(String sessionId, MessageAcceptance acceptance,
            String content, String answerToQuestionId) {
        if (acceptance.duplicate() || acceptance.queueStatus() != MessageQueueStatus.ACTIVE) return null;
        ConversationState state = conversations.state(sessionId);
        ConversationAgentRequest request = new ConversationAgentRequest(sessionId, acceptance.requestId(),
                acceptance.messageId(), state.sequence(), state.goal(),
                new ConversationAgentRequest.UserMessage(content, answerToQuestionId), null);
        ConversationAgentDecision decision = validator.validate(request, client.decide(request));
        if (decision.mode() != ConversationInteractionMode.ASK_USER) {
            throw new IllegalArgumentException("Day 1 initial conversation only accepts ASK_USER");
        }
        synchronized (state) {
            if (!mailbox.isActive(sessionId, acceptance.messageId()))
                throw new IllegalStateException("Stale AI decision for inactive message");
            String questionId = UUID.randomUUID().toString();
            String assistantMessageId = UUID.randomUUID().toString();
            UserGoal.PendingQuestion pending = new UserGoal.PendingQuestion(
                    questionId, decision.question().fieldKey());
            UserGoal applied = state.applyGoalPatch(decision.goalId(), decision.baseGoalRevision(),
                    decision.requestMessageId(), decision.goalPatch(), pending);
            Instant now = Instant.now();
            ConversationSnapshot.ActiveQuestion question = state.appendQuestion(
                    assistantMessageId, questionId, decision.message(), applied.revision(), now);
            AutomationSession session = sessions.findById(sessionId)
                    .orElseThrow(() -> new IllegalStateException("Session not found"));
            session.transitionTo(WorkflowStatus.ADDITIONAL_INFORMATION_REQUIRED);
            sessions.save(session);
            conversations.eventStore().question(sessionId, assistantMessageId, question.sequence(),
                    questionId, decision.message(), applied.revision(), now);
            mailbox.completeActive(sessionId, acceptance.messageId());
        }
        return decision;
    }
}
