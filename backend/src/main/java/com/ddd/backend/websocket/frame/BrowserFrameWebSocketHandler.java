package com.ddd.backend.websocket.frame;

import com.ddd.backend.frame.BrowserFrameMetadata;
import com.ddd.backend.frame.BrowserFramePayload;
import com.ddd.backend.frame.BrowserFrameStore;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.BinaryMessage;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.SubProtocolCapable;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.AbstractWebSocketHandler;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;

@Component
public final class BrowserFrameWebSocketHandler
        extends AbstractWebSocketHandler
        implements SubProtocolCapable {

    public static final String SUB_PROTOCOL =
            "ddd.browser-frame.v1";

    /*
     * 하나의 AutomationSession에
     * 하나의 Viewer WebSocket만 허용한다.
     */
    private final Map<String, WebSocketSession> connections =
            new ConcurrentHashMap<>();

    private final BrowserFrameStore browserFrameStore;

    public BrowserFrameWebSocketHandler(
            BrowserFrameStore browserFrameStore
    ) {
        this.browserFrameStore =
                Objects.requireNonNull(
                        browserFrameStore,
                        "BrowserFrameStore는 필수입니다."
                );
    }

    /*
     * Spring WebSocket handshake에서
     * 이 subprotocol을 협상한다.
     */
    @Override
    public List<String> getSubProtocols() {
        return List.of(
                SUB_PROTOCOL
        );
    }

    @Override
    public void afterConnectionEstablished(
            WebSocketSession session
    ) throws Exception {

        /*
         * Frontend가 반드시:
         *
         * ddd.browser-frame.v1
         *
         * 을 요청해야 한다.
         */
        if (!SUB_PROTOCOL.equals(
                session.getAcceptedProtocol()
        )) {

            session.close(
                    CloseStatus.POLICY_VIOLATION
            );

            return;
        }

        String automationSessionId =
                readAutomationSessionId(
                        session
                );

        if (automationSessionId == null) {

            session.close(
                    CloseStatus.POLICY_VIOLATION
            );

            return;
        }

        /*
         * 같은 AutomationSession에
         * 동시에 여러 Viewer가 붙지 못하도록 한다.
         */
        synchronized (connections) {

            WebSocketSession existing =
                    connections.get(
                            automationSessionId
                    );

            if (existing != null
                    && existing.isOpen()) {

                session.close(
                        CloseStatus.POLICY_VIOLATION
                );

                return;
            }

            connections.put(
                    automationSessionId,
                    session
            );
        }

        /*
         * 연결 직후 Store에 이미 준비돼 있는
         * 최초 sequence=1 Frame을 즉시 전송한다.
         */
        sendLatest(
                automationSessionId
        );
    }

    /*
     * 향후 Browser Action이나 navigation 완료 후
     * 최신 Frame을 Viewer로 다시 보낼 때도
     * 이 메서드를 그대로 사용한다.
     */
    public void sendLatest(
            String automationSessionId
    ) {
        validateAutomationSessionId(
                automationSessionId
        );

        WebSocketSession session =
                connections.get(
                        automationSessionId
                );

        /*
         * 아직 Viewer가 연결되지 않았다면
         * Frame은 Store에만 유지한다.
         */
        if (session == null
                || !session.isOpen()) {

            return;
        }

        BrowserFramePayload payload =
                browserFrameStore.latest(
                                automationSessionId
                        )
                        .orElse(null);

        if (payload == null) {

            closeQuietly(
                    session,
                    CloseStatus.POLICY_VIOLATION
            );

            connections.remove(
                    automationSessionId,
                    session
            );

            return;
        }

        try {
            sendPayload(
                    session,
                    payload
            );

        } catch (IOException exception) {

            connections.remove(
                    automationSessionId,
                    session
            );

            closeQuietly(
                    session,
                    CloseStatus.SERVER_ERROR
            );

            throw new IllegalStateException(
                    "Browser Frame WebSocket 전송에 "
                            + "실패했습니다."
            );
        }
    }

    /*
     * 하나의 Frame은 반드시:
     *
     * 1. metadata TextMessage
     * 2. PNG BinaryMessage
     *
     * 순서로 연속 전송한다.
     *
     * 다른 Frame 전송이 중간에 끼어들지 못하게
     * 같은 WebSocketSession 기준으로 동기화한다.
     */
    private void sendPayload(
            WebSocketSession session,
            BrowserFramePayload payload
    ) throws IOException {

        String metadataJson =
                metadataToJson(
                        payload.metadata()
                );

        byte[] frameBytes =
                payload.bytes();

        synchronized (session) {

            if (!session.isOpen()) {
                return;
            }

            session.sendMessage(
                    new TextMessage(
                            metadataJson
                    )
            );

            session.sendMessage(
                    new BinaryMessage(
                            frameBytes
                    )
            );
        }
    }

    @Override
    public void afterConnectionClosed(
            WebSocketSession session,
            CloseStatus status
    ) {
        String automationSessionId =
                readAutomationSessionId(
                        session
                );

        if (automationSessionId == null) {
            return;
        }

        /*
         * disconnect 시 WebSocket 연결 정보만 제거한다.
         *
         * BrowserContext / Frame Store는
         * AutomationSession cancel/failure lifecycle에서
         * 정리한다.
         */
        connections.remove(
                automationSessionId,
                session
        );
    }

    @Override
    public void handleTransportError(
            WebSocketSession session,
            Throwable exception
    ) {
        String automationSessionId =
                readAutomationSessionId(
                        session
                );

        if (automationSessionId != null) {

            connections.remove(
                    automationSessionId,
                    session
            );
        }

        closeQuietly(
                session,
                CloseStatus.SERVER_ERROR
        );
    }

    public boolean hasConnection(
            String automationSessionId
    ) {
        validateAutomationSessionId(
                automationSessionId
        );

        WebSocketSession session =
                connections.get(
                        automationSessionId
                );

        return session != null
                && session.isOpen();
    }

    public int activeConnectionCount() {
        return (int) connections.values()
                .stream()
                .filter(
                        WebSocketSession::isOpen
                )
                .count();
    }

    private String readAutomationSessionId(
            WebSocketSession session
    ) {
        Object value =
                session.getAttributes()
                        .get(
                                FrameWebSocketHandshakeInterceptor
                                        .SESSION_ID_ATTRIBUTE
                        );

        if (!(value instanceof String sessionId)
                || sessionId.isBlank()) {

            return null;
        }

        return sessionId;
    }

    private void validateAutomationSessionId(
            String automationSessionId
    ) {
        if (automationSessionId == null
                || automationSessionId.isBlank()) {

            throw new IllegalArgumentException(
                    "AutomationSession ID는 "
                            + "비어 있을 수 없습니다."
            );
        }
    }

    /*
     * Jackson dependency/package 차이에 의존하지 않도록
     * D17 Frame Metadata 계약만 직접 JSON으로 직렬화한다.
     */
    private String metadataToJson(
            BrowserFrameMetadata metadata
    ) {
        return "{"
                + "\"type\":"
                + quote(metadata.type())
                + ","
                + "\"sessionId\":"
                + quote(metadata.sessionId())
                + ","
                + "\"frameId\":"
                + quote(metadata.frameId())
                + ","
                + "\"sequence\":"
                + metadata.sequence()
                + ","
                + "\"timestamp\":"
                + metadata.timestamp()
                + ","
                + "\"width\":"
                + metadata.width()
                + ","
                + "\"height\":"
                + metadata.height()
                + ","
                + "\"mimeType\":"
                + quote(metadata.mimeType())
                + ","
                + "\"byteLength\":"
                + metadata.byteLength()
                + "}";
    }

    private String quote(
            String value
    ) {
        if (value == null) {
            return "null";
        }

        StringBuilder builder =
                new StringBuilder();

        builder.append(
                '"'
        );

        for (int index = 0;
             index < value.length();
             index++) {

            char character =
                    value.charAt(
                            index
                    );

            switch (character) {
                case '"' ->
                        builder.append(
                                "\\\""
                        );

                case '\\' ->
                        builder.append(
                                "\\\\"
                        );

                case '\b' ->
                        builder.append(
                                "\\b"
                        );

                case '\f' ->
                        builder.append(
                                "\\f"
                        );

                case '\n' ->
                        builder.append(
                                "\\n"
                        );

                case '\r' ->
                        builder.append(
                                "\\r"
                        );

                case '\t' ->
                        builder.append(
                                "\\t"
                        );

                default -> {
                    if (character < 0x20) {

                        builder.append(
                                String.format(
                                        "\\u%04x",
                                        (int) character
                                )
                        );

                    } else {

                        builder.append(
                                character
                        );
                    }
                }
            }
        }

        builder.append(
                '"'
        );

        return builder.toString();
    }

    private void closeQuietly(
            WebSocketSession session,
            CloseStatus closeStatus
    ) {
        try {
            if (session.isOpen()) {

                session.close(
                        closeStatus
                );
            }

        } catch (IOException ignored) {
            /*
             * WebSocket cleanup 실패가
             * 기존 오류를 덮어쓰지 않는다.
             */
        }
    }
}