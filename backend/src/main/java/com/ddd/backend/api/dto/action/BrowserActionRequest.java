package com.ddd.backend.api.dto.action;

import com.ddd.backend.automation.BrowserActionType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record BrowserActionRequest(

        @NotBlank(
                message =
                        "requestId는 비어 있을 수 없습니다."
        )
        @Size(
                max = 100,
                message =
                        "requestId는 100자를 초과할 수 없습니다."
        )
        @Pattern(
                regexp =
                        "^[A-Za-z0-9_-]+$",
                message =
                        "requestId 형식이 올바르지 않습니다."
        )
        String requestId,

        @NotNull(
                message =
                        "actionType은 필수입니다."
        )
        BrowserActionType actionType,

        @NotBlank(
                message =
                        "elementId는 비어 있을 수 없습니다."
        )
        @Pattern(
                regexp =
                        "^el-[A-Za-z0-9]{8}-\\d{3}$",
                message =
                        "elementId 형식이 올바르지 않습니다."
        )
        String elementId,

        @NotBlank(
                message =
                        "expectedFrameId는 비어 있을 수 없습니다."
        )
        @Size(
                max = 100,
                message =
                        "expectedFrameId는 100자를 초과할 수 없습니다."
        )
        String expectedFrameId,

        @NotNull(
                message =
                        "expectedSequence는 필수입니다."
        )
        @Positive(
                message =
                        "expectedSequence는 1 이상이어야 합니다."
        )
        Long expectedSequence

) {
}