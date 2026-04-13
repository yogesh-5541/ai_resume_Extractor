package com.airesumeinsight.service;

import java.util.Map;

/**
 * Result of extraction operation containing extracted text and metadata
 */
public class ExtractionResult {
    public final String extractedText;
    public final Map<String, Object> metadata;
    
    public ExtractionResult(String extractedText, Map<String, Object> metadata) {
        this.extractedText = extractedText;
        this.metadata = metadata;
    }
}
