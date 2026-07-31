package com.ddd.backend.service;

import com.ddd.backend.automation.session.BrowserSessionManager;
import com.ddd.backend.common.exception.SessionNotFoundException;
import com.ddd.backend.domain.session.AutomationSession;
import com.ddd.backend.domain.session.AutomationSessionRepository;
import org.springframework.stereotype.Service;

@Service
public class AutomationSessionService {

    private final AutomationSessionRepository sessionRepository;
    private final BrowserSessionManager browserSessionManager;

    public AutomationSessionService(
            AutomationSessionRepository sessionRepository,
            BrowserSessionManager browserSessionManager
    ) {
        this.sessionRepository = sessionRepository;
        this.browserSessionManager = browserSessionManager;
    }

    public AutomationSession createSession(String userRequest) {
        AutomationSession session =
                AutomationSession.create(userRequest);

        String sessionId = session.getSessionId();

        browserSessionManager.createSession(sessionId);

        try {
            return sessionRepository.save(session);
        } catch (RuntimeException exception) {
            browserSessionManager.closeSession(sessionId);
            throw exception;
        }
    }

    public AutomationSession getSession(String sessionId) {
        validateSessionId(sessionId);

        return sessionRepository.findById(sessionId)
                .orElseThrow(() ->
                        new SessionNotFoundException(sessionId)
                );
    }

    public AutomationSession cancelSession(String sessionId) {
        AutomationSession session = getSession(sessionId);

        session.cancel();

        AutomationSession savedSession =
                sessionRepository.save(session);

        if (browserSessionManager.exists(sessionId)) {
            browserSessionManager.closeSession(sessionId);
        }

        return savedSession;
    }

    private void validateSessionId(String sessionId) {
        if (sessionId == null || sessionId.isBlank()) {
            throw new IllegalArgumentException(
                    "세션 ID는 비어 있을 수 없습니다."
            );
        }
    }
}