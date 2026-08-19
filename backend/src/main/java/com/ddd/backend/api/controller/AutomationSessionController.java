package com.ddd.backend.api.controller;

import com.ddd.backend.api.dto.session.AutomationSessionResponse;
import com.ddd.backend.api.dto.session.CreateSessionRequest;
import com.ddd.backend.api.dto.session.SubmitConfirmationRequest;
import com.ddd.backend.api.dto.session.SubmitDecisionRequest;
import com.ddd.backend.common.response.ApiResponse;
import com.ddd.backend.domain.session.AutomationSession;
import com.ddd.backend.service.AutomationSessionService;
import com.ddd.backend.service.UserDecisionService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/sessions")
public class AutomationSessionController {

    private final AutomationSessionService sessionService;
    private final UserDecisionService userDecisionService;

    public AutomationSessionController(
            AutomationSessionService sessionService,
            UserDecisionService userDecisionService
    ) {
        this.sessionService = sessionService;
        this.userDecisionService = userDecisionService;
    }

    @PostMapping
    public ResponseEntity<ApiResponse<AutomationSessionResponse>>
    createSession(
            @Valid @RequestBody CreateSessionRequest request
    ) {
        AutomationSession session =
                sessionService.createSession(
                        request.userRequest(),
                        request.siteId(),
                        request.initialPath()
                );

        AutomationSessionResponse response =
                AutomationSessionResponse.from(
                        session
                );

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(
                        ApiResponse.success(
                                response,
                                "자동화 세션이 생성되었습니다."
                        )
                );
    }

    @GetMapping("/{sessionId}")
    public ApiResponse<AutomationSessionResponse> getSession(
            @PathVariable String sessionId
    ) {
        AutomationSession session =
                sessionService.getSession(
                        sessionId
                );

        return ApiResponse.success(
                AutomationSessionResponse.from(
                        session
                )
        );
    }

    @PostMapping("/{sessionId}/cancel")
    public ApiResponse<AutomationSessionResponse> cancelSession(
            @PathVariable String sessionId
    ) {
        AutomationSession session =
                sessionService.cancelSession(
                        sessionId
                );

        return ApiResponse.success(
                AutomationSessionResponse.from(
                        session
                ),
                "자동화 세션이 취소되었습니다."
        );
    }

    @PostMapping("/{sessionId}/decisions")
    public ApiResponse<AutomationSessionResponse> submitDecision(
            @PathVariable String sessionId,
            @Valid @RequestBody SubmitDecisionRequest request
    ) {
        AutomationSession session =
                userDecisionService.submitDecision(
                        sessionId,
                        request
                );

        return ApiResponse.success(
                AutomationSessionResponse.from(
                        session
                ),
                "사용자 결정이 제출되었습니다."
        );
    }

    @PostMapping("/{sessionId}/confirm")
    public ApiResponse<AutomationSessionResponse> confirmFinalAction(
            @PathVariable String sessionId,
            @Valid @RequestBody SubmitConfirmationRequest request
    ) {
        AutomationSession session =
                userDecisionService.confirmFinalAction(
                        sessionId,
                        request.confirmationId(),
                        request.approved()
                );

        return ApiResponse.success(
                AutomationSessionResponse.from(
                        session
                ),
                "최종 실행을 승인했습니다."
        );
    }

    @PostMapping("/{sessionId}/reject")
    public ApiResponse<AutomationSessionResponse> rejectFinalAction(
            @PathVariable String sessionId,
            @Valid @RequestBody SubmitConfirmationRequest request
    ) {
        AutomationSession session =
                userDecisionService.rejectFinalAction(
                        sessionId,
                        request.confirmationId(),
                        request.approved()
                );

        return ApiResponse.success(
                AutomationSessionResponse.from(
                        session
                ),
                "최종 실행을 거절했습니다."
        );
    }
}
