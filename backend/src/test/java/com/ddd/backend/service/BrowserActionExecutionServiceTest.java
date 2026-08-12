package com.ddd.backend.service;

import com.ddd.backend.automation.BrowserAction;
import com.ddd.backend.automation.BrowserActionExecutionResult;
import com.ddd.backend.automation.BrowserActionExecutor;
import com.ddd.backend.automation.BrowserActionType;
import com.ddd.backend.common.exception.SessionNotFoundException;
import com.ddd.backend.domain.session.AutomationSession;
import com.ddd.backend.domain.session.WorkflowStatus;
import com.ddd.backend.infrastructure.session.InMemoryAutomationSessionRepository;
import com.ddd.backend.websocket.mapper.BrowserActionStatusEventMapper;
import com.ddd.backend.websocket.publisher.AutomationStatusEventPublisher;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class BrowserActionExecutionServiceTest {

    private BrowserActionExecutor actionExecutor;
    private AutomationStatusEventPublisher statusEventPublisher;
    private InMemoryAutomationSessionRepository sessionRepository;
    private BrowserActionExecutionService service;

    @BeforeEach
    void setUp() {
        actionExecutor =
                mock(BrowserActionExecutor.class);

        statusEventPublisher =
                mock(AutomationStatusEventPublisher.class);

        sessionRepository =
                new InMemoryAutomationSessionRepository();

        service =
                new BrowserActionExecutionService(
                        actionExecutor,
                        new BrowserActionStatusEventMapper(),
                        sessionRepository,
                        statusEventPublisher
                );
    }

    @Test
    void 행동을_실행하고_세션과_WebSocket_상태를_변경한다() {
        AutomationSession session =
                createSession();

        BrowserAction action =
                createClickAction(
                        "#btn-next"
                );

        BrowserActionExecutionResult executionResult =
                BrowserActionExecutionResult.executed(
                        BrowserActionType.CLICK
                );

        when(
                actionExecutor.execute(
                        session.getSessionId(),
                        action
                )
        ).thenReturn(
                executionResult
        );

        BrowserActionExecutionResult result =
                service.execute(
                        session.getSessionId(),
                        action
                );

        assertThat(result)
                .isSameAs(executionResult);

        assertSessionStatus(
                session.getSessionId(),
                WorkflowStatus.AI_EXECUTING
        );

        verify(statusEventPublisher)
                .publish(
                        session.getSessionId(),
                        WorkflowStatus.AI_EXECUTING,
                        "브라우저 행동을 실행했습니다."
                );
    }

    @Test
    void 사용자_선택이_필요하면_결정_대기_상태를_저장한다() {
        AutomationSession session =
                createSession();

        BrowserAction action =
                createClickAction(
                        "#account-option"
                );

        BrowserActionExecutionResult executionResult =
                BrowserActionExecutionResult
                        .userActionRequired(
                                BrowserActionType.CLICK
                        );

        when(
                actionExecutor.execute(
                        session.getSessionId(),
                        action
                )
        ).thenReturn(
                executionResult
        );

        service.execute(
                session.getSessionId(),
                action
        );

        assertSessionStatus(
                session.getSessionId(),
                WorkflowStatus.USER_DECISION_REQUIRED
        );

        verify(statusEventPublisher)
                .publish(
                        session.getSessionId(),
                        WorkflowStatus.USER_DECISION_REQUIRED,
                        "사용자의 선택이 필요합니다."
                );
    }

    @Test
    void 민감정보_입력이_필요하면_보안입력_상태를_저장한다() {
        AutomationSession session =
                createSession();

        BrowserAction action =
                new BrowserAction(
                        BrowserActionType.TYPE,
                        "#password",
                        "입력되지-않아야-하는-값",
                        null,
                        null,
                        null
                );

        BrowserActionExecutionResult executionResult =
                BrowserActionExecutionResult
                        .secureInputRequired(
                                BrowserActionType.TYPE
                        );

        when(
                actionExecutor.execute(
                        session.getSessionId(),
                        action
                )
        ).thenReturn(
                executionResult
        );

        service.execute(
                session.getSessionId(),
                action
        );

        assertSessionStatus(
                session.getSessionId(),
                WorkflowStatus.SECURE_INPUT_REQUIRED
        );

        verify(statusEventPublisher)
                .publish(
                        session.getSessionId(),
                        WorkflowStatus.SECURE_INPUT_REQUIRED,
                        "민감정보는 사용자가 직접 입력해야 합니다."
                );
    }

    @Test
    void 최종_확인이_필요하면_최종확인_대기_상태를_저장한다() {
        AutomationSession session =
                createSession();

        BrowserAction action =
                createClickAction(
                        "#final-submit"
                );

        BrowserActionExecutionResult executionResult =
                BrowserActionExecutionResult
                        .finalConfirmationRequired(
                                BrowserActionType.CLICK
                        );

        when(
                actionExecutor.execute(
                        session.getSessionId(),
                        action
                )
        ).thenReturn(
                executionResult
        );

        service.execute(
                session.getSessionId(),
                action
        );

        assertSessionStatus(
                session.getSessionId(),
                WorkflowStatus.FINAL_CONFIRMATION_REQUIRED
        );

        verify(statusEventPublisher)
                .publish(
                        session.getSessionId(),
                        WorkflowStatus.FINAL_CONFIRMATION_REQUIRED,
                        "최종 실행 전 사용자의 확인이 필요합니다."
                );
    }

    @Test
    void 실행기가_예외를_발생시키면_ERROR_상태를_저장하고_전송한다() {
        AutomationSession session =
                createSession();

        BrowserAction action =
                createClickAction(
                        "#missing-button"
                );

        when(
                actionExecutor.execute(
                        session.getSessionId(),
                        action
                )
        ).thenThrow(
                new IllegalStateException(
                        "브라우저 행동 실행 실패"
                )
        );

        assertThatThrownBy(
                () -> service.execute(
                        session.getSessionId(),
                        action
                )
        )
                .isInstanceOf(
                        IllegalStateException.class
                )
                .hasMessage(
                        "브라우저 행동 실행 실패"
                );

        assertSessionStatus(
                session.getSessionId(),
                WorkflowStatus.ERROR
        );

        verify(statusEventPublisher)
                .publish(
                        session.getSessionId(),
                        WorkflowStatus.ERROR,
                        "브라우저 행동 실행 중 오류가 발생했습니다."
                );
    }

    @Test
    void ERROR_이벤트_발행에_실패해도_원래_실행_예외를_유지한다() {
        AutomationSession session =
                createSession();

        BrowserAction action =
                createClickAction(
                        "#missing-button"
                );

        IllegalArgumentException originalException =
                new IllegalArgumentException(
                        "원래 실행 예외"
                );

        when(
                actionExecutor.execute(
                        session.getSessionId(),
                        action
                )
        ).thenThrow(
                originalException
        );

        doThrow(
                new IllegalStateException(
                        "WebSocket 발행 실패"
                )
        ).when(
                statusEventPublisher
        ).publish(
                session.getSessionId(),
                WorkflowStatus.ERROR,
                "브라우저 행동 실행 중 오류가 발생했습니다."
        );

        assertThatThrownBy(
                () -> service.execute(
                        session.getSessionId(),
                        action
                )
        ).isSameAs(
                originalException
        );

        assertSessionStatus(
                session.getSessionId(),
                WorkflowStatus.ERROR
        );
    }

    @Test
    void 존재하지_않는_세션이면_브라우저_행동을_실행하지_않는다() {
        BrowserAction action =
                createClickAction(
                        "#btn-next"
                );

        assertThatThrownBy(
                () -> service.execute(
                        "not-found-session",
                        action
                )
        )
                .isInstanceOf(
                        SessionNotFoundException.class
                );

        verifyNoInteractions(
                actionExecutor,
                statusEventPublisher
        );
    }

    private AutomationSession createSession() {
        AutomationSession session =
                AutomationSession.create(
                        "예금 가입을 도와 줘"
                );

        return sessionRepository.save(
                session
        );
    }

    private BrowserAction createClickAction(
            String targetElementId
    ) {
        return new BrowserAction(
                BrowserActionType.CLICK,
                targetElementId,
                null,
                null,
                null,
                null
        );
    }

    private void assertSessionStatus(
            String sessionId,
            WorkflowStatus expectedStatus
    ) {
        AutomationSession savedSession =
                sessionRepository
                        .findById(sessionId)
                        .orElseThrow();

        assertThat(
                savedSession.getStatus()
        ).isEqualTo(
                expectedStatus
        );
    }
}