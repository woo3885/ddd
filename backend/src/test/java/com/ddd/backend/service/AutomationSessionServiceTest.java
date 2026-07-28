package com.ddd.backend.service;

import com.ddd.backend.common.exception.SessionNotFoundException;
import com.ddd.backend.domain.session.AutomationSession;
import com.ddd.backend.domain.session.WorkflowStatus;
import com.ddd.backend.infrastructure.session.InMemoryAutomationSessionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

class AutomationSessionServiceTest {

    private AutomationSessionService sessionService;

    @BeforeEach
    void setUp() {
        InMemoryAutomationSessionRepository repository =
                new InMemoryAutomationSessionRepository();

        sessionService = new AutomationSessionService(repository);
    }

    @Test
    void 자동화_세션을_생성한다() {
        AutomationSession session =
                sessionService.createSession("적금 상품을 비교해 줘");

        assertNotNull(session.getSessionId());
        assertEquals(
                "적금 상품을 비교해 줘",
                session.getUserRequest()
        );
        assertEquals(
                WorkflowStatus.SESSION_CREATED,
                session.getStatus()
        );
        assertNotNull(session.getCreatedAt());
        assertNotNull(session.getUpdatedAt());
    }

    @Test
    void 생성한_세션을_조회한다() {
        AutomationSession created =
                sessionService.createSession("예금 상품을 찾아 줘");

        AutomationSession found =
                sessionService.getSession(created.getSessionId());

        assertEquals(
                created.getSessionId(),
                found.getSessionId()
        );
        assertEquals(
                "예금 상품을 찾아 줘",
                found.getUserRequest()
        );
    }

    @Test
    void 자동화_세션을_취소한다() {
        AutomationSession created =
                sessionService.createSession("송금 절차를 안내해 줘");

        AutomationSession cancelled =
                sessionService.cancelSession(
                        created.getSessionId()
                );

        assertEquals(
                WorkflowStatus.CANCELLED,
                cancelled.getStatus()
        );
    }

    @Test
    void 존재하지_않는_세션을_조회하면_예외가_발생한다() {
        assertThrows(
                SessionNotFoundException.class,
                () -> sessionService.getSession("not-found-session")
        );
    }

    @Test
    void 취소된_세션을_다시_취소하면_예외가_발생한다() {
        AutomationSession created =
                sessionService.createSession("적금 가입을 도와 줘");

        sessionService.cancelSession(created.getSessionId());

        assertThrows(
                IllegalStateException.class,
                () -> sessionService.cancelSession(
                        created.getSessionId()
                )
        );
    }
}