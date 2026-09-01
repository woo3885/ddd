package com.ddd.backend.conversation;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Session별 안전한 대화 snapshot. 원문 credential은 이 경계에 들어올 수 없다. */
public final class ConversationState {

    private static final int MAX_MESSAGES = 50;

    private final String sessionId;
    private final List<ConversationMessage> messages = new ArrayList<>();
    private final Map<String, MessageAcceptance> acceptedRequests = new LinkedHashMap<>();
    private long sequence;
    private long goalRevision;
    private String activeQuestionId;
    private Instant expiresAt;

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
                goalRevision,
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
        return goalRevision;
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
