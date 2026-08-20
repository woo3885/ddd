package com.ddd.backend.websocket.dto;

public record AutomationDecisionOption(
        String id,
        String label,
        boolean required,
        boolean checked,
        boolean disabled
) {
    public AutomationDecisionOption {
        if (id == null || id.isBlank() || label == null || label.isBlank()) {
            throw new IllegalArgumentException("결정 선택 항목 ID와 label은 필수입니다.");
        }
        id = id.trim();
        label = label.trim();
    }

    public AutomationDecisionOption(String id, String label) {
        this(id, label, false, false, false);
    }
}
