package com.ddd.backend.ai.gemini;

import com.ddd.backend.ai.AiDecisionClientException;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Objects;

@Component
@ConditionalOnProperty(
        prefix = "ddd.ai.gemini",
        name = "enabled",
        havingValue = "true"
)
public final class JavaHttpGeminiTransport
        implements GeminiHttpTransport {

    private static final URI GEMINI_ENDPOINT =
            URI.create(
                    "https://generativelanguage.googleapis.com/v1beta/interactions"
            );

    private final GeminiProperties properties;

    private final HttpClient httpClient;

    public JavaHttpGeminiTransport(
            GeminiProperties properties
    ) {
        this.properties =
                Objects.requireNonNull(
                        properties,
                        "GeminiProperties는 필수입니다."
                );

        this.httpClient =
                HttpClient
                        .newBuilder()
                        .connectTimeout(
                                properties
                                        .getConnectTimeout()
                        )
                        .build();
    }

    @Override
    public String post(
            String requestBody
    ) {
        properties.validate();

        if (requestBody == null
                || requestBody.isBlank()) {

            throw new IllegalArgumentException(
                    "Gemini 요청 Body는 비어 있을 수 없습니다."
            );
        }

        HttpRequest request =
                HttpRequest
                        .newBuilder(
                                GEMINI_ENDPOINT
                        )
                        .timeout(
                                properties
                                        .getRequestTimeout()
                        )
                        .header(
                                "Content-Type",
                                "application/json"
                        )
                        .header(
                                "x-goog-api-key",
                                properties
                                        .getApiKey()
                        )
                        .POST(
                                HttpRequest
                                        .BodyPublishers
                                        .ofString(
                                                requestBody
                                        )
                        )
                        .build();

        try {

            HttpResponse<String> response =
                    httpClient.send(
                            request,
                            HttpResponse
                                    .BodyHandlers
                                    .ofString()
                    );

            int statusCode =
                    response.statusCode();

            if (statusCode < 200
                    || statusCode >= 300) {

                /*
                 * API 응답 Body는 로그나 Exception에
                 * 그대로 넣지 않는다.
                 */
                throw new AiDecisionClientException(
                        "Gemini API 요청에 실패했습니다. "
                                + "HTTP status="
                                + statusCode
                );
            }

            String responseBody =
                    response.body();

            if (responseBody == null
                    || responseBody.isBlank()) {

                throw new AiDecisionClientException(
                        "Gemini API가 빈 응답을 반환했습니다."
                );
            }

            return responseBody;

        } catch (InterruptedException exception) {

            Thread.currentThread()
                    .interrupt();

            throw new AiDecisionClientException(
                    "Gemini API 요청이 중단되었습니다.",
                    exception
            );

        } catch (IOException exception) {

            throw new AiDecisionClientException(
                    "Gemini API 통신에 실패했습니다.",
                    exception
            );
        }
    }
}