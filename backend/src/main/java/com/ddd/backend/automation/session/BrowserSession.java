package com.ddd.backend.automation.session;

import com.microsoft.playwright.BrowserContext;
import com.microsoft.playwright.Page;

import java.time.Instant;
import java.util.Objects;
import java.util.concurrent.atomic.AtomicBoolean;

public final class BrowserSession implements AutoCloseable {

    private final String sessionId;
    private final BrowserContext browserContext;
    private final Page page;
    private final Instant createdAt;
    private final AtomicBoolean closed;

    public BrowserSession(
            String sessionId,
            BrowserContext browserContext,
            Page page
    ) {
        if (sessionId == null || sessionId.isBlank()) {
            throw new IllegalArgumentException(
                    "브라우저 세션 ID는 비어 있을 수 없습니다."
            );
        }

        this.sessionId = sessionId;
        this.browserContext = Objects.requireNonNull(
                browserContext,
                "BrowserContext는 필수입니다."
        );
        this.page = Objects.requireNonNull(
                page,
                "Page는 필수입니다."
        );
        this.createdAt = Instant.now();
        this.closed = new AtomicBoolean(false);
    }

    public String sessionId() {
        return sessionId;
    }

    BrowserContext browserContext() {
        ensureOpen();
        return browserContext;
    }

    Page page() {
        ensureOpen();
        return page;
    }

    public Instant createdAt() {
        return createdAt;
    }

    String currentUrl() {
        ensureOpen();
        return page.url();
    }

    public boolean isClosed() {
        return closed.get();
    }

    private void ensureOpen() {
        if (closed.get()) {
            throw new IllegalStateException(
                    "이미 종료된 브라우저 세션입니다."
            );
        }
    }

    @Override
    public void close() {
        if (closed.compareAndSet(false, true)) {
            browserContext.close();
        }
    }
}