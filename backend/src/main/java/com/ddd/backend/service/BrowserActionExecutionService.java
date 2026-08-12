package com.ddd.backend.service;

import com.ddd.backend.automation.BrowserAction;
import com.ddd.backend.automation.BrowserActionExecutionResult;
import com.ddd.backend.automation.BrowserActionExecutor;
import com.ddd.backend.common.exception.SessionNotFoundException;
import com.ddd.backend.domain.session.AutomationSession;
import com.ddd.backend.domain.session.AutomationSessionRepository;
import com.ddd.backend.domain.session.WorkflowStatus;
import com.ddd.backend.websocket.mapper.BrowserActionStatusEventMapper;
import com.ddd.backend.websocket.publisher.AutomationStatusEventPublisher;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.Objects;

@Service
public final class BrowserActionExecutionService {

    private static final Logger log =
            LoggerFactory.getLogger(
                    BrowserActionExecutionService.class
            );

    private static final String EXECUTION_ERROR_MESSAGE =
            "브라우저 행동 실행 중 오류가 발생했습니다.";

    private final BrowserActionExecutor actionExecutor;
    private final BrowserActionStatusEventMapper statusEventMapper;
    private final AutomationSessionRepository sessionRepository;
    private final AutomationStatusEventPublisher statusEventPublisher;

    public BrowserActionExecutionService(
            BrowserActionExecutor actionExecutor,
            BrowserActionStatusEventMapper statusEventMapper,
            AutomationSessionRepository sessionRepository,
            AutomationStatusEventPublisher statusEventPublisher
    ) {
        this.actionExecutor =
                Objects.requireNonNull(
                        actionExecutor,
                        "BrowserActionExecutor는 필수입니다."
                );

        this.statusEventMapper =
                Objects.requireNonNull(
                        statusEventMapper,
                        "BrowserActionStatusEventMapper는 필수입니다."
                );

        this.sessionRepository =
                Objects.requireNonNull(
                        sessionRepository,
                        "AutomationSessionRepository는 필수입니다."
                );

        this.statusEventPublisher =
                Objects.requireNonNull(
                        statusEventPublisher,
                        "AutomationStatusEventPublisher는 필수입니다."
                );
    }

    public BrowserActionExecutionResult execute(
            String sessionId,
            BrowserAction action
    ) {
        AutomationSession session =
                getSession(sessionId);

        BrowserActionExecutionResult result;

        try {
            result =
                    actionExecutor.execute(
                            sessionId,
                            action
                    );
        } catch (RuntimeException executionException) {
            updateExecutionErrorStatusSafely(
                    session
            );

            publishExecutionErrorSafely(
                    sessionId
            );

            throw executionException;
        }

        Objects.requireNonNull(
                result,
                "브라우저 행동 실행 결과는 필수입니다."
        );

        WorkflowStatus workflowStatus =
                statusEventMapper.toWorkflowStatus(
                        result.status()
                );

        String message =
                statusEventMapper.message(
                        result.status()
                );

        session.transitionTo(
                workflowStatus
        );

        sessionRepository.save(
                session
        );

        statusEventPublisher.publish(
                sessionId,
                workflowStatus,
                message
        );

        return result;
    }

    private AutomationSession getSession(
            String sessionId
    ) {
        if (sessionId == null
                || sessionId.isBlank()) {

            throw new IllegalArgumentException(
                    "세션 ID는 비어 있을 수 없습니다."
            );
        }

        return sessionRepository
                .findById(sessionId)
                .orElseThrow(
                        () -> new SessionNotFoundException(
                                sessionId
                        )
                );
    }

    private void updateExecutionErrorStatusSafely(
            AutomationSession session
    ) {
        try {
            session.transitionTo(
                    WorkflowStatus.ERROR
            );

            sessionRepository.save(
                    session
            );
        } catch (RuntimeException updateException) {
            log.warn(
                    "브라우저 실행 오류 상태 저장 실패. "
                            + "sessionId={}, exceptionType={}",
                    session.getSessionId(),
                    updateException
                            .getClass()
                            .getSimpleName()
            );
        }
    }

    private void publishExecutionErrorSafely(
            String sessionId
    ) {
        try {
            statusEventPublisher.publish(
                    sessionId,
                    WorkflowStatus.ERROR,
                    EXECUTION_ERROR_MESSAGE
            );
        } catch (RuntimeException publishException) {
            log.warn(
                    "WebSocket 오류 상태 이벤트 발행 실패. "
                            + "sessionId={}, exceptionType={}",
                    sessionId,
                    publishException
                            .getClass()
                            .getSimpleName()
            );
        }
    }
}