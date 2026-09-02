package com.ddd.backend.conversation.event;
import com.ddd.backend.domain.session.WorkflowStatus;
import org.springframework.stereotype.Component;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
@Component
public final class ConversationEventStore {
    private final ConcurrentHashMap<String, List<ConversationEvent>> events = new ConcurrentHashMap<>();
    public synchronized UserMessageAcceptedEvent accepted(String sessionId, String messageId,
            long acceptedSequence, WorkflowStatus status, Instant at) {
        var event = new UserMessageAcceptedEvent(UUID.randomUUID().toString(), lastSequence(sessionId) + 1,
                "USER_MESSAGE_ACCEPTED", sessionId, messageId, acceptedSequence, status, at);
        events.computeIfAbsent(sessionId, ignored -> new ArrayList<>()).add(event); return event;
    }
    public synchronized AiQuestionEvent question(String sessionId, String messageId, long messageSequence,
            String questionId, String text, long goalRevision, Instant at) {
        var event = new AiQuestionEvent(UUID.randomUUID().toString(), lastSequence(sessionId) + 1,
                "AI_QUESTION", sessionId, WorkflowStatus.ADDITIONAL_INFORMATION_REQUIRED, messageId,
                messageSequence, questionId, text, "QUESTION", goalRevision, at);
        events.computeIfAbsent(sessionId, ignored -> new ArrayList<>()).add(event); return event;
    }
    public synchronized long lastSequence(String sessionId) {
        var values = events.get(sessionId); return values == null || values.isEmpty() ? 0 : values.getLast().eventSequence();
    }
    public synchronized List<ConversationEvent> events(String sessionId) {
        return List.copyOf(events.getOrDefault(sessionId, List.of()));
    }
    public void removeSession(String sessionId) { events.remove(sessionId); }
}
