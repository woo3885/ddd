package com.ddd.backend.automation.session;

import com.ddd.backend.automation.worker.BrowserTask;
import com.ddd.backend.automation.worker.BrowserTaskResult;
import com.ddd.backend.automation.worker.BrowserTaskStatus;
import com.ddd.backend.automation.worker.PlaywrightWorker;
import com.microsoft.playwright.Browser;
import com.microsoft.playwright.BrowserContext;
import com.microsoft.playwright.BrowserType;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.Playwright;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.concurrent.atomic.AtomicBoolean;

@Service
public class BrowserSessionManager implements AutoCloseable {

    private static final Logger log =
            LoggerFactory.getLogger(
                    BrowserSessionManager.class
            );

    private static final Duration SESSION_CREATE_TIMEOUT =
            Duration.ofSeconds(15);

    private static final Duration SESSION_CLOSE_TIMEOUT =
            Duration.ofSeconds(10);

    private static final Duration URL_READ_TIMEOUT =
            Duration.ofSeconds(5);

    private static final Duration MANAGER_CLOSE_TIMEOUT =
            Duration.ofSeconds(15);

    private static final long WAIT_MARGIN_MILLIS =
            2_000L;

    private static final String MANAGER_TASK_SESSION_ID =
            "browser-session-manager";

    private final Map<String, BrowserSession> sessions =
            new ConcurrentHashMap<>();

    private final PlaywrightWorker playwrightWorker;

    private final AtomicBoolean closed =
            new AtomicBoolean(false);

    /*
     * Playwright, Browser, BrowserContext, Page는
     * 반드시 PlaywrightWorker 스레드에서만 접근한다.
     */
    private Playwright playwright;
    private Browser browser;

    public BrowserSessionManager(
            PlaywrightWorker playwrightWorker
    ) {
        this.playwrightWorker =
                Objects.requireNonNull(
                        playwrightWorker,
                        "PlaywrightWorker는 필수입니다."
                );
    }

    public synchronized void createSession(
            String sessionId
    ) {
        validateSessionId(sessionId);
        ensureManagerOpen();

        if (sessions.containsKey(sessionId)) {
            throw new IllegalStateException(
                    "이미 생성된 브라우저 세션입니다."
            );
        }

        executeWorkerTask(
                sessionId,
                SESSION_CREATE_TIMEOUT,
                () -> {
                    createSessionOnWorker(sessionId);
                    return null;
                }
        );
    }

    public synchronized boolean exists(
            String sessionId
    ) {
        validateSessionId(sessionId);

        BrowserSession session =
                sessions.get(sessionId);

        return session != null
                && !session.isClosed();
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
        return execute(
                sessionId,
                URL_READ_TIMEOUT,
                Page::url
        );
    }

    public synchronized <T> T execute(
            String sessionId,
            Duration timeout,
            BrowserCommand<T> command
    ) {
        validateSessionId(sessionId);
        validateTimeout(timeout);
        ensureManagerOpen();

        Objects.requireNonNull(
                command,
                "브라우저 명령은 필수입니다."
        );

        if (!exists(sessionId)) {
            throw new IllegalArgumentException(
                    "브라우저 세션을 찾을 수 없습니다."
            );
        }

        return executeWorkerTask(
                sessionId,
                timeout,
                () -> {
                    BrowserSession session =
                            getRequiredSessionOnWorker(
                                    sessionId
                            );

                    return command.execute(
                            session.page()
                    );
                }
        );
    }

    public synchronized void closeSession(
            String sessionId
    ) {
        validateSessionId(sessionId);
        ensureManagerOpen();

        if (!exists(sessionId)) {
            throw new IllegalArgumentException(
                    "브라우저 세션을 찾을 수 없습니다."
            );
        }

        executeWorkerTask(
                sessionId,
                SESSION_CLOSE_TIMEOUT,
                () -> {
                    closeSessionOnWorker(sessionId);
                    return null;
                }
        );
    }

    private void createSessionOnWorker(
            String sessionId
    ) {
        /*
         * 실제 생성 직전에도 중복 여부를 확인한다.
         */
        if (sessions.containsKey(sessionId)) {
            throw new IllegalStateException(
                    "이미 생성된 브라우저 세션입니다."
            );
        }

        ensureBrowserStartedOnWorker();

        BrowserContext context =
                browser.newContext();

        try {
            Page page =
                    context.newPage();

            BrowserSession browserSession =
                    new BrowserSession(
                            sessionId,
                            context,
                            page
                    );

            sessions.put(
                    sessionId,
                    browserSession
            );

        } catch (RuntimeException exception) {
            context.close();
            throw exception;
        }
    }

    private BrowserSession getRequiredSessionOnWorker(
            String sessionId
    ) {
        BrowserSession session =
                sessions.get(sessionId);

        if (session == null
                || session.isClosed()) {

            throw new IllegalArgumentException(
                    "브라우저 세션을 찾을 수 없습니다."
            );
        }

        return session;
    }

    private void closeSessionOnWorker(
            String sessionId
    ) {
        BrowserSession session =
                sessions.remove(sessionId);

        if (session == null
                || session.isClosed()) {

            throw new IllegalArgumentException(
                    "브라우저 세션을 찾을 수 없습니다."
            );
        }

        session.close();
    }

