package com.ddd.backend.service;

import com.ddd.backend.automation.session.BrowserSessionManager;
import com.ddd.backend.common.exception.SessionNotFoundException;
import com.ddd.backend.domain.session.AutomationSession;
import com.ddd.backend.domain.session.DecisionType;
import com.ddd.backend.domain.session.WorkflowStatus;
import com.ddd.backend.infrastructure.session.InMemoryAutomationSessionRepository;
import com.ddd.backend.service.validation.UserDecisionValidator;
import com.ddd.backend.websocket.publisher.AutomationStatusEventPublisher;
import com.ddd.backend.api.dto.session.SubmitDecisionRequest;
import com.ddd.backend.frame.BrowserFrameStore;
import com.ddd.backend.security.capture.CapturedBrowserFrame;
import com.ddd.backend.service.decision.UserDecisionSessionState;
import com.ddd.backend.websocket.dto.AutomationDecisionOption;
import com.ddd.backend.websocket.dto.AutomationDecisionPrompt;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class UserDecisionServiceTest {

    private InMemoryAutomationSessionRepository sessionRepository;
    private BrowserSessionManager browserSessionManager;
    private AutomationStatusEventPublisher statusEventPublisher;
    private UserDecisionService service;

    @BeforeEach
    void setUp() {
        sessionRepository =
                new InMemoryAutomationSessionRepository();

        browserSessionManager =
                mock(BrowserSessionManager.class);

        statusEventPublisher =
                mock(AutomationStatusEventPublisher.class);

        service =
                new UserDecisionService(
                        sessionRepository,
                        new UserDecisionValidator(),
                        browserSessionManager,
                        statusEventPublisher
                );
    }

    @Test
    void 사용자_선택을_제출하면_AI_실행_상태로_변경한다() {
        AutomationSession session =
                createSession(
                        WorkflowStatus.USER_DECISION_REQUIRED
                );

        AutomationSession result =
                service.submitDecision(
                        session.getSessionId(),
                        DecisionType.PRODUCT_SELECTION,
                        List.of("product-001")
                );

        assertThat(result.getStatus())
                .isEqualTo(
                        WorkflowStatus.AI_EXECUTING
                );

        verify(statusEventPublisher)
                .publish(
                        session.getSessionId(),
                        WorkflowStatus.AI_EXECUTING,
                        "사용자 선택이 제출되었습니다."
                );
    }

    @Test
    void 발급된_Decision과_현재_Frame이_일치할_때만_재개한다() {
        AutomationSession session = createSession(
                WorkflowStatus.USER_DECISION_REQUIRED);
        BrowserFrameStore frameStore = new BrowserFrameStore();
        var frame = frameStore.publish(
                session.getSessionId(),
                new CapturedBrowserFrame(
                        new byte[]{1, 2, 3}, 1280, 720, "image/png"));
        UserDecisionSessionState decisionState = new UserDecisionSessionState();
        decisionState.register(
                session.getSessionId(),
                new AutomationDecisionPrompt(
                        "req-001", "dec-001", DecisionType.PRODUCT_SELECTION,
                        List.of(new AutomationDecisionOption("product-001", "정기예금")),
                        frame.metadata().frameId(), frame.metadata().sequence()));

        UserDecisionService securedService = new UserDecisionService(
                sessionRepository,
                new UserDecisionValidator(),
                browserSessionManager,
                statusEventPublisher,
                decisionState,
                frameStore);
        SubmitDecisionRequest request = new SubmitDecisionRequest(
                "req-001", "dec-001", DecisionType.PRODUCT_SELECTION,
                List.of("product-001"),
                frame.metadata().frameId(), frame.metadata().sequence());

        AutomationSession result = securedService.submitDecision(
                session.getSessionId(), request);

        assertThat(result.getStatus()).isEqualTo(WorkflowStatus.AI_EXECUTING);
        assertThatThrownBy(() -> securedService.submitDecision(
                session.getSessionId(), request))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("이미 처리된 사용자 결정 요청입니다.");
    }

    @Test
    void 추가_정보를_제출하면_AI_실행_상태로_변경한다() {
        AutomationSession session =
                createSession(
                        WorkflowStatus.ADDITIONAL_INFORMATION_REQUIRED
                );

        AutomationSession result =
                service.submitDecision(
                        session.getSessionId(),
                        DecisionType.ADDITIONAL_INFORMATION,
                        List.of("information-001")
                );

        assertThat(result.getStatus())
                .isEqualTo(
                        WorkflowStatus.AI_EXECUTING
                );

        verify(statusEventPublisher)
                .publish(
                        session.getSessionId(),
                        WorkflowStatus.AI_EXECUTING,
                        "추가 정보가 제출되었습니다."
                );
    }

    @Test
    void 사용자_결정_대기_상태가_아니면_선택할_수_없다() {
        AutomationSession session =
                createSession(
                        WorkflowStatus.AI_EXECUTING
                );

        assertThatThrownBy(
                () -> service.submitDecision(
                        session.getSessionId(),
                        DecisionType.PRODUCT_SELECTION,
                        List.of("product-001")
                )
        )
                .isInstanceOf(
                        IllegalStateException.class
                )
                .hasMessage(
                        "사용자 결정 대기 상태에서만 선택을 제출할 수 있습니다."
                );

        verifyNoInteractions(
                statusEventPublisher
        );
    }

    @Test
    void 추가정보가_아닌_결정을_추가정보_대기상태에_제출할_수_없다() {
        AutomationSession session =
                createSession(
                        WorkflowStatus.ADDITIONAL_INFORMATION_REQUIRED
                );

        assertThatThrownBy(
                () -> service.submitDecision(
                        session.getSessionId(),
                        DecisionType.PRODUCT_SELECTION,
                        List.of("product-001")
                )
        )
                .isInstanceOf(
                        IllegalStateException.class
                );

        verifyNoInteractions(
                statusEventPublisher
        );
    }

    @Test
    void 최종_실행을_승인하면_AI_실행_상태로_변경한다() {
        AutomationSession session =
                createSession(
                        WorkflowStatus.FINAL_CONFIRMATION_REQUIRED
                );

        AutomationSession result =
                service.confirmFinalAction(
                        session.getSessionId(),
                        "confirm-001",
                        true
                );

        assertThat(result.getStatus())
                .isEqualTo(
                        WorkflowStatus.AI_EXECUTING
                );

        verify(statusEventPublisher)
                .publish(
                        session.getSessionId(),
                        WorkflowStatus.AI_EXECUTING,
                        "사용자가 최종 실행을 승인했습니다."
                );
    }

    @Test
    void 승인_API에_false를_전달하면_실패한다() {
        AutomationSession session =
                createSession(
                        WorkflowStatus.FINAL_CONFIRMATION_REQUIRED
                );

        assertThatThrownBy(
                () -> service.confirmFinalAction(
                        session.getSessionId(),
                        "confirm-001",
                        false
                )
        )
                .isInstanceOf(
                        IllegalArgumentException.class
                )
                .hasMessage(
                        "최종 실행 승인 요청에서는 approved가 true여야 합니다."
                );

        verifyNoInteractions(
                statusEventPublisher
        );
    }

    @Test
    void 최종_실행을_거절하면_세션과_브라우저를_종료한다() {
        AutomationSession session =
                createSession(
                        WorkflowStatus.FINAL_CONFIRMATION_REQUIRED
                );

        when(
                browserSessionManager.exists(
                        session.getSessionId()
                )
        ).thenReturn(true);

        AutomationSession result =
                service.rejectFinalAction(
                        session.getSessionId(),
                        "confirm-001",
                        false
                );

        assertThat(result.getStatus())
                .isEqualTo(
                        WorkflowStatus.CANCELLED
                );

        verify(browserSessionManager)
                .closeSession(
                        session.getSessionId()
                );

        verify(statusEventPublisher)
                .publish(
                        session.getSessionId(),
                        WorkflowStatus.CANCELLED,
                        "최종 실행이 거절되어 세션이 취소되었습니다."
                );
    }

    @Test
    void 브라우저_세션이_없어도_최종_실행을_거절한다() {
        AutomationSession session =
                createSession(
                        WorkflowStatus.FINAL_CONFIRMATION_REQUIRED
                );

        when(
                browserSessionManager.exists(
                        session.getSessionId()
                )
        ).thenReturn(false);

        AutomationSession result =
                service.rejectFinalAction(
                        session.getSessionId(),
                        "confirm-001",
                        false
                );

        assertThat(result.getStatus())
                .isEqualTo(
                        WorkflowStatus.CANCELLED
                );

        verify(
                browserSessionManager,
                never()
        ).closeSession(
                session.getSessionId()
        );
    }

    @Test
    void 거절_API에_true를_전달하면_실패한다() {
        AutomationSession session =
                createSession(
                        WorkflowStatus.FINAL_CONFIRMATION_REQUIRED
                );

        assertThatThrownBy(
                () -> service.rejectFinalAction(
                        session.getSessionId(),
                        "confirm-001",
                        true
                )
        )
                .isInstanceOf(
                        IllegalArgumentException.class
                )
                .hasMessage(
                        "최종 실행 거절 요청에서는 approved가 false여야 합니다."
                );

        verifyNoInteractions(
                statusEventPublisher
        );
    }

    @Test
    void 존재하지_않는_세션에_선택을_제출하면_실패한다() {
        assertThatThrownBy(
                () -> service.submitDecision(
                        "not-found-session",
                        DecisionType.PRODUCT_SELECTION,
                        List.of("product-001")
                )
        )
                .isInstanceOf(
                        SessionNotFoundException.class
                );

        verifyNoInteractions(
                statusEventPublisher
        );
    }

    private AutomationSession createSession(
            WorkflowStatus status
    ) {
        AutomationSession session =
                AutomationSession.create(
                        "예금 가입을 도와 줘"
                );

        if (status
                != WorkflowStatus.SESSION_CREATED) {
            session.transitionTo(
                    status
            );
        }

        return sessionRepository.save(
                session
        );
    }
}
