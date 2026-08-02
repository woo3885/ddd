package com.ddd.backend.automation;

import com.ddd.backend.automation.session.BrowserSessionManager;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Objects;

@Service
public final class BrowserActionExecutor {

    private static final Duration ACTION_TIMEOUT =
            Duration.ofSeconds(15);

    private final BrowserSessionManager browserSessionManager;
    private final BrowserActionValidator actionValidator;
    private final BrowserActionPolicyContextResolver contextResolver;
    private final BrowserActionPolicyEvaluator policyEvaluator;

    public BrowserActionExecutor(
            BrowserSessionManager browserSessionManager,
            BrowserActionValidator actionValidator,
            BrowserActionPolicyContextResolver contextResolver,
            BrowserActionPolicyEvaluator policyEvaluator
    ) {
        this.browserSessionManager =
                Objects.requireNonNull(
                        browserSessionManager,
                        "BrowserSessionManager는 필수입니다."
                );

        this.actionValidator =
                Objects.requireNonNull(
                        actionValidator,
                        "BrowserActionValidator는 필수입니다."
                );

        this.contextResolver =
                Objects.requireNonNull(
                        contextResolver,
                        "BrowserActionPolicyContextResolver는 필수입니다."
                );

        this.policyEvaluator =
                Objects.requireNonNull(
                        policyEvaluator,
                        "BrowserActionPolicyEvaluator는 필수입니다."
                );
    }

    public BrowserActionExecutionResult execute(
            String sessionId,
            BrowserAction action
    ) {
        validateSessionId(sessionId);
        actionValidator.validate(action);

        BrowserActionPolicyContext context =
                contextResolver.resolve(
                        sessionId,
                        action
                );

        BrowserActionPolicyResult policyResult =
                policyEvaluator.evaluate(
                        action,
                        context
                );

        return switch (policyResult.decision()) {
            case ALLOW ->
                    executeAllowedAction(
                            sessionId,
                            action
                    );

            case USER_ACTION_REQUIRED ->
                    BrowserActionExecutionResult
                            .userActionRequired(
                                    action.type()
                            );

            case SECURE_INPUT_REQUIRED ->
                    BrowserActionExecutionResult
                            .secureInputRequired(
                                    action.type()
                            );

            case FINAL_CONFIRMATION_REQUIRED ->
                    BrowserActionExecutionResult
                            .finalConfirmationRequired(
                                    action.type()
                            );

            case BLOCKED -> {
                if (action.type()
                        == BrowserActionType.STOP) {

                    yield BrowserActionExecutionResult
                            .stopped();
                }

                yield BrowserActionExecutionResult
                        .blocked(action.type());
            }
        };
    }

    private BrowserActionExecutionResult executeAllowedAction(
            String sessionId,
            BrowserAction action
    ) {
        return switch (action.type()) {
            case NONE ->
                    BrowserActionExecutionResult.noAction();

            case CLICK,
                 TYPE,
                 SELECT,
                 SCROLL,
                 PRESS_KEY,
                 GO_BACK,
                 REFRESH,
                 WAIT ->
                    executePageAction(
                            sessionId,
                            action
                    );

            case WAIT_FOR_USER ->
                    BrowserActionExecutionResult
                            .userActionRequired(
                                    action.type()
                            );

            case PAUSE_FOR_SECURE_INPUT ->
                    BrowserActionExecutionResult
                            .secureInputRequired(
                                    action.type()
                            );

            case REQUEST_FINAL_CONFIRMATION ->
                    BrowserActionExecutionResult
                            .finalConfirmationRequired(
                                    action.type()
                            );

            case STOP ->
                    BrowserActionExecutionResult.stopped();
        };
    }

    private BrowserActionExecutionResult executePageAction(
            String sessionId,
            BrowserAction action
    ) {
        return browserSessionManager.execute(
                sessionId,
                ACTION_TIMEOUT,
                page -> {
                    switch (action.type()) {
                        case CLICK ->
                                page.locator(
                                        action.selector()
                                ).click();

                        case TYPE ->
                                page.locator(
                                        action.selector()
                                ).fill(
                                        action.value()
                                );

                        case SELECT ->
                                page.locator(
                                        action.selector()
                                ).selectOption(
                                        action.value()
                                );

                        case SCROLL ->
                                page.mouse().wheel(
                                        scrollX(action),
                                        scrollY(action)
                                );

                        case PRESS_KEY ->
                                page.keyboard().press(
                                        action.value()
                                );

                        case GO_BACK ->
                                page.goBack();

                        case REFRESH ->
                                page.reload();

                        case WAIT ->
                                page.waitForTimeout(
                                        action.waitMillis()
                                );

                        default ->
                                throw new IllegalStateException(
                                        "실행 대상이 아닌 브라우저 행동입니다."
                                );
                    }

                    return BrowserActionExecutionResult
                            .executed(action.type());
                }
        );
    }

    private int scrollX(
            BrowserAction action
    ) {
        return action.scrollX() == null
                ? 0
                : action.scrollX();
    }

    private int scrollY(
            BrowserAction action
    ) {
        return action.scrollY() == null
                ? 0
                : action.scrollY();
    }

    private void validateSessionId(
            String sessionId
    ) {
        if (sessionId == null
                || sessionId.isBlank()) {

            throw new IllegalArgumentException(
                    "브라우저 세션 ID는 비어 있을 수 없습니다."
            );
        }
    }
}