package com.ddd.backend.infrastructure.session;

import com.ddd.backend.automation.session.BrowserSessionManager;
import com.ddd.backend.domain.session.AutomationSessionRepository;
import com.ddd.backend.frame.BrowserFrameStore;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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

    private final AutomationSessionRepository sessionRepository;

    private final BrowserSessionManager browserSessionManager;

    private final BrowserFrameStore browserFrameStore;

    public SessionExpirationScheduler(
            AutomationSessionRepository sessionRepository,
            BrowserSessionManager browserSessionManager,
            BrowserFrameStore browserFrameStore
    ) {
        this.sessionRepository =
                sessionRepository;

        this.browserSessionManager =
                browserSessionManager;

        this.browserFrameStore =
                browserFrameStore;
    }

    /*
     * D8
     *
     * Redis TTL에 의해 Key가 삭제된 세션이
     * BrowserSessionManager에는 남아 있는지
     * 주기적으로 확인한다.
     *
     * 기본 5초.
     */
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
                /*
                 * Redis Key가 TTL에 의해 없어졌으면
                 * Optional.empty().
                 */
                sessionExists =
                        sessionRepository
                                .findById(
                                        sessionId
                                )
                                .isPresent();

            } catch (RuntimeException exception) {

                /*
                 * Redis 자체가 장애난 경우에는
                 * "세션 만료"라고 판단하면 안 된다.
                 *
                 * Redis 장애 때문에 정상 BrowserContext를
                 * 전부 닫는 것을 방지한다.
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

            /*
             * Scheduler는 한 세션 cleanup 실패 때문에
             * 전체 주기가 중단되면 안 된다.
             */
            log.warn(
                    "만료 BrowserSession 정리 실패. "
                            + "exceptionType={}",
                    exception
                            .getClass()
                            .getSimpleName()
            );
        }

        /*
         * Viewer용 최신 Frame도 제거.
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