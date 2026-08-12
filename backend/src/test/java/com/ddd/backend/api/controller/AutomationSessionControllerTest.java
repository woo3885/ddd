package com.ddd.backend.api.controller;

import com.ddd.backend.common.exception.SessionNotFoundException;
import com.ddd.backend.domain.session.AutomationSession;
import com.ddd.backend.service.AutomationSessionService;
import com.ddd.backend.service.UserDecisionService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import com.ddd.backend.config.RestCorsProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@WebMvcTest(
        AutomationSessionController.class
)
@EnableConfigurationProperties(
        RestCorsProperties.class
)
class AutomationSessionControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AutomationSessionService sessionService;

    /*
     * Controller 생성자 의존성 때문에
     * MVC 테스트 Context에 Mock으로 등록한다.
     */
    @MockitoBean
    private UserDecisionService userDecisionService;

    @Test
    void 자동화_세션을_생성한다()
            throws Exception {

        AutomationSession session =
                AutomationSession.create(
                        "계좌 선택 화면을 확인합니다."
                );

        when(
                sessionService.createSession(
                        "계좌 선택 화면을 확인합니다.",
                        "demo-bank",
                        "/transfer/accounts"
                )
        ).thenReturn(
                session
        );

        mockMvc.perform(
                        post(
                                "/api/v1/sessions"
                        )
                                .contentType(
                                        MediaType.APPLICATION_JSON
                                )
                                .content(
                                        """
                                        {
                                          "userRequest": "계좌 선택 화면을 확인합니다.",
                                          "siteId": "demo-bank",
                                          "initialPath": "/transfer/accounts"
                                        }
                                        """
                                )
                )
                .andExpect(
                        status().isCreated()
                )
                .andExpect(
                        jsonPath(
                                "$.success"
                        ).value(
                                true
                        )
                )
                .andExpect(
                        jsonPath(
                                "$.data.sessionId"
                        ).isNotEmpty()
                )
                .andExpect(
                        jsonPath(
                                "$.data.userRequest"
                        ).value(
                                "계좌 선택 화면을 확인합니다."
                        )
                )
                .andExpect(
                        jsonPath(
                                "$.data.status"
                        ).value(
                                "SESSION_CREATED"
                        )
                )
                .andExpect(
                        jsonPath(
                                "$.message"
                        ).value(
                                "자동화 세션이 생성되었습니다."
                        )
                );

        verify(
                sessionService
        ).createSession(
                "계좌 선택 화면을 확인합니다.",
                "demo-bank",
                "/transfer/accounts"
        );
    }

    @Test
    void 자동화_세션을_조회한다()
            throws Exception {

        AutomationSession session =
                AutomationSession.create(
                        "예금 상품을 찾아 줘"
                );

        when(
                sessionService.getSession(
                        session.getSessionId()
                )
        ).thenReturn(
                session
        );

        mockMvc.perform(
                        get(
                                "/api/v1/sessions/{sessionId}",
                                session.getSessionId()
                        )
                )
                .andExpect(
                        status().isOk()
                )
                .andExpect(
                        jsonPath(
                                "$.success"
                        ).value(
                                true
                        )
                )
                .andExpect(
                        jsonPath(
                                "$.data.sessionId"
                        ).value(
                                session.getSessionId()
                        )
                )
                .andExpect(
                        jsonPath(
                                "$.data.userRequest"
                        ).value(
                                "예금 상품을 찾아 줘"
                        )
                )
                .andExpect(
                        jsonPath(
                                "$.data.status"
                        ).value(
                                "SESSION_CREATED"
                        )
                );
    }

    @Test
    void 자동화_세션을_취소한다()
            throws Exception {

        AutomationSession session =
                AutomationSession.create(
                        "송금 절차를 안내해 줘"
                );

        session.cancel();

        when(
                sessionService.cancelSession(
                        session.getSessionId()
                )
        ).thenReturn(
                session
        );

        mockMvc.perform(
                        post(
                                "/api/v1/sessions/{sessionId}/cancel",
                                session.getSessionId()
                        )
                )
                .andExpect(
                        status().isOk()
                )
                .andExpect(
                        jsonPath(
                                "$.success"
                        ).value(
                                true
                        )
                )
                .andExpect(
                        jsonPath(
                                "$.data.sessionId"
                        ).value(
                                session.getSessionId()
                        )
                )
                .andExpect(
                        jsonPath(
                                "$.data.status"
                        ).value(
                                "CANCELLED"
                        )
                )
                .andExpect(
                        jsonPath(
                                "$.message"
                        ).value(
                                "자동화 세션이 취소되었습니다."
                        )
                );
    }

    @Test
    void 존재하지_않는_세션을_조회하면_404를_반환한다()
            throws Exception {

        when(
                sessionService.getSession(
                        "not-found-session"
                )
        ).thenThrow(
                new SessionNotFoundException(
                        "not-found-session"
                )
        );

        mockMvc.perform(
                        get(
                                "/api/v1/sessions/not-found-session"
                        )
                )
                .andExpect(
                        status().isNotFound()
                )
                .andExpect(
                        jsonPath(
                                "$.success"
                        ).value(
                                false
                        )
                )
                .andExpect(
                        jsonPath(
                                "$.data"
                        ).doesNotExist()
                )
                .andExpect(
                        jsonPath(
                                "$.message"
                        ).value(
                                "자동화 세션을 찾을 수 없습니다. "
                                        + "sessionId=not-found-session"
                        )
                );
    }

    @Test
    void 사용자_요청이_비어_있으면_400을_반환한다()
            throws Exception {

        mockMvc.perform(
                        post(
                                "/api/v1/sessions"
                        )
                                .contentType(
                                        MediaType.APPLICATION_JSON
                                )
                                .content(
                                        """
                                        {
                                          "userRequest": "",
                                          "siteId": "demo-bank",
                                          "initialPath": "/transfer/accounts"
                                        }
                                        """
                                )
                )
                .andExpect(
                        status().isBadRequest()
                )
                .andExpect(
                        jsonPath(
                                "$.success"
                        ).value(
                                false
                        )
                )
                .andExpect(
                        jsonPath(
                                "$.data"
                        ).doesNotExist()
                )
                .andExpect(
                        jsonPath(
                                "$.message"
                        ).value(
                                "사용자 요청은 비어 있을 수 없습니다."
                        )
                );

        verify(
                sessionService,
                never()
        ).createSession(
                "",
                "demo-bank",
                "/transfer/accounts"
        );
    }

    @Test
    void siteId가_비어_있으면_400을_반환한다()
            throws Exception {

        mockMvc.perform(
                        post(
                                "/api/v1/sessions"
                        )
                                .contentType(
                                        MediaType.APPLICATION_JSON
                                )
                                .content(
                                        """
                                        {
                                          "userRequest": "계좌 선택",
                                          "siteId": "",
                                          "initialPath": "/transfer/accounts"
                                        }
                                        """
                                )
                )
                .andExpect(
                        status().isBadRequest()
                )
                .andExpect(
                        jsonPath(
                                "$.message"
                        ).value(
                                "siteId는 비어 있을 수 없습니다."
                        )
                );
    }

    @Test
    void initialPath가_비어_있으면_400을_반환한다()
            throws Exception {

        mockMvc.perform(
                        post(
                                "/api/v1/sessions"
                        )
                                .contentType(
                                        MediaType.APPLICATION_JSON
                                )
                                .content(
                                        """
                                        {
                                          "userRequest": "계좌 선택",
                                          "siteId": "demo-bank",
                                          "initialPath": ""
                                        }
                                        """
                                )
                )
                .andExpect(
                        status().isBadRequest()
                )
                .andExpect(
                        jsonPath(
                                "$.message"
                        ).value(
                                "initialPath는 비어 있을 수 없습니다."
                        )
                );
    }
}