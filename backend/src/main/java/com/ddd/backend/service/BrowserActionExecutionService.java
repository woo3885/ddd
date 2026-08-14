package com.ddd.backend.service;

import com.ddd.backend.automation.BrowserAction;
import com.ddd.backend.automation.BrowserActionExecutionResult;
import com.ddd.backend.automation.BrowserActionExecutionStatus;
import com.ddd.backend.automation.BrowserActionExecutor;
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

    /*
     * D17 Viewer Frame 갱신용.
     */
    private final BrowserFrameCaptureService browserFrameCaptureService;

    private final BrowserFrameStore browserFrameStore;

    private final BrowserFrameWebSocketHandler frameWebSocketHandler;

    public BrowserActionExecutionService(
            BrowserActionExecutor actionExecutor,
            BrowserActionStatusEventMapper statusEventMapper,
            AutomationSessionRepository sessionRepository,
            AutomationStatusEventPublisher statusEventPublisher,
            BrowserFrameCaptureService browserFrameCaptureService,
            BrowserFrameStore browserFrameStore,
            BrowserFrameWebSocketHandler frameWebSocketHandler
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
    }

    public BrowserActionExecutionResult execute(
            String sessionId,
            BrowserAction action
    ) {
        AutomationSession session =
                getSession(
                        sessionId
                );

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
         * 기존 STOMP 상태 이벤트.
         */
        statusEventPublisher.publish(
                sessionId,
                workflowStatus,
                message
        );

        /*
         * D17:
         *
         * 실제 Browser Action이 실행된 경우에만
         * Viewer Frame을 갱신한다.
         */
        refreshFrameAfterExecutedActionSafely(
                sessionId,
                result
        );

        return result;
    }

    /*
     * D17 Viewer 화면 갱신.
     *
     * EXECUTED 외 상태에서는 절대 Frame을
     * 새로 캡처하지 않는다.
     */
    private void refreshFrameAfterExecutedActionSafely(
            String sessionId,
            BrowserActionExecutionResult result
    ) {
        if (result.status()
                != BrowserActionExecutionStatus.EXECUTED) {

            return;
        }

        try {
            /*
             * BrowserFrameCaptureService 내부에서
             *
             * latest currentPage
             * → FrameCaptureGuard
             * → secure-input 검사
             * → PNG screenshot
             *
             * 순서로 처리한다.
             */
            FrameCaptureAttempt captureAttempt =
                    browserFrameCaptureService.capture(
                            sessionId
                    );

            /*
             * secure-input 또는 검사 실패 등으로
             * Capture가 차단됐다면
             *
             * 기존 마지막 안전 Frame을 그대로 유지한다.
             */
            if (!captureAttempt.captured()
                    || captureAttempt.frame() == null) {

                return;
            }

            /*
             * 새로운 Frame 저장.
             *
             * 기존:
             * sequence=1
             *
             * 행동 실행 후:
             * sequence=2
             *
             * 다음 행동:
             * sequence=3
             */
            browserFrameStore.publish(
                    sessionId,
                    captureAttempt.frame()
            );

            /*
             * Viewer WebSocket이 연결돼 있으면
             *
             * metadata
             * → PNG binary
             *
             * 를 바로 전송한다.
             *
             * Viewer가 아직 연결되지 않은 경우
             * sendLatest()는 아무 작업도 하지 않고,
             * FrameStore에는 최신 Frame이 유지된다.
             */
            frameWebSocketHandler.sendLatest(
                    sessionId
            );

        } catch (RuntimeException frameException) {

            /*
             * Frame 갱신은 Browser Action의
             * 부가적인 Viewer 동기화 작업이다.
             *
             * 이미 성공한 Browser Action 결과를
             * Frame 전송 실패 때문에 ERROR로
             * 변경하지 않는다.
             *
             * Frame bytes나 sessionId는 로그에 남기지 않는다.
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