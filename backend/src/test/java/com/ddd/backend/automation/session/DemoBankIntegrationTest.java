package com.ddd.backend.automation.session;

import com.ddd.backend.automation.worker.PlaywrightWorker;
import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;

import static com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat;
import com.ddd.backend.security.capture.FrameCaptureDecision;
import com.ddd.backend.security.capture.FrameCaptureGuard;

@EnabledIfEnvironmentVariable(
        named = "RUN_DEMO_BANK_INTEGRATION",
        matches = "true"
)
class DemoBankIntegrationTest {

    private static final String BASE_URL =
            System.getenv().getOrDefault(
                    "DEMO_BANK_BASE_URL",
                    "http://127.0.0.1:5190"
            );

    private static final Duration COMMAND_TIMEOUT =
            Duration.ofSeconds(15);

    @Test
    void 예금_상품을_선택할_수_있다() {
        try (
                PlaywrightWorker worker =
                        new PlaywrightWorker();

                BrowserSessionManager manager =
                        new BrowserSessionManager(worker)
        ) {
            String sessionId =
                    "demo-deposit-session";

            manager.createSession(sessionId);

            manager.execute(
                    sessionId,
                    COMMAND_TIMEOUT,
                    page -> {
                        page.navigate(BASE_URL);

                        assertThat(
                                page.locator("#page-home")
                        ).isVisible();

                        page.locator(
                                "#btn-start-deposit"
                        ).click();

                        page.waitForURL(
                                "**/deposit/products"
                        );

                        assertThat(
                                page.locator(
                                        "#page-deposit-products"
                                )
                        ).isVisible();

                        Locator selectButton =
                                page.locator(
                                        "#btn-select-deposit-12m"
                                );

                        assertThat(selectButton)
                                .hasAttribute(
                                        "aria-pressed",
                                        "false"
                                );

                        selectButton.click();

                        assertThat(selectButton)
                                .hasAttribute(
                                        "aria-pressed",
                                        "true"
                                );

                        assertThat(
                                page.locator(
                                        "#status-selected-deposit-product"
                                )
                        ).containsText(
                                "12개월 정기예금이 선택되었습니다."
                        );

                        saveScreenshot(
                                page,
                                "demo-deposit-selection.png"
                        );

                        return null;
                    }
            );
        }
    }

    @Test
    void D25_정기예금_전체경로는_password에서_보안중단한다() {
        try (PlaywrightWorker worker = new PlaywrightWorker();
             BrowserSessionManager manager = new BrowserSessionManager(worker)) {
            String sessionId = "demo-deposit-d25";
            manager.createSession(sessionId);
            manager.execute(sessionId, COMMAND_TIMEOUT, page -> {
                page.navigate(BASE_URL + "/deposit/products");
                page.locator("#btn-select-deposit-12m").click();
                page.locator("#btn-deposit-product-next").click();
                page.waitForURL("**/deposit/products/deposit-12m");
                page.locator("#btn-deposit-amount-start").click();
                page.waitForURL("**/deposit/conditions/deposit-12m");
                page.locator("#input-deposit-amount").fill("1000000");
                page.locator("#btn-deposit-amount-confirm").click();
                page.locator("#btn-deposit-terms-start").click();
                page.waitForURL("**/deposit/terms/deposit-12m");
                page.locator("#checkbox-term-service-required").check();
                page.locator("#checkbox-term-privacy-required").check();
                page.locator("#btn-deposit-terms-confirm").click();
                page.locator("#btn-deposit-terms-next").click();
                page.waitForURL("**/deposit/secure/password/deposit-12m");
                assertThat(page.locator("#input-account-password"))
                        .hasAttribute("data-ddd-policy", "secure-input");
                return null;
            });

            FrameCaptureGuard guard = new FrameCaptureGuard(manager);
            org.assertj.core.api.Assertions.assertThat(guard.evaluate(sessionId))
                    .isEqualTo(FrameCaptureDecision.SECURE_INPUT_BLOCKED);
        }
    }

    @Test
    void 출금_계좌를_선택할_수_있다() {
        try (
                PlaywrightWorker worker =
                        new PlaywrightWorker();

                BrowserSessionManager manager =
                        new BrowserSessionManager(worker)
        ) {
            String sessionId =
                    "demo-transfer-session";

            manager.createSession(sessionId);

            manager.execute(
                    sessionId,
                    COMMAND_TIMEOUT,
                    page -> {
                        page.navigate(BASE_URL);

                        assertThat(
                                page.locator("#page-home")
                        ).isVisible();

                        page.locator(
                                "#btn-start-transfer"
                        ).click();

                        page.waitForURL(
                                "**/transfer/accounts"
                        );

                        assertThat(
                                page.locator(
                                        "#page-transfer-accounts"
                                )
                        ).isVisible();

                        Locator selectButton =
                                page.locator(
                                        "#btn-select-account-living-expense"
                                );

                        assertThat(selectButton)
                                .hasAttribute(
                                        "aria-pressed",
                                        "false"
                                );

                        selectButton.click();

                        assertThat(selectButton)
                                .hasAttribute(
                                        "aria-pressed",
                                        "true"
                                );

                        assertThat(
                                page.locator(
                                        "#status-selected-transfer-account"
                                )
                        ).containsText(
                                "생활비 계좌가 선택되었습니다."
                        );

                        saveScreenshot(
                                page,
                                "demo-transfer-selection.png"
                        );

                        return null;
                    }
            );
        }
    }

    private void saveScreenshot(
            Page page,
            String fileName
    ) throws IOException {

        Path screenshotPath =
                Path.of(
                        "build",
                        "playwright",
                        "demo-integration",
                        fileName
                );

        Files.createDirectories(
                screenshotPath.getParent()
        );

        page.screenshot(
                new Page.ScreenshotOptions()
                        .setPath(screenshotPath)
                        .setFullPage(true)
        );
    }
}
