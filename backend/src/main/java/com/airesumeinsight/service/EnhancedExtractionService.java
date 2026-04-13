package com.airesumeinsight.service;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

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
    
    // Enhanced skill database
    private static final List<String> ENHANCED_SKILLS = Arrays.asList(
        "Java", "Python", "JavaScript", "TypeScript", "C#", "C++", "Go", "Rust", "Swift", "Kotlin", "Scala",
        "Ruby", "PHP", "Perl", "R", "MATLAB", "Julia", "Dart", "Lua", "Haskell",
        "React", "Angular", "Vue.js", "Node.js", "Express", "Django", "Flask", "Spring Boot", "ASP.NET", "Laravel",
        "Next.js", "Nuxt.js", "Svelte", "Ember.js", "Backbone.js", "jQuery", "WordPress", "Shopify",
        "MySQL", "PostgreSQL", "MongoDB", "Redis", "Elasticsearch", "Cassandra", "DynamoDB", "Firebase",
        "Oracle", "SQL Server", "SQLite", "Neo4j", "Couchbase", "InfluxDB",
        "AWS", "Azure", "GCP", "Google Cloud", "DigitalOcean", "Heroku", "Netlify", "Vercel",
        "Docker", "Kubernetes", "Jenkins", "GitLab CI", "GitHub Actions", "Terraform", "Ansible",
        "Git", "JIRA", "Confluence", "Slack", "Figma", "Adobe Creative Suite", "Sketch", "Framer",
        "Postman", "Insomnia", "VS Code", "IntelliJ IDEA", "Eclipse", "Sublime Text",
        "Salesforce", "HubSpot", "Marketo", "Google Analytics", "Adobe Analytics", "Mixpanel", "Segment",
        "Tableau", "Power BI", "Excel", "Google Sheets", "Looker", "Domo",
        "Leadership", "Communication", "Project Management", "Team Collaboration", "Problem Solving", "Critical Thinking",
        "Time Management", "Negotiation", "Presentation Skills", "Public Speaking", "Writing Skills",
        "Research Skills", "Analytical Skills", "Creativity", "Adaptability", "Mentoring",
        "Machine Learning", "Data Science", "Artificial Intelligence", "Blockchain", "Cybersecurity", "DevOps",
        "Mobile Development", "Web Development", "Full Stack", "Backend Development", "Frontend Development",
        "Cloud Architecture", "Microservices", "API Development", "UI/UX Design", "Product Management",
        "Web3", "Blockchain", "NFT", "DeFi", "Smart Contracts", "Solidity", "Web3.js",
        "Metaverse", "AR/VR", "Unity", "Unreal Engine", "Three.js", "WebGL",
        "REST", "GraphQL", "gRPC", "WebSocket", "MQTT", "Apache Kafka", "RabbitMQ", "Apache Spark",
        "Hadoop", "Spark", "Kubernetes", "Helm", "Prometheus", "Grafana", "ELK Stack"
    );
    
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
     * Advanced text preprocessing
     */
    private String preprocessText(String text) {
        if (text == null || text.isBlank()) return "";
        
        // Remove excessive whitespace and normalize line endings
        String cleaned = text.replaceAll("\\r\\n", "\\n")
                           .replaceAll("\\n{3,}", "\\n\\n")
                           .replaceAll("[ \\t]{2,}", " ")
                           .trim();
        
        // Remove common OCR artifacts
        cleaned = cleaned.replaceAll("\\f", " ")
                           .replaceAll("\\v", " ")
                           .replaceAll("[^\\x00-\\x7F\\n\\r\\t]", " ");
        
        // Normalize multiple spaces
        cleaned = cleaned.replaceAll(" +", " ");
        
        return cleaned.trim();
    }
    
    /**
     * AI-powered data enhancement
     */
    private Candidate enhanceWithAI(String extractedText, String filename) {
        log.debug("Enhancing extracted data with AI for: {}", filename);
        
        try {
            // Enhanced AI prompt for comprehensive extraction
            String prompt = String.format("""
                You are an advanced resume parser and data enrichment specialist. Extract comprehensive information from the resume text below.
                
                Focus on extracting and enhancing:
                1. Personal Information (name, email, phone)
                2. Professional Summary (enhanced, detailed summary)
                3. Skills (technical, soft, business, tools)
                4. Experience (detailed breakdown with achievements)
                5. Education (degrees, institutions, dates, GPA)
                6. Certifications (professional, technical)
                7. Projects (significant projects with technologies)
                8. Languages (spoken and programming)
                9. Social Media/Portfolio (LinkedIn, GitHub, personal website)
                
                RESUME TEXT:
                %s
                
                RULES:
                - Return ONLY a valid JSON object
                - Include ALL extracted information, even if partial
                - Enhance missing information with intelligent defaults
                - Validate and cross-reference data
                - Extract contact information with validation
                - Identify and categorize all skills accurately
                - Extract quantifiable achievements and metrics
                
                OUTPUT FORMAT:
                {
                    "name": "Full Name",
                    "email": "validated@email.com",
                    "phone": "validated-phone",
                    "summary": "Enhanced professional summary with key achievements",
                    "skills": ["Skill1", "Skill2", "Skill3"],
                    "experienceYears": 5,
                    "education": "Degree Name from University Name",
                    "certifications": "Certification Name - Issuing Organization",
                    "projects": "Project Name: Description with impact",
                    "languages": "English (Native/Bilingual)",
                    "currentJobTitle": "Current Job Title",
                    "status": "GOOD"
                }
                """, extractedText);
            
            long startTime = System.currentTimeMillis();
            String response = chatModel.call(prompt);
            long processingTime = System.currentTimeMillis() - startTime;
            
            log.info("AI enhancement completed in {}ms", processingTime);
            
            // Parse and build enhanced candidate object
            return parseEnhancedAIResponse(response, extractedText);
            
        } catch (Exception e) {
            log.error("AI enhancement failed", e);
            return buildFallbackCandidate(extractedText);
        }
    }
    
    /**
     * Parse enhanced AI response
     */
    private Candidate parseEnhancedAIResponse(String response, String extractedText) {
        try {
            // Clean and extract JSON
            String cleanedJson = extractJsonFromResponse(response);
            
            // Parse the enhanced response
            com.fasterxml.jackson.databind.JsonNode rootNode = objectMapper.readTree(cleanedJson);
            
            Candidate candidate = new Candidate();
            
            // Extract all fields
            candidate.setName(safeGetText(rootNode, "name"));
            candidate.setEmail(validateEmail(safeGetText(rootNode, "email")));
            candidate.setPhone(validatePhone(safeGetText(rootNode, "phone")));
            candidate.setSummary(safeGetText(rootNode, "summary"));
            candidate.setCurrentJobTitle(safeGetText(rootNode, "currentJobTitle"));
            candidate.setStatus(safeGetText(rootNode, "status"));
            
            // Extract skills
            if (rootNode.hasNonNull("skills") && rootNode.get("skills").isArray()) {
                List<String> skills = new ArrayList<>();
                for (com.fasterxml.jackson.databind.JsonNode skill : rootNode.get("skills")) {
                    String skillText = skill.asText().trim();
                    if (!skillText.isEmpty()) {
                        skills.add(skillText);
                    }
                }
                candidate.setSkills(skills);
            }
            
            // Extract experience years
            if (rootNode.hasNonNull("experienceYears")) {
                candidate.setExperienceYears(rootNode.get("experienceYears").asDouble());
            }
            
            // Extract education
            candidate.setEducation(safeGetText(rootNode, "education"));
            
            // Determine status if not provided
            if (candidate.getStatus() == null || candidate.getStatus().isEmpty()) {
                String status = determineCandidateStatus(candidate);
                candidate.setStatus(status);
            }
            
            return candidate;
            
        } catch (Exception e) {
            log.error("Failed to parse enhanced AI response: {}", e.getMessage());
            return buildFallbackCandidate(extractedText);
        }
    }
    
    /**
     * Enhanced email validation
     */
    private String validateEmail(String email) {
        if (email == null || email.isBlank()) return null;
        
        // Basic format check
        if (!email.matches("^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$")) {
            return null;
        }
        
        // Common typo corrections
        email = email.toLowerCase()
                   .replaceAll(".con", ".com")
                   .replaceAll("gmial.com", "gmail.com")
                   .replaceAll("gmaill.com", "gmail.com");
        
        return email.toLowerCase();
    }
    
    /**
     * Enhanced phone validation
     */
    private String validatePhone(String phone) {
        if (phone == null || phone.isBlank()) return null;
        
        // Remove all non-digit characters
        String digits = phone.replaceAll("[^0-9+]", "");
        
        // Basic validation
        if (digits.length() < 10 || digits.length() > 15) {
            return null;
        }
        
        // Format with country code if long enough
        if (digits.length() == 10) {
            return String.format("(%s) %s-%s", 
                   digits.substring(0, 3), 
                   digits.substring(3, 6), 
                   digits.substring(6));
        } else if (digits.length() > 10) {
            return digits;
        }
        
        return null;
    }
    
    /**
     * Determine candidate status based on extraction quality
     */
    private String determineCandidateStatus(Candidate candidate) {
        // Simple heuristic based on available data
        int score = 0;
        if (candidate.getName() != null && !candidate.getName().isEmpty()) score += 20;
        if (candidate.getEmail() != null && !candidate.getEmail().isEmpty()) score += 20;
        if (candidate.getPhone() != null && !candidate.getPhone().isEmpty()) score += 15;
        if (candidate.getSkills() != null && !candidate.getSkills().isEmpty()) score += 20;
        if (candidate.getSummary() != null && !candidate.getSummary().isEmpty()) score += 15;
        if (candidate.getEducation() != null && !candidate.getEducation().isEmpty()) score += 10;
        
        if (score >= 85) return "EXCELLENT";
        else if (score >= 70) return "GOOD";
        else if (score >= 50) return "FAIR";
        else return "POOR";
    }
    
    /**
     * Build fallback candidate with enhanced processing
     */
    private Candidate buildFallbackCandidate(String text) {
        Candidate candidate = new Candidate();
        
        // Use enhanced extraction methods
        candidate.setName(extractEnhancedName(text));
        candidate.setEmail(validateEmail(extractEnhancedEmail(text)));
        candidate.setPhone(validatePhone(extractEnhancedPhone(text)));
        candidate.setSkills(extractEnhancedSkills(text));
        candidate.setExperienceYears((double) extractEnhancedExperience(text));
        candidate.setEducation(extractEnhancedEducation(text));
        candidate.setSummary(extractEnhancedSummary(text));
        candidate.setStatus(determineCandidateStatus(candidate));
        
        return candidate;
    }
    
    /**
     * Enhanced name extraction
     */
    private String extractEnhancedName(String text) {
        String[] lines = text.split("[\\r\\n]+");
        for (String line : lines) {
            line = line.trim();
            if (line.isEmpty() || line.contains("@")) continue;
            
            // Skip common header lines
            if (line.matches("(?i)resume|cv|curriculum vitae|objective|summary|experience|education|skills|projects|certifications|languages|contact|phone|email|address")) {
                continue;
            }
            
            // Look for name patterns
            if (line.matches("([A-Z][a-z]+(?:\\s+[A-Z][a-z]+)+\\s+[A-Z][a-z]+)") || 
                line.matches("[A-Z][a-z]+\\s+[A-Z][a-z]+\\s+[A-Z][a-z]+")) {
                return toTitleCase(line);
            }
            
            // Single word names (all caps)
            if (line.matches("^[A-Z]+$") && line.length() <= 4 && line.length() >= 2) {
                return line;
            }
            
            // Two-word names with proper capitalization
            if (line.matches("^[A-Z][a-z]+\\s+[A-Z][a-z]+$")) {
                return toTitleCase(line);
            }
        }
        return null;
    }
    
    /**
     * Enhanced email extraction
     */
    private String extractEnhancedEmail(String text) {
        Pattern emailPattern = Pattern.compile(
            "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}", 
            Pattern.CASE_INSENSITIVE
        );
        Matcher matcher = emailPattern.matcher(text);
        return matcher.find() ? matcher.group().toLowerCase().trim() : null;
    }
    
    /**
     * Enhanced phone extraction
     */
    private String extractEnhancedPhone(String text) {
        Pattern[] patterns = {
            Pattern.compile("(\\\\+?\\\\d{1,3}[.\\\\s-]?)?\\\\(?\\\\d{3}\\\\)?[.\\\\s-]?\\\\d{3,4}\\\\s?\\\\d{4}", Pattern.CASE_INSENSITIVE),
            Pattern.compile("\\\\(?\\\\d{3}\\\\)?[.\\\\s-]?\\\\d{3}[.\\\\s-]?\\\\d{4}", Pattern.CASE_INSENSITIVE),
            Pattern.compile("\\\\(?\\\\d{2,4})[.\\\\s-]?\\\\d{4}", Pattern.CASE_INSENSITIVE),
            Pattern.compile("\\\\d{10,15}", Pattern.CASE_INSENSITIVE)
        };
        
        for (Pattern pattern : patterns) {
            Matcher matcher = pattern.matcher(text);
            if (matcher.find()) {
                return matcher.group().replaceAll("[^0-9+]", "");
            }
        }
        
        return null;
    }
    
    /**
     * Enhanced skills extraction
     */
    private List<String> extractEnhancedSkills(String text) {
        List<String> skills = new ArrayList<>();
        
        // First try AI-known skills
        for (String skill : ENHANCED_SKILLS) {
            String patternString = "\\b" + Pattern.quote(skill) + "\\b";
            Pattern pattern = Pattern.compile(patternString, Pattern.CASE_INSENSITIVE);
            if (pattern.matcher(text).find()) {
                skills.add(skill);
            }
        }
        
        return skills;
    }
    
    /**
     * Enhanced experience extraction
     */
    private int extractEnhancedExperience(String text) {
        Pattern pattern = Pattern.compile("(\\d+)\\s*(?:year|years|yr|y)?", Pattern.CASE_INSENSITIVE);
        Matcher matcher = pattern.matcher(text);
        
        int max = 0;
        while (matcher.find()) {
            try {
                int years = Integer.parseInt(matcher.group(1));
                if (years > max && years < 60) max = years;
            } catch (Exception e) {
                log.debug("Could not parse years: {}", matcher.group(1));
            }
        }
        
        return max;
    }
    
    /**
     * Enhanced education extraction
     */
    private String extractEnhancedEducation(String text) {
        Pattern educationPattern = Pattern.compile(
            "(?i)(?:bachelor|master|phd|doctorate|associate|degree|diploma|certificate|bs|ms|phd|ba|ma).{0,50}(?:university|college|institute|school|academy)",
            Pattern.CASE_INSENSITIVE
        );
        
        Matcher matcher = educationPattern.matcher(text);
        return matcher.find() ? matcher.group().trim() : null;
    }
    
    /**
     * Enhanced summary extraction
     */
    private String extractEnhancedSummary(String text) {
        String[] sentences = text.split("[.!?]+");
        for (String sentence : sentences) {
            sentence = sentence.trim();
            if (sentence.length() > 50 && sentence.length() < 200 &&
                (sentence.toLowerCase().contains("experience") || 
                 sentence.toLowerCase().contains("skilled") ||
                 sentence.toLowerCase().contains("professional") ||
                 sentence.toLowerCase().contains("expert"))) {
                return sentence;
            }
        }
        return null;
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
