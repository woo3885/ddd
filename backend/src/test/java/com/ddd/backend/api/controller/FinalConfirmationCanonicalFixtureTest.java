package com.ddd.backend.api.controller;

import com.ddd.backend.api.dto.session.SubmitConfirmationRequest;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;
import org.junit.jupiter.api.Test;

import java.io.InputStream;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class FinalConfirmationCanonicalFixtureTest {
    private final ObjectMapper objectMapper = JsonMapper.builder().build();

    @Test
    void approve_reject_fixture는_frame_identity와_requestId를_포함한다()
            throws Exception {
        SubmitConfirmationRequest approve = objectMapper.readValue(
                resource("d27-final-confirmation-approve-request.json"),
                SubmitConfirmationRequest.class);
        SubmitConfirmationRequest reject = objectMapper.readValue(
                resource("d27-final-confirmation-reject-request.json"),
                SubmitConfirmationRequest.class);

        assertThat(approve.requestId()).isNotBlank();
        assertThat(approve.expectedFrameId()).isEqualTo("frm-001");
        assertThat(approve.expectedSequence()).isEqualTo(7L);
        assertThat(approve.approved()).isTrue();
        assertThat(reject.approved()).isFalse();
    }

    @Test
    void event와_snapshot_fixture_set은_canonical_type과_source_frame을_유지한다()
            throws Exception {
        JsonNode required = read("d27-final-confirmation-required-event.json");
        JsonNode snapshot = read("d27-final-confirmation-snapshot.json");
        assertThat(required.path("eventType").asText())
                .isEqualTo("CONFIRMATION_REQUIRED");
        assertThat(required.at("/confirmation/sourceFrameId").asText())
                .isEqualTo("frm-001");
        assertThat(required.at("/confirmation/sourceFrameSequence").asLong())
                .isEqualTo(7L);
        assertThat(snapshot.at("/confirmation/confirmation/sourceFrameId").asText())
                .isEqualTo("frm-001");

        for (String fixture : List.of(
                "d27-final-confirmation-resolved-event.json",
                "d27-final-confirmation-rejected-event.json",
                "d27-final-confirmation-clear-event.json")) {
            assertThat(read(fixture).path("eventType").asText())
                    .startsWith("CONFIRMATION_");
        }
    }

    private JsonNode read(String name) throws Exception {
        return objectMapper.readTree(resource(name));
    }

    private InputStream resource(String name) {
        InputStream stream = getClass().getResourceAsStream("/contracts/" + name);
        if (stream == null) {
            throw new IllegalStateException("fixture를 찾을 수 없습니다: " + name);
        }
        return stream;
    }
}
