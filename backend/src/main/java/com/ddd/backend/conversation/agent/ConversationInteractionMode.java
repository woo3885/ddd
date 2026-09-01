package com.ddd.backend.conversation.agent;

public enum ConversationInteractionMode {
    AUTO_EXECUTE,
    GUIDE_USER,
    ASK_USER,
    SECURE_INPUT_REQUIRED,
    RISK_WARNING,
    FINAL_CONFIRMATION_REQUIRED,
    COMPLETE,
    STOP
}
