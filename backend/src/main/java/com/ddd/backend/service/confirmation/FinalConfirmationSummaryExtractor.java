package com.ddd.backend.service.confirmation;

import com.ddd.backend.automation.dom.SanitizedDomSnapshot;
import com.ddd.backend.security.SensitiveDataMasker;
import org.springframework.stereotype.Component;

import java.util.Objects;
import java.util.regex.Pattern;
import java.util.stream.Stream;

@Component
public final class FinalConfirmationSummaryExtractor {
    private static final Pattern PERIOD = Pattern.compile("^[0-9]{1,3}\\s*(개월|년)$");
    private static final Pattern AMOUNT = Pattern.compile(
            "(?<![0-9])([0-9][0-9,]*)\\s*원(?![0-9])");

    public FinalConfirmationSummary extract(SanitizedDomSnapshot snapshot) {
        Objects.requireNonNull(snapshot, "최종 확인 Snapshot은 필수입니다.");
        String amount = snapshot.elements().stream()
                .flatMap(element -> Stream.of(element.text(), element.ariaLabel()))
                .filter(java.util.Objects::nonNull)
                .map(String::trim)
                .filter(value -> SensitiveDataMasker.maskFreeText(value).equals(value))
                .map(AMOUNT::matcher)
                .filter(java.util.regex.Matcher::find)
                .map(matcher -> matcher.group(1) + "원")
                .findFirst().orElse(null);
        String productName = safeRequired(snapshot.page().productName(), "상품명", 100);
        String productPeriod = safeRequired(snapshot.page().productPeriod(), "가입 기간", 20);
        if (!PERIOD.matcher(productPeriod).matches()) {
            throw new IllegalStateException("최종 확인 가입 기간 형식이 올바르지 않습니다.");
        }
        if (amount == null) {
            throw new IllegalStateException("최종 확인 가입 금액을 확인할 수 없습니다.");
        }
        return new FinalConfirmationSummary(productName, productPeriod, amount);
    }

    private String safeRequired(String value, String fieldName, int maxLength) {
        if (value == null || value.isBlank()) {
            throw new IllegalStateException("최종 확인 " + fieldName + "을 확인할 수 없습니다.");
        }
        String masked = SensitiveDataMasker.maskFreeText(value.trim());
        if (!masked.equals(value.trim())) {
            throw new IllegalStateException("최종 확인 요약에 민감정보가 포함되어 있습니다.");
        }
        if (masked.length() > maxLength || masked.indexOf('\n') >= 0
                || masked.indexOf('\r') >= 0) {
            throw new IllegalStateException("최종 확인 " + fieldName + " 형식이 올바르지 않습니다.");
        }
        return masked;
    }
}
