package com.ddd.backend.service;

import com.ddd.backend.automation.session.BrowserSessionManager;
import com.ddd.backend.common.exception.SessionNotFoundException;
import com.ddd.backend.domain.session.AutomationSession;
import com.ddd.backend.domain.session.AutomationSessionRepository;
import com.ddd.backend.frame.BrowserFrameStore;
import com.ddd.backend.security.capture.BrowserFrameCaptureService;
import com.ddd.backend.security.capture.FrameCaptureAttempt;
import com.ddd.backend.security.navigation.DemoNavigationPolicy;
import com.ddd.backend.security.navigation.DemoNavigationTarget;
import com.ddd.backend.websocket.frame.BrowserFrameWebSocketHandler;
import com.ddd.backend.websocket.publisher.AutomationStatusEventPublisher;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class AutomationSessionService {

    private final AutomationSessionRepository
            sessionRepository;

    private final BrowserSessionManager
            browserSessionManager;

    private final AutomationStatusEventPublisher
            statusEventPublisher;

    private final DemoNavigationPolicy
            demoNavigationPolicy;

    private final BrowserFrameCaptureService
            browserFrameCaptureService;

    private final BrowserFrameStore
            browserFrameStore;

    /*
     * D20 Viewer WebSocket lifecycle.
     *
     * 기존 직접 생성 테스트 호환을 위해
     * 테스트용 생성자에서는 null일 수 있다.
     *
     * 실제 Spring 구동에서는 @Autowired 생성자로
     * 반드시 주입된다.
     */
    private final BrowserFrameWebSocketHandler
            frameWebSocketHandler;

    @Autowired
    public AutomationSessionService(
            AutomationSessionRepository sessionRepository,
            BrowserSessionManager browserSessionManager,
            AutomationStatusEventPublisher statusEventPublisher,
            DemoNavigationPolicy demoNavigationPolicy,
            BrowserFrameCaptureService browserFrameCaptureService,
            BrowserFrameStore browserFrameStore,
            BrowserFrameWebSocketHandler frameWebSocketHandler
    ) {
        this.sessionRepository =
                sessionRepository;

        this.browserSessionManager =
                browserSessionManager;

        this.statusEventPublisher =
                statusEventPublisher;

        this.demoNavigationPolicy =
                demoNavigationPolicy;

        this.browserFrameCaptureService =
                browserFrameCaptureService;

        this.browserFrameStore =
                browserFrameStore;

        this.frameWebSocketHandler =
                frameWebSocketHandler;
    }

    /*
     * 기존 테스트 호환 생성자.
     */
    public AutomationSessionService(
            AutomationSessionRepository sessionRepository,
            BrowserSessionManager browserSessionManager,
            AutomationStatusEventPublisher statusEventPublisher,
            DemoNavigationPolicy demoNavigationPolicy,
            BrowserFrameCaptureService browserFrameCaptureService,
            BrowserFrameStore browserFrameStore
    ) {
        this(
                sessionRepository,
                browserSessionManager,
                statusEventPublisher,
                demoNavigationPolicy,
                browserFrameCaptureService,
                browserFrameStore,
                null
        );
    }

    public AutomationSession createSession(
            String userRequest
    ) {
        AutomationSession session =
                AutomationSession.create(
                        userRequest
                );

        String sessionId =
                session.getSessionId();

        browserSessionManager.createSession(
                sessionId
        );

        try {
            AutomationSession savedSession =
                    sessionRepository.save(
                            session
                    );

            statusEventPublisher.publish(
                    savedSession.getSessionId(),
                    savedSession.getStatus(),
                    "자동화 세션이 생성되었습니다."
            );

            return savedSession;

        } catch (RuntimeException exception) {

            cleanupBrowserResources(
                    sessionId
            );

            throw exception;
        }
    }

    public AutomationSession createSession(
            String userRequest,
            String siteId,
            String initialPath
    ) {
        DemoNavigationTarget navigationTarget =
                demoNavigationPolicy.resolve(
                        siteId,
                        initialPath
                );

        AutomationSession session =
                AutomationSession.create(
                        userRequest
                );

        String sessionId =
                session.getSessionId();

        browserSessionManager.createSession(
                sessionId
        );

        try {
            String finalUrl =
                    browserSessionManager.navigate(
                            sessionId,
                            navigationTarget.targetUri()
                    );

            demoNavigationPolicy
                    .validateNavigatedTarget(
                            navigationTarget,
                            finalUrl
                    );

            session.updateCurrentUrl(
                    finalUrl
            );

            FrameCaptureAttempt captureAttempt =
                    browserFrameCaptureService
                            .capture(
                                    sessionId
                            );

            if (!captureAttempt.captured()
                    || captureAttempt.frame()
                    == null) {

                throw new IllegalStateException(
                        "초기 Browser Frame을 생성할 수 없습니다. "
                                + "decision="
                                + captureAttempt.decision()
                );
            }

            browserFrameStore.publish(
                    sessionId,
                    captureAttempt.frame()
            );

            AutomationSession savedSession =
                    sessionRepository.save(
                            session
                    );

            statusEventPublisher.publish(
                    savedSession.getSessionId(),
                    savedSession.getStatus(),
                    "자동화 세션이 생성되었습니다."
            );

            return savedSession;

        } catch (RuntimeException exception) {

            cleanupBrowserResources(
                    sessionId
            );

            throw exception;
        }
    }

    public AutomationSession getSession(
            String sessionId
    ) {
        validateSessionId(
                sessionId
        );

        AutomationSession session =
                sessionRepository
                        .findById(
                                sessionId
                        )
                        .orElseThrow(
                                () ->
                                        new SessionNotFoundException(
                                                sessionId
                                        )
                        );

        session.touch();

        return sessionRepository.save(
                session
        );
    }

    public AutomationSession cancelSession(
            String sessionId
    ) {
        AutomationSession session =
                getSession(
                        sessionId
                );

        session.cancel();

        AutomationSession savedSession =
                sessionRepository.save(
                        session
                );

        /*
         * Playwright BrowserContext 종료.
         */
        if (browserSessionManager.exists(
                sessionId
        )) {

            browserSessionManager.closeSession(
                    sessionId
            );
        }

        /*
         * D20:
         * Viewer WebSocket도 서버에서 종료한다.
         */
        closeFrameWebSocketSafely(
                sessionId
        );

        /*
         * Viewer 최신 Frame 제거.
         */
        if (browserFrameStore.containsSession(
                sessionId
        )) {

            browserFrameStore.removeSession(
                    sessionId
            );
        }

        statusEventPublisher.publish(
                savedSession.getSessionId(),
                savedSession.getStatus(),
                "자동화 세션이 취소되었습니다."
        );

        return savedSession;
    }

    /*
     * 세션 생성 실패 시
     * Browser + Viewer WebSocket + Frame을
     * 함께 정리한다.
     */
    private void cleanupBrowserResources(
            String sessionId
    ) {
        try {

            if (browserSessionManager.exists(
                    sessionId
            )) {

                browserSessionManager.closeSession(
                        sessionId
                );
            }

        } catch (RuntimeException ignored) {

            /*
             * cleanup 실패가 원래 예외를
             * 덮어쓰지 않는다.
             */
        }

        closeFrameWebSocketSafely(
                sessionId
        );

        try {

            if (browserFrameStore.containsSession(
                    sessionId
            )) {

                browserFrameStore.removeSession(
                        sessionId
                );
            }

        } catch (RuntimeException ignored) {

            /*
             * Frame cleanup 실패 역시
             * 원래 예외를 덮어쓰지 않는다.
             */
        }
    }

    private void closeFrameWebSocketSafely(
            String sessionId
    ) {
        /*
         * 기존 테스트 호환 생성자에서는
         * Handler가 없을 수 있다.
         */
        if (frameWebSocketHandler == null) {
            return;
        }

        try {
            frameWebSocketHandler.closeConnection(
                    sessionId
            );

        } catch (RuntimeException ignored) {

            /*
             * Viewer WebSocket cleanup 실패가
             * Session cleanup 자체를
             * 실패시키지 않도록 한다.
             */
        }
    }

    private void validateSessionId(
            String sessionId
    ) {
        if (sessionId == null
                || sessionId.isBlank()) {

            throw new IllegalArgumentException(
                    "세션 ID는 비어 있을 수 없습니다."
            );
        }
    }
}