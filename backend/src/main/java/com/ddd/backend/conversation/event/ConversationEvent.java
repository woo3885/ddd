package com.ddd.backend.conversation.event;
public sealed interface ConversationEvent permits UserMessageAcceptedEvent, AiQuestionEvent, AiMessageEvent {
    String eventId(); long eventSequence(); String eventType(); String sessionId();
}
