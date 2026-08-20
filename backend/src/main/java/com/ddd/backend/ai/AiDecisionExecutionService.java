package com.ddd.backend.ai;

import com.ddd.backend.ai.validation.AiDecisionResponseValidator;
import com.ddd.backend.ai.validation.AiDecisionValidationException;
import com.ddd.backend.automation.BrowserAction;
import com.ddd.backend.automation.BrowserActionExecutionResult;
import com.ddd.backend.automation.BrowserActionType;
import com.ddd.backend.automation.dom.SanitizedDomSnapshot;
import com.ddd.backend.automation.dom.SanitizedDomSnapshotService;
import com.ddd.backend.common.exception.SessionNotFoundException;
import com.ddd.backend.domain.session.AutomationSession;
import com.ddd.backend.domain.session.AutomationSessionRepository;
import com.ddd.backend.domain.session.WorkflowStatus;
import com.ddd.backend.service.BrowserActionExecutionService;
import com.ddd.backend.websocket.publisher.AutomationStatusEventPublisher;
import com.ddd.backend.websocket.publisher.AutomationTargetEventService;
import com.ddd.backend.service.decision.UserDecisionPromptService;
import com.ddd.backend.service.decision.UserDecisionSessionState;
import org.springframework.beans.factory.annotation.Autowired;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.Objects;

@Service
public final class AiDecisionExecutionService {

    private static final Logger log =
            LoggerFactory.getLogger(
                    AiDecisionExecutionService.class
            );

    private final AutomationSessionRepository
            sessionRepository;

    private final SanitizedDomSnapshotService
            snapshotService;

    private final AiDecisionClient
            aiDecisionClient;

    private final AiDecisionResponseValidator
            responseValidator;

    private final BrowserActionExecutionService
            actionExecutionService;

    private final AutomationStatusEventPublisher
            statusEventPublisher;

    private final AutomationTargetEventService targetEventService;
    private final UserDecisionPromptService userDecisionPromptService;
    private final UserDecisionSessionState userDecisionState;

    @Autowired
    public AiDecisionExecutionService(
            AutomationSessionRepository sessionRepository,
            SanitizedDomSnapshotService snapshotService,
            AiDecisionClient aiDecisionClient,
            AiDecisionResponseValidator responseValidator,
            BrowserActionExecutionService actionExecutionService,
            AutomationStatusEventPublisher statusEventPublisher,
            AutomationTargetEventService targetEventService,
            UserDecisionPromptService userDecisionPromptService,
            UserDecisionSessionState userDecisionState
    ) {
        this.sessionRepository =
                Objects.requireNonNull(
                        sessionRepository,
                        "AutomationSessionRepository는 필수입니다."
                );

        this.snapshotService =
                Objects.requireNonNull(
                        snapshotService,
                        "SanitizedDomSnapshotService는 필수입니다."
                );

        this.aiDecisionClient =
                Objects.requireNonNull(
                        aiDecisionClient,
                        "AiDecisionClient는 필수입니다."
                );

        this.responseValidator =
                Objects.requireNonNull(
                        responseValidator,
                        "AiDecisionResponseValidator는 필수입니다."
                );

        this.actionExecutionService =
                Objects.requireNonNull(
                        actionExecutionService,
                        "BrowserActionExecutionService는 필수입니다."
                );

        this.statusEventPublisher =
                Objects.requireNonNull(
                        statusEventPublisher,
                        "AutomationStatusEventPublisher는 필수입니다."
                );

        this.targetEventService = Objects.requireNonNull(
                targetEventService,
                "AutomationTargetEventService는 필수입니다."
        );
        this.userDecisionPromptService = Objects.requireNonNull(
                userDecisionPromptService,
                "UserDecisionPromptService는 필수입니다."
        );
        this.userDecisionState = Objects.requireNonNull(
                userDecisionState, "UserDecisionSessionState는 필수입니다.");
    }

    public AiDecisionExecutionService(
            AutomationSessionRepository sessionRepository,
            SanitizedDomSnapshotService snapshotService,
            AiDecisionClient aiDecisionClient,
            AiDecisionResponseValidator responseValidator,
            BrowserActionExecutionService actionExecutionService,
            AutomationStatusEventPublisher statusEventPublisher
    ) {
        this.sessionRepository = Objects.requireNonNull(sessionRepository);
        this.snapshotService = Objects.requireNonNull(snapshotService);
        this.aiDecisionClient = Objects.requireNonNull(aiDecisionClient);
        this.responseValidator = Objects.requireNonNull(responseValidator);
        this.actionExecutionService = Objects.requireNonNull(actionExecutionService);
        this.statusEventPublisher = Objects.requireNonNull(statusEventPublisher);
        this.targetEventService = null;
        this.userDecisionPromptService = null;
        this.userDecisionState = null;
    }

