package com.ddd.backend.service.confirmation;

import com.ddd.backend.domain.session.ConfirmationType;
import org.springframework.stereotype.Component;

import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Component
public final class FinalConfirmationStore {
    private final ConcurrentHashMap<String, State> states = new ConcurrentHashMap<>();

    public FinalConfirmationRequest activate(String sessionId, ConfirmationType type,
            String targetElementId, String sourceSnapshotId,
            FinalConfirmationSummary summary) {
        FinalConfirmationRequest request = new FinalConfirmationRequest(
                "confirm-" + UUID.randomUUID(), type, targetElementId,
                sourceSnapshotId, summary);
        if (states.putIfAbsent(sessionId, new State(request)) != null) {
            throw new IllegalStateException("이미 처리 중인 최종 확인이 있습니다.");
        }
        return request;
    }

    public Optional<FinalConfirmationRequest> active(String sessionId) {
        State state = states.get(sessionId);
        return state == null || state.consumed ? Optional.empty()
                : Optional.of(state.request);
    }

    public FinalConfirmationRequest consume(String sessionId, String confirmationId) {
        State state = states.get(sessionId);
        if (state == null || !state.request.confirmationId().equals(confirmationId)) {
            throw new IllegalStateException("현재 최종 확인 요청과 일치하지 않습니다.");
        }
        synchronized (state) {
            if (state.consumed) {
                throw new IllegalStateException("이미 처리된 최종 확인 요청입니다.");
            }
            state.consumed = true;
            return state.request;
        }
    }

    public void clear(String sessionId) { states.remove(sessionId); }

    private static final class State {
        private final FinalConfirmationRequest request;
        private boolean consumed;
        private State(FinalConfirmationRequest request) { this.request = request; }
    }
}
