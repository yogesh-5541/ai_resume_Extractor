package com.airesumeinsight.service;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.airesumeinsight.model.dto.Candidate;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
public class EnhancedExtractionService {
    
    private static final Logger log = LoggerFactory.getLogger(EnhancedExtractionService.class);
    
    private final ChatModel chatModel;
    private final ObjectMapper objectMapper;
    
    public EnhancedExtractionService(ChatModel chatModel, ObjectMapper objectMapper) {
        this.chatModel = chatModel;
        this.objectMapper = objectMapper;
    }
    
    /**
     * Enhanced resume extraction with multi-format support
     */
    public Candidate extractComprehensiveData(MultipartFile file) throws IOException {
        log.info("Starting enhanced extraction for file: {}", file.getOriginalFilename());
        
        String originalFilename = file.getOriginalFilename();
        String fileExtension = getFileExtension(originalFilename).toLowerCase();
        
        try {
            // Create temporary file
            Path tempDir = Files.createTempDirectory("enhanced_extraction_");
            File tempFile = new File(tempDir.toFile(), UUID.randomUUID() + "_" + originalFilename);
            file.transferTo(tempFile);
            
            // Extract text based on file type
            String extractedText;
            switch (fileExtension) {
                case "pdf":
                    extractedText = extractFromPDF(tempFile);
                    break;
                case "docx":
                    extractedText = extractFromDOCX(tempFile);
                    break;
                case "doc":
                    extractedText = extractFromDOC(tempFile);
                    break;
                case "txt":
                    extractedText = extractFromTXT(tempFile);
                    break;
                case "rtf":
                    extractedText = extractFromRTF(tempFile);
                    break;
                default:
                    extractedText = extractWithTika(tempFile);
                    break;
            }
            
            // Enhance with AI processing
            Candidate candidate = enhanceWithAI(extractedText, originalFilename);
            
            // Clean up
            if (tempFile.exists()) tempFile.delete();
            if (tempDir.toFile().exists()) tempDir.toFile().delete();
            
            log.info("Enhanced extraction completed successfully for file: {}", originalFilename);
            return candidate;
            
        } catch (Exception e) {
            log.error("Enhanced extraction failed for file: {}", originalFilename, e);
            throw new IOException("Failed to extract enhanced data from " + originalFilename + ": " + e.getMessage());
        }
    }
    
    /**
     * Enhanced PDF extraction
     */
    private String extractFromPDF(File pdfFile) throws IOException {
        log.debug("Extracting from PDF using Apache PDFBox");
        
        try (PDDocument document = PDDocument.load(pdfFile)) {
            PDFTextStripper stripper = new PDFTextStripper();
            stripper.setSortByPosition(true);
            return preprocessText(stripper.getText(document));
        } catch (Exception e) {
            log.error("PDF extraction failed", e);
            throw new IOException("Failed to extract from PDF: " + e.getMessage());
        }
    }
    
    /**
     * Enhanced DOCX extraction
     */
    private String extractFromDOCX(File docxFile) throws IOException {
        log.debug("Extracting from DOCX using Apache POI");
        
        try (org.apache.poi.xwpf.usermodel.XWPFDocument document = new org.apache.poi.xwpf.usermodel.XWPFDocument(new java.io.FileInputStream(docxFile))) {
            StringBuilder text = new StringBuilder();
            
            for (org.apache.poi.xwpf.usermodel.XWPFParagraph paragraph : document.getParagraphs()) {
                String paragraphText = paragraph.getText().trim();
                if (!paragraphText.isEmpty()) {
                    text.append(paragraphText).append("\n\n");
                }
            }
            
            return preprocessText(text.toString());
        } catch (Exception e) {
            log.error("DOCX extraction failed", e);
            throw new IOException("Failed to extract from DOCX: " + e.getMessage());
        }
    }
    
    /**
     * Fallback DOC extraction using Tika
     */
    private String extractFromDOC(File docFile) throws IOException {
        log.debug("Extracting from DOC using Tika fallback");
        return extractWithTika(docFile);
    }
    
    /**
     * Enhanced TXT extraction
     */
    private String extractFromTXT(File txtFile) throws IOException {
        log.debug("Extracting from TXT with encoding detection");
        
        try {
            return preprocessText(Files.readString(txtFile.toPath()));
        } catch (Exception e) {
            log.error("TXT extraction failed", e);
            throw new IOException("Failed to extract from TXT: " + e.getMessage());
        }
    }
    
    /**
     * RTF extraction using Tika
     */
    private String extractFromRTF(File rtfFile) throws IOException {
        log.debug("Extracting from RTF using Tika");
        return extractWithTika(rtfFile);
    }
    
