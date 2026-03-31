package com.airesumeinsight.controller;

import com.airesumeinsight.model.Resume;
import com.airesumeinsight.service.ResumeService;
import com.airesumeinsight.service.FileExtractionService;
import com.airesumeinsight.service.AIExtractionService;
import com.airesumeinsight.model.dto.Candidate;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@CrossOrigin(origins = "http://localhost:5173")
@RestController
@RequestMapping("/api/v1/resumes")
public class ResumeController {
    private final ResumeService resumeService;
    private final FileExtractionService fileExtractionService;
    private final AIExtractionService aiExtractionService;

    public ResumeController(ResumeService resumeService, FileExtractionService fileExtractionService, AIExtractionService aiExtractionService) {
        this.resumeService = resumeService;
        this.fileExtractionService = fileExtractionService;
        this.aiExtractionService = aiExtractionService;
    }

    @GetMapping
    public ResponseEntity<List<Resume>> getAllResumes() {
        return ResponseEntity.ok(resumeService.getAllResumes());
    }

    @DeleteMapping("/all")
    public ResponseEntity<Map<String, String>> deleteAllResumes() {
        resumeService.deleteAllResumes();
        return ResponseEntity.ok(Map.of("message", "All resumes deleted successfully"));
    }

    @PostMapping
    public ResponseEntity<Resume> saveResume(@RequestBody Resume resume) {
        return ResponseEntity.ok(resumeService.saveResume(resume));
    }

    @PostMapping("/upload")
    public ResponseEntity<Map<String, Object>> uploadResumeFile(
            @RequestParam("file") MultipartFile file) {
        try {
            String contentType = file.getContentType();
            if (contentType == null || (!contentType.equals("application/pdf") 
                && !contentType.equals("application/vnd.openxmlformats-officedocument.wordprocessingml.document") 
                && !contentType.startsWith("image/")
                && !contentType.equals("text/plain"))) {
                return ResponseEntity.badRequest().body(Map.of("message", "Invalid file extension. Only PDF, DOCX, Images, and TXT allowed."));
            }

            String extractedText = fileExtractionService.extractText(file);

            // 1. Call AIExtractionService to get structured JSON
            Candidate candidate = aiExtractionService.extractStructuredData(extractedText);

            // 2. Save structured data and text to Database
            Resume resume = new Resume();
            resume.setOriginalText(extractedText);
            resume.setApplicantName(candidate.getName());
            resume.setEmail(candidate.getEmail());
            resume.setPhone(candidate.getPhone());
            
            if (candidate.getSkills() != null) {
                resume.setSkills(String.join(", ", candidate.getSkills()));
            } else {
                resume.setSkills("");
            }
            
            resume.setExperienceYears(candidate.getExperienceYears());
            resume.setEducation(candidate.getEducation());
            resume.setCurrentJobTitle(candidate.getCurrentJobTitle());
            resume.setSummary(candidate.getSummary());
            resume.setStatus(candidate.getStatus());

            Resume savedResume = resumeService.saveResume(resume);

            return ResponseEntity.ok(Map.of(
                "message", "File uploaded and processed successfully",
                "fileName", file.getOriginalFilename() != null ? file.getOriginalFilename() : "Unknown",
                "structuredData", candidate, 
                "resumeId", savedResume.getId()
            ));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("message", "Error extracting file: " + e.getMessage()));
        }
    }
}
