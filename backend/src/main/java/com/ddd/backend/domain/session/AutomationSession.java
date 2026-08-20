package com.ddd.backend.domain.session;

import java.time.Instant;
import java.util.UUID;

public class AutomationSession {

    private final String sessionId;
    private final String userRequest;
    private WorkflowStatus status;
    private final Instant createdAt;
    private Instant updatedAt;

    private AutomationSession(
            String sessionId,
            String userRequest,
            WorkflowStatus status,
            Instant createdAt,
            Instant updatedAt
    ) {
        this.sessionId = sessionId;
        this.userRequest = userRequest;
        this.status = status;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public static AutomationSession create(String userRequest) {
        if (userRequest == null || userRequest.isBlank()) {
            throw new IllegalArgumentException("사용자 요청은 비어 있을 수 없습니다.");
        }

        Instant now = Instant.now();

        return new AutomationSession(
                UUID.randomUUID().toString(),
                userRequest.trim(),
                WorkflowStatus.SESSION_CREATED,
                now,
                now
        );
    }

    public void cancel() {
        if (status == WorkflowStatus.COMPLETED
                || status == WorkflowStatus.CANCELLED
                || status == WorkflowStatus.TERMINATED) {
            throw new IllegalStateException("현재 상태에서는 세션을 취소할 수 없습니다.");
        }

        this.status = WorkflowStatus.CANCELLED;
        this.updatedAt = Instant.now();
    }

    public String getSessionId() {
        return sessionId;
    }

    public String getUserRequest() {
        return userRequest;
    }

    public WorkflowStatus getStatus() {
        return status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
