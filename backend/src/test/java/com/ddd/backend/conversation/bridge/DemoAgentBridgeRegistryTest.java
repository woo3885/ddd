package com.ddd.backend.conversation.bridge;

import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class DemoAgentBridgeRegistryTest {

    @Test
    void sessionTokenOriginPage를_모두_검증한다() {
        DemoAgentBridgeRegistry registry = new DemoAgentBridgeRegistry();
        DemoAgentBridgeBinding binding = new DemoAgentBridgeBinding(
                "session-1", "secret", "page-1", "http://127.0.0.1:5190",
                Instant.now().plusSeconds(60));
        registry.put(binding);

        assertThat(registry.require(
                "session-1", "secret", "http://127.0.0.1:5190", "page-1"))
                .isEqualTo(binding);
        assertThatThrownBy(() -> registry.require(
                "session-1", "secret", "http://evil.example", "page-1"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("identity");
        assertThatThrownBy(() -> registry.require(
                "session-1", "secret", "http://127.0.0.1:5190", "page-2"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("identity");
    }

    @Test
    void 만료된_binding은_재사용할_수_없다() {
        DemoAgentBridgeRegistry registry = new DemoAgentBridgeRegistry();
        registry.put(new DemoAgentBridgeBinding(
                "session-1", "secret", "page-1", "http://127.0.0.1:5190",
                Instant.now().minusSeconds(1)));

        assertThat(registry.find("session-1")).isEmpty();
    }
}
