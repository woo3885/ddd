package com.ddd.backend.service.confirmation;

import com.ddd.backend.domain.session.ConfirmationType;
import org.springframework.stereotype.Component;

import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Component
public final class FinalConfirmationStore {
    private final ConcurrentHashMap<String, State> states = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Set<String>> processedRequestIds =
            new ConcurrentHashMap<>();

    public FinalConfirmationRequest activate(String sessionId, ConfirmationType type,
            String targetElementId, String sourceSnapshotId,
            String sourceFrameId, long sourceFrameSequence,
            FinalConfirmationSummary summary) {
        if (sourceFrameId == null || sourceFrameId.isBlank()
                || sourceFrameSequence < 1) {
            throw new IllegalArgumentException("최종 확인 source frame이 올바르지 않습니다.");
        }
        FinalConfirmationRequest request = new FinalConfirmationRequest(
                "confirm-" + UUID.randomUUID(), type, targetElementId,
                sourceSnapshotId, sourceFrameId, sourceFrameSequence, summary);
        if (states.putIfAbsent(sessionId, new State(request)) != null) {
            throw new IllegalStateException("이미 처리 중인 최종 확인이 있습니다.");
        }
        return request;
    }

    public FinalConfirmationRequest activate(String sessionId, ConfirmationType type,
            String targetElementId, String sourceSnapshotId,
            FinalConfirmationSummary summary) {
        return activate(sessionId, type, targetElementId, sourceSnapshotId,
                "legacy-frame", 1L, summary);
    }

    public Optional<FinalConfirmationRequest> active(String sessionId) {
        State state = states.get(sessionId);
        return state == null || state.consumed ? Optional.empty()
                : Optional.of(state.request);
    }

    public FinalConfirmationRequest consume(String sessionId, String confirmationId) {
        return consume(sessionId, confirmationId,
                "legacy-request-" + UUID.randomUUID(),
                active(sessionId).map(FinalConfirmationRequest::sourceFrameId)
                        .orElse("legacy-frame"),
                active(sessionId).map(FinalConfirmationRequest::sourceFrameSequence)
                        .orElse(1L));
    }

    public FinalConfirmationRequest consume(
            String sessionId,
            String confirmationId,
            String requestId,
            String frameId,
            long frameSequence
    ) {
        if (requestId == null || requestId.isBlank()) {
            throw new IllegalArgumentException("requestId는 필수입니다.");
        }
        Set<String> processed = processedRequestIds.computeIfAbsent(
                sessionId, ignored -> ConcurrentHashMap.newKeySet());
        if (processed.contains(requestId)) {
            throw new IllegalStateException("이미 처리된 최종 확인 요청입니다.");
        }
        State state = states.get(sessionId);
        if (state == null || !state.request.confirmationId().equals(confirmationId)) {
            throw new IllegalStateException("현재 최종 확인 요청과 일치하지 않습니다.");
        }
        synchronized (state) {
            if (state.consumed) {
                throw new IllegalStateException("이미 처리된 최종 확인 요청입니다.");
            }
            if (!state.request.sourceFrameId().equals(frameId)
                    || state.request.sourceFrameSequence() != frameSequence) {
                throw new IllegalStateException("오래된 Viewer Frame의 최종 확인 요청입니다.");
            }
            state.consumed = true;
            processed.add(requestId);
            return state.request;
        }
    }

    public void clear(String sessionId) { states.remove(sessionId); }

    public void removeSession(String sessionId) {
        states.remove(sessionId);
        processedRequestIds.remove(sessionId);
    }

    private static final class State {
        private final FinalConfirmationRequest request;
        private boolean consumed;
        private State(FinalConfirmationRequest request) { this.request = request; }
    }
}
