package com.airesumeinsight.service;

import com.airesumeinsight.model.dto.Candidate;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

@Service
public class AIExtractionService {

    private static final Logger log = LoggerFactory.getLogger(AIExtractionService.class);

    private final ChatModel chatModel;
    private final ObjectMapper objectMapper;

    // Known skills for fallback
    private static final List<String> KNOWN_SKILLS = Arrays.asList(
        "Java", "Python", "JavaScript", "TypeScript", "Spring Boot", "React", "Angular", 
        "Vue", "Node.js", "Express", "SQL", "MySQL", "PostgreSQL", "NoSQL", "MongoDB", 
        "AWS", "GCP", "Azure", "Docker", "Kubernetes", "Git", "C++", "C#", "Go", "Ruby"
    );

    public AIExtractionService(ChatModel chatModel, ObjectMapper objectMapper) {
        this.chatModel = chatModel;
        this.objectMapper = objectMapper;
    }

    public Candidate extractStructuredData(String resumeText) {
        String prompt = """
                Extract the following fields from the resume text.
                Return ONLY valid JSON.
                
                {
                  "name": "",
                  "email": "",
                  "phone": "",
                  "skills": [],
                  "experienceYears": 0
                }
                
                Rules:
                * Do not add explanation
                * Do not add extra text
                * Only return JSON
                * If not found, use null
                
                Content:
                %s
                """.formatted(resumeText);

        try {
            log.info("Sending prompt to AI for extraction...");
            String responseBody = chatModel.call(prompt);
            
            System.out.println("RAW AI RESPONSE: " + responseBody);

            String cleanedJson = extractJson(responseBody);
            System.out.println("CLEAN JSON: " + cleanedJson);

            Candidate candidate = objectMapper.readValue(cleanedJson, Candidate.class);

            // 5. Improve skills extraction fallback (in case AI parsed Candidate but left skills empty)
            if (candidate.getSkills() == null || candidate.getSkills().isEmpty()) {
                candidate.setSkills(fallbackSkillsExtraction(resumeText));
            }

            // Set success conditionally based on whether valid elements emerged
            String name = candidate.getName();
            candidate.setStatus((name != null && !name.trim().isEmpty()) ? "SUCCESS" : "FAILED");
            
            return candidate;

        } catch (Exception e) {
            log.error("AI Extraction failed. Reason: {}. Using fallback strategy.", e.getMessage());
            
            // 6. Handle errors safely -> mark status = FAILED
            List<String> fallbackSkills = fallbackSkillsExtraction(resumeText);
            
            return Candidate.builder()
                .name(null)
                .email(null)
                .phone(null)
                .skills(fallbackSkills)
                .experienceYears(0.0)
                .status("FAILED")
                .build();
        }
    }

    private String extractJson(String response) {
        int startIndex = response.indexOf("{");
        int endIndex = response.lastIndexOf("}");
        
        if (startIndex == -1 || endIndex == -1 || startIndex > endIndex) {
            throw new RuntimeException("Valid JSON not found in AI response");
        }
        
        return response.substring(startIndex, endIndex + 1);
    }

    // 5. Improve skills extraction -> search known skills string match
    private List<String> fallbackSkillsExtraction(String text) {
        List<String> foundSkills = new ArrayList<>();
        if (text == null || text.isBlank()) {
            return foundSkills;
        }
        String textLower = text.toLowerCase();
        for (String skill : KNOWN_SKILLS) {
            if (textLower.contains(skill.toLowerCase())) {
                foundSkills.add(skill);
            }
        }
        return foundSkills;
    }
}
