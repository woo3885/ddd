package com.ddd.backend.websocket.dto;

import com.ddd.backend.domain.session.WorkflowStatus;
import com.ddd.backend.security.SensitiveDataMasker;

import java.time.Instant;
import java.util.Objects;

public record AutomationUiEvent(
        String eventId,
        long eventSequence,
        AutomationUiEventType eventType,
        String sessionId,
        WorkflowStatus status,
        String message,
        boolean actionRequired,
        AutomationTarget target,
        Instant occurredAt
) {
    public AutomationUiEvent {
        if (eventId == null || eventId.isBlank() || eventSequence < 1) {
            throw new IllegalArgumentException("이벤트 식별 정보가 올바르지 않습니다.");
        }
        Objects.requireNonNull(eventType, "이벤트 유형은 필수입니다.");
        if (sessionId == null || sessionId.isBlank()) {
            throw new IllegalArgumentException("자동화 세션 ID는 필수입니다.");
        }
        Objects.requireNonNull(occurredAt, "이벤트 발생 시각은 필수입니다.");
        if (eventType == AutomationUiEventType.STATE && status == null) {
            throw new IllegalArgumentException("STATE 이벤트에는 상태가 필요합니다.");
        }
        if (eventType == AutomationUiEventType.TARGET && target == null) {
            throw new IllegalArgumentException("TARGET 이벤트에는 target이 필요합니다.");
        }
        if (message == null || message.isBlank()) {
            message = null;
        } else {
            String masked = SensitiveDataMasker.maskFreeText(message.trim());
            message = masked.substring(0, Math.min(masked.length(), 500));
        }
    }
}
