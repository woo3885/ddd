package com.ddd.backend.service.confirmation;

import com.ddd.backend.automation.dom.SanitizedDomSnapshot;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class FinalConfirmationSummaryExtractorTest {
    private final FinalConfirmationSummaryExtractor extractor =
            new FinalConfirmationSummaryExtractor();

    @Test
    void 안전하고_완전한_요약만_생성한다() {
        FinalConfirmationSummary summary = extractor.extract(snapshot(
                "정기예금", "12개월", "1,000,000원"));

        assertThat(summary).isEqualTo(
                new FinalConfirmationSummary("정기예금", "12개월", "1,000,000원"));
    }

    @Test
    void 민감정보가_포함된_상품명은_fail_closed한다() {
        assertThatThrownBy(() -> extractor.extract(snapshot(
                "홍길동 010-1234-5678 정기예금", "12개월", "1,000,000원")))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("민감정보");
    }

    @Test
    void malformed_or_missing_summary는_fail_closed한다() {
        assertThatThrownBy(() -> extractor.extract(snapshot(
                "정기예금", "열두 달", "가입 금액 미확인")))
                .isInstanceOf(IllegalStateException.class);
    }

    private SanitizedDomSnapshot snapshot(
            String productName, String productPeriod, String amount
    ) {
        return new SanitizedDomSnapshot(
                "1.0", "snap-001",
                new SanitizedDomSnapshot.PageSnapshot(
                        "http://127.0.0.1/final", "최종 확인",
                        "deposit-001", productName, productPeriod),
                List.of(new SanitizedDomSnapshot.ElementSnapshot(
                        "el-amount", "span", null, amount, null,
                        null, null, true, true, null,
                        new SanitizedDomSnapshot.BoundingBoxSnapshot(0, 0, 1, 1),
                        SanitizedDomSnapshot.SecurityPolicy.NORMAL)));
    }
}
