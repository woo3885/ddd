package com.ddd.backend.frame;

import com.ddd.backend.security.capture.CapturedBrowserFrame;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class BrowserFrameStore {

    /*
     * D22
     *
     * Session마다:
     *
     * - 현재 sequence
     * - 최신 Frame 1개
     *
     * 만 유지한다.
     *
     * 과거 Frame Queue를 만들지 않는다.
     */
    private final Map<String, SessionFrameState> states =
            new ConcurrentHashMap<>();

    /*
     * Frame을 publish한다.
     *
     * D22 Change Detection:
     *
     * 직전 Frame과 PNG byte[]가 완전히 같다면
     *
     * - 새 frameId 생성 X
     * - sequence 증가 X
     * - latest 교체 X
     *
     * 기존 최신 Payload를 그대로 반환한다.
     */
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

    private static final class SessionFrameState {

        private long sequence;

        private BrowserFramePayload latest;

        /*
         * Change Detection 비교용.
         *
         * Store 외부에는 노출하지 않는다.
         */
        private byte[] latestFrameBytes;

        private synchronized BrowserFramePayload publish(
                String sessionId,
                CapturedBrowserFrame frame
        ) {
            byte[] incomingBytes =
                    frame.bytes();

            /*
             * 동일 Frame이면
             * 기존 sequence / frameId를 그대로 유지한다.
             */
            if (latest != null
                    && latestFrameBytes != null
                    && Arrays.equals(
                    latestFrameBytes,
                    incomingBytes
            )) {

                return latest;
            }

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
                            incomingBytes
                    );

            latest =
                    payload;

            /*
             * 외부 Frame 배열 변경과 독립되도록
             * 별도 복사본 유지.
             */
            latestFrameBytes =
                    incomingBytes.clone();

            return payload;
        }

        private synchronized Optional<BrowserFramePayload>
        latest() {

            return Optional.ofNullable(
                    latest
            );
        }
    }
}