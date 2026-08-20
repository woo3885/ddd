package com.ddd.backend.api.dto.session;

import com.ddd.backend.domain.session.AutomationSession;
import com.ddd.backend.domain.session.WorkflowStatus;

import java.time.Instant;

public record AutomationSessionResponse(
        String sessionId,
        String userRequest,
        WorkflowStatus status,
        Instant createdAt,
        Instant updatedAt
) {

    public static AutomationSessionResponse from(
            AutomationSession session
    ) {
        return new AutomationSessionResponse(
                session.getSessionId(),
                session.getUserRequest(),
                session.getStatus(),
                session.getCreatedAt(),
                session.getUpdatedAt()
        );
    }
}