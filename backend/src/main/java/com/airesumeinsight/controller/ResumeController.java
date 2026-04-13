package com.airesumeinsight.controller;

import java.util.List;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.airesumeinsight.model.Resume;
import com.airesumeinsight.model.dto.Candidate;
import com.airesumeinsight.service.EnhancedExtractionService;
import com.airesumeinsight.service.ResumeService;

@CrossOrigin(origins = "http://localhost:5173")
@RestController
@RequestMapping("/api/v1/resumes")
public class ResumeController {
    private final ResumeService resumeService;
    private final EnhancedExtractionService enhancedExtractionService;

    public ResumeController(ResumeService resumeService, EnhancedExtractionService enhancedExtractionService) {
        this.resumeService = resumeService;
        this.enhancedExtractionService = enhancedExtractionService;
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

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deleteResume(@PathVariable Long id) {
        try {
            resumeService.deleteResumeById(id);
            return ResponseEntity.ok(Map.of("message", "Resume deleted successfully"));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("message", "Failed to delete resume: " + e.getMessage()));
        }
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

            // 1. Call EnhancedExtractionService to get structured data
            Candidate candidate = enhancedExtractionService.extractComprehensiveData(file);

            // 2. Save structured data and text to Database
            Resume resume = new Resume();
            resume.setOriginalText(candidate.getSummary() != null ? candidate.getSummary() : "Enhanced extraction completed");
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
