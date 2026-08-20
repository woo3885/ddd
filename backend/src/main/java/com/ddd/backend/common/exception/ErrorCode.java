package com.ddd.backend.common.exception;

import org.springframework.http.HttpStatus;

public enum ErrorCode {

    INVALID_REQUEST(
            HttpStatus.BAD_REQUEST,
            "COMMON_400",
            "요청값이 올바르지 않습니다."
    ),

    SESSION_NOT_FOUND(
            HttpStatus.NOT_FOUND,
            "SESSION_404",
            "자동화 세션을 찾을 수 없습니다."
    ),

    INVALID_SESSION_STATE(
            HttpStatus.CONFLICT,
            "SESSION_409",
            "현재 세션 상태에서는 요청을 처리할 수 없습니다."
    ),

    ACTION_FRAME_NOT_READY(
            HttpStatus.CONFLICT,
            "ACTION_409_FRAME_NOT_READY",
            "현재 Viewer Frame이 준비되지 않았습니다."
    ),

    ACTION_STALE_FRAME(
            HttpStatus.CONFLICT,
            "ACTION_409_STALE_FRAME",
            "오래된 Viewer Frame을 기준으로 한 요청입니다."
    ),

    ACTION_DUPLICATE_REQUEST(
            HttpStatus.CONFLICT,
            "ACTION_409_DUPLICATE_REQUEST",
            "이미 처리된 Browser Action 요청입니다."
    ),

    ACTION_BUSY(
            HttpStatus.CONFLICT,
            "ACTION_409_BUSY",
            "현재 다른 Browser Action이 처리 중입니다."
    ),

    ACTION_RATE_LIMITED(
            HttpStatus.TOO_MANY_REQUESTS,
            "ACTION_429_RATE_LIMITED",
            "Browser Action 요청이 너무 빠릅니다."
    ),

    USER_DECISION_RESUME_FAILED(
            HttpStatus.CONFLICT,
            "DECISION_409_RESUME_FAILED",
            "사용자 결정 후속 처리에 실패했습니다."
    ),

    INTERNAL_SERVER_ERROR(
            HttpStatus.INTERNAL_SERVER_ERROR,
            "COMMON_500",
            "서버 처리 중 오류가 발생했습니다."
    );

    private final HttpStatus httpStatus;
    private final String code;
    private final String message;

    ErrorCode(
            HttpStatus httpStatus,
            String code,
            String message
    ) {
        this.httpStatus =
                httpStatus;

        this.code =
                code;

        this.message =
                message;
    }

    public HttpStatus getHttpStatus() {
        return httpStatus;
    }

    public String getCode() {
        return code;
    }

    public String getMessage() {
        return message;
    }
}