    /**
     * Universal Tika extraction
     */
    private String extractWithTika(File file) throws IOException {
        log.debug("Extracting using enhanced Tika processing");
        
        try {
            org.apache.tika.Tika tika = new org.apache.tika.Tika();
            return preprocessText(tika.parseToString(file));
        } catch (Exception e) {
            log.error("Tika extraction failed", e);
            throw new IOException("Failed to extract using Tika: " + e.getMessage());
        }
    }
    
    /**
     * Text preprocessing
     */
    private String preprocessText(String text) {
        if (text == null || text.isBlank()) return "";
        return text.replace("\r\n", "\n")
                   .replaceAll("\n{3,}", "\n\n")
                   .replaceAll("[ \t]{2,}", " ")
                   .replaceAll("\f|\u000B", " ")
                   .replaceAll(" +", " ")
                   .trim();
    }
    
    /**
     * AI-powered data extraction
     */
    private Candidate enhanceWithAI(String extractedText, String filename) {
        log.debug("Extracting data with AI for: {}", filename);

        // Truncate to avoid slow processing on very long resumes
        String text = extractedText != null && extractedText.length() > 8000
                ? extractedText.substring(0, 8000)
                : extractedText;

        String prompt = """
                Parse this resume. Return ONLY a JSON object, no markdown, no explanation.

                {"name":"","email":"","phone":"","skills":[],"experienceYears":0,"education":"","currentJobTitle":"","summary":""}

                Rules:
                - name: full name from top of resume
                - email: email address
                - phone: phone number
                - skills: ALL skills mentioned (technical, soft, tools) as array
                - experienceYears: total years as number
                - education: highest degree and institution
                - currentJobTitle: most recent job title
                - summary: 1-2 sentence professional summary

                RESUME:
                %s
                """.formatted(text);

        long startTime = System.currentTimeMillis();
        String response = chatModel.call(prompt);
        log.info("AI extraction completed in {}ms", System.currentTimeMillis() - startTime);

        return parseEnhancedAIResponse(response, extractedText);
    }
    
    /**
     * Parse AI response into Candidate
     */
    private Candidate parseEnhancedAIResponse(String response, String extractedText) {
        String cleanedJson = extractJsonFromResponse(response);

        try {
            com.fasterxml.jackson.databind.JsonNode rootNode = objectMapper.readTree(cleanedJson);

            Candidate candidate = new Candidate();
            candidate.setName(safeGetText(rootNode, "name"));
            candidate.setEmail(safeGetText(rootNode, "email"));
            candidate.setPhone(safeGetText(rootNode, "phone"));
            candidate.setSummary(safeGetText(rootNode, "summary"));
            candidate.setCurrentJobTitle(safeGetText(rootNode, "currentJobTitle"));
            candidate.setEducation(safeGetText(rootNode, "education"));

            if (rootNode.hasNonNull("skills") && rootNode.get("skills").isArray()) {
                List<String> skills = new ArrayList<>();
                for (com.fasterxml.jackson.databind.JsonNode skill : rootNode.get("skills")) {
                    String skillText = skill.asText().trim();
                    if (!skillText.isEmpty()) skills.add(skillText);
                }
                candidate.setSkills(skills);
            }

            if (rootNode.hasNonNull("experienceYears")) {
                candidate.setExperienceYears(rootNode.get("experienceYears").asDouble());
            }

            candidate.setStatus(candidate.getName() != null ? "SUCCESS" : "FAILED");
            return candidate;

        } catch (Exception e) {
            log.error("Failed to parse AI response: {}", e.getMessage());
            Candidate failed = new Candidate();
            failed.setStatus("FAILED");
            return failed;
        }
    }
    
    /**
     * Extract JSON from AI response
     */
    private String extractJsonFromResponse(String response) {
        response = response.replaceAll("```json", "").replaceAll("```", "").trim();
        int start = response.indexOf("{");
        int end = response.lastIndexOf("}");
        if (start == -1 || end == -1 || start > end) {
            throw new RuntimeException("No valid JSON in AI response: " + response.substring(0, Math.min(200, response.length())));
        }
        return response.substring(start, end + 1);
    }
    
    /**
     * Safely get text from JSON node
     */
    private String safeGetText(com.fasterxml.jackson.databind.JsonNode node, String field) {
        if (!node.hasNonNull(field)) return null;
        String val = node.get(field).asText("").trim();
        return (val.isEmpty() || val.equalsIgnoreCase("null")) ? null : val;
    }
    
    /**
     * Get file extension
     */
    private String getFileExtension(String filename) {
        if (filename == null || filename.isEmpty()) return "";
        int lastDot = filename.lastIndexOf('.');
        return lastDot == -1 ? filename : filename.substring(lastDot + 1);
    }
    
    /**
     * Convert to title case
     */
    private String toTitleCase(String s) {
        StringBuilder sb = new StringBuilder();
        for (String w : s.split(" ")) {
            if (!w.isEmpty())
                sb.append(Character.toUpperCase(w.charAt(0))).append(w.substring(1).toLowerCase()).append(" ");
        }
        return sb.toString().trim();
    }
}
