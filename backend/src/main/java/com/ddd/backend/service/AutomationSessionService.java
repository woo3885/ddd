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
import com.ddd.backend.websocket.publisher.AutomationStatusEventPublisher;
import org.springframework.stereotype.Service;

@Service
public class AutomationSessionService {

    private final AutomationSessionRepository sessionRepository;
    private final BrowserSessionManager browserSessionManager;
    private final AutomationStatusEventPublisher statusEventPublisher;
    private final DemoNavigationPolicy demoNavigationPolicy;
    private final BrowserFrameCaptureService browserFrameCaptureService;
    private final BrowserFrameStore browserFrameStore;

    public AutomationSessionService(
            AutomationSessionRepository sessionRepository,
            BrowserSessionManager browserSessionManager,
            AutomationStatusEventPublisher statusEventPublisher,
            DemoNavigationPolicy demoNavigationPolicy,
            BrowserFrameCaptureService browserFrameCaptureService,
            BrowserFrameStore browserFrameStore
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
    }

    /*
     * 기존 코드/테스트 호환용 세션 생성.
     *
     * 기존 API 내부 사용을 위해 유지한다.
     * Demo navigation 및 Frame 생성은 하지 않는다.
     */
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

    /*
     * D17 세션 생성.
     *
     * 1. site/path 보안검증
     * 2. BrowserContext 생성
     * 3. 실제 페이지 이동
     * 4. 최종 URL 재검증
     * 5. 최초 Frame 캡처
     * 6. 최신 Frame Store 저장
     * 7. AutomationSession 저장
     */
    public AutomationSession createSession(
            String userRequest,
            String siteId,
            String initialPath
    ) {
        /*
         * Browser를 만들기 전에
         * 사용자 입력부터 검증한다.
         */
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
            /*
             * 서버가 생성한 안전한 URL로 이동.
             */
            String finalUrl =
                    browserSessionManager.navigate(
                            sessionId,
                            navigationTarget.targetUri()
                    );

            /*
             * redirect 등을 포함한
             * 실제 최종 URL을 재검증한다.
             */
            demoNavigationPolicy.validateNavigatedTarget(
                    navigationTarget,
                    finalUrl
            );

            /*
             * D17 첫 Frame 생성.
             *
             * 여기서 FrameCaptureGuard가 먼저 실행되므로
             * secure-input 화면이면 screenshot 자체가
             * 실행되지 않는다.
             */
            FrameCaptureAttempt captureAttempt =
                    browserFrameCaptureService.capture(
                            sessionId
                    );

            /*
             * D17의 session-start 계약에서는
             * 첫 Frame을 제공할 수 있어야
             * 세션 생성을 성공으로 처리한다.
             */
            if (!captureAttempt.captured()
                    || captureAttempt.frame() == null) {

                throw new IllegalStateException(
                        "초기 Browser Frame을 생성할 수 없습니다. "
                                + "decision="
                                + captureAttempt.decision()
                );
            }

            /*
             * 세션별 sequence=1의
             * 최초 Frame을 메모리에 저장한다.
             */
            browserFrameStore.publish(
                    sessionId,
                    captureAttempt.frame()
            );

            /*
             * 브라우저 및 최초 Frame 준비가
             * 모두 끝난 뒤에만 도메인 세션 저장.
             */
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

            /*
             * 아래 실패 상황 모두 정리:
             *
             * - navigation 실패
             * - URL 재검증 실패
             * - Frame 보안 차단
             * - Frame capture 실패
             * - Frame Store 오류
             * - Repository 저장 실패
             */
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

        return sessionRepository.findById(
                        sessionId
                )
                .orElseThrow(
                        () ->
                                new SessionNotFoundException(
                                        sessionId
                                )
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
         * BrowserContext / Page 정리.
         */
        if (browserSessionManager.exists(
                sessionId
        )) {

            browserSessionManager.closeSession(
                    sessionId
            );
        }

        /*
         * 해당 세션의 최신 Frame도
         * 메모리에서 삭제한다.
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
     * 실패 시 Browser + Frame Store를
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
             * cleanup 오류가 원래 예외를
             * 덮어쓰지 않도록 한다.
             */
        }

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