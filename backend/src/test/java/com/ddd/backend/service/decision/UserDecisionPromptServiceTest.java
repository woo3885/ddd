package com.ddd.backend.service.decision;

import com.ddd.backend.automation.dom.SanitizedDomSnapshot;
import com.ddd.backend.frame.BrowserFrameStore;
import com.ddd.backend.security.capture.CapturedBrowserFrame;
import com.ddd.backend.websocket.dto.AutomationDecisionPrompt;
import com.ddd.backend.websocket.publisher.AutomationStatusEventPublisher;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

class UserDecisionPromptServiceTest {

    @Test
    void Backend가_Decision_ID를_발급하고_Frame에_결합해_발행한다() {
        BrowserFrameStore frameStore = new BrowserFrameStore();
        var frame = frameStore.publish(
                "session-001",
                new CapturedBrowserFrame(
                        new byte[]{1, 2, 3}, 1280, 720, "image/png"));
        UserDecisionSessionState state = new UserDecisionSessionState();
        AutomationStatusEventPublisher publisher =
                mock(AutomationStatusEventPublisher.class);
        UserDecisionPromptService service = new UserDecisionPromptService(
                frameStore, state, publisher);

        SanitizedDomSnapshot snapshot = new SanitizedDomSnapshot(
                "1.0", "snap-12345678",
                new SanitizedDomSnapshot.PageSnapshot("http://example.test", "상품"),
                List.of(new SanitizedDomSnapshot.ElementSnapshot(
                        "el-12345678-001", "button", "button", "정기예금",
                        null, null, null, true, true,
                        new SanitizedDomSnapshot.BoundingBoxSnapshot(1, 2, 3, 4),
                        SanitizedDomSnapshot.SecurityPolicy.USER_DECISION)));

        AutomationDecisionPrompt prompt = service.publish(
                "session-001", snapshot);

        assertThat(prompt.requestId()).startsWith("req-");
        assertThat(prompt.decisionId()).startsWith("dec-");
        assertThat(prompt.frameId()).isEqualTo(frame.metadata().frameId());
        assertThat(prompt.frameSequence()).isEqualTo(frame.metadata().sequence());
        assertThat(prompt.options().getFirst().label()).isEqualTo("정기예금");

        ArgumentCaptor<AutomationDecisionPrompt> captor =
                ArgumentCaptor.forClass(AutomationDecisionPrompt.class);
        verify(publisher).publishDecisionRequired(
                org.mockito.ArgumentMatchers.eq("session-001"),
                captor.capture(),
                org.mockito.ArgumentMatchers.anyString());
        assertThat(captor.getValue()).isEqualTo(prompt);
    }
}
