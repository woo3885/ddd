package com.ddd.backend.service;

import com.ddd.backend.automation.BrowserAction;
import com.ddd.backend.automation.BrowserActionExecutionResult;
import com.ddd.backend.automation.BrowserActionExecutionStatus;
import com.ddd.backend.automation.BrowserActionExecutor;
import com.ddd.backend.automation.BrowserActionType;
import com.ddd.backend.automation.ElementIdBrowserActionExecutor;
import com.ddd.backend.common.exception.SessionNotFoundException;
import com.ddd.backend.domain.session.AutomationSession;
import com.ddd.backend.domain.session.AutomationSessionRepository;
import com.ddd.backend.domain.session.WorkflowStatus;
import com.ddd.backend.frame.BrowserFrameStore;
import com.ddd.backend.security.capture.BrowserFrameCaptureService;
import com.ddd.backend.security.capture.FrameCaptureAttempt;
import com.ddd.backend.websocket.frame.BrowserFrameWebSocketHandler;
import com.ddd.backend.websocket.mapper.BrowserActionStatusEventMapper;
import com.ddd.backend.websocket.publisher.AutomationStatusEventPublisher;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Objects;
import java.util.function.Supplier;

@Service
public final class BrowserActionExecutionService {

    private static final Logger log =
            LoggerFactory.getLogger(
                    BrowserActionExecutionService.class
            );

    private static final String
            EXECUTION_ERROR_MESSAGE =
            "브라우저 행동 실행 중 오류가 발생했습니다.";

    private final BrowserActionExecutor
            actionExecutor;

    private final BrowserActionStatusEventMapper
            statusEventMapper;

    private final AutomationSessionRepository
            sessionRepository;

    private final AutomationStatusEventPublisher
            statusEventPublisher;

    private final BrowserFrameCaptureService
            browserFrameCaptureService;

    private final BrowserFrameStore
            browserFrameStore;

    private final BrowserFrameWebSocketHandler
            frameWebSocketHandler;

    private final ElementIdBrowserActionExecutor
            elementIdActionExecutor;

    @Autowired
    public BrowserActionExecutionService(
            BrowserActionExecutor actionExecutor,
            BrowserActionStatusEventMapper statusEventMapper,
            AutomationSessionRepository sessionRepository,
            AutomationStatusEventPublisher statusEventPublisher,
            BrowserFrameCaptureService browserFrameCaptureService,
            BrowserFrameStore browserFrameStore,
            BrowserFrameWebSocketHandler frameWebSocketHandler,
            ElementIdBrowserActionExecutor
                    elementIdActionExecutor
    ) {
        this(
                actionExecutor,
                statusEventMapper,
                sessionRepository,
                statusEventPublisher,
                browserFrameCaptureService,
                browserFrameStore,
                frameWebSocketHandler,
                elementIdActionExecutor,
                false
        );
    }

    /*
     * 기존 테스트 호환 생성자.
     */
    public BrowserActionExecutionService(
            BrowserActionExecutor actionExecutor,
            BrowserActionStatusEventMapper statusEventMapper,
            AutomationSessionRepository sessionRepository,
            AutomationStatusEventPublisher statusEventPublisher,
            BrowserFrameCaptureService browserFrameCaptureService,
            BrowserFrameStore browserFrameStore,
            BrowserFrameWebSocketHandler frameWebSocketHandler
    ) {
        this(
                actionExecutor,
                statusEventMapper,
                sessionRepository,
                statusEventPublisher,
                browserFrameCaptureService,
                browserFrameStore,
                frameWebSocketHandler,
                null,
                true
        );
    }

    private BrowserActionExecutionService(
            BrowserActionExecutor actionExecutor,
            BrowserActionStatusEventMapper statusEventMapper,
            AutomationSessionRepository sessionRepository,
            AutomationStatusEventPublisher statusEventPublisher,
            BrowserFrameCaptureService browserFrameCaptureService,
            BrowserFrameStore browserFrameStore,
            BrowserFrameWebSocketHandler frameWebSocketHandler,
            ElementIdBrowserActionExecutor
                    elementIdActionExecutor,
            boolean allowMissingElementIdExecutor
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

        this.browserFrameCaptureService =
                Objects.requireNonNull(
                        browserFrameCaptureService,
                        "BrowserFrameCaptureService는 필수입니다."
                );

        this.browserFrameStore =
                Objects.requireNonNull(
                        browserFrameStore,
                        "BrowserFrameStore는 필수입니다."
                );

        this.frameWebSocketHandler =
                Objects.requireNonNull(
                        frameWebSocketHandler,
                        "BrowserFrameWebSocketHandler는 필수입니다."
                );

        if (allowMissingElementIdExecutor) {

            this.elementIdActionExecutor =
                    elementIdActionExecutor;

        } else {

            this.elementIdActionExecutor =
                    Objects.requireNonNull(
                            elementIdActionExecutor,
                            "ElementIdBrowserActionExecutor는 필수입니다."
                    );
        }
    }