    /*
     * AI Decision 한 Step을 실행한다.
     *
     * 1. AutomationSession 확인
     * 2. AI_EXECUTING
     * 3. Sanitized Snapshot 생성
     * 4. ElementRegistry 동시 갱신
     * 5. C AI Engine 호출
     * 6. AiDecisionResponse 검증
     * 7. 안전 Gate 처리
     * 8. Browser Action 실행
     */
    public AiDecisionExecutionResult execute(
            String sessionId
    ) {
        validateSessionId(
                sessionId
        );

        AutomationSession session =
                getSession(
                        sessionId
                );

        markAiExecuting(
                session
        );

        boolean resumingUserDecision = userDecisionState != null
                && userDecisionState.latestResult(sessionId).isPresent();

        SanitizedDomSnapshot snapshot;
        AiDecisionResponse response;

        try {
            /*
             * createSnapshot() 내부에서
             * ElementRegistry도 같은 Snapshot으로
             * 교체된다.
             */
            snapshot =
                    snapshotService
                            .createSnapshot(
                                    sessionId
                            );

            AiUserDecisionContext userDecision = userDecisionState == null
                    ? null
                    : userDecisionState.latestResult(sessionId)
                            .map(result -> new AiUserDecisionContext(
                                    result.decisionId(),
                                    result.decisionType(),
                                    result.selectedOptionIds(),
                                    result.sourceSnapshotId()))
                            .orElse(null);

            AiDecisionRequest request = new AiDecisionRequest(
                    session.getUserRequest(), snapshot, userDecision);

            /*
             * B → C
             *
             * POST /api/ai/action
             */
            response =
                    aiDecisionClient
                            .decide(
                                    request
                            );
            if (userDecision != null) {
                userDecisionState.takeLatestResult(sessionId);
            }

        } catch (RuntimeException exception) {

            if (!resumingUserDecision) {
                markErrorSafely(session);
            }

            throw exception;
        }

        AiDecisionResponse validatedResponse;

        try {
            /*
             * C의 응답을 절대 바로 실행하지 않는다.
             */
            validatedResponse =
                    responseValidator
                            .validate(
                                    response,
                                    snapshot
                            );

        } catch (AiDecisionValidationException
                validationException) {

            return handleValidationGate(
                    sessionId,
                    snapshot,
                    response,
                    validationException,
                    session
            );
        }

        BrowserActionExecutionResult
                executionResult =
                publishTargetThenExecute(
                        sessionId,
                        snapshot,
                        validatedResponse
                );

        return AiDecisionExecutionResult.from(
                snapshot,
                response,
                executionResult
        );
    }

    private BrowserActionExecutionResult publishTargetThenExecute(
            String sessionId,
            SanitizedDomSnapshot snapshot,
            AiDecisionResponse validatedResponse
    ) {
        if (targetEventService != null) {
            try {
                targetEventService.publishCurrentTarget(
                        sessionId, snapshot, validatedResponse.elementId());
            } catch (RuntimeException targetException) {
                targetEventService.clearSafely(
                        sessionId, "대상 좌표를 안전하게 확인할 수 없습니다.");
            }
        }

        BrowserActionExecutionResult result = executeValidatedResponse(
                sessionId,
                validatedResponse
        );

        if (validatedResponse.actionType() == BrowserActionType.WAIT_FOR_USER
                && userDecisionPromptService != null) {
            userDecisionPromptService.publish(sessionId, snapshot, validatedResponse);
        }

        return result;
    }

    private BrowserActionExecutionResult
    executeValidatedResponse(
            String sessionId,
            AiDecisionResponse response
    ) {
        return switch (
                response.actionType()
                ) {

            /*
             * Element Action은
             * selector로 변환하지 않는다.
             */
            case CLICK,
                 TYPE,
                 SELECT ->
                    actionExecutionService
                            .executeAiElementAction(
                                    sessionId,
                                    response.actionType(),
                                    response.elementId(),
                                    response.value()
                            );

            /*
             * Element를 필요로 하지 않는 Action은
             * 기존 BrowserActionExecutor를 재사용한다.
             */
            case NONE,
                 SCROLL,
                 PRESS_KEY,
                 GO_BACK,
                 REFRESH,
                 WAIT,
                 WAIT_FOR_USER,
                 PAUSE_FOR_SECURE_INPUT,
                 REQUEST_FINAL_CONFIRMATION,
                 STOP ->
                    actionExecutionService
                            .execute(
                                    sessionId,
                                    toBrowserAction(
                                            response
                                    )
                            );
        };
    }

