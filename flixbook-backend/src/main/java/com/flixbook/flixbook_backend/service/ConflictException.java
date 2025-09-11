package com.flixbook.flixbook_backend.service;

import java.util.Map;

public class ConflictException extends RuntimeException {
    private final Map<String, Object> payload;

    public ConflictException(String message, Map<String, Object> payload) {
        super(message);
        this.payload = payload;
    }

    public Map<String, Object> getPayload() {
        return payload;
    }
}
