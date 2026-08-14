package com.ddd.backend.ai.gemini;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.time.Duration;

@Component
@ConfigurationProperties(
        prefix = "ddd.ai.gemini"
)
public class GeminiProperties {

    private boolean enabled = false;

    private String apiKey = "";

    private String model =
            "gemini-3.6-flash";

    private Duration connectTimeout =
            Duration.ofSeconds(5);

    private Duration requestTimeout =
            Duration.ofSeconds(20);

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(
            boolean enabled
    ) {
        this.enabled =
                enabled;
    }

    public String getApiKey() {
        return apiKey;
    }

    public void setApiKey(
            String apiKey
    ) {
        this.apiKey =
                apiKey;
    }

    public String getModel() {
        return model;
    }

    public void setModel(
            String model
    ) {
        this.model =
                model;
    }

    public Duration getConnectTimeout() {
        return connectTimeout;
    }

    public void setConnectTimeout(
            Duration connectTimeout
    ) {
        this.connectTimeout =
                connectTimeout;
    }

    public Duration getRequestTimeout() {
        return requestTimeout;
    }

    public void setRequestTimeout(
            Duration requestTimeout
    ) {
        this.requestTimeout =
                requestTimeout;
    }

    public void validate() {

        if (apiKey == null
                || apiKey.isBlank()) {

            throw new IllegalStateException(
                    "Gemini API Key가 설정되지 않았습니다."
            );
        }

        if (model == null
                || model.isBlank()) {

            throw new IllegalStateException(
                    "Gemini model이 설정되지 않았습니다."
            );
        }

        if (connectTimeout == null
                || connectTimeout.isZero()
                || connectTimeout.isNegative()) {

            throw new IllegalStateException(
                    "Gemini connect timeout이 올바르지 않습니다."
            );
        }

        if (requestTimeout == null
                || requestTimeout.isZero()
                || requestTimeout.isNegative()) {

            throw new IllegalStateException(
                    "Gemini request timeout이 올바르지 않습니다."
            );
        }
    }
}