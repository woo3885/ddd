package com.ddd.backend.automation.session;

import com.microsoft.playwright.Browser;
import com.microsoft.playwright.BrowserContext;
import com.microsoft.playwright.BrowserType;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.Playwright;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class BrowserSessionManager implements AutoCloseable {

    private static final Logger log =
            LoggerFactory.getLogger(BrowserSessionManager.class);

    private final Map<String, BrowserSession> sessions =
            new ConcurrentHashMap<>();

    private Playwright playwright;
    private Browser browser;
    private boolean closed;

    public synchronized BrowserSession createSession(
            String sessionId
    ) {
        validateSessionId(sessionId);
        ensureManagerOpen();

        if (sessions.containsKey(sessionId)) {
            throw new IllegalStateException(
                    "이미 생성된 브라우저 세션입니다. sessionId="
                            + sessionId
            );
        }

        ensureBrowserStarted();

        BrowserContext context = browser.newContext();

        try {
            Page page = context.newPage();

            BrowserSession browserSession =
                    new BrowserSession(
                            sessionId,
                            context,
                            page
                    );

            sessions.put(sessionId, browserSession);

            return browserSession;
        } catch (RuntimeException exception) {
            context.close();
            throw exception;
        }
    }

    public synchronized boolean exists(
            String sessionId
    ) {
        validateSessionId(sessionId);

        BrowserSession session = sessions.get(sessionId);

        return session != null && !session.isClosed();
    }

    public synchronized int activeSessionCount() {
        return (int) sessions.values()
                .stream()
                .filter(session -> !session.isClosed())
                .count();
    }

    public synchronized String currentUrl(
            String sessionId
    ) {
        return getRequiredSession(sessionId).currentUrl();
    }

    public synchronized void closeSession(
            String sessionId
    ) {
        validateSessionId(sessionId);

        BrowserSession session = sessions.remove(sessionId);

        if (session == null) {
            throw new IllegalArgumentException(
                    "브라우저 세션을 찾을 수 없습니다. sessionId="
                            + sessionId
            );
        }

        session.close();
    }

    private BrowserSession getRequiredSession(
            String sessionId
    ) {
        validateSessionId(sessionId);

        BrowserSession session = sessions.get(sessionId);

        if (session == null || session.isClosed()) {
            throw new IllegalArgumentException(
                    "브라우저 세션을 찾을 수 없습니다. sessionId="
                            + sessionId
            );
        }

        return session;
    }

    private void ensureBrowserStarted() {
        if (browser != null && browser.isConnected()) {
            return;
        }

        if (playwright == null) {
            playwright = Playwright.create();
        }

        try {
            browser = playwright.chromium().launch(
                    new BrowserType.LaunchOptions()
                            .setHeadless(true)
            );
        } catch (RuntimeException exception) {
            playwright.close();
            playwright = null;
            browser = null;

            throw exception;
        }
    }

    private void ensureManagerOpen() {
        if (closed) {
            throw new IllegalStateException(
                    "종료된 브라우저 세션 관리자입니다."
            );
        }
    }

    private void validateSessionId(
            String sessionId
    ) {
        if (sessionId == null || sessionId.isBlank()) {
            throw new IllegalArgumentException(
                    "브라우저 세션 ID는 비어 있을 수 없습니다."
            );
        }
    }

    @PreDestroy
    @Override
    public synchronized void close() {
        if (closed) {
            return;
        }

        closed = true;

        for (BrowserSession session : sessions.values()) {
            try {
                session.close();
            } catch (RuntimeException exception) {
                log.warn(
                        "Browser session close failed. exceptionType={}",
                        exception.getClass().getSimpleName()
                );
            }
        }

        sessions.clear();

        if (browser != null) {
            try {
                browser.close();
            } catch (RuntimeException exception) {
                log.warn(
                        "Browser close failed. exceptionType={}",
                        exception.getClass().getSimpleName()
                );
            } finally {
                browser = null;
            }
        }

        if (playwright != null) {
            try {
                playwright.close();
            } catch (RuntimeException exception) {
                log.warn(
                        "Playwright close failed. exceptionType={}",
                        exception.getClass().getSimpleName()
                );
            } finally {
                playwright = null;
            }
        }
    }
}