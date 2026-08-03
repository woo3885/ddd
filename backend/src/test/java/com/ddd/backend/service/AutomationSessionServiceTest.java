package com.ddd.backend.service;

import com.ddd.backend.automation.session.BrowserSessionManager;
import com.ddd.backend.common.exception.SessionNotFoundException;
import com.ddd.backend.domain.session.AutomationSession;
import com.ddd.backend.domain.session.WorkflowStatus;
import com.ddd.backend.infrastructure.session.InMemoryAutomationSessionRepository;
import com.ddd.backend.websocket.publisher.AutomationStatusEventPublisher;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AutomationSessionServiceTest {

    private AutomationSessionService sessionService;
    private BrowserSessionManager browserSessionManager;
    private AutomationStatusEventPublisher statusEventPublisher;

    @BeforeEach
    void setUp() {
        InMemoryAutomationSessionRepository repository =
                new InMemoryAutomationSessionRepository();

        browserSessionManager =
                mock(BrowserSessionManager.class);

        statusEventPublisher =
                mock(AutomationStatusEventPublisher.class);

        sessionService =
                new AutomationSessionService(
                        repository,
                        browserSessionManager,
                        statusEventPublisher
                );
    }

    @Test
    void 자동화_세션을_생성한다() {
        AutomationSession session =
                sessionService.createSession(
                        "적금 상품을 비교해 줘"
                );

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

        verify(browserSessionManager)
                .createSession(
                        session.getSessionId()
                );

        verify(statusEventPublisher)
                .publish(
                        session.getSessionId(),
                        WorkflowStatus.SESSION_CREATED,
                        "자동화 세션이 생성되었습니다."
                );
    }

    @Test
    void 생성한_세션을_조회한다() {
        AutomationSession created =
                sessionService.createSession(
                        "예금 상품을 찾아 줘"
                );

        AutomationSession found =
                sessionService.getSession(
                        created.getSessionId()
                );

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
    void 자동화_세션을_취소하면_브라우저_세션도_종료한다() {
        AutomationSession created =
                sessionService.createSession(
                        "송금 절차를 안내해 줘"
                );

        when(
                browserSessionManager.exists(
                        created.getSessionId()
                )
        ).thenReturn(true);

        AutomationSession cancelled =
                sessionService.cancelSession(
                        created.getSessionId()
                );

        assertEquals(
                WorkflowStatus.CANCELLED,
                cancelled.getStatus()
        );

        verify(browserSessionManager)
                .closeSession(
                        created.getSessionId()
                );

        verify(statusEventPublisher)
                .publish(
                        cancelled.getSessionId(),
                        WorkflowStatus.CANCELLED,
                        "자동화 세션이 취소되었습니다."
                );
    }

    @Test
    void 브라우저_세션이_없어도_자동화_세션을_취소한다() {
        AutomationSession created =
                sessionService.createSession(
                        "계좌 조회를 도와 줘"
                );

        when(
                browserSessionManager.exists(
                        created.getSessionId()
                )
        ).thenReturn(false);

        AutomationSession cancelled =
                sessionService.cancelSession(
                        created.getSessionId()
                );

        assertEquals(
                WorkflowStatus.CANCELLED,
                cancelled.getStatus()
        );

        verify(browserSessionManager, never())
                .closeSession(
                        created.getSessionId()
                );

        verify(statusEventPublisher)
                .publish(
                        cancelled.getSessionId(),
                        WorkflowStatus.CANCELLED,
                        "자동화 세션이 취소되었습니다."
                );
    }

    @Test
    void 존재하지_않는_세션을_조회하면_예외가_발생한다() {
        assertThrows(
                SessionNotFoundException.class,
                () -> sessionService.getSession(
                        "not-found-session"
                )
        );
    }

    @Test
    void 취소된_세션을_다시_취소하면_브라우저는_한번만_종료한다() {
        AutomationSession created =
                sessionService.createSession(
                        "적금 가입을 도와 줘"
                );

        when(
                browserSessionManager.exists(
                        created.getSessionId()
                )
        ).thenReturn(true);

        sessionService.cancelSession(
                created.getSessionId()
        );

        assertThrows(
                IllegalStateException.class,
                () -> sessionService.cancelSession(
                        created.getSessionId()
                )
        );

        verify(browserSessionManager, times(1))
                .closeSession(
                        created.getSessionId()
                );

        verify(statusEventPublisher, times(1))
                .publish(
                        created.getSessionId(),
                        WorkflowStatus.CANCELLED,
                        "자동화 세션이 취소되었습니다."
                );
    }

    @Test
    void 잘못된_사용자_요청이면_브라우저_세션을_생성하지_않는다() {
        assertThrows(
                IllegalArgumentException.class,
                () -> sessionService.createSession(" ")
        );

        verify(browserSessionManager, never())
                .createSession(anyString());
    }
}