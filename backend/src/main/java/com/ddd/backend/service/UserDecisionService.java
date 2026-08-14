package com.ddd.backend.service;

import com.ddd.backend.automation.session.BrowserSessionManager;
import com.ddd.backend.common.exception.SessionNotFoundException;
import com.ddd.backend.domain.session.AutomationSession;
import com.ddd.backend.domain.session.AutomationSessionRepository;
import com.ddd.backend.domain.session.DecisionType;
import com.ddd.backend.domain.session.WorkflowStatus;
import com.ddd.backend.service.validation.UserDecisionValidator;
import com.ddd.backend.websocket.publisher.AutomationStatusEventPublisher;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class UserDecisionService {

    private static final int MAX_CONFIRMATION_ID_LENGTH = 100;

    private final AutomationSessionRepository sessionRepository;
    private final UserDecisionValidator decisionValidator;
    private final BrowserSessionManager browserSessionManager;
    private final AutomationStatusEventPublisher statusEventPublisher;

    public UserDecisionService(
            AutomationSessionRepository sessionRepository,
            UserDecisionValidator decisionValidator,
            BrowserSessionManager browserSessionManager,
            AutomationStatusEventPublisher statusEventPublisher
    ) {
        this.sessionRepository = sessionRepository;
        this.decisionValidator = decisionValidator;
        this.browserSessionManager = browserSessionManager;
        this.statusEventPublisher = statusEventPublisher;
    }

    public AutomationSession submitDecision(
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