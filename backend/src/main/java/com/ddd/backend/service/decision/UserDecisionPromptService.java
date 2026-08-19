package com.ddd.backend.service.decision;

import com.ddd.backend.automation.dom.SanitizedDomSnapshot;
import com.ddd.backend.domain.session.DecisionType;
import com.ddd.backend.frame.BrowserFramePayload;
import com.ddd.backend.frame.BrowserFrameStore;
import com.ddd.backend.websocket.dto.AutomationDecisionOption;
import com.ddd.backend.websocket.dto.AutomationDecisionPrompt;
import com.ddd.backend.websocket.publisher.AutomationStatusEventPublisher;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Objects;
import java.util.UUID;

@Service
public final class UserDecisionPromptService {

    private final BrowserFrameStore frameStore;
    private final UserDecisionSessionState decisionState;
    private final AutomationStatusEventPublisher eventPublisher;

    public UserDecisionPromptService(
            BrowserFrameStore frameStore,
            UserDecisionSessionState decisionState,
            AutomationStatusEventPublisher eventPublisher
    ) {
        this.frameStore = Objects.requireNonNull(frameStore);
        this.decisionState = Objects.requireNonNull(decisionState);
        this.eventPublisher = Objects.requireNonNull(eventPublisher);
    }

    public AutomationDecisionPrompt publish(
            String sessionId,
            SanitizedDomSnapshot snapshot
    ) {
        return publish(
                sessionId,
                snapshot,
                DecisionType.PRODUCT_SELECTION
        );
    }

    public AutomationDecisionPrompt publish(
            String sessionId,
            SanitizedDomSnapshot snapshot,
            DecisionType decisionType
    ) {
        Objects.requireNonNull(decisionType, "DecisionType은 필수입니다.");
        BrowserFramePayload frame = frameStore.latest(sessionId)
                .orElseThrow(() -> new IllegalStateException(
                        "사용자 결정과 연결할 Viewer Frame이 없습니다."
                ));

        List<AutomationDecisionOption> options = snapshot.elements().stream()
                .filter(element -> element.securityPolicy()
                        == SanitizedDomSnapshot.SecurityPolicy.USER_DECISION)
                .map(element -> new AutomationDecisionOption(
                        element.elementId(), safeLabel(element)))
                .limit(20)
                .toList();

        if (options.isEmpty()) {
            throw new IllegalStateException("사용자가 선택할 수 있는 항목이 없습니다.");
        }

        AutomationDecisionPrompt prompt = new AutomationDecisionPrompt(
                "req-" + UUID.randomUUID(),
                "dec-" + UUID.randomUUID(),
                decisionType,
                options,
                frame.metadata().frameId(),
                frame.metadata().sequence()
        );

        decisionState.register(sessionId, prompt);
        eventPublisher.publishDecisionRequired(
                sessionId, prompt, "사용자가 항목을 선택해야 합니다."
        );
        return prompt;
    }

    private String safeLabel(SanitizedDomSnapshot.ElementSnapshot element) {
        String[] values = {
                element.ariaLabel(), element.text(), element.placeholder(),
                element.role(), element.tag()
        };
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                String trimmed = value.trim();
                return trimmed.substring(0, Math.min(trimmed.length(), 120));
            }
        }
        return "선택 항목";
    }
}
