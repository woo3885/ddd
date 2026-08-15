package com.ddd.backend.service;

import com.ddd.backend.automation.BrowserAction;
import com.ddd.backend.automation.BrowserActionExecutionResult;
import com.ddd.backend.automation.BrowserActionExecutionStatus;
import com.ddd.backend.automation.BrowserActionExecutor;
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

    /*
     * D19 Public Viewer elementId Action.
     */
    private final ElementIdBrowserActionExecutor
            elementIdActionExecutor;

    /*
     * Spring 실제 구동 시 사용하는 Constructor.
     */
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
     * 기존 테스트 코드 호환용 Constructor.
     *
     * 기존 테스트들이 7개 인자로
     * BrowserActionExecutionService를 직접 생성해도
     * 깨지지 않도록 유지한다.
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
     * 기존 AI / 내부 selector 기반 Action 실행.
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
     * D19 Public Viewer Action.
     *
     * 외부에서 selector를 받지 않는다.
     */
    public BrowserActionExecutionResult
    executeElementClick(
            String sessionId,
            String elementId
    ) {
        if (elementIdActionExecutor == null) {

            throw new IllegalStateException(
                    "elementId Action 실행기가 "
                            + "구성되지 않았습니다."
            );
        }

        return executeInternal(
                sessionId,
                () ->
                        elementIdActionExecutor
                                .executeClick(
                                        sessionId,
                                        elementId
                                )
        );
    }

    /*
     * 기존 selector Action과
     * 신규 elementId Action이
     * 동일한 Session 상태/Frame 갱신 흐름을
     * 사용하도록 공통화한다.
     */
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

        /*
         * BrowserAction 결과를
         * AutomationSession 상태에 반영한다.
         */
        session.transitionTo(
                workflowStatus
        );

        sessionRepository.save(
                session
        );

        /*
         * STOMP 상태 이벤트.
         */
        statusEventPublisher.publish(
                sessionId,
                workflowStatus,
                message
        );

        /*
         * 실제 Action이 실행된 경우에만
         * Viewer Frame을 딱 한 번 갱신한다.
         */
        refreshFrameAfterExecutedActionSafely(
                sessionId,
                result
        );

        return result;
    }

    /*
     * EXECUTED 외 상태에서는
     * Frame을 새로 캡처하지 않는다.
     */
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

            /*
             * Secure Input 화면 등으로
             * Capture가 차단된 경우
             * 기존 마지막 안전 Frame 유지.
             */
            if (!captureAttempt.captured()
                    || captureAttempt.frame()
                    == null) {

                return;
            }

            /*
             * BrowserFrameStore가
             * sequence를 증가시킨다.
             */
            browserFrameStore.publish(
                    sessionId,
                    captureAttempt.frame()
            );

            /*
             * 연결된 Viewer가 있으면
             * metadata → PNG binary 순으로 전달.
             */
            frameWebSocketHandler.sendLatest(
                    sessionId
            );

        } catch (RuntimeException
                frameException) {

            /*
             * Action 자체는 이미 성공했다.
             *
             * Frame 갱신 실패 때문에
             * 성공한 금융사이트 Action을
             * 다시 실행해서는 안 된다.
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