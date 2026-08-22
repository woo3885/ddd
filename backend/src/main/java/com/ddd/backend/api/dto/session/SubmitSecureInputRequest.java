package com.ddd.backend.api.dto.session;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record SubmitSecureInputRequest(
        @NotBlank @Size(max = 100) String requestId,
        @NotBlank @Size(max = 256) String value,
        @NotBlank @Size(max = 100) String expectedFrameId,
        @Positive long expectedSequence
) {}
