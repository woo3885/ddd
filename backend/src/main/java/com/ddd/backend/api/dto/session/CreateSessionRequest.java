package com.ddd.backend.api.dto.session;

import jakarta.validation.constraints.NotBlank;

public record CreateSessionRequest(

        @NotBlank(message = "사용자 요청은 비어 있을 수 없습니다.")
        String userRequest

) {
}
