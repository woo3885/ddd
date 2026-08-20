package com.ddd.backend.service;

import com.ddd.backend.automation.session.BrowserSessionManager;
import com.ddd.backend.common.exception.SessionNotFoundException;
import com.ddd.backend.domain.session.AutomationSession;
import com.ddd.backend.domain.session.AutomationSessionRepository;
import com.ddd.backend.domain.session.DecisionType;
import com.ddd.backend.domain.session.WorkflowStatus;
import com.ddd.backend.service.validation.UserDecisionValidator;
import com.ddd.backend.websocket.publisher.AutomationStatusEventPublisher;
import com.ddd.backend.api.dto.session.SubmitDecisionRequest;
import com.ddd.backend.frame.BrowserFrameMetadata;
import com.ddd.backend.frame.BrowserFrameStore;
import com.ddd.backend.service.decision.UserDecisionSessionState;
import org.springframework.beans.factory.annotation.Autowired;
import com.ddd.backend.ai.AiDecisionExecutionService;
import com.ddd.backend.automation.BrowserActionExecutionStatus;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class UserDecisionService {

    private static final int MAX_CONFIRMATION_ID_LENGTH = 100;

    private final AutomationSessionRepository sessionRepository;
    private final UserDecisionValidator decisionValidator;
    private final BrowserSessionManager browserSessionManager;
    private final AutomationStatusEventPublisher statusEventPublisher;
    private final UserDecisionSessionState decisionState;
    private final BrowserFrameStore frameStore;
    private final BrowserActionExecutionService actionExecutionService;
    private final AiDecisionExecutionService aiDecisionExecutionService;

    @Autowired
    public UserDecisionService(
            AutomationSessionRepository sessionRepository,
            UserDecisionValidator decisionValidator,
            BrowserSessionManager browserSessionManager,
            AutomationStatusEventPublisher statusEventPublisher,
            UserDecisionSessionState decisionState,
            BrowserFrameStore frameStore,
            BrowserActionExecutionService actionExecutionService,
            AiDecisionExecutionService aiDecisionExecutionService
    ) {
        this.sessionRepository = sessionRepository;
        this.decisionValidator = decisionValidator;
        this.browserSessionManager = browserSessionManager;
        this.statusEventPublisher = statusEventPublisher;
        this.decisionState = decisionState;
        this.frameStore = frameStore;
        this.actionExecutionService = actionExecutionService;
        this.aiDecisionExecutionService = aiDecisionExecutionService;
    }

    public UserDecisionService(
            AutomationSessionRepository sessionRepository,
            UserDecisionValidator decisionValidator,
            BrowserSessionManager browserSessionManager,
            AutomationStatusEventPublisher statusEventPublisher,
            UserDecisionSessionState decisionState,
            BrowserFrameStore frameStore
    ) {
        this(sessionRepository, decisionValidator, browserSessionManager,
                statusEventPublisher, decisionState, frameStore, null, null);
    }

    public UserDecisionService(
            AutomationSessionRepository sessionRepository,
            UserDecisionValidator decisionValidator,
            BrowserSessionManager browserSessionManager,
            AutomationStatusEventPublisher statusEventPublisher
    ) {
        this(sessionRepository, decisionValidator, browserSessionManager,
                statusEventPublisher, null, null, null, null);
    }

    public AutomationSession submitDecision(
            String sessionId,
            SubmitDecisionRequest request
    ) {
        if (decisionState == null || frameStore == null) {
            return applyDecision(
                    sessionId,
                    request.decisionType(),
                    request.selectedOptionIds()
            );
        }

        BrowserFrameMetadata latest = frameStore.latest(sessionId)
                .orElseThrow(() -> new IllegalStateException(
                        "현재 Viewer Frame이 준비되지 않았습니다."
                )).metadata();
        if (!latest.frameId().equals(request.expectedFrameId())
                || latest.sequence() != request.expectedSequence()) {
            throw new IllegalStateException("오래된 Viewer Frame의 사용자 결정입니다.");
        }

        java.util.concurrent.atomic.AtomicReference<AutomationSession> saved =
                new java.util.concurrent.atomic.AtomicReference<>();
        decisionState.consume(sessionId, request, () -> {
            executeSelectedOptions(sessionId, request.selectedOptionIds());
            saved.set(applyDecision(
                    sessionId,
                    request.decisionType(),
                    request.selectedOptionIds()
            ));
        });
        statusEventPublisher.publishDecisionResolved(
                sessionId,
                "사용자 결정이 처리되었습니다."
        );

        if (aiDecisionExecutionService != null) {
            aiDecisionExecutionService.execute(sessionId);
        }
        return saved.get();
    }

    private void executeSelectedOptions(
            String sessionId,
            List<String> selectedOptionIds
    ) {
        if (actionExecutionService == null) {
            return;
        }

        for (String elementId : selectedOptionIds) {
            var result = actionExecutionService.executeElementClick(
                    sessionId, elementId);
            if (result.status() != BrowserActionExecutionStatus.EXECUTED) {
                throw new IllegalStateException(
                        "사용자가 선택한 항목을 안전하게 실행할 수 없습니다."
                );
            }
        }
    }

    public AutomationSession submitDecision(
            String sessionId,
            DecisionType decisionType,
            List<String> selectedOptionIds
    ) {
        return applyDecision(sessionId, decisionType, selectedOptionIds);
    }

    private AutomationSession applyDecision(
            String sessionId,
            DecisionType decisionType,
            List<String> selectedOptionIds
    ) {
        decisionValidator.validate(
                decisionType,
                selectedOptionIds
        );

        AutomationSession session =
                getSession(sessionId);

        validateDecisionStatus(
                session,
                decisionType
        );

        session.submitDecision();

        AutomationSession savedSession =
                sessionRepository.save(
                        session
                );

        statusEventPublisher.publish(
                savedSession.getSessionId(),
                savedSession.getStatus(),
                decisionType
                        == DecisionType.ADDITIONAL_INFORMATION
                        ? "추가 정보가 제출되었습니다."
                        : "사용자 선택이 제출되었습니다."
        );

        return savedSession;
    }

    public AutomationSession confirmFinalAction(
            String sessionId,
            String confirmationId,
            Boolean approved
    ) {
        validateConfirmationRequest(
                confirmationId,
                approved
        );

        if (!Boolean.TRUE.equals(approved)) {
            throw new IllegalArgumentException(
                    "최종 실행 승인 요청에서는 approved가 true여야 합니다."
            );
        }

        AutomationSession session =
                getSession(sessionId);

        session.approveFinalConfirmation();

        AutomationSession savedSession =
                sessionRepository.save(
                        session
                );

        statusEventPublisher.publish(
                savedSession.getSessionId(),
                savedSession.getStatus(),
                "사용자가 최종 실행을 승인했습니다."
        );

        return savedSession;
    }

    public AutomationSession rejectFinalAction(
            String sessionId,
            String confirmationId,
            Boolean approved
    ) {
        validateConfirmationRequest(
                confirmationId,
                approved
        );

        if (!Boolean.FALSE.equals(approved)) {
            throw new IllegalArgumentException(
                    "최종 실행 거절 요청에서는 approved가 false여야 합니다."
            );
        }

        AutomationSession session =
                getSession(sessionId);

        session.rejectFinalConfirmation();

        AutomationSession savedSession =
                sessionRepository.save(
                        session
                );

        if (browserSessionManager.exists(
                sessionId
        )) {
            browserSessionManager.closeSession(
                    sessionId
            );
        }

        statusEventPublisher.publish(
                savedSession.getSessionId(),
                savedSession.getStatus(),
                "최종 실행이 거절되어 세션이 취소되었습니다."
        );

        return savedSession;
    }

    private AutomationSession getSession(
            String sessionId
    ) {
        if (sessionId == null
                || sessionId.isBlank()) {

            throw new IllegalArgumentException(
                    "세션 ID는 비어 있을 수 없습니다."
            );
        }

        return sessionRepository
                .findById(sessionId)
                .orElseThrow(
                        () -> new SessionNotFoundException(
                                sessionId
                        )
                );
    }

    private void validateDecisionStatus(
            AutomationSession session,
            DecisionType decisionType
    ) {
        WorkflowStatus currentStatus =
                session.getStatus();

        if (decisionType
                == DecisionType.ADDITIONAL_INFORMATION) {

            if (currentStatus
                    != WorkflowStatus.ADDITIONAL_INFORMATION_REQUIRED) {

                throw new IllegalStateException(
                        "추가 정보 대기 상태에서만 추가 정보를 제출할 수 있습니다."
                );
            }

            return;
        }

        if (currentStatus
                != WorkflowStatus.USER_DECISION_REQUIRED) {

            throw new IllegalStateException(
                    "사용자 결정 대기 상태에서만 선택을 제출할 수 있습니다."
            );
        }
    }

    private void validateConfirmationRequest(
            String confirmationId,
            Boolean approved
    ) {
        if (confirmationId == null
                || confirmationId.isBlank()) {

            throw new IllegalArgumentException(
                    "최종 확인 ID는 필수입니다."
            );
        }

        if (confirmationId.trim().length()
                > MAX_CONFIRMATION_ID_LENGTH) {

            throw new IllegalArgumentException(
                    "최종 확인 ID는 100자를 초과할 수 없습니다."
            );
        }

        if (approved == null) {
            throw new IllegalArgumentException(
                    "승인 여부는 필수입니다."
            );
        }
    }
}
