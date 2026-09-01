package com.ddd.backend.api.dto.conversation;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;

import java.time.Instant;

public record SubmitSessionMessageRequest(
        @NotBlank String requestId,
        @NotBlank String messageId,
        @NotBlank String content,
        String answerToQuestionId,
        @PositiveOrZero long expectedConversationSequence,
        @PositiveOrZero long expectedGoalRevision,
        Instant clientOccurredAt
) {
}
