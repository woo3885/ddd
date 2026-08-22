package com.ddd.backend.automation.dom;

import com.ddd.backend.automation.BrowserActionPolicyContext;
import com.ddd.backend.automation.BrowserActionPolicyContextResolver;
import com.ddd.backend.automation.BrowserActionType;
import com.ddd.backend.automation.session.BrowserSessionManager;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import java.util.HashSet;
import java.util.Set;
import com.ddd.backend.security.secureinput.SecureInputRegistry;

@Service
public final class SanitizedDomSnapshotService {

    private static final String SCHEMA_VERSION =
            "1.0";

    private static final int MAX_ELEMENTS =
            300;

    private static final Duration SNAPSHOT_TIMEOUT =
            Duration.ofSeconds(
                    10
            );

    private final BrowserSessionManager browserSessionManager;

    private final InteractiveElementExtractor elementExtractor;

    private final BrowserActionPolicyContextResolver policyResolver;

    private final DomSanitizer sanitizer;

    private final ElementRegistry elementRegistry;
    private SecureInputRegistry secureInputRegistry;

    @Autowired
    void setSecureInputRegistry(SecureInputRegistry secureInputRegistry) {
        this.secureInputRegistry = secureInputRegistry;
    }

    /*
     * 실제 Spring 실행에서는
     * 공유 ElementRegistry Bean을 사용한다.
     */
    @Autowired
    public SanitizedDomSnapshotService(
            BrowserSessionManager browserSessionManager,
            InteractiveElementExtractor elementExtractor,
            BrowserActionPolicyContextResolver policyResolver,
            DomSanitizer sanitizer,
            ElementRegistry elementRegistry
    ) {
        this.browserSessionManager =
                Objects.requireNonNull(
                        browserSessionManager
                );

        this.elementExtractor =
                Objects.requireNonNull(
                        elementExtractor
                );

        this.policyResolver =
                Objects.requireNonNull(
                        policyResolver
                );

        this.sanitizer =
                Objects.requireNonNull(
                        sanitizer
                );

        this.elementRegistry =
                Objects.requireNonNull(
                        elementRegistry
                );
    }

    /*
     * 기존 D15 테스트와의 호환용 생성자.
     */
    public SanitizedDomSnapshotService(
            BrowserSessionManager browserSessionManager,
            InteractiveElementExtractor elementExtractor,
            BrowserActionPolicyContextResolver policyResolver,
            DomSanitizer sanitizer
    ) {
        this(
                browserSessionManager,
                elementExtractor,
                policyResolver,
                sanitizer,
                new ElementRegistry(
                        sanitizer
                )
        );
    }

