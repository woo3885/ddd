package com.ddd.backend.service;

import com.ddd.backend.automation.BrowserAction;
import com.ddd.backend.automation.BrowserActionExecutionResult;
import com.ddd.backend.automation.BrowserActionExecutor;
import com.ddd.backend.automation.BrowserActionType;
import com.ddd.backend.domain.session.WorkflowStatus;
import com.ddd.backend.websocket.mapper.BrowserActionStatusEventMapper;
import com.ddd.backend.websocket.publisher.AutomationStatusEventPublisher;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class BrowserActionExecutionServiceTest {

    private BrowserActionExecutor actionExecutor;
    private AutomationStatusEventPublisher statusEventPublisher;
    private BrowserActionExecutionService service;

    @BeforeEach
    void setUp() {
        actionExecutor =
                mock(BrowserActionExecutor.class);

        statusEventPublisher =
                mock(AutomationStatusEventPublisher.class);

        service =
                new BrowserActionExecutionService(
                        actionExecutor,
                        new BrowserActionStatusEventMapper(),
                        statusEventPublisher
                );
    }

    @Test
    void 행동을_실행하고_WebSocket_상태를_전송한다() {
        BrowserAction action =
                new BrowserAction(
                        BrowserActionType.CLICK,
                        "#btn-next",
                        null,
                        null,
                        null,
                        null
                );

        BrowserActionExecutionResult executionResult =
                BrowserActionExecutionResult.executed(
                        BrowserActionType.CLICK
                );

        when(
                actionExecutor.execute(
                        "session-001",
                        action
                )
        ).thenReturn(executionResult);

        BrowserActionExecutionResult result =
                service.execute(
                        "session-001",
                        action
                );

        assertThat(result)
                .isSameAs(executionResult);

        verify(statusEventPublisher)
                .publish(
                        "session-001",
                        WorkflowStatus.AI_EXECUTING,
                        "브라우저 행동을 실행했습니다."
                );
    }

    @Test
    void 사용자_선택이_필요하면_결정_대기_상태를_전송한다() {
        BrowserAction action =
                new BrowserAction(
                        BrowserActionType.CLICK,
                        "#account-option",
                        null,
                        null,
                        null,
                        null
                );

        BrowserActionExecutionResult executionResult =
                BrowserActionExecutionResult
                        .userActionRequired(
                                BrowserActionType.CLICK
                        );

        when(
                actionExecutor.execute(
                        "session-002",
                        action
                )
        ).thenReturn(executionResult);

        service.execute(
                "session-002",
                action
        );

        verify(statusEventPublisher)
                .publish(
                        "session-002",
                        WorkflowStatus.USER_DECISION_REQUIRED,
                        "사용자의 선택이 필요합니다."
                );
    }

    @Test
    void 민감정보_입력이_필요하면_보안입력_상태를_전송한다() {
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
                        "session-003",
                        action
                )
        ).thenReturn(executionResult);

        service.execute(
                "session-003",
                action
        );

        verify(statusEventPublisher)
                .publish(
                        "session-003",
                        WorkflowStatus.SECURE_INPUT_REQUIRED,
                        "민감정보는 사용자가 직접 입력해야 합니다."
                );
    }

    @Test
    void 실행기가_예외를_발생시키면_ERROR_상태를_전송한다() {
        BrowserAction action =
                new BrowserAction(
                        BrowserActionType.CLICK,
                        "#missing-button",
                        null,
                        null,
                        null,
                        null
                );

        when(
                actionExecutor.execute(
                        "session-004",
                        action
                )
        ).thenThrow(
                new IllegalStateException(
                        "브라우저 행동 실행 실패"
                )
        );

        assertThatThrownBy(
                () -> service.execute(
                        "session-004",
                        action
                )
        )
                .isInstanceOf(
                        IllegalStateException.class
                )
                .hasMessage(
                        "브라우저 행동 실행 실패"
                );

        verify(statusEventPublisher)
                .publish(
                        "session-004",
                        WorkflowStatus.ERROR,
                        "브라우저 행동 실행 중 오류가 발생했습니다."
                );
    }

    @Test
    void ERROR_이벤트_발행에_실패해도_원래_실행_예외를_유지한다() {
        BrowserAction action =
                new BrowserAction(
                        BrowserActionType.CLICK,
                        "#missing-button",
                        null,
                        null,
                        null,
                        null
                );

        IllegalArgumentException originalException =
                new IllegalArgumentException(
                        "원래 실행 예외"
                );

        when(
                actionExecutor.execute(
                        "session-005",
                        action
                )
        ).thenThrow(
                originalException
        );

        org.mockito.Mockito.doThrow(
                new IllegalStateException(
                        "WebSocket 발행 실패"
                )
        ).when(
                statusEventPublisher
        ).publish(
                "session-005",
                WorkflowStatus.ERROR,
                "브라우저 행동 실행 중 오류가 발생했습니다."
        );

        assertThatThrownBy(
                () -> service.execute(
                        "session-005",
                        action
                )
        ).isSameAs(
                originalException
        );
    }
}