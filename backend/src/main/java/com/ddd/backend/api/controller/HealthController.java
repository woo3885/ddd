package com.ddd.backend.api.controller;

import com.ddd.backend.common.response.ApiResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/v1")
public class HealthController {

    @GetMapping("/hello")
    public ApiResponse<Map<String, String>> hello() {
        return ApiResponse.success(
                Map.of(
                        "service", "finance-guide-backend",
                        "message", "백엔드 서버가 정상 실행 중입니다."
                )
        );
    }
}