package com.ddd.backend.api.controller;

import com.ddd.backend.domain.session.AutomationSession;
import com.ddd.backend.service.AutomationSessionService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class AutomationSessionControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private AutomationSessionService sessionService;

    @Test
    void 자동화_세션을_생성한다() throws Exception {
        mockMvc.perform(
                        post("/api/v1/sessions")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("""
                                        {
                                          "userRequest": "적금 상품을 비교해 줘"
                                        }
                                        """)
                )
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.sessionId").isNotEmpty())
                .andExpect(jsonPath("$.data.userRequest")
                        .value("적금 상품을 비교해 줘"))
                .andExpect(jsonPath("$.data.status")
                        .value("SESSION_CREATED"))
                .andExpect(jsonPath("$.message")
                        .value("자동화 세션이 생성되었습니다."));
    }

    @Test
    void 자동화_세션을_조회한다() throws Exception {
        AutomationSession session =
                sessionService.createSession("예금 상품을 찾아 줘");

        mockMvc.perform(
                        get("/api/v1/sessions/{sessionId}",
                                session.getSessionId())
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.sessionId")
                        .value(session.getSessionId()))
                .andExpect(jsonPath("$.data.userRequest")
                        .value("예금 상품을 찾아 줘"))
                .andExpect(jsonPath("$.data.status")
                        .value("SESSION_CREATED"));
    }

    @Test
    void 자동화_세션을_취소한다() throws Exception {
        AutomationSession session =
                sessionService.createSession("송금 절차를 안내해 줘");

        mockMvc.perform(
                        post("/api/v1/sessions/{sessionId}/cancel",
                                session.getSessionId())
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.sessionId")
                        .value(session.getSessionId()))
                .andExpect(jsonPath("$.data.status")
                        .value("CANCELLED"))
                .andExpect(jsonPath("$.message")
                        .value("자동화 세션이 취소되었습니다."));
    }

    @Test
    void 존재하지_않는_세션을_조회하면_404를_반환한다()
            throws Exception {

        mockMvc.perform(
                        get("/api/v1/sessions/not-found-session")
                )
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.data").doesNotExist())
                .andExpect(jsonPath("$.message")
                        .value("자동화 세션을 찾을 수 없습니다. "
                                + "sessionId=not-found-session"));
    }

    @Test
    void 사용자_요청이_비어_있으면_400을_반환한다()
            throws Exception {

        mockMvc.perform(
                        post("/api/v1/sessions")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("""
                                        {
                                          "userRequest": ""
                                        }
                                        """)
                )
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.data").doesNotExist())
                .andExpect(jsonPath("$.message")
                        .value("사용자 요청은 비어 있을 수 없습니다."));
    }
}