    /*
     * Validator에서 보안 대상이라고 판단한 경우.
     *
     * 이것은 실행 오류가 아니라
     * 사용자 개입이 필요한 정상적인 Workflow일 수 있다.
     */
    private AiDecisionExecutionResult
    handleValidationGate(
            String sessionId,
            SanitizedDomSnapshot snapshot,
            AiDecisionResponse response,
            AiDecisionValidationException exception,
            AutomationSession session
    ) {
        BrowserActionExecutionResult result;

        switch (exception.code()) {

            case USER_DECISION_REQUIRED -> {
                result = actionExecutionService.execute(
                        sessionId,
                        controlAction(BrowserActionType.WAIT_FOR_USER)
                );
                if (userDecisionPromptService != null) {
                    userDecisionPromptService.publish(sessionId, snapshot);
                }
            }

            case SECURE_INPUT_REQUIRED ->

                    result =
                            actionExecutionService
                                    .execute(
                                            sessionId,
                                            controlAction(
                                                    BrowserActionType
                                                            .PAUSE_FOR_SECURE_INPUT
                                            )
                                    );

            case FINAL_CONFIRMATION_REQUIRED ->

                    result =
                            actionExecutionService
                                    .execute(
                                            sessionId,
                                            controlAction(
                                                    BrowserActionType
                                                            .REQUEST_FINAL_CONFIRMATION
                                            )
                                    );

            /*
             * 위 3개 외 Validator 실패는
             * AI가 비정상 또는 위험한 Action을
             * 생성한 것으로 판단한다.
             */
            default -> {
                markRiskWarningSafely(
                        session
                );

                throw exception;
            }
        }

        return AiDecisionExecutionResult.from(
                snapshot,
                response,
                result
        );
    }

    private BrowserAction toBrowserAction(
            AiDecisionResponse response
    ) {
        return new BrowserAction(
                response.actionType(),
                null,
                response.value(),
                response.scrollX(),
                response.scrollY(),
                response.waitMillis()
        );
    }

    private BrowserAction controlAction(
            BrowserActionType actionType
    ) {
        return new BrowserAction(
                actionType,
                null,
                null,
                null,
                null,
                null
        );
    }

    private void markAiExecuting(
            AutomationSession session
    ) {
        session.transitionTo(
                WorkflowStatus.AI_EXECUTING
        );

        sessionRepository.save(
                session
        );

        statusEventPublisher.publish(
                session.getSessionId(),
                WorkflowStatus.AI_EXECUTING,
                "AI가 다음 행동을 판단하고 있습니다."
        );
    }

    private void markRiskWarningSafely(
            AutomationSession session
    ) {
        try {
            session.transitionTo(
                    WorkflowStatus.RISK_WARNING
            );

            sessionRepository.save(
                    session
            );

            statusEventPublisher.publish(
                    session.getSessionId(),
                    WorkflowStatus.RISK_WARNING,
                    "AI 행동이 보안 검증에서 차단되었습니다."
            );

        } catch (RuntimeException updateException) {

            log.warn(
                    "AI Action 위험 상태 반영 실패. "
                            + "exceptionType={}",
                    updateException
                            .getClass()
                            .getSimpleName()
            );
        }
    }

    private void markErrorSafely(
            AutomationSession session
    ) {
        try {
            session.transitionTo(
                    WorkflowStatus.ERROR
            );

            sessionRepository.save(
                    session
            );

            statusEventPublisher.publish(
                    session.getSessionId(),
                    WorkflowStatus.ERROR,
                    "AI 행동 판단 중 오류가 발생했습니다."
            );

        } catch (RuntimeException updateException) {

            log.warn(
                    "AI 실행 오류 상태 반영 실패. "
                            + "exceptionType={}",
                    updateException
                            .getClass()
                            .getSimpleName()
            );
        }
    }

    private AutomationSession getSession(
            String sessionId
    ) {
        return sessionRepository
                .findById(
                        sessionId
                )
                .orElseThrow(
                        () ->
                                new SessionNotFoundException(
                                        sessionId
                                )
                );
    }

    private void validateSessionId(
            String sessionId
    ) {
        if (sessionId == null
                || sessionId.isBlank()) {

            throw new IllegalArgumentException(
                    "세션 ID는 비어 있을 수 없습니다."
            );
        }
    }
}
