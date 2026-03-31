package com.airesumeinsight.service;

import com.airesumeinsight.model.dto.Candidate;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class AIExtractionService {

    private static final Logger log = LoggerFactory.getLogger(AIExtractionService.class);

    private final ChatModel chatModel;
    private final ObjectMapper objectMapper;

    // Known skills for fallback
    private static final List<String> KNOWN_SKILLS = Arrays.asList(
        "Java", "Python", "JavaScript", "TypeScript", "Spring Boot", "React", "Angular",
        "Vue", "Node.js", "Express", "SQL", "MySQL", "PostgreSQL", "NoSQL", "MongoDB",
        "AWS", "GCP", "Azure", "Docker", "Kubernetes", "Git", "C++", "C#", "Go", "Ruby",
        "Accounting", "Finance", "Excel", "Data Analysis", "Communication", "Leadership",
        "Photoshop", "Illustrator", "Figma", "HTML", "CSS", "REST", "GraphQL", "Redis",
        "Kafka", "Jenkins", "CI/CD", "Linux", "Bash", "Terraform", "Spring", "Hibernate"
    );

    public AIExtractionService(ChatModel chatModel, ObjectMapper objectMapper) {
        this.chatModel = chatModel;
        this.objectMapper = objectMapper;
    }

    public Candidate extractStructuredData(String resumeText) {
        // Truncate very long resumes to avoid context limits
        String truncated = resumeText != null && resumeText.length() > 10000
                ? resumeText.substring(0, 10000)
                : resumeText;

        String prompt = """
                You are a resume parser. Extract info from the resume below and return ONLY a JSON object.

                EXAMPLE INPUT:
                John Smith
                Software Engineer
                Email: john@example.com | Phone: 555-1234
                Skills: Java, Python, Docker, Negotiation, B2B Sales
                Experience: 5 years
                Education: B.Sc. in Computer Science - University of State
                Summary: Experienced software engineer with a track record.

                EXAMPLE OUTPUT:
                {"name":"John Smith","email":"john@example.com","phone":"555-1234","skills":["Java","Python","Docker","Negotiation","B2B Sales"],"experienceYears":5,"education":"B.Sc. in Computer Science - University of State","currentJobTitle":"Software Engineer","summary":"Experienced software engineer with a track record."}

                RULES:
                - Return ONLY the JSON object, no explanation, no markdown, no code block
                - name: full name of the candidate (usually the first line of the resume)
                - email: email address (look for @ symbol)
                - phone: phone number with digits
                - skills: array of ALL technical, soft, business, or professional skills mentioned. EXHAUSTIVE LIST - DO NOT TRUNCATE OR OMIT ANY SKILLS.
                - experienceYears: total years of work experience as a number (0 if not mentioned)
                - education: highest degree and institution name (null if not found)
                - currentJobTitle: the candidate's current or most recent job title (null if not found)
                - summary: a short 1-2 sentence professional summary of the candidate's profile (generate one if not explicitly written)
                - NEVER return null for name if any name-like text exists at the top of the resume

                RESUME:
                %s
                """.formatted(truncated);

        try {
            log.info("Sending prompt to AI for extraction...");
            String responseBody = chatModel.call(prompt);

            System.out.println("RAW AI RESPONSE: " + responseBody);

            String cleanedJson = extractJson(responseBody);
            System.out.println("CLEAN JSON: " + cleanedJson);

            JsonNode rootNode = objectMapper.readTree(cleanedJson);

            Candidate candidate = new Candidate();

            // Name
            String aiName = safeGetText(rootNode, "name");
            candidate.setName(aiName);

            // Email
            String aiEmail = safeGetText(rootNode, "email");
            candidate.setEmail(aiEmail);

            // Phone
            String aiPhone = safeGetText(rootNode, "phone");
            candidate.setPhone(aiPhone);

            // Skills
            List<String> parsedSkills = new ArrayList<>();
            if (rootNode.hasNonNull("skills") && rootNode.get("skills").isArray()) {
                for (JsonNode skillNode : rootNode.get("skills")) {
                    String s = skillNode.asText().trim();
                    if (!s.isEmpty()) parsedSkills.add(s);
                }
            }
            candidate.setSkills(parsedSkills);

            // Experience years
            double expYears = 0.0;
            if (rootNode.hasNonNull("experienceYears")) {
                try {
                    expYears = rootNode.get("experienceYears").asDouble();
                } catch (Exception ignored) {}
            }
            candidate.setExperienceYears(expYears);

            // Education
            String aiEducation = safeGetText(rootNode, "education");
            candidate.setEducation(aiEducation);

            // Job Title
            String aiJobTitle = safeGetText(rootNode, "currentJobTitle");
            candidate.setCurrentJobTitle(aiJobTitle);

            // Summary
            String aiSummary = safeGetText(rootNode, "summary");
            candidate.setSummary(aiSummary);

            // --- Apply fallbacks for any null fields ---
            applyFallbacks(candidate, resumeText);

            String name = candidate.getName();
            candidate.setStatus((name != null && !name.trim().isEmpty()) ? "SUCCESS" : "FAILED");
            
            return candidate;

        } catch (Exception e) {
            log.error("AI Extraction failed: {}. Using regex fallback.", e.getMessage());
            return buildFallbackCandidate(resumeText);
        }
    }

    /** Apply regex-based fallbacks for any field the AI left null/empty. */
    private void applyFallbacks(Candidate candidate, String text) {
        if (text == null || text.isBlank()) return;
        if (candidate.getEmail() == null || candidate.getEmail().isBlank())
            candidate.setEmail(extractEmail(text));
        if (candidate.getPhone() == null || candidate.getPhone().isBlank())
            candidate.setPhone(extractPhone(text));
        if (candidate.getName() == null || candidate.getName().isBlank())
            candidate.setName(extractName(text));
        if (candidate.getSkills() == null || candidate.getSkills().isEmpty())
            candidate.setSkills(fallbackSkillsExtraction(text));
        if (candidate.getExperienceYears() == null || candidate.getExperienceYears() == 0.0)
            candidate.setExperienceYears(extractExperienceYears(text));
    }

    private Candidate buildFallbackCandidate(String text) {
        Candidate c = new Candidate();
        c.setName(extractName(text));
        c.setEmail(extractEmail(text));
        c.setPhone(extractPhone(text));
        c.setSkills(fallbackSkillsExtraction(text));
        c.setExperienceYears(extractExperienceYears(text));
        c.setStatus(c.getName() != null ? "SUCCESS" : "FAILED");
        return c;
    }

    /** Safely get a text value; returns null if field is missing, null, or the string "null". */
    private String safeGetText(JsonNode node, String field) {
        if (!node.hasNonNull(field)) return null;
        String val = node.get(field).asText("").trim();
        return (val.isEmpty() || val.equalsIgnoreCase("null")) ? null : val;
    }

    private String extractEmail(String text) {
        Matcher m = Pattern.compile("[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}").matcher(text);
        return m.find() ? m.group() : null;
    }

    private String extractPhone(String text) {
        Matcher m = Pattern.compile("(\\+?\\d[\\d\\s().\\-]{7,}\\d)").matcher(text);
        return m.find() ? m.group().trim() : null;
    }

    private String extractName(String text) {
        String[] lines = text.trim().split("[\\r\\n]+");
        for (String line : lines) {
            line = line.trim();
            if (line.isEmpty() || line.contains("@")) continue;
            if (line.matches(".*\\d{5,}.*") || line.length() > 60) continue;
            if (line.matches("[A-Z ]+") && line.length() > 3) return toTitleCase(line);
            if (line.matches("[A-Z][a-z]+([ ][A-Z][a-z]+)+")) return line;
            if (line.matches("[A-Za-z]+([ ][A-Za-z]+)+") && line.split(" ").length <= 5) return line;
        }
        return null;
    }

    private String toTitleCase(String s) {
        StringBuilder sb = new StringBuilder();
        for (String w : s.split(" ")) {
            if (!w.isEmpty())
                sb.append(Character.toUpperCase(w.charAt(0))).append(w.substring(1).toLowerCase()).append(" ");
        }
        return sb.toString().trim();
    }

    private double extractExperienceYears(String text) {
        Matcher m = Pattern.compile("(\\d+)\\s*\\+?\\s*years?", Pattern.CASE_INSENSITIVE).matcher(text);
        int max = 0;
        while (m.find()) {
            int y = Integer.parseInt(m.group(1));
            if (y > max && y < 60) max = y;
        }
        return max;
    }

    private String extractJson(String response) {
        response = response.replaceAll("```json", "").replaceAll("```", "").trim();
        int start = response.indexOf("{");
        int end = response.lastIndexOf("}");
        if (start == -1 || end == -1 || start > end)
            throw new RuntimeException("No valid JSON in AI response: " + response.substring(0, Math.min(200, response.length())));
        return response.substring(start, end + 1);
    }

    private List<String> fallbackSkillsExtraction(String text) {
        List<String> found = new ArrayList<>();
        if (text == null || text.isBlank()) return found;
        for (String skill : KNOWN_SKILLS) {
            String patternString = "\\b" + Pattern.quote(skill) + "\\b";
            Pattern pattern = Pattern.compile(patternString, Pattern.CASE_INSENSITIVE);
            if (pattern.matcher(text).find()) {
                found.add(skill);
            }
        }
        return found;
    }
}
