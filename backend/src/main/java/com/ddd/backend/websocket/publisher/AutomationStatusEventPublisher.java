package com.ddd.backend.websocket.publisher;

import com.ddd.backend.domain.session.WorkflowStatus;
import com.ddd.backend.websocket.dto.AutomationStatusEvent;
import com.ddd.backend.websocket.dto.AutomationTarget;
import com.ddd.backend.websocket.dto.AutomationDecisionPrompt;
import com.ddd.backend.websocket.dto.AutomationUiEvent;
import com.ddd.backend.websocket.dto.AutomationUiEventSnapshot;
import com.ddd.backend.websocket.dto.AutomationUiEventType;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.beans.factory.annotation.Autowired;
import com.ddd.backend.service.decision.UserDecisionSessionState;

import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.atomic.AtomicLong;
import java.util.regex.Pattern;

@Component
public final class AutomationStatusEventPublisher {

    public static final String DESTINATION_PREFIX =
            "/topic/sessions/";

    public static final String DESTINATION_SUFFIX =
            "/status";

    public static final String UI_DESTINATION_SUFFIX =
            "/events";

    private static final Pattern SAFE_SESSION_ID =
            Pattern.compile("^[a-zA-Z0-9-]{1,100}$");

    private final SimpMessagingTemplate messagingTemplate;
    private final UserDecisionSessionState decisionState;

    private final ConcurrentMap<String, SessionUiState> uiStates =
            new ConcurrentHashMap<>();

    @Autowired
    public AutomationStatusEventPublisher(
            SimpMessagingTemplate messagingTemplate,
            UserDecisionSessionState decisionState
    ) {
        this.messagingTemplate =
                Objects.requireNonNull(
                        messagingTemplate,
                        "SimpMessagingTemplate은 필수입니다."
                );
        this.decisionState = Objects.requireNonNull(decisionState);
    }

    public AutomationStatusEventPublisher(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = Objects.requireNonNull(
                messagingTemplate, "SimpMessagingTemplate은 필수입니다.");
        this.decisionState = null;
    }

    public void publish(
            String sessionId,
            WorkflowStatus status,
            String message
    ) {
        publish(
                AutomationStatusEvent.create(
                        sessionId,
                        status,
                        message
                )
        );
    }

    public void publish(
            AutomationStatusEvent event
    ) {
        Objects.requireNonNull(
                event,
                "상태 이벤트는 필수입니다."
        );

        messagingTemplate.convertAndSend(
                destination(event.sessionId()),
                event
        );

        publishUiEvent(
                event.sessionId(),
                AutomationUiEventType.STATE,
                event.status(),
                event.message(),
                requiresUserAction(event.status()),
                null,
                null
        );

        if (event.message() != null) {
            publishGuide(
                    event.sessionId(),
                    event.message(),
                    requiresUserAction(event.status())
            );
        }

        if (clearsTarget(event.status())) {
            publishTargetClear(event.sessionId(), event.message());
        }
        if (clearsDecision(event.status())) {
            publishDecisionClear(event.sessionId(), event.message());
            if (decisionState != null) {
                decisionState.removeSession(event.sessionId());
            }
        }
    }

    public AutomationUiEvent publishGuide(
            String sessionId,
            String message,
            boolean actionRequired
    ) {
        return publishUiEvent(sessionId, AutomationUiEventType.GUIDE,
                null, message, actionRequired, null, null);
    }

    public AutomationUiEvent publishTarget(
            String sessionId,
            AutomationTarget target,
            String message
    ) {
        Objects.requireNonNull(target, "Target은 필수입니다.");
        return publishUiEvent(sessionId, AutomationUiEventType.TARGET,
                null, message, false, target, null);
    }

    public AutomationUiEvent publishTargetClear(
            String sessionId,
            String message
    ) {
        return publishUiEvent(sessionId, AutomationUiEventType.TARGET_CLEAR,
                null, message, false, null, null);
    }

    public AutomationUiEvent publishDecisionRequired(
            String sessionId,
            AutomationDecisionPrompt decision,
            String message
    ) {
        Objects.requireNonNull(decision, "Decision Prompt는 필수입니다.");
        return publishUiEvent(
                sessionId, AutomationUiEventType.DECISION_REQUIRED,
                null, message, true, null, decision
        );
    }

    public AutomationUiEvent publishDecisionResolved(
            String sessionId,
            String message
    ) {
        return publishUiEvent(
                sessionId, AutomationUiEventType.DECISION_RESOLVED,
                null, message, false, null, null
        );
    }

