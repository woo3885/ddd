package com.ddd.backend.service.confirmation;

import com.ddd.backend.domain.session.ConfirmationType;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class FinalConfirmationStoreTest {
    @Test
    void Backend가_ID를_생성하고_승인을_exactly_once로_소비한다() {
        FinalConfirmationStore store = new FinalConfirmationStore();
        FinalConfirmationRequest request = store.activate(
                "session-001", ConfirmationType.DEPOSIT_SUBSCRIPTION,
                "el-final", "snap-001",
                new FinalConfirmationSummary("정기예금", "12개월", "1,000,000원"));

        assertThat(request.confirmationId()).startsWith("confirm-");
        assertThat(store.consume("session-001", request.confirmationId()))
                .isEqualTo(request);
        assertThatThrownBy(() -> store.consume(
                "session-001", request.confirmationId()))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("이미 처리");
    }

    @Test
    void 다른_confirmationId는_거부하고_active를_유지한다() {
        FinalConfirmationStore store = new FinalConfirmationStore();
        FinalConfirmationRequest request = store.activate(
                "session-001", ConfirmationType.DEPOSIT_SUBSCRIPTION,
                "el-final", "snap-001",
                new FinalConfirmationSummary(null, null, null));

        assertThatThrownBy(() -> store.consume("session-001", "confirm-other"))
                .isInstanceOf(IllegalStateException.class);
        assertThat(store.active("session-001")).contains(request);
    }

    @Test
    void source_frame과_requestId가_일치할_때만_한번_소비한다() {
        FinalConfirmationStore store = new FinalConfirmationStore();
        FinalConfirmationRequest request = store.activate(
                "session-001", ConfirmationType.DEPOSIT_SUBSCRIPTION,
                "el-final", "snap-001", "frm-001", 7L,
                new FinalConfirmationSummary("정기예금", "12개월", "1,000,000원"));

        assertThatThrownBy(() -> store.consume(
                "session-001", request.confirmationId(), "req-001",
                "frm-stale", 6L))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("오래된 Viewer Frame");

        assertThat(store.consume(
                "session-001", request.confirmationId(), "req-001",
                "frm-001", 7L)).isEqualTo(request);

        assertThatThrownBy(() -> store.consume(
                "session-001", request.confirmationId(), "req-001",
                "frm-001", 7L))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("이미 처리된");
    }
}