    private void ensureBrowserStartedOnWorker() {
        if (browser != null
                && browser.isConnected()) {

            return;
        }

        if (playwright == null) {
            playwright =
                    Playwright.create();
        }

        try {
            browser =
                    playwright.chromium().launch(
                            new BrowserType.LaunchOptions()
                                    .setHeadless(true)
                    );

        } catch (RuntimeException exception) {
            closePlaywrightAfterLaunchFailure();
            throw exception;
        }
    }

    private void closePlaywrightAfterLaunchFailure() {
        if (playwright != null) {
            try {
                playwright.close();

            } catch (RuntimeException closeException) {
                log.warn(
                        "Playwright cleanup failed. "
                                + "exceptionType={}",
                        closeException
                                .getClass()
                                .getSimpleName()
                );
            }
        }

        playwright = null;
        browser = null;
    }

    private <T> T executeWorkerTask(
            String sessionId,
            Duration timeout,
            BrowserTaskCommand<T> command
    ) {
        BrowserTask<T> task =
                BrowserTask.create(
                        sessionId,
                        timeout,
                        command::execute
                );

        CompletableFuture<BrowserTaskResult<T>> future =
                playwrightWorker.submit(task);

        BrowserTaskResult<T> result =
                waitForResult(
                        task,
                        future
                );

        return unwrapResult(result);
    }

    private <T> BrowserTaskResult<T> waitForResult(
            BrowserTask<T> task,
            CompletableFuture<BrowserTaskResult<T>> future
    ) {
        long waitMillis =
                task.getTimeout().toMillis()
                        + WAIT_MARGIN_MILLIS;

        try {
            return future.get(
                    waitMillis,
                    TimeUnit.MILLISECONDS
            );

        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();

            throw new IllegalStateException(
                    "브라우저 작업 대기 중 중단되었습니다."
            );

        } catch (TimeoutException exception) {
            throw new IllegalStateException(
                    "Playwright Worker 응답 제한시간을 "
                            + "초과했습니다."
            );

        } catch (ExecutionException exception) {
            throw new IllegalStateException(
                    "Playwright Worker 작업 처리에 "
                            + "실패했습니다."
            );
        }
    }

    private <T> T unwrapResult(
            BrowserTaskResult<T> result
    ) {
        if (result.status()
                == BrowserTaskStatus.SUCCESS) {

            return result.data();
        }

        String safeMessage =
                result.message();

        if (safeMessage == null
                || safeMessage.isBlank()) {

            safeMessage =
                    "브라우저 작업 처리에 실패했습니다.";
        }

        if (result.status()
                == BrowserTaskStatus.TIMED_OUT) {

            throw new IllegalStateException(
                    safeMessage
            );
        }

        if (result.status()
                == BrowserTaskStatus.CANCELLED) {

            throw new IllegalStateException(
                    safeMessage
            );
        }

        throw new IllegalStateException(
                safeMessage
        );
    }

    private void ensureManagerOpen() {
        if (closed.get()) {
            throw new IllegalStateException(
                    "종료된 브라우저 세션 관리자입니다."
            );
        }
    }

    private void validateSessionId(
            String sessionId
    ) {
        if (sessionId == null
                || sessionId.isBlank()) {

            throw new IllegalArgumentException(
                    "브라우저 세션 ID는 "
                            + "비어 있을 수 없습니다."
            );
        }
    }

    private void validateTimeout(
            Duration timeout
    ) {
        if (timeout == null
                || timeout.isZero()
                || timeout.isNegative()) {

            throw new IllegalArgumentException(
                    "브라우저 명령 제한시간은 "
                            + "0보다 커야 합니다."
            );
        }
    }

    @PreDestroy
    @Override
    public synchronized void close() {
        if (!closed.compareAndSet(false, true)) {
            return;
        }

        try {
            BrowserTask<Void> task =
                    BrowserTask.create(
                            MANAGER_TASK_SESSION_ID,
                            MANAGER_CLOSE_TIMEOUT,
                            () -> {
                                closeResourcesOnWorker();
                                return null;
                            }
                    );

            BrowserTaskResult<Void> result =
                    waitForResult(
                            task,
                            playwrightWorker.submit(task)
                    );

            if (result.status()
                    != BrowserTaskStatus.SUCCESS) {

                log.warn(
                        "Browser manager close failed. "
                                + "status={}",
                        result.status()
                );
            }

        } catch (RuntimeException exception) {
            log.warn(
                    "Browser manager close failed. "
                            + "exceptionType={}",
                    exception.getClass()
                            .getSimpleName()
            );
        }
    }

    private void closeResourcesOnWorker() {
        for (BrowserSession session :
                sessions.values()) {

            try {
                session.close();

            } catch (RuntimeException exception) {
                log.warn(
                        "Browser session close failed. "
                                + "exceptionType={}",
                        exception.getClass()
                                .getSimpleName()
                );
            }
        }

        sessions.clear();

        if (browser != null) {
            try {
                browser.close();

            } catch (RuntimeException exception) {
                log.warn(
                        "Browser close failed. "
                                + "exceptionType={}",
                        exception.getClass()
                                .getSimpleName()
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
                        "Playwright close failed. "
                                + "exceptionType={}",
                        exception.getClass()
                                .getSimpleName()
                );

            } finally {
                playwright = null;
            }
        }
    }

    @FunctionalInterface
    private interface BrowserTaskCommand<T> {

        T execute() throws Exception;
    }
}