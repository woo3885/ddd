package com.ddd.backend.api.dto.session;

import jakarta.validation.constraints.NotBlank;

public record CreateSessionRequest(

        @NotBlank(message = "사용자 요청은 비어 있을 수 없습니다.")
        String userRequest,

        @NotBlank(message = "siteId는 비어 있을 수 없습니다.")
        String siteId,

        @NotBlank(message = "initialPath는 비어 있을 수 없습니다.")
        String initialPath

) {

        /*
         * 기존 단위 테스트 코드 호환용 생성자.
         *
         * 실제 REST API에서는 Jackson이 canonical constructor를
         * 사용하므로 siteId / initialPath가 누락되면
         * @NotBlank 검증에서 거부된다.
         */
        public CreateSessionRequest(
                String userRequest
        ) {
                this(
                        userRequest,
                        "demo-bank",
                        "/transfer/accounts"
                );
        }
}