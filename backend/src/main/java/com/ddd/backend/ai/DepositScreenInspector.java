package com.ddd.backend.ai;

import com.ddd.backend.automation.session.BrowserSessionManager;
import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import org.springframework.stereotype.Component;

import java.time.Duration;

/** D25 예금 화면의 URL과 필수 DOM/policy 계약을 같은 Page에서 검증한다. */
@Component
public final class DepositScreenInspector {

    private static final Duration TIMEOUT = Duration.ofSeconds(5);
    private final BrowserSessionManager browserSessionManager;
    private final DepositPageClassifier classifier;

    public DepositScreenInspector(
            BrowserSessionManager browserSessionManager,
            DepositPageClassifier classifier
    ) {
        this.browserSessionManager = browserSessionManager;
        this.classifier = classifier;
    }

    public Inspection inspect(String sessionId) {
        return browserSessionManager.execute(sessionId, TIMEOUT, this::inspectPage);
    }

    Inspection inspectPage(Page page) {
        DepositPageClassifier.DepositPage screen = classifier.classify(page.url());
        boolean valid = switch (screen) {
            case PRODUCT_LIST -> visible(page, "#page-deposit-products")
                    && visible(page, "#btn-select-deposit-12m")
                    && visible(page, "#btn-select-deposit-preferred")
                    && visible(page, "#btn-deposit-product-next");
            case PRODUCT_DETAIL -> visible(page, "#page-deposit-product-detail")
                    && visible(page, "#summary-deposit-product-period")
                    && visible(page, "#btn-deposit-amount-start");
            case CONDITIONS -> visible(page, "#page-deposit-amount")
                    && inputType(page, "#input-deposit-amount", "text")
                    && visible(page, "#btn-deposit-amount-confirm")
                    && visible(page, "#btn-deposit-terms-start");
            case TERMS -> visible(page, "#page-deposit-terms")
                    && checkbox(page, "#checkbox-term-service-required", true)
                    && checkbox(page, "#checkbox-term-privacy-required", true)
                    && checkbox(page, "#checkbox-term-marketing-optional", false)
                    && visible(page, "#btn-deposit-terms-confirm")
                    && safeTermsNext(page);
            case SECURE_PASSWORD -> visible(page, "#page-deposit-password")
                    && securePassword(page);
            case OTHER -> true;
            case UNKNOWN -> false;
        };
        return new Inspection(screen, valid);
    }

    private boolean safeTermsNext(Page page) {
        Locator button = page.locator("#btn-deposit-terms-next");
        String policy = button.count() == 0 ? null : button.first().getAttribute("data-ddd-policy");
        return button.count() == 1
                && !"secure-input".equalsIgnoreCase(policy)
                && !"final-confirmation".equalsIgnoreCase(policy);
    }

    private boolean securePassword(Page page) {
        Locator input = page.locator("#input-account-password");
        return input.count() == 1
                && input.first().isVisible()
                && "password".equalsIgnoreCase(input.first().getAttribute("type"))
                && "secure-input".equalsIgnoreCase(
                        input.first().getAttribute("data-ddd-policy"));
    }

    private boolean checkbox(Page page, String selector, boolean required) {
        Locator input = page.locator(selector);
        return input.count() == 1
                && "checkbox".equalsIgnoreCase(input.first().getAttribute("type"))
                && required == (input.first().getAttribute("required") != null);
    }

    private boolean inputType(Page page, String selector, String type) {
        Locator input = page.locator(selector);
        return input.count() == 1
                && input.first().isVisible()
                && type.equalsIgnoreCase(input.first().getAttribute("type"));
    }

    private boolean visible(Page page, String selector) {
        Locator locator = page.locator(selector);
        return locator.count() == 1 && locator.first().isVisible();
    }

    public record Inspection(
            DepositPageClassifier.DepositPage screen,
            boolean valid
    ) {}
}