    public AutomationUiEvent publishDecisionClear(String sessionId, String message) {
        return publishUiEvent(
                sessionId, AutomationUiEventType.DECISION_CLEAR,
                null, message, false, null, null);
    }

    public Optional<AutomationUiEventSnapshot> latestSnapshot(String sessionId) {
        destination(sessionId);
        SessionUiState state = uiStates.get(sessionId);
        return state == null ? Optional.empty() : Optional.of(state.snapshot(sessionId));
    }

    public void removeSession(String sessionId) {
        if (sessionId != null) {
            uiStates.remove(sessionId);
        }
    }

    private AutomationUiEvent publishUiEvent(
            String sessionId,
            AutomationUiEventType type,
            WorkflowStatus status,
            String message,
            boolean actionRequired,
            AutomationTarget target,
            AutomationDecisionPrompt decision
    ) {
        String uiDestination = uiDestination(sessionId);
        SessionUiState state = uiStates.computeIfAbsent(
                sessionId, ignored -> new SessionUiState());
        AutomationUiEvent event = state.next(
                sessionId, type, status, message, actionRequired, target, decision);
        messagingTemplate.convertAndSend(uiDestination, event);
        return event;
    }

    String destination(
            String sessionId
    ) {
        if (sessionId == null
                || !SAFE_SESSION_ID
                .matcher(sessionId)
                .matches()) {

            throw new IllegalArgumentException(
                    "WebSocket 전송에 사용할 수 없는 세션 ID입니다."
            );
        }

        return DESTINATION_PREFIX
                + sessionId
                + DESTINATION_SUFFIX;
    }

    String uiDestination(String sessionId) {
        destination(sessionId);
        return DESTINATION_PREFIX + sessionId + UI_DESTINATION_SUFFIX;
    }

    private boolean requiresUserAction(WorkflowStatus status) {
        return status == WorkflowStatus.USER_DECISION_REQUIRED
                || status == WorkflowStatus.ADDITIONAL_INFORMATION_REQUIRED
                || status == WorkflowStatus.SECURE_INPUT_REQUIRED
                || status == WorkflowStatus.FINAL_CONFIRMATION_REQUIRED
                || status == WorkflowStatus.RISK_WARNING;
    }

    private boolean clearsTarget(WorkflowStatus status) {
        return status == WorkflowStatus.PAGE_LOADING
                || status == WorkflowStatus.AI_EXECUTING
                || requiresUserAction(status)
                || status == WorkflowStatus.COMPLETED
                || status == WorkflowStatus.CANCELLED
                || status == WorkflowStatus.ERROR
                || status == WorkflowStatus.TERMINATED;
    }

    private boolean clearsDecision(WorkflowStatus status) {
        return status == WorkflowStatus.SECURE_INPUT_REQUIRED
                || status == WorkflowStatus.FINAL_CONFIRMATION_REQUIRED
                || status == WorkflowStatus.RISK_WARNING
                || status == WorkflowStatus.COMPLETED
                || status == WorkflowStatus.CANCELLED
                || status == WorkflowStatus.ERROR
                || status == WorkflowStatus.TERMINATED;
    }

    private static final class SessionUiState {
        private final AtomicLong sequence = new AtomicLong();
        private AutomationUiEvent state;
        private AutomationUiEvent guide;
        private AutomationUiEvent target;
        private AutomationUiEvent decision;

        private synchronized AutomationUiEvent next(
                String sessionId, AutomationUiEventType type,
                WorkflowStatus status, String message,
                boolean actionRequired, AutomationTarget targetValue,
                AutomationDecisionPrompt decisionValue
        ) {
            long next = sequence.incrementAndGet();
            AutomationUiEvent event = new AutomationUiEvent(
                    "evt-" + UUID.randomUUID(), next, type, sessionId,
                    status, message, actionRequired, targetValue, decisionValue,
                    java.time.Instant.now());
            switch (type) {
                case STATE -> state = event;
                case GUIDE -> guide = event;
                case TARGET -> target = event;
                case TARGET_CLEAR -> target = null;
                case DECISION_REQUIRED -> decision = event;
                case DECISION_RESOLVED -> decision = null;
                case DECISION_CLEAR -> decision = null;
            }
            return event;
        }

        private synchronized AutomationUiEventSnapshot snapshot(String sessionId) {
            return new AutomationUiEventSnapshot(
                    sessionId, sequence.get(), state, guide, target, decision);
        }
    }
}
