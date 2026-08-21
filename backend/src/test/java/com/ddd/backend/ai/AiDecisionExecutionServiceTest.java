package com.ddd.backend.ai;

import com.ddd.backend.ai.validation.AiDecisionResponseValidator;
import com.ddd.backend.ai.validation.AiDecisionValidationException;
import com.ddd.backend.automation.BrowserAction;
import com.ddd.backend.automation.BrowserActionExecutionResult;
import com.ddd.backend.automation.BrowserActionExecutionStatus;
import com.ddd.backend.automation.BrowserActionType;
import com.ddd.backend.automation.dom.SanitizedDomSnapshot;
import com.ddd.backend.automation.dom.SanitizedDomSnapshotService;
import com.ddd.backend.domain.session.AutomationSession;
import com.ddd.backend.domain.session.AutomationSessionRepository;
import com.ddd.backend.domain.session.WorkflowStatus;
import com.ddd.backend.service.BrowserActionExecutionService;
import com.ddd.backend.websocket.publisher.AutomationStatusEventPublisher;
import com.ddd.backend.websocket.publisher.AutomationTargetEventService;
import com.ddd.backend.service.decision.UserDecisionPromptService;
import com.ddd.backend.service.decision.UserDecisionSessionState;
import com.ddd.backend.websocket.dto.AutomationDecisionPrompt;
import com.ddd.backend.websocket.dto.AutomationDecisionOption;
import com.ddd.backend.api.dto.session.SubmitDecisionRequest;
import com.ddd.backend.domain.session.DecisionType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AiDecisionExecutionServiceTest {

    private AutomationSessionRepository
            sessionRepository;

    private SanitizedDomSnapshotService
            snapshotService;

    private AiDecisionClient
            aiDecisionClient;

    private AiDecisionResponseValidator
            responseValidator;

    private BrowserActionExecutionService
            actionExecutionService;

    private AutomationStatusEventPublisher
            statusEventPublisher;

    private AiDecisionExecutionService service;

    private AutomationSession session;

    private SanitizedDomSnapshot snapshot;

    @BeforeEach
    void setUp() {
        sessionRepository =
                mock(
                        AutomationSessionRepository.class
                );

        snapshotService =
                mock(
                        SanitizedDomSnapshotService.class
                );

        aiDecisionClient =
                mock(
                        AiDecisionClient.class
                );

        responseValidator =
                mock(
                        AiDecisionResponseValidator.class
                );

        actionExecutionService =
                mock(
                        BrowserActionExecutionService.class
                );

        statusEventPublisher =
                mock(
                        AutomationStatusEventPublisher.class
                );

        service =
                new AiDecisionExecutionService(
                        sessionRepository,
                        snapshotService,
                        aiDecisionClient,
                        responseValidator,
                        actionExecutionService,
                        statusEventPublisher
                );

        session =
                AutomationSession.create(
                        "생활비 계좌를 선택해줘"
                );

        snapshot =
                createSnapshot();

        when(
                sessionRepository.findById(
                        session.getSessionId()
                )
        ).thenReturn(
                Optional.of(
                        session
                )
        );

        when(
                sessionRepository.save(
                        any(
                                AutomationSession.class
                        )
                )
        ).thenAnswer(
                invocation ->
                        invocation.getArgument(
                                0
                        )
        );

        when(
                snapshotService.createSnapshot(
                        session.getSessionId()
                )
        ).thenReturn(
                snapshot
        );
    }

    @Test
    void AI_CLICK은_elementId_실행경로를_사용한다() {
        AiDecisionResponse response =
                new AiDecisionResponse(
                        BrowserActionType.CLICK,
                        "el-a1b2c3d4-001",
                        null,
                        null,
                        null,
                        null
                );

        when(
                aiDecisionClient.decide(
                        any(
                                AiDecisionRequest.class
                        )
                )
        ).thenReturn(
                response
        );

        when(
                responseValidator.validate(
                        response,
                        snapshot
                )
        ).thenReturn(
                response
        );

        when(
                actionExecutionService
                        .executeAiElementAction(
                                session.getSessionId(),
                                BrowserActionType.CLICK,
                                "el-a1b2c3d4-001",
                                null
                        )
        ).thenReturn(
                BrowserActionExecutionResult
                        .executed(
                                BrowserActionType.CLICK
                        )
        );

        AiDecisionExecutionResult result =
                service.execute(
                        session.getSessionId()
                );

        assertThat(
                result.aiActionType()
        ).isEqualTo(
                BrowserActionType.CLICK
        );

        assertThat(
                result.executedActionType()
        ).isEqualTo(
                BrowserActionType.CLICK
        );

        assertThat(
                result.status()
        ).isEqualTo(
                BrowserActionExecutionStatus.EXECUTED
        );

        verify(
                actionExecutionService
        ).executeAiElementAction(
                session.getSessionId(),
                BrowserActionType.CLICK,
                "el-a1b2c3d4-001",
                null
        );

        /*
         * selector 기반 Action 경로를
         * 사용하지 않았는지 검증.
         */
        verify(
                actionExecutionService,
                never()
        ).execute(
                any(),
                any(
                        BrowserAction.class
                )
        );
    }

    @Test
    void C에는_userRequest와_동일한_Snapshot을_전달한다() {
        AiDecisionResponse response =
                new AiDecisionResponse(
                        BrowserActionType.NONE,
                        null,
                        null,
                        null,
                        null,
                        null
                );

        when(
                aiDecisionClient.decide(
                        any(
                                AiDecisionRequest.class
                        )
                )
        ).thenReturn(
                response
        );

        when(
                responseValidator.validate(
                        response,
                        snapshot
                )
        ).thenReturn(
                response
        );

        when(
                actionExecutionService.execute(
                        any(),
                        any(
                                BrowserAction.class
                        )
                )
        ).thenReturn(
                BrowserActionExecutionResult
                        .noAction()
        );

        service.execute(
                session.getSessionId()
        );

        ArgumentCaptor<AiDecisionRequest>
                requestCaptor =
                ArgumentCaptor.forClass(
                        AiDecisionRequest.class
                );

        verify(
                aiDecisionClient
        ).decide(
                requestCaptor.capture()
        );

        AiDecisionRequest request =
                requestCaptor.getValue();

        assertThat(
                request.userRequest()
        ).isEqualTo(
                session.getUserRequest()
        );

        assertThat(
                request.snapshot()
        ).isSameAs(
                snapshot
        );
    }

    @Test
    void 사용자_결정_후_C_재호출에_선택결과와_원본_Snapshot을_전달한다() {
        UserDecisionSessionState decisionState = new UserDecisionSessionState();
        decisionState.register(session.getSessionId(), new AutomationDecisionPrompt(
                "req-001", "dec-001", DecisionType.TERMS_AGREEMENT,
                List.of(new AutomationDecisionOption(
                        "term-required", "[필수] 약관", true, false, false)),
                "frm-001", 1L, "snap-before-decision"));
        decisionState.consume(session.getSessionId(), new SubmitDecisionRequest(
                "req-001", "dec-001", DecisionType.TERMS_AGREEMENT,
                List.of("term-required"), "frm-001", 1L), () -> {});
        AutomationTargetEventService targetService = mock(AutomationTargetEventService.class);
        UserDecisionPromptService promptService = mock(UserDecisionPromptService.class);
        AiDecisionExecutionService resumedService = new AiDecisionExecutionService(
                sessionRepository, snapshotService, aiDecisionClient, responseValidator,
                actionExecutionService, statusEventPublisher, targetService,
                promptService, decisionState);
        AiDecisionResponse response = new AiDecisionResponse(
                BrowserActionType.NONE, null, null, null, null, null);
        when(aiDecisionClient.decide(any(AiDecisionRequest.class))).thenReturn(response);
        when(responseValidator.validate(response, snapshot)).thenReturn(response);
        when(actionExecutionService.execute(any(), any(BrowserAction.class)))
                .thenReturn(BrowserActionExecutionResult.noAction());

        resumedService.execute(session.getSessionId());

        ArgumentCaptor<AiDecisionRequest> captor =
                ArgumentCaptor.forClass(AiDecisionRequest.class);
        verify(aiDecisionClient).decide(captor.capture());
        assertThat(captor.getValue().userDecision().decisionId()).isEqualTo("dec-001");
        assertThat(captor.getValue().userDecision().selectedOptionIds())
                .containsExactly("term-required");
        assertThat(captor.getValue().userDecision().sourceSnapshotId())
                .isEqualTo("snap-before-decision");
        assertThat(decisionState.latestResult(session.getSessionId())).isEmpty();
    }

    @Test
    void AI_SCROLL은_기존_BrowserActionExecutor_경로를_사용한다() {
        AiDecisionResponse response =
                new AiDecisionResponse(
                        BrowserActionType.SCROLL,
                        null,
                        null,
                        0,
                        500,
                        null
                );

        when(
                aiDecisionClient.decide(
                        any(
                                AiDecisionRequest.class
                        )
                )
        ).thenReturn(
                response
        );

        when(
                responseValidator.validate(
                        response,
                        snapshot
                )
        ).thenReturn(
                response
        );

        when(
                actionExecutionService.execute(
                        any(),
                        any(
                                BrowserAction.class
                        )
                )
        ).thenReturn(
                BrowserActionExecutionResult
                        .executed(
                                BrowserActionType.SCROLL
                        )
        );

        AiDecisionExecutionResult result =
                service.execute(
                        session.getSessionId()
                );

        assertThat(
                result.status()
        ).isEqualTo(
                BrowserActionExecutionStatus.EXECUTED
        );

        ArgumentCaptor<BrowserAction>
                actionCaptor =
                ArgumentCaptor.forClass(
                        BrowserAction.class
                );

        verify(
                actionExecutionService
        ).execute(
                org.mockito.ArgumentMatchers.eq(
                        session.getSessionId()
                ),
                actionCaptor.capture()
        );

        BrowserAction action =
                actionCaptor.getValue();

        assertThat(
                action.type()
        ).isEqualTo(
                BrowserActionType.SCROLL
        );

        assertThat(
                action.selector()
        ).isNull();

        assertThat(
                action.scrollY()
        ).isEqualTo(
                500
        );
    }

    @Test
    void USER_DECISION_Element는_자동_CLICK하지_않고_사용자대기로_전환한다() {
        AiDecisionResponse response =
                new AiDecisionResponse(
                        BrowserActionType.CLICK,
                        "el-a1b2c3d4-001",
                        null,
                        null,
                        null,
                        null
                );

        when(
                aiDecisionClient.decide(
                        any(
                                AiDecisionRequest.class
                        )
                )
        ).thenReturn(
                response
        );

        when(
                responseValidator.validate(
                        response,
                        snapshot
                )
        ).thenThrow(
                new AiDecisionValidationException(
                        AiDecisionValidationException
                                .Code
                                .USER_DECISION_REQUIRED,
                        "사용자 선택이 필요합니다."
                )
        );

        when(
                actionExecutionService.execute(
                        any(),
                        any(
                                BrowserAction.class
                        )
                )
        ).thenReturn(
                BrowserActionExecutionResult
                        .userActionRequired(
                                BrowserActionType
                                        .WAIT_FOR_USER
                        )
        );

        AiDecisionExecutionResult result =
                service.execute(
                        session.getSessionId()
                );

        assertThat(
                result.status()
        ).isEqualTo(
                BrowserActionExecutionStatus
                        .USER_ACTION_REQUIRED
        );

        assertThat(
                result.aiActionType()
        ).isEqualTo(
                BrowserActionType.CLICK
        );

        assertThat(
                result.executedActionType()
        ).isEqualTo(
                BrowserActionType.WAIT_FOR_USER
        );

        verify(
                actionExecutionService,
                never()
        ).executeAiElementAction(
                any(),
                any(),
                any(),
                any()
        );
    }

    @Test
    void 비정상_AI_Response는_RISK_WARNING으로_전환하고_실행하지_않는다() {
        AiDecisionResponse response =
                new AiDecisionResponse(
                        BrowserActionType.CLICK,
                        "el-a1b2c3d4-999",
                        null,
                        null,
                        null,
                        null
                );

        when(
                aiDecisionClient.decide(
                        any(
                                AiDecisionRequest.class
                        )
                )
        ).thenReturn(
                response
        );

        AiDecisionValidationException exception =
                new AiDecisionValidationException(
                        AiDecisionValidationException
                                .Code
                                .UNKNOWN_ELEMENT_ID,
                        "현재 Snapshot에 없는 elementId입니다."
                );

        when(
                responseValidator.validate(
                        response,
                        snapshot
                )
        ).thenThrow(
                exception
        );

        assertThatThrownBy(
                () ->
                        service.execute(
                                session.getSessionId()
                        )
        )
                .isSameAs(
                        exception
                );

        assertThat(
                session.getStatus()
        ).isEqualTo(
                WorkflowStatus.RISK_WARNING
        );

        verify(
                actionExecutionService,
                never()
        ).executeAiElementAction(
                any(),
                any(),
                any(),
                any()
        );

        verify(
                actionExecutionService,
                never()
        ).execute(
                any(),
                any(
                        BrowserAction.class
                )
        );
    }

    @Test
    void AI_Engine_호출실패는_ERROR로_전환한다() {
        when(
                aiDecisionClient.decide(
                        any(
                                AiDecisionRequest.class
                        )
                )
        ).thenThrow(
                new AiDecisionClientException(
                        "AI Engine 연결 실패"
                )
        );

        assertThatThrownBy(
                () ->
                        service.execute(
                                session.getSessionId()
                        )
        )
                .isInstanceOf(
                        AiDecisionClientException.class
                );

        assertThat(
                session.getStatus()
        ).isEqualTo(
                WorkflowStatus.ERROR
        );

        verify(
                actionExecutionService,
                never()
        ).executeAiElementAction(
                any(),
                any(),
                any(),
                any()
        );
    }

    @Test
    void 가입금액은_사용자요청에_명시된_값만_TYPE한다() {
        session = AutomationSession.create(
                "100만 원을 12개월 정기예금 상품에 가입하고 싶다");
        snapshot = snapshotAt(
                "http://127.0.0.1:5190/deposit/conditions/deposit-12m");
        stubCurrentSessionAndSnapshot();
        AiDecisionResponse response = new AiDecisionResponse(
                BrowserActionType.TYPE, "el-a1b2c3d4-001", "1000000",
                null, null, null);
        when(aiDecisionClient.decide(any(AiDecisionRequest.class))).thenReturn(response);
        when(responseValidator.validate(response, snapshot)).thenReturn(response);
        when(actionExecutionService.executeAiElementAction(
                session.getSessionId(), BrowserActionType.TYPE,
                "el-a1b2c3d4-001", "1000000"))
                .thenReturn(BrowserActionExecutionResult.executed(BrowserActionType.TYPE));

        AiDecisionExecutionResult result = service.execute(session.getSessionId());

        assertThat(result.status()).isEqualTo(BrowserActionExecutionStatus.EXECUTED);
        verify(actionExecutionService).executeAiElementAction(
                session.getSessionId(), BrowserActionType.TYPE,
                "el-a1b2c3d4-001", "1000000");
    }

    @Test
    void 사용자요청에_없는_가입금액은_추가정보_상태로_중단한다() {
        snapshot = snapshotAt(
                "http://127.0.0.1:5190/deposit/conditions/deposit-12m");
        when(snapshotService.createSnapshot(session.getSessionId())).thenReturn(snapshot);
        AiDecisionResponse response = new AiDecisionResponse(
                BrowserActionType.TYPE, "el-a1b2c3d4-001", "1000000",
                null, null, null);
        when(aiDecisionClient.decide(any(AiDecisionRequest.class))).thenReturn(response);
        when(responseValidator.validate(response, snapshot)).thenReturn(response);

        AiDecisionExecutionResult result = service.execute(session.getSessionId());

        assertThat(session.getStatus())
                .isEqualTo(WorkflowStatus.ADDITIONAL_INFORMATION_REQUIRED);
        assertThat(result.status())
                .isEqualTo(BrowserActionExecutionStatus.USER_ACTION_REQUIRED);
        verify(actionExecutionService, never()).executeAiElementAction(
                any(), any(), any(), any());
    }

    @Test
    void AI_응답_대기중_취소된_세션은_Action을_실행하지_않는다() {
        AiDecisionResponse response = new AiDecisionResponse(
                BrowserActionType.CLICK, "el-a1b2c3d4-001", null,
                null, null, null);
        when(aiDecisionClient.decide(any(AiDecisionRequest.class))).thenReturn(response);
        when(responseValidator.validate(response, snapshot)).thenAnswer(ignored -> {
            session.cancel();
            return response;
        });

        assertThatThrownBy(() -> service.execute(session.getSessionId()))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("AI Action");
        assertThat(session.getStatus()).isEqualTo(WorkflowStatus.CANCELLED);
        verify(actionExecutionService, never()).executeAiElementAction(
                any(), any(), any(), any());
    }

    @Test
    void 가입기간이_사용자요청에_없으면_금액_Action도_중단한다() {
        session = AutomationSession.create("100만 원 정기예금에 가입하고 싶다");
        snapshot = snapshotAt(
                "http://127.0.0.1:5190/deposit/conditions/deposit-12m");
        stubCurrentSessionAndSnapshot();
        AiDecisionResponse response = new AiDecisionResponse(
                BrowserActionType.TYPE, "el-a1b2c3d4-001", "1000000",
                null, null, null);
        when(aiDecisionClient.decide(any(AiDecisionRequest.class))).thenReturn(response);
        when(responseValidator.validate(response, snapshot)).thenReturn(response);

        service.execute(session.getSessionId());

        assertThat(session.getStatus())
                .isEqualTo(WorkflowStatus.ADDITIONAL_INFORMATION_REQUIRED);
        verify(actionExecutionService, never()).executeAiElementAction(
                any(), any(), any(), any());
    }

    private void stubCurrentSessionAndSnapshot() {
        when(sessionRepository.findById(session.getSessionId()))
                .thenReturn(Optional.of(session));
        when(snapshotService.createSnapshot(session.getSessionId()))
                .thenReturn(snapshot);
    }

    private SanitizedDomSnapshot snapshotAt(String url) {
        SanitizedDomSnapshot base = createSnapshot();
        return new SanitizedDomSnapshot(base.schemaVersion(), base.snapshotId(),
                new SanitizedDomSnapshot.PageSnapshot(url, "가입 금액"),
                base.elements());
    }

    private SanitizedDomSnapshot createSnapshot() {
        SanitizedDomSnapshot.ElementSnapshot element =
                new SanitizedDomSnapshot
                        .ElementSnapshot(
                        "el-a1b2c3d4-001",
                        "button",
                        "button",
                        "생활비 계좌",
                        "생활비 계좌 선택",
                        null,
                        null,
                        true,
                        true,
                        new SanitizedDomSnapshot
                                .BoundingBoxSnapshot(
                                100,
                                200,
                                180,
                                48
                        ),
                        SanitizedDomSnapshot
                                .SecurityPolicy
                                .NORMAL
                );

        return new SanitizedDomSnapshot(
                "1.0",
                "snap-a1b2c3d4",
                new SanitizedDomSnapshot
                        .PageSnapshot(
                        "http://127.0.0.1:5190/accounts",
                        "계좌 선택"
                ),
                List.of(
                        element
                )
        );
    }
}
