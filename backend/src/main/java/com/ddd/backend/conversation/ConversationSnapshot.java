package com.ddd.backend.conversation;

import java.time.Instant;
import java.util.List;

public record ConversationSnapshot(
        String sessionId,
        long conversationSequence,
        long goalRevision,
        String activeQuestionId,
        List<ConversationMessage> recentSafeMessages,
        Instant expiresAt
) {
}
