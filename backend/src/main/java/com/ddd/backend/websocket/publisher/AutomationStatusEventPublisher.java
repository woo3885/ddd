package com.ddd.backend.websocket.publisher;

import com.ddd.backend.domain.session.WorkflowStatus;
import com.ddd.backend.websocket.dto.AutomationStatusEvent;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import java.util.Objects;
import java.util.regex.Pattern;

@Component
public final class AutomationStatusEventPublisher {

    public static final String DESTINATION_PREFIX =
            "/topic/sessions/";

    public static final String DESTINATION_SUFFIX =
            "/status";

    private static final Pattern SAFE_SESSION_ID =
            Pattern.compile("^[a-zA-Z0-9-]{1,100}$");

    private final SimpMessagingTemplate messagingTemplate;

    public AutomationStatusEventPublisher(
            SimpMessagingTemplate messagingTemplate
    ) {
        this.messagingTemplate =
                Objects.requireNonNull(
                        messagingTemplate,
                        "SimpMessagingTemplate은 필수입니다."
                );
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
}