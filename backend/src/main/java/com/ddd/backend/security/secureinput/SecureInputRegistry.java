package com.ddd.backend.security.secureinput;

import org.springframework.stereotype.Component;

import java.util.HashSet;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

/** 원문을 저장하지 않는 session별 D26 secure latch. */
@Component
public final class SecureInputRegistry {
    private final ConcurrentMap<String, State> states = new ConcurrentHashMap<>();

    public SecureInputRequest activate(
            String sessionId, SecureInputType type, String frameId, long frameSequence,
            String pageUrl
    ) {
        State state = states.computeIfAbsent(sessionId, ignored -> new State());
        synchronized (state) {
            if (state.active != null) return state.active;
            state.active = new SecureInputRequest(
                    "sec-" + UUID.randomUUID(), type, frameId, frameSequence,
                    "민감정보는 전용 보안 입력 화면에서 직접 입력해 주세요.");
            state.pageUrl = pageUrl;
            return state.active;
        }
    }

    public Optional<SecureInputRequest> active(String sessionId) {
        State state = states.get(sessionId);
        if (state == null) return Optional.empty();
        synchronized (state) {
            return Optional.ofNullable(state.active);
        }
    }

    public boolean isActive(String sessionId) {
        return active(sessionId).isPresent();
    }

    public boolean blocksCapture(String sessionId) {
        State state = states.get(sessionId);
        if (state == null) return false;
        synchronized (state) {
            return state.active != null && !state.safeCaptureAllowed;
        }
    }

    public void allowSingleSafeCapture(String sessionId, String secureRequestId) {
        State state = states.get(sessionId);
        if (state == null) throw rejected();
        synchronized (state) {
            if (state.active == null
                    || !state.active.secureRequestId().equals(secureRequestId)
                    || !state.inFlight) throw rejected();
            state.safeCaptureAllowed = true;
        }
    }

    public void finishSafeCapture(String sessionId) {
        State state = states.get(sessionId);
        if (state != null) synchronized (state) { state.safeCaptureAllowed = false; }
    }

    public String activePageUrl(String sessionId) {
        State state = states.get(sessionId);
        if (state == null) throw rejected();
        synchronized (state) {
            if (state.active == null) throw rejected();
            return state.pageUrl;
        }
    }

    public SecureInputRequest claim(
            String sessionId, String secureRequestId, String requestId,
            String expectedFrameId, long expectedSequence
    ) {
        State state = states.get(sessionId);
        if (state == null) throw rejected();
        synchronized (state) {
            SecureInputRequest active = state.active;
            if (active == null || !active.secureRequestId().equals(secureRequestId)
                    || !active.frameId().equals(expectedFrameId)
                    || active.frameSequence() != expectedSequence
                    || state.inFlight || state.processedRequestIds.contains(requestId)) {
                throw rejected();
            }
            state.inFlight = true;
            state.processedRequestIds.add(requestId);
            return active;
        }
    }

    public SecureInputRequest resolve(String sessionId, String secureRequestId) {
        State state = states.get(sessionId);
        if (state == null) throw rejected();
        synchronized (state) {
            if (state.active == null
                    || !state.active.secureRequestId().equals(secureRequestId)) throw rejected();
            SecureInputRequest resolved = state.active;
            state.active = null;
            state.pageUrl = null;
            state.inFlight = false;
            state.safeCaptureAllowed = false;
            return resolved;
        }
    }

    public void releaseFailedSubmission(String sessionId) {
        State state = states.get(sessionId);
        if (state != null) synchronized (state) { state.inFlight = false; }
    }

    public void removeSession(String sessionId) {
        if (sessionId != null) states.remove(sessionId);
    }

    private IllegalStateException rejected() {
        return new IllegalStateException("보안 입력 요청을 처리할 수 없습니다.");
    }

    private static final class State {
        private SecureInputRequest active;
        private boolean inFlight;
        private String pageUrl;
        private boolean safeCaptureAllowed;
        private final Set<String> processedRequestIds = new HashSet<>();
    }
}
