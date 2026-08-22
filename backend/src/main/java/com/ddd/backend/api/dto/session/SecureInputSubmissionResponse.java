package com.ddd.backend.api.dto.session;

public record SecureInputSubmissionResponse(
        String requestId,
        String secureRequestId,
        String status,
        String message
) {}
