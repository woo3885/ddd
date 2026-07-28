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
        this.httpStatus = httpStatus;
        this.code = code;
        this.message = message;
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