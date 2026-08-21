package com.ddd.backend.ai;

import com.ddd.backend.automation.BrowserActionExecutionStatus;
import com.ddd.backend.common.exception.SessionNotFoundException;
import com.ddd.backend.domain.session.AutomationSession;
import com.ddd.backend.domain.session.AutomationSessionRepository;
import com.ddd.backend.domain.session.WorkflowStatus;
import com.ddd.backend.security.capture.FrameCaptureDecision;
import com.ddd.backend.security.capture.FrameCaptureGuard;
import com.ddd.backend.websocket.publisher.AutomationStatusEventPublisher;
import com.ddd.backend.frame.BrowserFrameStore;
import com.ddd.backend.frame.BrowserFrameMetadata;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.Duration;
import java.time.Instant;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.concurrent.ExecutionException;

/** D25 production Agent loop의 세션별 단일 실행 경계. */
@Service
public final class AgentLoopService {

    static final int MAX_STEPS = 20;
    static final Duration LOOP_TIMEOUT = Duration.ofSeconds(45);

    private static final Logger log = LoggerFactory.getLogger(AgentLoopService.class);
    private static final Set<WorkflowStatus> STOP_STATUSES = Set.of(
            WorkflowStatus.USER_DECISION_REQUIRED,
            WorkflowStatus.ADDITIONAL_INFORMATION_REQUIRED,
            WorkflowStatus.SECURE_INPUT_REQUIRED,
            WorkflowStatus.FINAL_CONFIRMATION_REQUIRED,
            WorkflowStatus.RISK_WARNING,
            WorkflowStatus.CANCELLED,
            WorkflowStatus.ERROR,
            WorkflowStatus.TERMINATED,
            WorkflowStatus.COMPLETED
    );

    private final AutomationSessionRepository sessionRepository;
    private final AiDecisionExecutionService executionService;
    private final FrameCaptureGuard frameCaptureGuard;
    private final AutomationStatusEventPublisher statusEventPublisher;
    private final DepositScreenInspector screenInspector;
    private final int maxSteps;
    private final Duration loopTimeout;
    private final ActionReplayGuard replayGuard;
    private final BrowserFrameStore frameStore;
    private final ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor();
    private final Set<String> scheduled = ConcurrentHashMap.newKeySet();
    private final Set<String> resumeRequested = ConcurrentHashMap.newKeySet();

    @Autowired
    public AgentLoopService(
            AutomationSessionRepository sessionRepository,
            AiDecisionExecutionService executionService,
            FrameCaptureGuard frameCaptureGuard,
            AutomationStatusEventPublisher statusEventPublisher,
            DepositScreenInspector screenInspector,
            ActionReplayGuard replayGuard,
            BrowserFrameStore frameStore
    ) {
        this(sessionRepository, executionService, frameCaptureGuard,
                statusEventPublisher, screenInspector, replayGuard,
                frameStore, MAX_STEPS, LOOP_TIMEOUT);
    }

    AgentLoopService(
            AutomationSessionRepository sessionRepository,
            AiDecisionExecutionService executionService,
            FrameCaptureGuard frameCaptureGuard,
            AutomationStatusEventPublisher statusEventPublisher,
            DepositScreenInspector screenInspector
    ) {
        this(sessionRepository, executionService, frameCaptureGuard,
                statusEventPublisher, screenInspector, new ActionReplayGuard(),
                null, MAX_STEPS, LOOP_TIMEOUT);
    }

    AgentLoopService(
            AutomationSessionRepository sessionRepository,
            AiDecisionExecutionService executionService,
            FrameCaptureGuard frameCaptureGuard,
            AutomationStatusEventPublisher statusEventPublisher,
            DepositScreenInspector screenInspector,
            BrowserFrameStore frameStore
    ) {
        this(sessionRepository, executionService, frameCaptureGuard,
                statusEventPublisher, screenInspector, new ActionReplayGuard(),
                frameStore, MAX_STEPS, LOOP_TIMEOUT);
    }

    AgentLoopService(
            AutomationSessionRepository sessionRepository,
            AiDecisionExecutionService executionService,
            FrameCaptureGuard frameCaptureGuard,
            AutomationStatusEventPublisher statusEventPublisher,
            DepositScreenInspector screenInspector,
            int maxSteps,
            Duration loopTimeout
    ) {
        this(sessionRepository, executionService, frameCaptureGuard,
                statusEventPublisher, screenInspector, new ActionReplayGuard(),
                null, maxSteps, loopTimeout);
    }

