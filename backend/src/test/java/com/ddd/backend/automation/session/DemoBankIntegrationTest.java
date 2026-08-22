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
import com.ddd.backend.security.capture.BrowserFrameCaptureService;
import com.ddd.backend.automation.BrowserActionPolicyContextResolver;
import com.ddd.backend.automation.dom.DomSanitizer;
import com.ddd.backend.automation.dom.InteractiveElementExtractor;
import com.ddd.backend.automation.dom.SanitizedDomSnapshot;
import com.ddd.backend.automation.dom.SanitizedDomSnapshotService;
import com.ddd.backend.ai.DepositPageClassifier;
import com.ddd.backend.ai.DepositScreenInspector;

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
    void D25_실제_Demo_다섯화면의_Sanitized_DOM_계약을_검증한다() {
        try (PlaywrightWorker worker = new PlaywrightWorker();
             BrowserSessionManager manager = new BrowserSessionManager(worker)) {
            String sessionId = "demo-deposit-fixture";
            manager.createSession(sessionId);
            SanitizedDomSnapshotService snapshots = new SanitizedDomSnapshotService(
                    manager, new InteractiveElementExtractor(manager),
                    new BrowserActionPolicyContextResolver(manager), new DomSanitizer());

            manager.navigate(sessionId, java.net.URI.create(BASE_URL + "/deposit/products"));
            SanitizedDomSnapshot products = snapshots.createSnapshot(sessionId);
            org.assertj.core.api.Assertions.assertThat(products.elements().stream()
                            .filter(e -> e.securityPolicy()
                                    == SanitizedDomSnapshot.SecurityPolicy.USER_DECISION)
                            .map(SanitizedDomSnapshot.ElementSnapshot::text).toList())
                    .contains("12개월 정기예금", "우대금리 정기예금");

            for (String path : java.util.List.of(
                    "/deposit/products/deposit-12m",
                    "/deposit/conditions/deposit-12m",
                    "/deposit/terms/deposit-12m",
                    "/deposit/secure/password/deposit-12m")) {
                manager.navigate(sessionId, java.net.URI.create(BASE_URL + path));
                SanitizedDomSnapshot snapshot = snapshots.createSnapshot(sessionId);
                org.assertj.core.api.Assertions.assertThat(snapshot.page().url())
                        .endsWith(path);
                org.assertj.core.api.Assertions.assertThat(snapshot.elements())
                        .allMatch(element -> element.elementId()
                                .startsWith(snapshot.snapshotId().replace("snap-", "el-") + "-"));
            }

            SanitizedDomSnapshot secure = snapshots.createSnapshot(sessionId);
            org.assertj.core.api.Assertions.assertThat(secure.elements())
                    .anyMatch(element -> "password".equals(element.inputType())
                            && element.securityPolicy()
                            == SanitizedDomSnapshot.SecurityPolicy.SECURE_INPUT);
        }
    }

    @Test
    void D25_실제_Demo_두_예금상품의_URL과_DOM기간을_검증한다() {
        try (PlaywrightWorker worker = new PlaywrightWorker();
             BrowserSessionManager manager = new BrowserSessionManager(worker)) {
            String sessionId = "demo-deposit-products-period";
            manager.createSession(sessionId);
            DepositScreenInspector inspector = new DepositScreenInspector(
                    manager, new DepositPageClassifier());

            for (String productId : java.util.List.of(
                    "deposit-12m", "deposit-preferred")) {
                manager.navigate(sessionId, java.net.URI.create(
                        BASE_URL + "/deposit/products/" + productId));

                DepositScreenInspector.Inspection result = inspector.inspect(sessionId);
                SanitizedDomSnapshotService snapshots = new SanitizedDomSnapshotService(
                        manager, new InteractiveElementExtractor(manager),
                        new BrowserActionPolicyContextResolver(manager), new DomSanitizer());
                SanitizedDomSnapshot snapshot = snapshots.createSnapshot(sessionId);

                org.assertj.core.api.Assertions.assertThat(result.valid()).isTrue();
                org.assertj.core.api.Assertions.assertThat(result.productId())
                        .isEqualTo(productId);
                org.assertj.core.api.Assertions.assertThat(result.productName())
                        .isNotBlank();
                org.assertj.core.api.Assertions.assertThat(result.periodLabel())
                        .isEqualTo("12개월");
                org.assertj.core.api.Assertions.assertThat(snapshot.page().productId())
                        .isEqualTo(productId);
                org.assertj.core.api.Assertions.assertThat(snapshot.page().productName())
                        .isEqualTo(result.productName());
                org.assertj.core.api.Assertions.assertThat(snapshot.page().productPeriod())
                        .isEqualTo(result.periodLabel());
            }
        }
    }

    @Test
    void D26_실제_Demo_보안입력_완료후_secure_DOM이_제거된다() {
        try (PlaywrightWorker worker = new PlaywrightWorker();
             BrowserSessionManager manager = new BrowserSessionManager(worker)) {
            String sessionId = "demo-secure-d26";
            manager.createSession(sessionId);
            manager.navigate(sessionId, java.net.URI.create(
                    BASE_URL + "/deposit/secure/password/deposit-12m"));

            manager.execute(sessionId, COMMAND_TIMEOUT, page -> {
                page.locator("#input-account-password").fill("demo-only-secret");
                page.locator("#btn-secure-input-complete").click();
                assertThat(page.locator("[data-ddd-policy=secure-input]")).hasCount(0);
                assertThat(page.locator("[data-ddd-secure-state=completed]")).isVisible();
                return null;
            });

            com.ddd.backend.ai.DepositScreenInspector inspector =
                    new com.ddd.backend.ai.DepositScreenInspector(
                            manager, new com.ddd.backend.ai.DepositPageClassifier());
            org.assertj.core.api.Assertions.assertThat(inspector.inspect(sessionId).valid())
                    .isTrue();
            org.assertj.core.api.Assertions.assertThat(
                    new FrameCaptureGuard(manager).evaluate(sessionId))
                    .isEqualTo(FrameCaptureDecision.ALLOW);
        }
    }

    @Test
    void D26_실제_Demo_사용자직접완료후_raw없는_API계약으로_안전재개한다() {
        try (PlaywrightWorker worker = new PlaywrightWorker();
             BrowserSessionManager manager = new BrowserSessionManager(worker)) {
            var session = com.ddd.backend.domain.session.AutomationSession.create(
                    "데모 보안 입력 직접 완료");
            session.transitionTo(com.ddd.backend.domain.session.WorkflowStatus.SECURE_INPUT_REQUIRED);
            String sessionId = session.getSessionId();
            manager.createSession(sessionId);
            manager.navigate(sessionId, java.net.URI.create(
                    BASE_URL + "/deposit/secure/password/deposit-12m"));

            var repository = org.mockito.Mockito.mock(
                    com.ddd.backend.domain.session.AutomationSessionRepository.class);
            org.mockito.Mockito.when(repository.findById(sessionId))
                    .thenReturn(java.util.Optional.of(session));
            org.mockito.Mockito.when(repository.save(session)).thenReturn(session);
            var frames = new com.ddd.backend.frame.BrowserFrameStore();
            frames.publish(sessionId, new com.ddd.backend.security.capture.CapturedBrowserFrame(
                    new byte[]{1}, 1280, 720, "image/png"));
            var publisher = org.mockito.Mockito.mock(
                    com.ddd.backend.websocket.publisher.AutomationStatusEventPublisher.class);
            var frameHandler = org.mockito.Mockito.mock(
                    com.ddd.backend.websocket.frame.BrowserFrameWebSocketHandler.class);
            var agentLoop = org.mockito.Mockito.mock(com.ddd.backend.ai.AgentLoopService.class);
            @SuppressWarnings("unchecked")
            org.springframework.beans.factory.ObjectProvider<com.ddd.backend.ai.AgentLoopService>
                    provider = org.mockito.Mockito.mock(
                    org.springframework.beans.factory.ObjectProvider.class);
            org.mockito.Mockito.when(provider.getObject()).thenReturn(agentLoop);
            org.mockito.Mockito.when(agentLoop.start(sessionId)).thenReturn(true);
            var registry = new com.ddd.backend.security.secureinput.SecureInputRegistry();
            var capture = new BrowserFrameCaptureService(
                    manager, new FrameCaptureGuard(manager));
            var service = new com.ddd.backend.security.secureinput.SecureInputService(
                    registry, manager, repository, frames, capture, frameHandler,
                    publisher, provider);

            var active = service.activate(sessionId);
            org.assertj.core.api.Assertions.assertThat(
                    new FrameCaptureGuard(manager).evaluate(sessionId))
                    .isEqualTo(FrameCaptureDecision.SECURE_INPUT_BLOCKED);

            // Test fixture가 headed 사용자의 직접 조작 경계를 대신한다.
            manager.execute(sessionId, COMMAND_TIMEOUT, page -> {
                page.locator("#input-account-password").fill("fixture-only");
                page.locator("#btn-secure-input-complete").click();
                return null;
            });

            var response = service.submit(sessionId, active.secureRequestId(),
                    new com.ddd.backend.api.dto.session.CompleteSecureInputRequest(
                            "req-demo-001", active.frameId(), active.frameSequence()));

            org.assertj.core.api.Assertions.assertThat(response.sessionId()).isEqualTo(sessionId);
            org.assertj.core.api.Assertions.assertThat(response.status())
                    .isEqualTo("COMPLETION_ACCEPTED");
            org.assertj.core.api.Assertions.assertThat(registry.active(sessionId)).isEmpty();
            org.assertj.core.api.Assertions.assertThat(frames.latest(sessionId).orElseThrow()
                    .metadata().sequence()).isEqualTo(2L);
            org.mockito.Mockito.verify(agentLoop, org.mockito.Mockito.times(1)).start(sessionId);
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
