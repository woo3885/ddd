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
     * 기존 코드 / 테스트 호환용 세션 생성.
     *
     * Demo navigation 및 Frame 생성은 하지 않는다.
     *
     * D7:
     * AutomationSession.create() 단계에서
     * lastAccessedAt이 자동 초기화된다.
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
     * D17 / D7 세션 생성.
     *
     * 1. site/path 보안 검증
     * 2. BrowserContext 생성
     * 3. 실제 페이지 이동
     * 4. 최종 URL 재검증
     * 5. D7 currentUrl / lastAccessedAt 갱신
     * 6. 최초 Frame 캡처
     * 7. 최신 Frame Store 저장
     * 8. AutomationSession 저장
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
             * 실제 최종 URL을 다시 검증한다.
             */
            demoNavigationPolicy.validateNavigatedTarget(
                    navigationTarget,
                    finalUrl
            );

            /*
             * D7
             *
             * 검증까지 끝난 실제 Browser URL을
             * AutomationSession에 저장한다.
             *
             * 이 메서드 내부에서
             * updatedAt과 lastAccessedAt도 갱신된다.
             */
            session.updateCurrentUrl(
                    finalUrl
            );

            /*
             * D17 첫 Frame 생성.
             *
             * FrameCaptureGuard가 먼저 실행되므로
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
             * D7
             *
             * 여기서 Repository가 memory라면 메모리에,
             * redis라면 Redis Hash에 아래 정보가 저장된다.
             *
             * - sessionId
             * - userRequest
             * - status
             * - createdAt
             * - updatedAt
             * - currentUrl
             * - lastAccessedAt
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

    /*
     * D7
     *
     * 단순 조회가 아니라
     * "세션에 접근했다"는 의미로 처리한다.
     *
     * 조회 성공 시:
     *
     * findById
     * → touch()
     * → lastAccessedAt 갱신
     * → 다시 Repository 저장
     *
     * Redis 모드에서는 이 시각까지 Redis에 반영된다.
     */
    public AutomationSession getSession(
            String sessionId
    ) {
        validateSessionId(
                sessionId
        );

        AutomationSession session =
                sessionRepository.findById(
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
        /*
         * getSession() 호출 시
         * D7 lastAccessedAt이 먼저 갱신된다.
         */
        AutomationSession session =
                getSession(
                        sessionId
                );

        /*
         * cancel()에서
         * status / updatedAt / lastAccessedAt이
         * 함께 갱신된다.
         */
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