package com.ddd.backend.websocket.dto;

public record AutomationUiEventSnapshot(
        String sessionId,
        long latestEventSequence,
        AutomationUiEvent state,
        AutomationUiEvent guide,
        AutomationUiEvent target,
        AutomationUiEvent decision,
        AutomationUiEvent secureInput
) {
    public AutomationUiEventSnapshot(
            String sessionId, long latestEventSequence,
            AutomationUiEvent state, AutomationUiEvent guide,
            AutomationUiEvent target
    ) {
        this(sessionId, latestEventSequence, state, guide, target, null, null);
    }
    public AutomationUiEventSnapshot(
            String sessionId, long latestEventSequence,
            AutomationUiEvent state, AutomationUiEvent guide,
            AutomationUiEvent target, AutomationUiEvent decision
    ) {
        this(sessionId, latestEventSequence, state, guide, target, decision, null);
    }
}
