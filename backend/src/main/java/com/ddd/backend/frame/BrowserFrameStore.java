package com.ddd.backend.frame;

import com.ddd.backend.security.capture.CapturedBrowserFrame;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class BrowserFrameStore {

    /*
     * 세션마다:
     *
     * - 현재 sequence
     * - 최신 Frame 1개
     *
     * 만 유지한다.
     *
     * 과거 Frame을 계속 쌓지 않으므로
     * 메모리가 무한 증가하지 않는다.
     */
    private final Map<String, SessionFrameState> states =
            new ConcurrentHashMap<>();

    public BrowserFramePayload publish(
            String sessionId,
            CapturedBrowserFrame frame
    ) {
        validateSessionId(
                sessionId
        );

        Objects.requireNonNull(
                frame,
                "CapturedBrowserFrame은 필수입니다."
        );

        SessionFrameState state =
                states.computeIfAbsent(
                        sessionId,
                        ignored ->
                                new SessionFrameState()
                );

        return state.publish(
                sessionId,
                frame
        );
    }

    public Optional<BrowserFramePayload> latest(
            String sessionId
    ) {
        validateSessionId(
                sessionId
        );

        SessionFrameState state =
                states.get(
                        sessionId
                );

        if (state == null) {
            return Optional.empty();
        }

        return state.latest();
    }

    /*
     * 세션 cancel / failure / cleanup 때 호출한다.
     */
    public void removeSession(
            String sessionId
    ) {
        validateSessionId(
                sessionId
        );

        states.remove(
                sessionId
        );
    }

    public boolean containsSession(
            String sessionId
    ) {
        validateSessionId(
                sessionId
        );

        return states.containsKey(
                sessionId
        );
    }

    public int activeSessionCount() {
        return states.size();
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

    private static String createFrameId() {
        return "frm-"
                + UUID.randomUUID();
    }

    /*
     * 하나의 Session 안에서는
     * sequence 생성 + latest 교체를
     * 하나의 synchronized 영역에서 수행한다.
     *
     * 따라서 같은 세션에서
     *
     * sequence 3
     * sequence 2
     *
     * 순으로 뒤집히는 일을 막는다.
     */
    private static final class SessionFrameState {

        private long sequence;
        private BrowserFramePayload latest;

        private synchronized BrowserFramePayload publish(
                String sessionId,
                CapturedBrowserFrame frame
        ) {
            long nextSequence =
                    ++sequence;

            BrowserFrameMetadata metadata =
                    new BrowserFrameMetadata(
                            BrowserFrameMetadata.FRAME_TYPE,
                            sessionId,
                            createFrameId(),
                            nextSequence,
                            System.currentTimeMillis(),
                            frame.width(),
                            frame.height(),
                            frame.mimeType(),
                            frame.byteLength()
                    );

            BrowserFramePayload payload =
                    new BrowserFramePayload(
                            metadata,
                            frame.bytes()
                    );

            latest =
                    payload;

            return payload;
        }

        private synchronized Optional<BrowserFramePayload> latest() {
            return Optional.ofNullable(
                    latest
            );
        }
    }
}