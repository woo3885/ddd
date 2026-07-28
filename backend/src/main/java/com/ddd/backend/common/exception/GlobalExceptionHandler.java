package com.ddd.backend.common.exception;

import com.ddd.backend.common.response.ApiResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log =
            LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(SessionNotFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleSessionNotFound(
            SessionNotFoundException exception
    ) {
        ErrorCode errorCode = ErrorCode.SESSION_NOT_FOUND;

        log.warn(
                "Application error handled. errorCode={}, exceptionType={}",
                errorCode.getCode(),
                exception.getClass().getSimpleName()
        );

        return ResponseEntity
                .status(errorCode.getHttpStatus())
                .body(ApiResponse.failure(
                        errorCode,
                        exception.getMessage()
                ));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleValidation(
            MethodArgumentNotValidException exception
    ) {
        String message = exception.getBindingResult()
                .getFieldErrors()
                .stream()
                .findFirst()
                .map(error -> error.getDefaultMessage())
                .orElse(ErrorCode.INVALID_REQUEST.getMessage());

        ErrorCode errorCode = ErrorCode.INVALID_REQUEST;

        log.warn(
                "Request validation failed. errorCode={}, validationErrorCount={}",
                errorCode.getCode(),
                exception.getBindingResult().getErrorCount()
        );

        return ResponseEntity
                .status(errorCode.getHttpStatus())
                .body(ApiResponse.failure(
                        errorCode,
                        message
                ));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiResponse<Void>> handleIllegalArgument(
            IllegalArgumentException exception
    ) {
        ErrorCode errorCode = ErrorCode.INVALID_REQUEST;

        log.warn(
                "Application error handled. errorCode={}, exceptionType={}",
                errorCode.getCode(),
                exception.getClass().getSimpleName()
        );

        return ResponseEntity
                .status(errorCode.getHttpStatus())
                .body(ApiResponse.failure(
                        errorCode,
                        exception.getMessage()
                ));
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<ApiResponse<Void>> handleIllegalState(
            IllegalStateException exception
    ) {
        ErrorCode errorCode = ErrorCode.INVALID_SESSION_STATE;

        log.warn(
                "Application error handled. errorCode={}, exceptionType={}",
                errorCode.getCode(),
                exception.getClass().getSimpleName()
        );

        return ResponseEntity
                .status(errorCode.getHttpStatus())
                .body(ApiResponse.failure(
                        errorCode,
                        exception.getMessage()
                ));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleUnexpectedException(
            Exception exception
    ) {
        ErrorCode errorCode = ErrorCode.INTERNAL_SERVER_ERROR;

        log.error(
                "Unexpected server error. errorCode={}, exceptionType={}",
                errorCode.getCode(),
                exception.getClass().getSimpleName()
        );

        return ResponseEntity
                .status(errorCode.getHttpStatus())
                .body(ApiResponse.failure(errorCode));
    }
}