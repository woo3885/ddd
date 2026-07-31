package com.ddd.backend.automation.session;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class BrowserSessionManagerTest {

    @Test
    void createsIsolatedBrowserContextsForEachSession() {
        try (BrowserSessionManager manager =
                     new BrowserSessionManager()) {

            BrowserSession firstSession =
                    manager.createSession("session-1");

            BrowserSession secondSession =
                    manager.createSession("session-2");

            assertNotSame(
                    firstSession.browserContext(),
                    secondSession.browserContext()
            );

            assertNotSame(
                    firstSession.page(),
                    secondSession.page()
            );

            firstSession.page().setContent("""
                    <!doctype html>
                    <html lang="ko">
                    <head>
                        <title>첫 번째 세션</title>
                    </head>
                    <body>
                        <h1>첫 번째 사용자 화면</h1>
                    </body>
                    </html>
                    """);

            secondSession.page().setContent("""
                    <!doctype html>
                    <html lang="ko">
                    <head>
                        <title>두 번째 세션</title>
                    </head>
                    <body>
                        <h1>두 번째 사용자 화면</h1>
                    </body>
                    </html>
                    """);

            assertEquals(
                    "첫 번째 세션",
                    firstSession.page().title()
            );

            assertEquals(
                    "두 번째 세션",
                    secondSession.page().title()
            );

            assertEquals(2, manager.activeSessionCount());
            assertTrue(manager.exists("session-1"));
            assertTrue(manager.exists("session-2"));
        }
    }

    @Test
    void closesOnlyRequestedBrowserSession() {
        try (BrowserSessionManager manager =
                     new BrowserSessionManager()) {

            BrowserSession firstSession =
                    manager.createSession("session-1");

            BrowserSession secondSession =
                    manager.createSession("session-2");

            manager.closeSession("session-1");

            assertTrue(firstSession.isClosed());
            assertFalse(secondSession.isClosed());

            assertFalse(manager.exists("session-1"));
            assertTrue(manager.exists("session-2"));
            assertEquals(1, manager.activeSessionCount());
        }
    }

    @Test
    void rejectsDuplicateSessionId() {
        try (BrowserSessionManager manager =
                     new BrowserSessionManager()) {

            manager.createSession("duplicate-session");

            IllegalStateException exception =
                    assertThrows(
                            IllegalStateException.class,
                            () -> manager.createSession(
                                    "duplicate-session"
                            )
                    );

            assertTrue(
                    exception.getMessage().contains(
                            "이미 생성된 브라우저 세션"
                    )
            );
        }
    }

    @Test
    void rejectsBlankSessionId() {
        try (BrowserSessionManager manager =
                     new BrowserSessionManager()) {

            assertThrows(
                    IllegalArgumentException.class,
                    () -> manager.createSession(" ")
            );
        }
    }
}