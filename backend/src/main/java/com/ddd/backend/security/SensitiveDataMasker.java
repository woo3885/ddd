package com.ddd.backend.security;

import java.util.Locale;
import java.util.Set;

public final class SensitiveDataMasker {

    private static final String MASKED_VALUE = "******";

    private static final Set<String> SENSITIVE_FIELD_NAMES = Set.of(
            "password",
            "passwd",
            "pin",
            "otp",
            "authcode",
            "verificationcode",
            "securitycode",
            "residentregistrationnumber",
            "rrn",
            "cardnumber",
            "accountnumber",
            "certificatepassword"
    );

    private SensitiveDataMasker() {
    }

    public static String mask(String fieldName, String value) {
        if (value == null) {
            return null;
        }

        if (isSensitiveField(fieldName)) {
            return MASKED_VALUE;
        }

        return value;
    }

    public static boolean isSensitiveField(String fieldName) {
        if (fieldName == null || fieldName.isBlank()) {
            return false;
        }

        String normalizedFieldName = fieldName
                .replaceAll("[^a-zA-Z0-9]", "")
                .toLowerCase(Locale.ROOT);

        return SENSITIVE_FIELD_NAMES.contains(normalizedFieldName);
    }
}