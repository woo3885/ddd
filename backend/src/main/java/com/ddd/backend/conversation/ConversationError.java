package com.ddd.backend.conversation;

import org.springframework.http.HttpStatus;

public enum ConversationError {
    STALE_SEQUENCE(HttpStatus.CONFLICT, "MESSAGE_409_STALE_SEQUENCE",
            "최신 대화 순서와 일치하지 않습니다."),
    STALE_GOAL_REVISION(HttpStatus.CONFLICT, "MESSAGE_409_STALE_GOAL",
            "최신 사용자 목표 revision과 일치하지 않습니다."),
    DUPLICATE_REQUEST(HttpStatus.CONFLICT, "MESSAGE_409_DUPLICATE_REQUEST",
            "requestId가 다른 메시지에 이미 사용되었습니다."),
    DUPLICATE_MESSAGE(HttpStatus.CONFLICT, "MESSAGE_409_DUPLICATE_MESSAGE",
            "messageId가 이미 사용되었습니다."),
    BUSY(HttpStatus.CONFLICT, "MESSAGE_409_BUSY",
            "AI가 처리 중이며 pending 메시지도 이미 존재합니다."),
    SENSITIVE_CONTENT(HttpStatus.BAD_REQUEST, "MESSAGE_400_SENSITIVE_CONTENT",
            "보안 입력으로 의심되는 내용은 채팅으로 전송할 수 없습니다."),
    INVALID_CONTENT(HttpStatus.BAD_REQUEST, "MESSAGE_400_INVALID_CONTENT",
            "메시지 내용이 올바르지 않습니다.");

    private final HttpStatus status;
    private final String code;
    private final String message;

    ConversationError(HttpStatus status, String code, String message) {
        this.status = status;
        this.code = code;
        this.message = message;
    }

    public HttpStatus status() { return status; }
    public String code() { return code; }
    public String message() { return message; }
}
