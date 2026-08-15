package com.ddd.backend.service.action;

import com.ddd.backend.api.dto.action.BrowserActionRequest;
import com.ddd.backend.api.dto.action.BrowserActionResponse;
import com.ddd.backend.automation.BrowserActionExecutionResult;
import com.ddd.backend.automation.BrowserActionType;
import com.ddd.backend.common.exception.BrowserActionRequestException;
import com.ddd.backend.common.exception.ErrorCode;
import com.ddd.backend.frame.BrowserFrameMetadata;
import com.ddd.backend.frame.BrowserFramePayload;
import com.ddd.backend.frame.BrowserFrameStore;
import com.ddd.backend.service.AutomationSessionService;
import com.ddd.backend.service.BrowserActionExecutionService;
import org.springframework.stereotype.Service;

import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.locks.ReentrantLock;

@Service
public final class PublicBrowserActionService {

    private final AutomationSessionService
            automationSessionService;

    private final BrowserFrameStore
            browserFrameStore;

    private final BrowserActionExecutionService
            actionExecutionService;

    private final BrowserActionRequestRegistry
            requestRegistry;

    /*
     * 같은 Session에서 Public Action 두 개가
     * 동시에 같은 Frame을 기준으로 실행되는 것을 막는다.
     */
    private final ConcurrentMap<String, ReentrantLock>
            sessionLocks =
            new ConcurrentHashMap<>();

    public PublicBrowserActionService(
            AutomationSessionService
                    automationSessionService,
            BrowserFrameStore browserFrameStore,
            BrowserActionExecutionService
                    actionExecutionService,
            BrowserActionRequestRegistry
                    requestRegistry
    ) {
        this.automationSessionService =
                Objects.requireNonNull(
                        automationSessionService,
                        "AutomationSessionService는 필수입니다."
                );

        this.browserFrameStore =
                Objects.requireNonNull(
                        browserFrameStore,
                        "BrowserFrameStore는 필수입니다."
                );

        this.actionExecutionService =
                Objects.requireNonNull(
                        actionExecutionService,
                        "BrowserActionExecutionService는 필수입니다."
                );

        this.requestRegistry =
                Objects.requireNonNull(
                        requestRegistry,
                        "BrowserActionRequestRegistry는 필수입니다."
                );
    }

    public BrowserActionResponse execute(
            String sessionId,
            BrowserActionRequest request
    ) {
        validateSessionId(
                sessionId
        );

        Objects.requireNonNull(
                request,
                "Browser Action 요청은 필수입니다."
        );

        /*
         * D19 Public API 1차 공개 범위:
         *
         * Viewer 사용자가 직접 누르는 CLICK만 허용.
         *
         * TYPE:
         * Secure Input 전용 경로와 분리.
         *
         * SCROLL/좌표 Action:
         * 이후 별도 계약으로 추가.
         */
        if (request.actionType()
                != BrowserActionType.CLICK) {

            throw new IllegalArgumentException(
                    "Public Browser Action API는 "
                            + "현재 CLICK만 지원합니다."
            );
        }

        /*
         * 존재하지 않는 AutomationSession이면
         * 기존 SESSION_404 사용.
         */
        automationSessionService.getSession(
                sessionId
        );

        ReentrantLock sessionLock =
                sessionLocks
                        .computeIfAbsent(
                                sessionId,
                                ignored ->
                                        new ReentrantLock()
                        );

        sessionLock.lock();

        try {
            /*
             * 동일 requestId 재전송을 먼저 차단한다.
             *
             * 이전 요청의 응답을 놓친 Frontend가
             * 같은 요청을 재전송하더라도
             * CLICK이 두 번 실행되면 안 된다.
             */
            if (requestRegistry.contains(
                    sessionId,
                    request.requestId()
            )) {

                throw duplicateRequest();
            }

            BrowserFramePayload beforePayload =
                    currentFrame(
                            sessionId
                    );

            BrowserFrameMetadata beforeFrame =
                    beforePayload.metadata();

            /*
             * A Viewer가 보고 있던 Frame과
             * Backend의 최신 Frame이 정확히 같은지 확인.
             */
            validateExpectedFrame(
                    request,
                    beforeFrame
            );

            /*
             * 실제 CLICK 직전에 requestId 예약.
             *
             * 여기부터는 실패하더라도 같은 requestId로
             * 재실행하지 않는다.
             */
            boolean reserved =
                    requestRegistry.reserve(
                            sessionId,
                            request.requestId()
                    );

            if (!reserved) {
                throw duplicateRequest();
            }

            BrowserActionExecutionResult result =
                    actionExecutionService
                            .executeElementClick(
                                    sessionId,
                                    request.elementId()
                            );

            /*
             * EXECUTED면 BrowserActionExecutionService가
             * 이미 새 Frame을 publish했다.
             *
             * BLOCKED / SECURE_INPUT / FINAL_CONFIRMATION이면
             * 기존 Frame이 그대로 유지된다.
             */
            BrowserFramePayload afterPayload =
                    browserFrameStore
                            .latest(
                                    sessionId
                            )
                            .orElse(
                                    beforePayload
                            );

            return BrowserActionResponse.from(
                    request.requestId(),
                    result,
                    beforeFrame,
                    afterPayload.metadata()
            );

        } finally {

            sessionLock.unlock();
        }
    }

    /*
     * Session 종료 시 호출하기 위한 cleanup hook.
     *
     * AutomationSessionService와의 실제 연결은
     * 다음 cleanup 단계에서 붙인다.
     */
    public void removeSession(
            String sessionId
    ) {
        if (sessionId == null
                || sessionId.isBlank()) {

            return;
        }

        requestRegistry.removeSession(
                sessionId
        );

        sessionLocks.remove(
                sessionId
        );
    }

    private BrowserFramePayload currentFrame(
            String sessionId
    ) {
        return browserFrameStore
                .latest(
                        sessionId
                )
                .orElseThrow(
                        () ->
                                new BrowserActionRequestException(
                                        ErrorCode
                                                .ACTION_FRAME_NOT_READY,
                                        "현재 Viewer Frame이 "
                                                + "준비되지 않았습니다."
                                )
                );
    }

    private void validateExpectedFrame(
            BrowserActionRequest request,
            BrowserFrameMetadata currentFrame
    ) {
        boolean sameFrameId =
                Objects.equals(
                        request.expectedFrameId(),
                        currentFrame.frameId()
                );

        boolean sameSequence =
                request
                        .expectedSequence()
                        .longValue()
                        == currentFrame.sequence();

        if (!sameFrameId
                || !sameSequence) {

            throw new BrowserActionRequestException(
                    ErrorCode.ACTION_STALE_FRAME,
                    "Viewer가 표시한 Frame이 "
                            + "이미 변경되었습니다. "
                            + "최신 Frame으로 다시 시도해 주세요."
            );
        }
    }

    private BrowserActionRequestException
    duplicateRequest() {
        return new BrowserActionRequestException(
                ErrorCode
                        .ACTION_DUPLICATE_REQUEST,
                "이미 처리된 Browser Action "
                        + "requestId입니다."
        );
    }

    private void validateSessionId(
            String sessionId
    ) {
        if (sessionId == null
                || sessionId.isBlank()) {

            throw new IllegalArgumentException(
                    "세션 ID는 비어 있을 수 없습니다."
            );
        }
    }
}