    /*
     * 기존 selector 기반 내부 Action 실행.
     */
    public BrowserActionExecutionResult execute(
            String sessionId,
            BrowserAction action
    ) {
        return executeInternal(
                sessionId,
                () ->
                        actionExecutor.execute(
                                sessionId,
                                action
                        )
        );
    }

    /*
     * Frontend Viewer에서 사용자가 직접 클릭.
     */
    public BrowserActionExecutionResult
    executeElementClick(
            String sessionId,
            String elementId
    ) {
        requireElementIdExecutor();

        return executeInternal(
                sessionId,
                () ->
                        elementIdActionExecutor
                                .executeUserClick(
                                        sessionId,
                                        elementId
                                )
        );
    }

    /*
     * D19 AI Action 전용.
     *
     * CSS Selector를 사용하지 않고
     * B가 발급한 elementId로 실행한다.
     */
    public BrowserActionExecutionResult
    executeAiElementAction(
            String sessionId,
            BrowserActionType actionType,
            String elementId,
            String value
    ) {
        requireElementIdExecutor();

        return executeInternal(
                sessionId,
                () ->
                        elementIdActionExecutor
                                .executeAiAction(
                                        sessionId,
                                        actionType,
                                        elementId,
                                        value
                                )
        );
    }

    private BrowserActionExecutionResult
    executeInternal(
            String sessionId,
            Supplier<BrowserActionExecutionResult>
                    execution
    ) {
        Objects.requireNonNull(
                execution,
                "Browser Action 실행 작업은 필수입니다."
        );

        AutomationSession session =
                getSession(
                        sessionId
                );

        BrowserActionExecutionResult result;

        try {
            result =
                    execution.get();

        } catch (RuntimeException
                executionException) {

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
                statusEventMapper
                        .toWorkflowStatus(
                                result.status()
                        );

        String message =
                statusEventMapper
                        .message(
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

        /*
         * EXECUTED일 때만 새 Frame.
         */
        refreshFrameAfterExecutedActionSafely(
                sessionId,
                result
        );

        return result;
    }

    private void
    refreshFrameAfterExecutedActionSafely(
            String sessionId,
            BrowserActionExecutionResult result
    ) {
        if (result.status()
                != BrowserActionExecutionStatus
                .EXECUTED) {

            return;
        }

        try {
            FrameCaptureAttempt captureAttempt =
                    browserFrameCaptureService
                            .capture(
                                    sessionId
                            );

            if (!captureAttempt.captured()
                    || captureAttempt.frame()
                    == null) {

                return;
            }

            browserFrameStore.publish(
                    sessionId,
                    captureAttempt.frame()
            );

            frameWebSocketHandler.sendLatest(
                    sessionId
            );

        } catch (RuntimeException
                frameException) {

            /*
             * 실제 Action은 이미 성공했다.
             *
             * Frame 실패 때문에 Action을
             * 재실행해서는 안 된다.
             */
            log.warn(
                    "Browser Viewer Frame 갱신 실패. "
                            + "exceptionType={}",
                    frameException
                            .getClass()
                            .getSimpleName()
            );
        }
    }

    private void requireElementIdExecutor() {
        if (elementIdActionExecutor == null) {

            throw new IllegalStateException(
                    "elementId Action 실행기가 "
                            + "구성되지 않았습니다."
            );
        }
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
                .findById(
                        sessionId
                )
                .orElseThrow(
                        () ->
                                new SessionNotFoundException(
                                        sessionId
                                )
                );
    }

    private void
    updateExecutionErrorStatusSafely(
            AutomationSession session
    ) {
        try {
            session.transitionTo(
                    WorkflowStatus.ERROR
            );

            sessionRepository.save(
                    session
            );

        } catch (RuntimeException
                updateException) {

            log.warn(
                    "브라우저 실행 오류 상태 저장 실패. "
                            + "sessionId={}, "
                            + "exceptionType={}",
                    session.getSessionId(),
                    updateException
                            .getClass()
                            .getSimpleName()
            );
        }
    }

    private void
    publishExecutionErrorSafely(
            String sessionId
    ) {
        try {
            statusEventPublisher.publish(
                    sessionId,
                    WorkflowStatus.ERROR,
                    EXECUTION_ERROR_MESSAGE
            );

        } catch (RuntimeException
                publishException) {

            log.warn(
                    "WebSocket 오류 상태 이벤트 "
                            + "발행 실패. "
                            + "sessionId={}, "
                            + "exceptionType={}",
                    sessionId,
                    publishException
                            .getClass()
                            .getSimpleName()
            );
        }
    }
}