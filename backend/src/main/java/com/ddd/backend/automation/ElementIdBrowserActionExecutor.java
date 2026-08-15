package com.ddd.backend.automation;

import com.ddd.backend.automation.dom.ElementLocatorResolver;
import com.microsoft.playwright.Locator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.Objects;

@Service
public final class ElementIdBrowserActionExecutor {

    private static final Logger log =
            LoggerFactory.getLogger(
                    ElementIdBrowserActionExecutor.class
            );

    private final ElementLocatorResolver
            elementLocatorResolver;

    private final BrowserActionPolicyContextResolver
            policyContextResolver;

    public ElementIdBrowserActionExecutor(
            ElementLocatorResolver elementLocatorResolver,
            BrowserActionPolicyContextResolver
                    policyContextResolver
    ) {
        this.elementLocatorResolver =
                Objects.requireNonNull(
                        elementLocatorResolver,
                        "ElementLocatorResolver는 필수입니다."
                );

        this.policyContextResolver =
                Objects.requireNonNull(
                        policyContextResolver,
                        "BrowserActionPolicyContextResolver는 필수입니다."
                );
    }

    /*
     * Public Viewer CLICK 전용 실행.
     *
     * 외부에서 selector를 절대 받지 않는다.
     *
     * elementId
     *   ↓
     * ElementRegistry
     *   ↓
     * 현재 DOM에서 Locator 재탐색
     *   ↓
     * visible / enabled / 보안정책 재검증
     *   ↓
     * CLICK
     */
    public BrowserActionExecutionResult executeClick(
            String sessionId,
            String elementId
    ) {
        validateText(
                sessionId,
                "sessionId"
        );

        validateText(
                elementId,
                "elementId"
        );

        try {
            return elementLocatorResolver
                    .withLocator(
                            sessionId,
                            elementId,
                            this::executeResolvedClick
                    );

        } catch (RuntimeException exception) {

            /*
             * 오래된 elementId,
             * 위조 elementId,
             * Page 변경,
             * DOM 변경,
             * 재탐색 실패 등을
             * 임의 Selector fallback으로 처리하지 않는다.
             *
             * 안전하게 BLOCKED로 끝낸다.
             *
             * sessionId / elementId는 로그에 남기지 않는다.
             */
            log.debug(
                    "Viewer elementId Action 차단. "
                            + "exceptionType={}",
                    exception
                            .getClass()
                            .getSimpleName()
            );

            return BrowserActionExecutionResult
                    .blocked(
                            BrowserActionType.CLICK
                    );
        }
    }

    /*
     * 이 메서드는 ElementLocatorResolver의
     * PlaywrightWorker 작업 내부에서 호출된다.
     */
    private BrowserActionExecutionResult
    executeResolvedClick(
            Locator locator
    ) {
        Objects.requireNonNull(
                locator,
                "Locator는 필수입니다."
        );

        /*
         * Snapshot 당시 visible이었더라도
         * 실제 실행 직전에 다시 검사한다.
         */
        if (!locator.isVisible()
                || !locator.isEnabled()) {

            return BrowserActionExecutionResult
                    .blocked(
                            BrowserActionType.CLICK
                    );
        }

        /*
         * 현재 DOM의 실제 속성으로
         * 보안정책도 다시 계산한다.
         *
         * Snapshot에 있던 SecurityPolicy만
         * 그대로 믿지 않는다.
         */
        BrowserActionPolicyContext context =
                policyContextResolver
                        .resolveMetadata(
                                locator.getAttribute(
                                        "data-ddd-policy"
                                ),
                                locator.getAttribute(
                                        "type"
                                ),
                                locator.getAttribute(
                                        "id"
                                ),
                                locator.getAttribute(
                                        "name"
                                ),
                                locator.getAttribute(
                                        "autocomplete"
                                ),
                                locator.getAttribute(
                                        "aria-label"
                                ),
                                locator.textContent(),
                                BrowserActionType.CLICK
                        );

        /*
         * 절대 실행 불가 대상.
         */
        if (context.blockedTarget()) {

            return BrowserActionExecutionResult
                    .blocked(
                            BrowserActionType.CLICK
                    );
        }

        /*
         * 비밀번호 / OTP / 보안정보 대상은
         * Viewer CLICK에서도 보안 입력 모드로 넘긴다.
         */
        if (context.sensitiveInput()) {

            return BrowserActionExecutionResult
                    .secureInputRequired(
                            BrowserActionType.CLICK
                    );
        }

        /*
         * 최종 송금/가입/결제 버튼은
         * Viewer에서 사용자가 한 번 클릭했다고
         * 바로 실행하지 않는다.
         *
         * 별도 Final Confirmation Gate로 보낸다.
         */
        if (context.finalExecution()) {

            return BrowserActionExecutionResult
                    .finalConfirmationRequired(
                            BrowserActionType.CLICK
                    );
        }

        /*
         * 중요:
         *
         * userChoice / optionalConsent는
         * AI 자동 클릭이면 USER_ACTION_REQUIRED지만,
         *
         * 이 Public Action API 자체가
         * Viewer에서 실제 사용자가 선택해서 보낸
         * CLICK 요청이므로 여기서는 실행을 허용한다.
         */

        locator.click();

        return BrowserActionExecutionResult
                .executed(
                        BrowserActionType.CLICK
                );
    }

    private void validateText(
            String value,
            String fieldName
    ) {
        if (value == null
                || value.isBlank()) {

            throw new IllegalArgumentException(
                    fieldName
                            + "은 비어 있을 수 없습니다."
            );
        }
    }
}