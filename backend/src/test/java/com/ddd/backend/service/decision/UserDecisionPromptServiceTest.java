package com.ddd.backend.service.decision;

import com.ddd.backend.automation.dom.SanitizedDomSnapshot;
import com.ddd.backend.automation.dom.ElementLocatorResolver;
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
import static org.mockito.Mockito.when;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;

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

    @Test
    void 약관_체크박스는_약관동의로_추론하고_필수여부를_표시한다() {
        BrowserFrameStore frameStore = new BrowserFrameStore();
        frameStore.publish("session-terms", new CapturedBrowserFrame(
                new byte[]{1}, 1280, 720, "image/png"));
        UserDecisionPromptService service = new UserDecisionPromptService(
                frameStore, new UserDecisionSessionState(),
                mock(AutomationStatusEventPublisher.class));
        SanitizedDomSnapshot snapshot = new SanitizedDomSnapshot(
                "1.0", "snap-terms",
                new SanitizedDomSnapshot.PageSnapshot("http://example.test", "약관"),
                List.of(
                        element("required", "[필수] 서비스 이용약관", true),
                        element("optional", "[선택] 마케팅 동의", true)));

        AutomationDecisionPrompt prompt = service.publish("session-terms", snapshot);

        assertThat(prompt.decisionType()).isEqualTo(com.ddd.backend.domain.session.DecisionType.TERMS_AGREEMENT);
        assertThat(prompt.options()).extracting(option -> option.required())
                .containsExactly(true, false);
    }

    @Test
    void 현재_DOM의_checked_상태를_옵션에_반영한다() {
        BrowserFrameStore frameStore = new BrowserFrameStore();
        frameStore.publish("session-checked", new CapturedBrowserFrame(
                new byte[]{1}, 1280, 720, "image/png"));
        ElementLocatorResolver resolver = mock(ElementLocatorResolver.class);
        when(resolver.withLocator(eq("session-checked"), eq("required"), any()))
                .thenReturn(true);
        UserDecisionPromptService service = new UserDecisionPromptService(
                frameStore, new UserDecisionSessionState(),
                mock(AutomationStatusEventPublisher.class), resolver);
        SanitizedDomSnapshot snapshot = new SanitizedDomSnapshot(
                "1.0", "snap-checked",
                new SanitizedDomSnapshot.PageSnapshot("http://example.test", "약관"),
                List.of(element("required", "[필수] 서비스 약관", true)));

        AutomationDecisionPrompt prompt = service.publish("session-checked", snapshot);

        assertThat(prompt.sourceSnapshotId()).isEqualTo("snap-checked");
        assertThat(prompt.options().getFirst().checked()).isTrue();
    }

    private SanitizedDomSnapshot.ElementSnapshot element(
            String id, String label, boolean enabled) {
        return new SanitizedDomSnapshot.ElementSnapshot(
                id, "input", "checkbox", label, null, null, "checkbox",
                true, enabled,
                new SanitizedDomSnapshot.BoundingBoxSnapshot(1, 2, 3, 4),
                SanitizedDomSnapshot.SecurityPolicy.USER_DECISION);
    }
}
