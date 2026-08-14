package com.ddd.backend.automation.dom;

import com.ddd.backend.automation.BrowserActionPolicyContext;
import com.ddd.backend.automation.BrowserActionPolicyContextResolver;
import com.ddd.backend.automation.BrowserActionType;
import com.ddd.backend.automation.session.BrowserSessionManager;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

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

    public SanitizedDomSnapshotService(
            BrowserSessionManager browserSessionManager,
            InteractiveElementExtractor elementExtractor,
            BrowserActionPolicyContextResolver policyResolver,
            DomSanitizer sanitizer
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
    }

    public SanitizedDomSnapshot createSnapshot(
            String sessionId
    ) {
        validateSessionId(
                sessionId
        );

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

                    int sequence =
                            1;

                    for (InteractiveElement element :
                            rawElements) {

                        /*
                         * AI에는 현재 보이는 요소만 전달.
                         */
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

                                                /*
                                                 * Snapshot의 interactive 후보는
                                                 * CLICK 관점으로 판정한다.
                                                 *
                                                 * user-choice 판정은
                                                 * CLICK/SELECT 둘 다 허용된다.
                                                 */
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

                        sanitizedElements.add(
                                new SanitizedDomSnapshot
                                        .ElementSnapshot(
                                        elementId,
                                        element.tagName(),
                                        sanitizer
                                                .sanitizeNullableText(
                                                        element.role()
                                                ),
                                        sanitizer
                                                .sanitizeText(
                                                        element.text()
                                                ),
                                        sanitizer
                                                .sanitizeNullableText(
                                                        element.ariaLabel()
                                                ),
                                        sanitizer
                                                .sanitizeNullableText(
                                                        element.placeholder()
                                                ),
                                        sanitizer
                                                .sanitizeNullableText(
                                                        element.inputType()
                                                ),
                                        element.visible(),
                                        element.enabled(),
                                        boundingBox,
                                        securityPolicy
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
                                    )
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

    private SanitizedDomSnapshot.SecurityPolicy
    toSecurityPolicy(
            BrowserActionPolicyContext context
    ) {
        /*
         * Action Policy와 같은 우선순위.
         */
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