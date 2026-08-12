package com.ddd.backend.api.controller;

import com.ddd.backend.common.exception.GlobalExceptionHandler;
import com.ddd.backend.domain.session.AutomationSession;
import com.ddd.backend.domain.session.DecisionType;
import com.ddd.backend.service.AutomationSessionService;
import com.ddd.backend.service.UserDecisionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AutomationSessionUserDecisionControllerTest {

    private AutomationSessionService sessionService;
    private UserDecisionService userDecisionService;
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        sessionService =
                mock(AutomationSessionService.class);

        userDecisionService =
                mock(UserDecisionService.class);

        AutomationSessionController controller =
                new AutomationSessionController(
                        sessionService,
                        userDecisionService
                );

        mockMvc =
                MockMvcBuilders
                        .standaloneSetup(controller)
                        .setControllerAdvice(
                                new GlobalExceptionHandler()
                        )
                        .build();
    }

    @Test
    void 사용자_결정_API를_호출한다() throws Exception {
        AutomationSession session =
                AutomationSession.create(
                        "예금 상품을 선택해 줘"
                );

        when(
                userDecisionService.submitDecision(
                        "session-001",
                        DecisionType.PRODUCT_SELECTION,
                        List.of("product-001")
                )
        ).thenReturn(
                session
        );

        mockMvc.perform(
                        post(
                                "/api/v1/sessions/"
                                        + "session-001/decisions"
                        )
                                .contentType(
                                        MediaType.APPLICATION_JSON
                                )
                                .content(
                                        """
                                        {
                                          "decisionType":
                                            "PRODUCT_SELECTION",
                                          "selectedOptionIds": [
                                            "product-001"
                                          ]
                                        }
                                        """
                                )
                )
                .andExpect(
                        status().isOk()
                );

        verify(userDecisionService)
                .submitDecision(
                        "session-001",
                        DecisionType.PRODUCT_SELECTION,
                        List.of("product-001")
                );
    }

    @Test
    void 최종_승인_API를_호출한다() throws Exception {
        AutomationSession session =
                AutomationSession.create(
                        "예금 가입을 승인해 줘"
                );

        when(
                userDecisionService.confirmFinalAction(
                        "session-002",
                        "confirm-001",
                        true
                )
        ).thenReturn(
                session
        );

        mockMvc.perform(
                        post(
                                "/api/v1/sessions/"
                                        + "session-002/confirm"
                        )
                                .contentType(
                                        MediaType.APPLICATION_JSON
                                )
                                .content(
                                        """
                                        {
                                          "confirmationId": "confirm-001",
                                          "approved": true
                                        }
                                        """
                                )
                )
                .andExpect(
                        status().isOk()
                );

        verify(userDecisionService)
                .confirmFinalAction(
                        "session-002",
                        "confirm-001",
                        true
                );
    }

    @Test
    void 최종_거절_API를_호출한다() throws Exception {
        AutomationSession session =
                AutomationSession.create(
                        "예금 가입을 취소해 줘"
                );

        when(
                userDecisionService.rejectFinalAction(
                        "session-003",
                        "confirm-002",
                        false
                )
        ).thenReturn(
                session
        );

        mockMvc.perform(
                        post(
                                "/api/v1/sessions/"
                                        + "session-003/reject"
                        )
                                .contentType(
                                        MediaType.APPLICATION_JSON
                                )
                                .content(
                                        """
                                        {
                                          "confirmationId": "confirm-002",
                                          "approved": false
                                        }
                                        """
                                )
                )
                .andExpect(
                        status().isOk()
                );

        verify(userDecisionService)
                .rejectFinalAction(
                        "session-003",
                        "confirm-002",
                        false
                );
    }

    @Test
    void 선택_항목이_없으면_400을_반환한다()
            throws Exception {

        mockMvc.perform(
                        post(
                                "/api/v1/sessions/"
                                        + "session-004/decisions"
                        )
                                .contentType(
                                        MediaType.APPLICATION_JSON
                                )
                                .content(
                                        """
                                        {
                                          "decisionType":
                                            "PRODUCT_SELECTION",
                                          "selectedOptionIds": []
                                        }
                                        """
                                )
                )
                .andExpect(
                        status().isBadRequest()
                );

        verifyNoInteractions(
                userDecisionService
        );
    }

    @Test
    void 승인_여부가_없으면_400을_반환한다()
            throws Exception {

        mockMvc.perform(
                        post(
                                "/api/v1/sessions/"
                                        + "session-005/confirm"
                        )
                                .contentType(
                                        MediaType.APPLICATION_JSON
                                )
                                .content(
                                        """
                                        {
                                          "confirmationId": "confirm-003"
                                        }
                                        """
                                )
                )
                .andExpect(
                        status().isBadRequest()
                );

        verifyNoInteractions(
                userDecisionService
        );
    }

    @Test
    void 확인_ID가_공백이면_400을_반환한다()
            throws Exception {

        mockMvc.perform(
                        post(
                                "/api/v1/sessions/"
                                        + "session-006/reject"
                        )
                                .contentType(
                                        MediaType.APPLICATION_JSON
                                )
                                .content(
                                        """
                                        {
                                          "confirmationId": "   ",
                                          "approved": false
                                        }
                                        """
                                )
                )
                .andExpect(
                        status().isBadRequest()
                );

        verifyNoInteractions(
                userDecisionService
        );
    }
}