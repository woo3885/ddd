package com.ddd.backend.infrastructure.session;

import com.ddd.backend.automation.session.BrowserSessionManager;
import com.ddd.backend.domain.session.AutomationSessionRepository;
import com.ddd.backend.frame.BrowserFrameStore;
import com.ddd.backend.websocket.frame.BrowserFrameWebSocketHandler;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.Set;

@Component
@ConditionalOnProperty(
        prefix = "ddd.session-store",
        name = "type",
        havingValue = "redis"
)
public class SessionExpirationScheduler {

    private static final Logger log =
            LoggerFactory.getLogger(
                    SessionExpirationScheduler.class
            );

    private final AutomationSessionRepository
            sessionRepository;

    private final BrowserSessionManager
            browserSessionManager;

    private final BrowserFrameStore
            browserFrameStore;

    private final BrowserFrameWebSocketHandler
            frameWebSocketHandler;

    @Autowired
    public SessionExpirationScheduler(
            AutomationSessionRepository sessionRepository,
            BrowserSessionManager browserSessionManager,
            BrowserFrameStore browserFrameStore,
            BrowserFrameWebSocketHandler frameWebSocketHandler
    ) {
        this.sessionRepository =
                sessionRepository;

        this.browserSessionManager =
                browserSessionManager;

        this.browserFrameStore =
                browserFrameStore;

        this.frameWebSocketHandler =
                frameWebSocketHandler;
    }

    /*
     * 기존 테스트 호환 생성자.
     */
    public SessionExpirationScheduler(
            AutomationSessionRepository sessionRepository,
            BrowserSessionManager browserSessionManager,
            BrowserFrameStore browserFrameStore
    ) {
        this(
                sessionRepository,
                browserSessionManager,
                browserFrameStore,
                null
        );
    }

    @Scheduled(
            fixedDelayString =
                    "${ddd.session-store.cleanup-interval-ms:5000}"
    )
    public void cleanupExpiredSessions() {

        Set<String> activeSessionIds =
                browserSessionManager
                        .activeSessionIds();

        for (String sessionId :
                activeSessionIds) {

            boolean sessionExists;

            try {
                sessionExists =
                        sessionRepository
                                .findById(
                                        sessionId
                                )
                                .isPresent();

            } catch (RuntimeException exception) {

                /*
                 * Redis 장애를 TTL 만료로
                 * 잘못 판단하지 않는다.
                 */
                log.warn(
                        "세션 만료 검사 중 저장소 조회 실패. "
                                + "exceptionType={}",
                        exception
                                .getClass()
                                .getSimpleName()
                );

                continue;
            }

            if (sessionExists) {
                continue;
            }

            cleanupExpiredSession(
                    sessionId
            );
        }
    }

    private void cleanupExpiredSession(
            String sessionId
    ) {
        /*
         * BrowserContext / Page 종료.
         */
        try {

            if (browserSessionManager.exists(
                    sessionId
            )) {

                browserSessionManager.closeSession(
                        sessionId
                );
            }

        } catch (RuntimeException exception) {

            log.warn(
                    "만료 BrowserSession 정리 실패. "
                            + "exceptionType={}",
                    exception
                            .getClass()
                            .getSimpleName()
            );
        }

        /*
         * D20:
         * Redis TTL로 Session이 사라졌다면
         * Viewer WebSocket도 즉시 종료한다.
         */
        try {

            if (frameWebSocketHandler != null) {

                frameWebSocketHandler
                        .closeConnection(
                                sessionId
                        );
            }

        } catch (RuntimeException exception) {

            log.warn(
                    "만료 Browser Viewer 연결 정리 실패. "
                            + "exceptionType={}",
                    exception
                            .getClass()
                            .getSimpleName()
            );
        }

        /*
         * Viewer 최신 Frame 제거.
         */
        try {

            if (browserFrameStore.containsSession(
                    sessionId
            )) {

                browserFrameStore.removeSession(
                        sessionId
                );
            }

        } catch (RuntimeException exception) {

            log.warn(
                    "만료 Browser Frame 정리 실패. "
                            + "exceptionType={}",
                    exception
                            .getClass()
                            .getSimpleName()
            );
        }
    }
}