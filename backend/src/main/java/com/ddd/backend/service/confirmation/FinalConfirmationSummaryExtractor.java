package com.ddd.backend.service.confirmation;

import com.ddd.backend.automation.dom.SanitizedDomSnapshot;
import org.springframework.stereotype.Component;

import java.util.stream.Stream;

@Component
public final class FinalConfirmationSummaryExtractor {
    public FinalConfirmationSummary extract(SanitizedDomSnapshot snapshot) {
        String amount = snapshot.elements().stream()
                .flatMap(element -> Stream.of(element.text(), element.ariaLabel()))
                .filter(java.util.Objects::nonNull)
                .filter(value -> value.matches(".*[0-9][0-9,]*\\s*원.*"))
                .findFirst().orElse(null);
        return new FinalConfirmationSummary(
                snapshot.page().productName(), snapshot.page().productPeriod(), amount);
    }
}
