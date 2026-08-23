package com.ddd.backend.service.confirmation;

import com.ddd.backend.domain.session.ConfirmationType;

public record FinalConfirmationRequest(
        String confirmationId,
        ConfirmationType confirmationType,
        String confirmationTargetElementId,
        String sourceSnapshotId,
        FinalConfirmationSummary summary
) {
}
