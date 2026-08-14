package com.ddd.backend.websocket.config;

import org.junit.jupiter.api.Test;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.StompWebSocketEndpointRegistration;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class WebSocketConfigTest {

    private final WebSocketConfig config =
            new WebSocketConfig();

    @Test
    void STOMP_연결_주소를_등록한다() {
        StompEndpointRegistry registry =
                mock(StompEndpointRegistry.class);

        StompWebSocketEndpointRegistration registration =
                mock(
                        StompWebSocketEndpointRegistration.class
                );

        when(
                registry.addEndpoint(
                        WebSocketConfig.STOMP_ENDPOINT
                )
        ).thenReturn(registration);

        config.registerStompEndpoints(registry);

        verify(registry).addEndpoint(
                WebSocketConfig.STOMP_ENDPOINT
        );
    }

    @Test
    void 애플리케이션과_브로커_주소를_설정한다() {
        MessageBrokerRegistry registry =
                mock(MessageBrokerRegistry.class);

        config.configureMessageBroker(registry);

        verify(registry)
                .setApplicationDestinationPrefixes(
                        WebSocketConfig.APPLICATION_PREFIX
                );

        verify(registry)
                .enableSimpleBroker(
                        WebSocketConfig.BROKER_PREFIX
                );
    }
}