    private AgentLoopService(
            AutomationSessionRepository sessionRepository,
            AiDecisionExecutionService executionService,
            FrameCaptureGuard frameCaptureGuard,
            AutomationStatusEventPublisher statusEventPublisher,
            DepositScreenInspector screenInspector,
            ActionReplayGuard replayGuard,
            BrowserFrameStore frameStore,
            int maxSteps,
            Duration loopTimeout
    ) {
        this.sessionRepository = sessionRepository;
        this.executionService = executionService;
        this.frameCaptureGuard = frameCaptureGuard;
        this.statusEventPublisher = statusEventPublisher;
        this.screenInspector = screenInspector;
        if (maxSteps <= 0 || loopTimeout == null || loopTimeout.isNegative()) {
            throw new IllegalArgumentException("Agent loop 제한값이 올바르지 않습니다.");
        }
        this.maxSteps = maxSteps;
        this.loopTimeout = loopTimeout;
        this.replayGuard = replayGuard;
        this.frameStore = frameStore;
    }

    /** REST 응답을 막지 않고 최초/재개 실행을 exactly-once로 예약한다. */
    public boolean start(String sessionId) {
        validateSessionId(sessionId);
        if (!scheduled.add(sessionId)) {
            return false;
        }
        executor.execute(() -> runSafely(sessionId));
        return true;
    }

    /** WAITING loop가 정리 중이면 종료 직후 재예약해 resume 유실을 막는다. */
    public boolean resume(String sessionId) {
        validateSessionId(sessionId);
        resumeRequested.add(sessionId);
        if (!scheduled.contains(sessionId)) {
            resumeRequested.remove(sessionId);
            return start(sessionId);
        }
        return true;
    }

    public void cancel(String sessionId) {
        if (sessionId != null) {
            scheduled.remove(sessionId);
            resumeRequested.remove(sessionId);
            replayGuard.removeSession(sessionId);
        }
    }

    boolean isScheduled(String sessionId) {
        return scheduled.contains(sessionId);
    }

    void runNowForTest(String sessionId) {
        if (!scheduled.add(sessionId)) {
            return;
        }
        runSafely(sessionId);
    }

    private void runSafely(String sessionId) {
        Instant deadline = Instant.now().plus(loopTimeout);
        String previousActionKey = null;
        try {
            for (int step = 1; step <= maxSteps; step++) {
                AutomationSession session = sessionRepository.findById(sessionId)
                        .orElseThrow(() -> new SessionNotFoundException(sessionId));
                if (!scheduled.contains(sessionId) || STOP_STATUSES.contains(session.getStatus())) {
                    return;
                }
                if (!Instant.now().isBefore(deadline)) {
                    failSafely(session, "자동화 실행 제한 시간을 초과했습니다.");
                    return;
                }

                // secure 화면에서는 Snapshot/AI/Action을 만들기 전에 fail-closed 한다.
                DepositScreenInspector.Inspection inspection =
                        screenInspector.inspect(sessionId);
                if (!inspection.valid()) {
                    failSafely(session, "예금 화면의 안전 계약을 확인할 수 없습니다.");
                    return;
                }
                FrameCaptureDecision captureDecision = frameCaptureGuard.evaluate(sessionId);
                DepositPageClassifier.DepositPage page = inspection.screen();
                if (captureDecision == FrameCaptureDecision.SECURE_INPUT_BLOCKED) {
                    transition(session, WorkflowStatus.SECURE_INPUT_REQUIRED,
                            "민감정보는 사용자가 직접 입력해야 합니다.");
                    return;
                }
                if (page == DepositPageClassifier.DepositPage.SECURE_PASSWORD) {
                    failSafely(session, "비밀번호 화면의 보안 입력 요소를 확인할 수 없습니다.");
                    return;
                }
                if (captureDecision != FrameCaptureDecision.ALLOW) {
                    failSafely(session, "화면 보안 상태를 확인할 수 없습니다.");
                    return;
                }

                BrowserFrameMetadata beforeFrame = latestFrame(sessionId);
                AiDecisionExecutionResult result = executeBeforeDeadline(
                        sessionId, deadline);
                AutomationSession after = sessionRepository.findById(sessionId)
                        .orElseThrow(() -> new SessionNotFoundException(sessionId));
                if (STOP_STATUSES.contains(after.getStatus())
                        || result.status() != BrowserActionExecutionStatus.EXECUTED) {
                    return;
                }
                if (!validateFrameAdvance(sessionId, beforeFrame, after)) {
                    return;
                }
                if (result.actionKey().equals(previousActionKey)) {
                    failSafely(after, "동일한 자동화 행동 반복을 안전하게 중단했습니다.");
                    return;
                }
                previousActionKey = result.actionKey();
            }

            sessionRepository.findById(sessionId).ifPresent(session ->
                    failSafely(session, "자동화 최대 실행 단계를 초과했습니다."));
        } catch (RuntimeException exception) {
            sessionRepository.findById(sessionId).ifPresent(session -> failSafely(
                    session, "자동화 실행 중 안전하게 중단되었습니다."));
            log.warn("D25 Agent loop 중단. exceptionType={}",
                    exception.getClass().getSimpleName());
        } finally {
            scheduled.remove(sessionId);
            if (resumeRequested.remove(sessionId)) {
                AutomationSession session = sessionRepository.findById(sessionId)
                        .orElse(null);
                if (session != null && !STOP_STATUSES.contains(session.getStatus())) {
                    start(sessionId);
                }
            }
        }
    }

