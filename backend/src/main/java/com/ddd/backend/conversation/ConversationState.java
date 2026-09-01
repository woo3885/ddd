package com.ddd.backend.conversation;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import com.ddd.backend.conversation.goal.UserGoal;
import com.ddd.backend.conversation.goal.UserGoalAuthority;
import com.ddd.backend.conversation.goal.UserGoalPatch;

/** Session별 안전한 대화 snapshot. 원문 credential은 이 경계에 들어올 수 없다. */
public final class ConversationState {

    private static final int MAX_MESSAGES = 50;

    private final String sessionId;
    private final List<ConversationMessage> messages = new ArrayList<>();
    private final Map<String, MessageAcceptance> acceptedRequests = new LinkedHashMap<>();
    private long sequence;
    private String activeQuestionId;
    private Instant expiresAt;
    private final UserGoalAuthority goalAuthority = new UserGoalAuthority();

    public ConversationState(String sessionId, Instant expiresAt) {
        if (sessionId == null || sessionId.isBlank()) {
            throw new IllegalArgumentException("세션 ID는 비어 있을 수 없습니다.");
        }
        this.sessionId = sessionId.trim();
        this.expiresAt = expiresAt;
    }

    public synchronized MessageAcceptance appendUserMessage(
            String requestId,
            String messageId,
            String content,
            Instant occurredAt,
            MessageQueueStatus queueStatus
    ) {
        MessageAcceptance duplicate = acceptedRequests.get(requestId);
        if (duplicate != null) {
            if (!duplicate.messageId().equals(messageId)) {
                throw new ConversationException(ConversationError.DUPLICATE_REQUEST);
            }
            return duplicate.asDuplicate();
        }
        boolean messageIdExists = messages.stream()
                .anyMatch(message -> message.messageId().equals(messageId));
        if (messageIdExists) {
            throw new ConversationException(ConversationError.DUPLICATE_MESSAGE);
        }

        long acceptedSequence = ++sequence;
        messages.add(new ConversationMessage(
                messageId, requestId, acceptedSequence,
                ConversationRole.USER, content, occurredAt));
        while (messages.size() > MAX_MESSAGES) {
            messages.removeFirst();
        }
        MessageAcceptance acceptance = new MessageAcceptance(
                sessionId, requestId, messageId, acceptedSequence,
                queueStatus, occurredAt, false);
        acceptedRequests.put(requestId, acceptance);
        while (acceptedRequests.size() > MAX_MESSAGES) {
            String firstKey = acceptedRequests.keySet().iterator().next();
            acceptedRequests.remove(firstKey);
        }
        return acceptance;
    }

    public synchronized ConversationSnapshot snapshot() {
        return new ConversationSnapshot(
                sessionId,
                sequence,
                goalAuthority.snapshot().revision(),
                goalAuthority.snapshot(),
                activeQuestionId,
                List.copyOf(messages),
                expiresAt
        );
    }

    public synchronized long sequence() {
        return sequence;
    }

    public synchronized MessageAcceptance duplicateAcceptance(
            String requestId,
            String messageId
    ) {
        MessageAcceptance acceptance = acceptedRequests.get(requestId);
        if (acceptance == null) return null;
        if (!acceptance.messageId().equals(messageId)) {
            throw new ConversationException(ConversationError.DUPLICATE_REQUEST);
        }
        return acceptance.asDuplicate();
    }

    public synchronized void ensureMessageIdAvailable(String messageId) {
        if (messages.stream().anyMatch(message -> message.messageId().equals(messageId))) {
            throw new ConversationException(ConversationError.DUPLICATE_MESSAGE);
        }
    }

    public synchronized long goalRevision() {
        return goalAuthority.snapshot().revision();
    }

    public synchronized UserGoal applyGoalPatch(
            String expectedGoalId,
            long expectedRevision,
            String turnId,
            UserGoalPatch patch
    ) {
        return goalAuthority.apply(expectedGoalId, expectedRevision, turnId, patch);
    }

    public synchronized UserGoal applyGoalPatch(
            long expectedRevision,
            String turnId,
            UserGoalPatch patch
    ) {
        return goalAuthority.apply(expectedRevision, turnId, patch);
    }

    public synchronized void activateQuestion(String questionId) {
        if (questionId == null || questionId.isBlank()) {
            throw new IllegalArgumentException("questionId는 필수입니다.");
        }
        if (activeQuestionId != null && !activeQuestionId.equals(questionId)) {
            throw new IllegalStateException("이미 활성 사용자 질문이 존재합니다.");
        }
        activeQuestionId = questionId.trim();
    }

    public synchronized void clearQuestion(String answerToQuestionId) {
        requireActiveQuestion(answerToQuestionId);
        activeQuestionId = null;
    }

    public synchronized void requireActiveQuestion(String answerToQuestionId) {
        if (activeQuestionId == null
                || answerToQuestionId == null
                || !activeQuestionId.equals(answerToQuestionId)) {
            throw new IllegalStateException("답변 대상 질문이 현재 활성 질문과 일치하지 않습니다.");
        }
    }

    public synchronized String activeQuestionId() {
        return activeQuestionId;
    }

    public synchronized void refreshExpiry(Instant nextExpiry) {
        expiresAt = nextExpiry;
    }

    public synchronized Instant expiresAt() {
        return expiresAt;
    }
}