    public SanitizedDomSnapshot createSnapshot(
            String sessionId
    ) {
        validateSessionId(
                sessionId
        );

        if (secureInputRegistry != null && secureInputRegistry.isActive(sessionId)) {
            throw new IllegalStateException("보안 입력 중에는 DOM Snapshot을 생성할 수 없습니다.");
        }

        String token =
                UUID.randomUUID()
                        .toString()
                        .replace(
                                "-",
                                ""
                        )
                        .substring(
                                0,
                                8
                        );

        String snapshotId =
                "snap-"
                        + token;

        return browserSessionManager.execute(
                sessionId,
                SNAPSHOT_TIMEOUT,
                page -> {

                    List<InteractiveElement> rawElements =
                            elementExtractor
                                    .extractFromPage(
                                            page
                                    );

                    List<SanitizedDomSnapshot.ElementSnapshot>
                            sanitizedElements =
                            new ArrayList<>();

                    Set<String> userDecisionLabels = new HashSet<>();

                    /*
                     * D16 Registry 등록용 데이터.
                     *
                     * Locator는 저장하지 않는다.
                     */
                    List<ElementRegistry.ElementRegistration>
                            registrations =
                            new ArrayList<>();

                    int sequence =
                            1;

                    for (InteractiveElement element :
                            rawElements) {

                        if (!element.visible()) {
                            continue;
                        }

                        if (sanitizedElements.size()
                                >= MAX_ELEMENTS) {

                            break;
                        }

                        String elementId =
                                "el-"
                                        + token
                                        + "-"
                                        + String.format(
                                        "%03d",
                                        sequence
                                );

                        sequence++;

                        BrowserActionPolicyContext
                                policyContext =
                                policyResolver
                                        .resolveMetadata(
                                                element.explicitPolicy(),
                                                element.inputType(),
                                                element.domId(),
                                                element.name(),
                                                element.autocomplete(),
                                                element.ariaLabel(),
                                                element.text(),
                                                BrowserActionType.CLICK
                                        );

                        SanitizedDomSnapshot.SecurityPolicy
                                securityPolicy =
                                toSecurityPolicy(
                                        policyContext
                                );

                        SanitizedDomSnapshot.BoundingBoxSnapshot
                                boundingBox =
                                toBoundingBox(
                                        element
                                );

                        /*
                         * AI 전달용 값.
                         */
                        String sanitizedRole =
                                sanitizer
                                        .sanitizeNullableText(
                                                element.role()
                                        );

                        String sanitizedText =
                                sanitizer
                                        .sanitizeText(
                                                element.text()
                                        );

                        String sanitizedAriaLabel =
                                sanitizer
                                        .sanitizeNullableText(
                                                element.ariaLabel()
                                        );

                        String sanitizedPlaceholder =
                                sanitizer
                                        .sanitizeNullableText(
                                                element.placeholder()
                                        );

                        String sanitizedInputType =
                                sanitizer
                                        .sanitizeNullableText(
                                        element.inputType()
                                        );

                        if (securityPolicy == SanitizedDomSnapshot.SecurityPolicy.USER_DECISION
                                && !sanitizedText.isBlank()
                                && !userDecisionLabels.add(sanitizedText)) {
                            throw new IllegalStateException(
                                    "사용자 선택 label을 안전하게 구분할 수 없습니다.");
                        }

                        sanitizedElements.add(
                                new SanitizedDomSnapshot
                                        .ElementSnapshot(
                                        elementId,
                                        element.tagName(),
                                        sanitizedRole,
                                        sanitizedText,
                                        sanitizedAriaLabel,
                                        sanitizedPlaceholder,
                                        sanitizedInputType,
                                        element.visible(),
                                        element.enabled(),
                                        element.checked(),
                                        boundingBox,
                                        securityPolicy
                                )
                        );

                        /*
                         * Registry에는 AI에 전달한
                         * Sanitized fingerprint와
                         * 내부 식별 속성만 저장한다.
                         *
                         * input value는 여기에도 없다.
                         */
                        registrations.add(
                                new ElementRegistry
                                        .ElementRegistration(
                                        elementId,
                                        element.tagName(),
                                        sanitizedText,
                                        sanitizedRole,
                                        sanitizedAriaLabel,
                                        sanitizedPlaceholder,
                                        sanitizedInputType,
                                        normalizeNullable(
                                                element.domId()
                                        ),
                                        normalizeNullable(
                                                element.name()
                                        ),
                                        normalizeNullableLowercase(
                                                element.autocomplete()
                                        ),
                                        normalizeNullableLowercase(
                                                element.explicitPolicy()
                                        )
                                )
                        );
                    }

                    SanitizedDomSnapshot.PageSnapshot
                            pageSnapshot =
                            new SanitizedDomSnapshot
                                    .PageSnapshot(
                                    sanitizer.sanitizeUrl(
                                            page.url()
                                    ),
                                    sanitizer.sanitizeText(
                                            page.title()
                                    ),
                                    detailProductId(page.url(), page),
                                    detailSemanticText(page,
                                            "#summary-deposit-product-name"),
                                    detailSemanticText(page,
                                            "#summary-deposit-product-period")
                            );

                    /*
                     * D16 핵심.
                     *
                     * Snapshot 반환 전에
                     * elementId ↔ fingerprint를 등록한다.
                     *
                     * 동일 Session의 이전 Snapshot은
                     * 여기서 교체된다.
                     */
                    elementRegistry.replaceSnapshot(
                            sessionId,
                            snapshotId,
                            page.url(),
                            registrations
                    );

                    return new SanitizedDomSnapshot(
                            SCHEMA_VERSION,
                            snapshotId,
                            pageSnapshot,
                            sanitizedElements
                    );
                }
        );
    }

    private String detailProductId(String url, com.microsoft.playwright.Page page) {
        if (page.locator("#page-deposit-product-detail").count() != 1) return null;
        String path = java.net.URI.create(url).getPath();
        String productId = path.substring(path.lastIndexOf('/') + 1);
        return sanitizer.sanitizeNullableText(productId);
    }

    private String detailSemanticText(com.microsoft.playwright.Page page, String selector) {
        com.microsoft.playwright.Locator locator = page.locator(selector);
        if (locator.count() != 1 || !locator.first().isVisible()) return null;
        return sanitizer.sanitizeNullableText(locator.first().textContent());
    }

    private SanitizedDomSnapshot.SecurityPolicy
    toSecurityPolicy(
            BrowserActionPolicyContext context
    ) {
        if (context.blockedTarget()) {

            return SanitizedDomSnapshot
                    .SecurityPolicy
                    .BLOCKED;
        }

        if (context.sensitiveInput()) {

            return SanitizedDomSnapshot
                    .SecurityPolicy
                    .SECURE_INPUT;
        }

        if (context.finalExecution()) {

            return SanitizedDomSnapshot
                    .SecurityPolicy
                    .FINAL_CONFIRMATION;
        }

        if (context.userChoice()
                || context.optionalConsent()) {

            return SanitizedDomSnapshot
                    .SecurityPolicy
                    .USER_DECISION;
        }

        return SanitizedDomSnapshot
                .SecurityPolicy
                .NORMAL;
    }

    private SanitizedDomSnapshot.BoundingBoxSnapshot
    toBoundingBox(
            InteractiveElement element
    ) {
        if (!element.hasBoundingBox()) {
            return null;
        }

        return new SanitizedDomSnapshot
                .BoundingBoxSnapshot(
                element.x(),
                element.y(),
                element.width(),
                element.height()
        );
    }

    private String normalizeNullable(
            String value
    ) {
        if (value == null
                || value.isBlank()) {

            return null;
        }

        return value.trim();
    }

    private String normalizeNullableLowercase(
            String value
    ) {
        String normalized =
                normalizeNullable(
                        value
                );

        if (normalized == null) {
            return null;
        }

        return normalized.toLowerCase();
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
