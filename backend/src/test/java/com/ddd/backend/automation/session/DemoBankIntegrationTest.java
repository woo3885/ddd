package com.ddd.backend.automation.session;

import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;

import static com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

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

    @Test
    void 예금_상품을_선택할_수_있다() throws IOException {
        try (BrowserSessionManager manager =
                     new BrowserSessionManager()) {

            BrowserSession session =
                    manager.createSession("demo-deposit-session");

            Page page = session.page();

            page.navigate(BASE_URL);

            assertThat(
                    page.locator("#page-home")
            ).isVisible();

            page.locator("#btn-start-deposit").click();

            page.waitForURL("**/deposit/products");

            assertThat(
                    page.locator("#page-deposit-products")
            ).isVisible();

            Locator selectButton =
                    page.locator("#btn-select-deposit-12m");

            assertThat(selectButton)
                    .hasAttribute("aria-pressed", "false");

            selectButton.click();

            assertThat(selectButton)
                    .hasAttribute("aria-pressed", "true");

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
        }
    }

    @Test
    void 출금_계좌를_선택할_수_있다() throws IOException {
        try (BrowserSessionManager manager =
                     new BrowserSessionManager()) {

            BrowserSession session =
                    manager.createSession("demo-transfer-session");

            Page page = session.page();

            page.navigate(BASE_URL);

            assertThat(
                    page.locator("#page-home")
            ).isVisible();

            page.locator("#btn-start-transfer").click();

            page.waitForURL("**/transfer/accounts");

            assertThat(
                    page.locator("#page-transfer-accounts")
            ).isVisible();

            Locator selectButton =
                    page.locator(
                            "#btn-select-account-living-expense"
                    );

            assertThat(selectButton)
                    .hasAttribute("aria-pressed", "false");

            selectButton.click();

            assertThat(selectButton)
                    .hasAttribute("aria-pressed", "true");

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
        }
    }

    private void saveScreenshot(
            Page page,
            String fileName
    ) throws IOException {

        Path screenshotPath = Path.of(
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