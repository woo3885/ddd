package com.ddd.backend.api.controller;

import com.ddd.backend.api.dto.session.AutomationSessionResponse;
import com.ddd.backend.api.dto.session.CreateSessionRequest;
import com.ddd.backend.common.response.ApiResponse;
import com.ddd.backend.domain.session.AutomationSession;
import com.ddd.backend.service.AutomationSessionService;
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

    public AutomationSessionController(
            AutomationSessionService sessionService
    ) {
        this.sessionService = sessionService;
    }

    @PostMapping
    public ResponseEntity<ApiResponse<AutomationSessionResponse>>
    createSession(
            @Valid @RequestBody CreateSessionRequest request
    ) {
        AutomationSession session =
                sessionService.createSession(request.userRequest());

        AutomationSessionResponse response =
                AutomationSessionResponse.from(session);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.success(
                        response,
                        "자동화 세션이 생성되었습니다."
                ));
    }

    @GetMapping("/{sessionId}")
    public ApiResponse<AutomationSessionResponse> getSession(
            @PathVariable String sessionId
    ) {
        AutomationSession session =
                sessionService.getSession(sessionId);

        return ApiResponse.success(
                AutomationSessionResponse.from(session)
        );
    }

    @PostMapping("/{sessionId}/cancel")
    public ApiResponse<AutomationSessionResponse> cancelSession(
            @PathVariable String sessionId
    ) {
        AutomationSession session =
                sessionService.cancelSession(sessionId);

        return ApiResponse.success(
                AutomationSessionResponse.from(session),
                "자동화 세션이 취소되었습니다."
        );
    }
}