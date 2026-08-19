package com.ddd.backend.websocket.publisher;

import com.ddd.backend.domain.session.WorkflowStatus;
import com.ddd.backend.websocket.dto.AutomationTarget;
import com.ddd.backend.websocket.dto.AutomationUiEvent;
import com.ddd.backend.websocket.dto.AutomationUiEventSnapshot;
import com.ddd.backend.websocket.dto.AutomationUiEventType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

class AutomationUiEventPublisherTest {

    private SimpMessagingTemplate messagingTemplate;
    private AutomationStatusEventPublisher publisher;

    @BeforeEach
    void setUp() {
        messagingTemplate = mock(SimpMessagingTemplate.class);
        publisher = new AutomationStatusEventPublisher(messagingTemplate);
    }

    @Test
    void 상태와_가이드에_세션별_증가_sequence를_발급한다() {
        publisher.publish(
                "session-001",
                WorkflowStatus.PAGE_LOADING,
                "페이지를 불러오고 있습니다."
        );

        AutomationUiEventSnapshot snapshot = publisher
                .latestSnapshot("session-001")
                .orElseThrow();

        assertThat(snapshot.state().eventType())
                .isEqualTo(AutomationUiEventType.STATE);
        assertThat(snapshot.state().eventSequence()).isEqualTo(1L);
        assertThat(snapshot.guide().eventSequence()).isEqualTo(2L);
        assertThat(snapshot.latestEventSequence()).isEqualTo(2L);
    }

    @Test
    void Target은_Frame과_Snapshot에_결합되고_clear된다() {
        AutomationTarget target = new AutomationTarget(
                "el-12345678-001",
                "예금 상품 선택",
                10, 20, 100, 40,
                "frm-001", 7L, "snap-12345678"
        );

        AutomationUiEvent targetEvent = publisher.publishTarget(
                "session-001", target, "예금 상품 선택"
        );

        assertThat(targetEvent.target().frameSequence()).isEqualTo(7L);
        assertThat(publisher.latestSnapshot("session-001").orElseThrow().target())
                .isEqualTo(targetEvent);

        AutomationUiEvent clearEvent = publisher.publishTargetClear(
                "session-001", "Action을 시작합니다."
        );

        AutomationUiEventSnapshot snapshot = publisher
                .latestSnapshot("session-001")
                .orElseThrow();

        assertThat(clearEvent.eventSequence()).isEqualTo(2L);
        assertThat(snapshot.target()).isNull();
        assertThat(snapshot.latestEventSequence()).isEqualTo(2L);

        verify(messagingTemplate).convertAndSend(
                eq("/topic/sessions/session-001/events"),
                eq(targetEvent)
        );
    }

    @Test
    void 세션별_sequence는_서로_독립적이다() {
        AutomationUiEvent first = publisher.publishGuide(
                "session-001", "첫 번째", false
        );
        AutomationUiEvent other = publisher.publishGuide(
                "session-002", "다른 세션", false
        );

        assertThat(first.eventSequence()).isEqualTo(1L);
        assertThat(other.eventSequence()).isEqualTo(1L);
    }

    @Test
    void 사용자개입과_종료_상태는_Target을_제거한다() {
        for (WorkflowStatus status : new WorkflowStatus[]{
                WorkflowStatus.SECURE_INPUT_REQUIRED,
                WorkflowStatus.FINAL_CONFIRMATION_REQUIRED,
                WorkflowStatus.RISK_WARNING,
                WorkflowStatus.COMPLETED,
                WorkflowStatus.CANCELLED,
                WorkflowStatus.ERROR,
                WorkflowStatus.TERMINATED
        }) {
            String sessionId = "session-" + status.name().replace('_', '-');
            publisher.publishTarget(
                    sessionId,
                    new AutomationTarget(
                            "el-12345678-001", "대상", 1, 1, 10, 10,
                            "frm-001", 1L, "snap-12345678"
                    ),
                    "대상"
            );

            publisher.publish(sessionId, status, "상태 변경");

            assertThat(publisher.latestSnapshot(sessionId).orElseThrow().target())
                    .as(status.name())
                    .isNull();
        }
    }
}