    private BrowserFrameMetadata latestFrame(String sessionId) {
        if (frameStore == null) return null;
        return frameStore.latest(sessionId).map(payload -> payload.metadata()).orElse(null);
    }

    private boolean validateFrameAdvance(
            String sessionId,
            BrowserFrameMetadata before,
            AutomationSession session
    ) {
        if (frameStore == null) return true;
        BrowserFrameMetadata after = latestFrame(sessionId);
        if (before != null && after != null
                && !before.frameId().equals(after.frameId())
                && after.sequence() > before.sequence()) {
            return true;
        }
        if (frameCaptureGuard.evaluate(sessionId)
                == FrameCaptureDecision.SECURE_INPUT_BLOCKED) {
            transition(session, WorkflowStatus.SECURE_INPUT_REQUIRED,
                    "민감정보는 사용자가 직접 입력해야 합니다.");
        } else {
            failSafely(session, "Action 후 새 Viewer Frame을 확인할 수 없습니다.");
        }
        return false;
    }

    private AiDecisionExecutionResult executeBeforeDeadline(
            String sessionId,
            Instant deadline
    ) {
        long remainingMillis = Duration.between(Instant.now(), deadline).toMillis();
        if (remainingMillis <= 0) {
            throw new AgentLoopTimeoutException();
        }
        Future<AiDecisionExecutionResult> future = executor.submit(
                () -> executionService.execute(sessionId));
        try {
            return future.get(remainingMillis, TimeUnit.MILLISECONDS);
        } catch (TimeoutException exception) {
            future.cancel(true);
            throw new AgentLoopTimeoutException();
        } catch (InterruptedException exception) {
            future.cancel(true);
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Agent loop가 중단되었습니다.");
        } catch (ExecutionException exception) {
            Throwable cause = exception.getCause();
            if (cause instanceof RuntimeException runtimeException) {
                throw runtimeException;
            }
            throw new IllegalStateException("Agent loop 실행에 실패했습니다.");
        }
    }

    private void failSafely(AutomationSession session, String message) {
        if (STOP_STATUSES.contains(session.getStatus())) {
            return;
        }
        transition(session, WorkflowStatus.ERROR, message);
    }

    private void transition(AutomationSession session, WorkflowStatus status, String message) {
        try {
            session.transitionTo(status);
            sessionRepository.save(session);
            statusEventPublisher.publish(session.getSessionId(), status, message);
        } catch (RuntimeException exception) {
            log.warn("D25 Agent loop 상태 반영 실패. exceptionType={}",
                    exception.getClass().getSimpleName());
        }
    }

    private void validateSessionId(String sessionId) {
        if (sessionId == null || sessionId.isBlank()) {
            throw new IllegalArgumentException("세션 ID는 비어 있을 수 없습니다.");
        }
    }

    @PreDestroy
    void close() {
        scheduled.clear();
        executor.shutdownNow();
    }

    private static final class AgentLoopTimeoutException
            extends RuntimeException {
    }
}
