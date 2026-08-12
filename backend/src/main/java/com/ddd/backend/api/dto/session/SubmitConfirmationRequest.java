package com.ddd.backend.api.dto.session;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record SubmitConfirmationRequest(

        @NotBlank(
                message = "최종 확인 ID는 필수입니다."
        )
        @Size(
                max = 100,
                message = "최종 확인 ID는 100자를 초과할 수 없습니다."
        )
        String confirmationId,

        @NotNull(
                message = "승인 여부는 필수입니다."
        )
        Boolean approved
) {

    public SubmitConfirmationRequest {
        if (confirmationId != null) {
            confirmationId =
                    confirmationId.trim();
        }
    }
}