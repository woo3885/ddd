package com.ddd.backend.ai.gemini;

public interface GeminiHttpTransport {

    String post(
            String requestBody
    );
}