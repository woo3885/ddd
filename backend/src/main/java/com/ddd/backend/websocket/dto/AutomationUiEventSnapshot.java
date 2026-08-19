package com.ddd.backend.websocket.dto;

public record AutomationUiEventSnapshot(
        String sessionId,
        long latestEventSequence,
        AutomationUiEvent state,
        AutomationUiEvent guide,
        AutomationUiEvent target
) {
}
