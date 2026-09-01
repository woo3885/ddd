package com.ddd.backend.conversation;

import java.time.Instant;
import java.util.List;
import com.ddd.backend.conversation.goal.UserGoal;

public record ConversationSnapshot(
        String sessionId,
        long conversationSequence,
        long goalRevision,
        UserGoal goal,
        String activeQuestionId,
        List<ConversationMessage> recentSafeMessages,
        Instant expiresAt
) {
}
