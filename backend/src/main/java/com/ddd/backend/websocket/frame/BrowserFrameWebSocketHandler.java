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
         * Frontend는 반드시
         * ddd.browser-frame.v1을 요청해야 한다.
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
         * 동일 AutomationSession에는
         * Viewer WebSocket 하나만 허용한다.
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
         * 연결 직후 최신 Frame 즉시 전송.
         */
        sendLatest(
                automationSessionId
        );
    }

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

        if (session == null
                || !session.isOpen()) {

            return;
        }

        BrowserFramePayload payload =
                browserFrameStore
                        .latest(
                                automationSessionId
                        )
                        .orElse(
                                null
                        );

        if (payload == null) {

            connections.remove(
                    automationSessionId,
                    session
            );

            closeQuietly(
                    session,
                    CloseStatus.POLICY_VIOLATION
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
                    "Browser Frame WebSocket 전송에 실패했습니다."
            );
        }
    }

    /*
     * D20 Session Lifecycle.
     *
     * AutomationSession 취소 / 만료 시
     * 서버가 Viewer WebSocket을 직접 종료한다.
     *
     * 단순히 connections Map에서만 제거하면
     * Frontend Socket 자체가 살아 있을 수 있으므로
     * 실제 WebSocketSession.close()까지 수행한다.
     */
    public void closeConnection(
            String automationSessionId
    ) {
        validateAutomationSessionId(
                automationSessionId
        );

        WebSocketSession session =
                connections.remove(
                        automationSessionId
                );

        if (session == null) {
            return;
        }

        closeQuietly(
                session,
                CloseStatus.NORMAL
        );
    }

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

        /*
         * metadata와 binary 사이에
         * 다른 Frame이 끼어들지 못하게 한다.
         */
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
        return (int) connections
                .values()
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
                session
                        .getAttributes()
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
                    "AutomationSession ID는 비어 있을 수 없습니다."
            );
        }
    }

    private String metadataToJson(
            BrowserFrameMetadata metadata
    ) {
        return "{"
                + "\"type\":"
                + quote(
                metadata.type()
        )
                + ","
                + "\"sessionId\":"
                + quote(
                metadata.sessionId()
        )
                + ","
                + "\"frameId\":"
                + quote(
                metadata.frameId()
        )
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
                + quote(
                metadata.mimeType()
        )
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
             * 원래 Session cleanup 작업을
             * 방해하지 않도록 한다.
             */
        }
    }
}