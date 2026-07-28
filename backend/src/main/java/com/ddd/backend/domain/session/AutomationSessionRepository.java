package com.ddd.backend.domain.session;

import java.util.Optional;

public interface AutomationSessionRepository {

    AutomationSession save(AutomationSession session);

    Optional<AutomationSession> findById(String sessionId);
}