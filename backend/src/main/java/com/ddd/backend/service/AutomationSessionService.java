package com.ddd.backend.service;

import com.ddd.backend.automation.session.BrowserSessionManager;
import com.ddd.backend.common.exception.SessionNotFoundException;
import com.ddd.backend.domain.session.AutomationSession;
import com.ddd.backend.domain.session.AutomationSessionRepository;
import com.ddd.backend.websocket.publisher.AutomationStatusEventPublisher;
import org.springframework.stereotype.Service;

@Service
public class AutomationSessionService {

    private final AutomationSessionRepository sessionRepository;
    private final BrowserSessionManager browserSessionManager;
    private final AutomationStatusEventPublisher statusEventPublisher;

    public AutomationSessionService(
            AutomationSessionRepository sessionRepository,
            BrowserSessionManager browserSessionManager,
            AutomationStatusEventPublisher statusEventPublisher
    ) {
        this.sessionRepository = sessionRepository;
        this.browserSessionManager = browserSessionManager;
        this.statusEventPublisher = statusEventPublisher;
    }

    public AutomationSession createSession(
            String userRequest
    ) {
        AutomationSession session =
                AutomationSession.create(userRequest);

        String sessionId =
                session.getSessionId();

        browserSessionManager.createSession(
                sessionId
        );

        try {
            AutomationSession savedSession =
                    sessionRepository.save(
                            session
                    );

            statusEventPublisher.publish(
                    savedSession.getSessionId(),
                    savedSession.getStatus(),
                    "자동화 세션이 생성되었습니다."
            );

            return savedSession;
        } catch (RuntimeException exception) {
            browserSessionManager.closeSession(
                    sessionId
            );

            throw exception;
        }
    }

    public AutomationSession getSession(
            String sessionId
    ) {
        validateSessionId(sessionId);

        return sessionRepository.findById(
                        sessionId
                )
                .orElseThrow(
                        () -> new SessionNotFoundException(
                                sessionId
                        )
                );
    }

    public AutomationSession cancelSession(
            String sessionId
    ) {
        AutomationSession session =
                getSession(sessionId);

        session.cancel();

        AutomationSession savedSession =
                sessionRepository.save(
                        session
                );

        if (browserSessionManager.exists(
                sessionId
        )) {
            browserSessionManager.closeSession(
                    sessionId
            );
        }

        statusEventPublisher.publish(
                savedSession.getSessionId(),
                savedSession.getStatus(),
                "자동화 세션이 취소되었습니다."
        );

        return savedSession;
    }

    private void validateSessionId(
            String sessionId
    ) {
        if (sessionId == null
                || sessionId.isBlank()) {

            throw new IllegalArgumentException(
                    "세션 ID는 비어 있을 수 없습니다."
            );
        }
    }
}