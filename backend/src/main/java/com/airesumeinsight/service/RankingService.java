package com.airesumeinsight.service;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.airesumeinsight.model.JobDescription;
import com.airesumeinsight.model.Resume;
import com.airesumeinsight.model.dto.RankedCandidate;

@Service
public class RankingService {

    private final JobService jobService;
    private final ResumeService resumeService;

    public RankingService(JobService jobService, ResumeService resumeService) {
        this.jobService = jobService;
        this.resumeService = resumeService;
    }

    public List<RankedCandidate> rankCandidatesForJob(Long jobId) {
        JobDescription job = jobService.getJobById(jobId)
                .orElseThrow(() -> new RuntimeException("Job not found with ID: " + jobId));

        List<Resume> allCandidates = resumeService.getAllResumes();
        List<RankedCandidate> rankedCandidates = new ArrayList<>();

        List<String> requiredSkillsList = parseSkills(job.getRequiredSkills());
        Double minExp = job.getMinExperience() != null ? job.getMinExperience() : 0.0;
        String jobTitle = job.getTitle() != null ? job.getTitle().toLowerCase() : "";

        for (Resume candidate : allCandidates) {
            List<String> candidateSkillsList = parseSkills(candidate.getSkills());
            Double candidateExp = candidate.getExperienceYears() != null ? candidate.getExperienceYears() : 0.0;
            String candidateTitle = candidate.getCurrentJobTitle() != null ? candidate.getCurrentJobTitle().toLowerCase() : "";
            String candidateEducation = candidate.getEducation() != null ? candidate.getEducation().toLowerCase() : "";

            // Enhanced Quantitative Analysis

            // 1. Advanced Skill Matching (Weight: 40%)
            SkillMatchResult skillResult = calculateAdvancedSkillMatch(requiredSkillsList, candidateSkillsList);

            // 2. Experience Relevance Analysis (Weight: 25%)
            ExperienceResult experienceResult = calculateExperienceRelevance(candidateExp, minExp, jobTitle, candidateTitle);

            // 3. Education & Title Alignment (Weight: 20%)
            EducationTitleResult educationResult = calculateEducationTitleAlignment(jobTitle, candidateTitle, candidateEducation);

            // 4. Overall Profile Completeness (Weight: 10%)
            Double completenessScore = calculateProfileCompleteness(candidate);

            // 5. Professional Level Assessment (Weight: 5%)
            Double levelScore = calculateProfessionalLevel(candidateExp, candidateTitle);

            // Calculate Final Weighted Score
            double finalScore = 
                (skillResult.matchScore * 0.40) +      // Advanced Skills
                (experienceResult.score * 0.25) +        // Experience Relevance
                (educationResult.score * 0.20) +         // Education/Title Alignment
                (completenessScore * 0.10) +           // Profile Completeness
                (levelScore * 0.05);                    // Professional Level

            // Create Enhanced RankedCandidate
            RankedCandidate rankedCandidate = new RankedCandidate(
                    candidate.getApplicantName() != null ? candidate.getApplicantName() : "Unknown",
                    candidate.getId(),
                    Math.round(finalScore * 100.0) / 100.0, // round to 2 decimals
                    skillResult.matchedSkills,
                    skillResult.missingSkills
            );

            // Set Enhanced Quantitative Metrics
            rankedCandidate.setSkillMatchScore(skillResult.matchScore);
            rankedCandidate.setExperienceScore(experienceResult.score);
            rankedCandidate.setEducationScore(educationResult.score);
            rankedCandidate.setOverallFitScore(finalScore);
            rankedCandidate.setTotalSkillsMatched(skillResult.matchedSkills.size());
            rankedCandidate.setTotalSkillsRequired(requiredSkillsList.size());
            rankedCandidate.setExperienceRelevanceRatio(experienceResult.relevanceRatio);
            rankedCandidate.setCandidateLevel(determineCandidateLevel(candidateExp, candidateTitle));
            rankedCandidate.setMatchQuality(determineMatchQuality(finalScore));

            rankedCandidates.add(rankedCandidate);
        }

        // Sort by final score (highest first)
        rankedCandidates.sort(Comparator.comparing(RankedCandidate::getScore).reversed());

        return rankedCandidates;
    }

    /**
     * Advanced Skill Matching with semantic analysis
     */
    private SkillMatchResult calculateAdvancedSkillMatch(List<String> requiredSkills, List<String> candidateSkills) {
        Set<String> requiredSet = new HashSet<>(requiredSkills.stream()
                .map(String::toLowerCase)
                .map(String::trim)
                .collect(Collectors.toSet()));

        Set<String> candidateSet = new HashSet<>(candidateSkills.stream()
                .map(String::toLowerCase)
                .map(String::trim)
                .collect(Collectors.toSet()));

        List<String> matchedSkills = new ArrayList<>();
        List<String> missingSkills = new ArrayList<>();

        // Exact matches
        for (String reqSkill : requiredSkills) {
            if (candidateSet.contains(reqSkill.toLowerCase())) {
                matchedSkills.add(reqSkill);
            } else {
                // Check for partial matches and synonyms
                boolean foundPartial = candidateSkills.stream()
                        .anyMatch(candidateSkill -> isSkillMatch(candidateSkill, reqSkill));
                
                if (foundPartial) {
                    matchedSkills.add(reqSkill);
                } else {
                    missingSkills.add(reqSkill);
                }
            }
        }

        // Calculate advanced skill score
        double exactMatchRatio = requiredSet.isEmpty() ? 0.0 : 
                (double) matchedSkills.size() / requiredSet.size();
        
        // Bonus for having extra relevant skills
        double extraSkillsBonus = Math.min((candidateSkills.size() - matchedSkills.size()) * 0.05, 0.25);
        
        double finalSkillScore = Math.min((exactMatchRatio * 100) + extraSkillsBonus, 100.0);

        return new SkillMatchResult(matchedSkills, missingSkills, finalSkillScore);
    }

    /**
     * Experience relevance with job title correlation
     */
    private ExperienceResult calculateExperienceRelevance(Double candidateExp, Double minExp, String jobTitle, String candidateTitle) {
        double baseScore = 0.0;
        double relevanceRatio = 0.0;

        if (minExp > 0) {
            if (candidateExp >= minExp) {
                baseScore = 100.0;
                // Bonus for significantly more experience
                if (candidateExp >= minExp * 1.5) {
                    baseScore = Math.min(baseScore + 15, 100.0);
                } else if (candidateExp >= minExp * 1.2) {
                    baseScore = Math.min(baseScore + 10, 100.0);
                }
            } else {
                baseScore = (candidateExp / minExp) * 100.0;
            }
            relevanceRatio = Math.min(candidateExp / minExp, 2.0);
        } else {
            baseScore = 100.0; // If job requires 0 exp, candidate always passes
            relevanceRatio = 1.0;
        }

        // Job title relevance bonus
        double titleBonus = calculateTitleRelevance(jobTitle, candidateTitle);
        baseScore = Math.min(baseScore + titleBonus, 100.0);

        return new ExperienceResult(baseScore, relevanceRatio);
    }

    /**
     * Education and Title Alignment Analysis
     */
    private EducationTitleResult calculateEducationTitleAlignment(String jobTitle, String candidateTitle, String candidateEducation) {
        double score = 50.0; // Base score

        // Title alignment
        if (!candidateTitle.isEmpty() && !jobTitle.isEmpty()) {
            List<String> jobWords = Arrays.asList(jobTitle.split("\\s+"));
            List<String> candidateWords = Arrays.asList(candidateTitle.split("\\s+"));
            
            long matchingWords = jobWords.stream()
                    .filter(word -> word.length() > 2)
                    .filter(candidateWords::contains)
                    .count();
            
            double titleAlignment = jobWords.isEmpty() ? 0.0 : 
                    (double) matchingWords / jobWords.size();
            score += titleAlignment * 30.0;
        }

        // Education relevance
        if (!candidateEducation.isEmpty()) {
            // Check for relevant degree keywords
            List<String> relevantDegrees = Arrays.asList(
                    "master", "bachelor", "phd", "doctorate", "mba", "engineering", 
                    "computer science", "information technology", "business", "management");
            
            boolean hasRelevantDegree = relevantDegrees.stream()
                    .anyMatch(degree -> candidateEducation.contains(degree));
            
            if (hasRelevantDegree) {
                score += 20.0;
            }
        }

        return new EducationTitleResult(Math.min(score, 100.0));
    }

    /**
     * Profile Completeness Score
     */
    private Double calculateProfileCompleteness(Resume candidate) {
        double score = 0.0;
        int totalFields = 7;
        int filledFields = 0;

        if (candidate.getApplicantName() != null && !candidate.getApplicantName().trim().isEmpty()) filledFields++;
        if (candidate.getEmail() != null && !candidate.getEmail().trim().isEmpty()) filledFields++;
        if (candidate.getPhone() != null && !candidate.getPhone().trim().isEmpty()) filledFields++;
        if (candidate.getSkills() != null && !candidate.getSkills().trim().isEmpty()) filledFields++;
        if (candidate.getExperienceYears() != null && candidate.getExperienceYears() > 0) filledFields++;
        if (candidate.getEducation() != null && !candidate.getEducation().trim().isEmpty()) filledFields++;
        if (candidate.getSummary() != null && !candidate.getSummary().trim().isEmpty()) filledFields++;

        score = (double) filledFields / totalFields * 100.0;
        return score;
    }

    /**
     * Professional Level Assessment
     */
    private Double calculateProfessionalLevel(Double experience, String title) {
        double score = 50.0; // Base score

        // Experience-based level
        if (experience >= 10) score += 25.0;
        else if (experience >= 5) score += 20.0;
        else if (experience >= 2) score += 15.0;
        else if (experience >= 1) score += 10.0;

        // Title-based level
        if (title.contains("senior") || title.contains("lead") || title.contains("principal")) {
            score += 15.0;
        } else if (title.contains("manager") || title.contains("head") || title.contains("director")) {
            score += 20.0;
        } else if (title.contains("junior") || title.contains("entry") || title.contains("associate")) {
            score += 5.0;
        }

        return Math.min(score, 100.0);
    }

    /**
     * Semantic skill matching
     */
    private boolean isSkillMatch(String candidateSkill, String requiredSkill) {
        String candidate = candidateSkill.toLowerCase().trim();
        String required = requiredSkill.toLowerCase().trim();

        // Exact match
        if (candidate.equals(required)) return true;

        // Common variations and abbreviations
        Map<String, List<String>> variations = new HashMap<>();
        variations.put("javascript", Arrays.asList("js", "ecmascript"));
        variations.put("typescript", Arrays.asList("ts"));
        variations.put("python", Arrays.asList("py"));
        variations.put("java", Arrays.asList("jvm", "j2ee"));
        variations.put("react", Arrays.asList("reactjs", "react.js"));
        variations.put("angular", Arrays.asList("angularjs", "angular.js"));
        variations.put("node", Arrays.asList("nodejs", "node.js"));
        variations.put("sql", Arrays.asList("mysql", "postgresql", "oracle", "database"));
        variations.put("aws", Arrays.asList("amazon web services", "cloud"));
        variations.put("docker", Arrays.asList("container", "kubernetes"));
        variations.put("git", Arrays.asList("github", "gitlab", "version control"));

        for (Map.Entry<String, List<String>> entry : variations.entrySet()) {
            if (entry.getKey().equals(required) || entry.getValue().contains(required)) {
                return entry.getValue().stream().anyMatch(candidate::contains) || 
                       entry.getKey().equals(candidate);
            }
        }

        return false;
    }

    /**
     * Title relevance calculation
     */
    private double calculateTitleRelevance(String jobTitle, String candidateTitle) {
        if (jobTitle.isEmpty() || candidateTitle.isEmpty()) return 0.0;

        List<String> jobWords = Arrays.asList(jobTitle.split("\\s+"));
        List<String> candidateWords = Arrays.asList(candidateTitle.split("\\s+"));

        long matchingWords = jobWords.stream()
                .filter(word -> word.length() > 2)
                .filter(candidateWords::contains)
                .count();

        double relevance = jobWords.isEmpty() ? 0.0 : 
                (double) matchingWords / jobWords.size();

        return relevance * 15.0; // Max 15 points bonus
    }

    /**
     * Determine candidate level based on experience and title
     */
    private String determineCandidateLevel(Double experience, String title) {
        if (experience >= 10 || title.contains("senior") || title.contains("lead")) {
            return "Senior";
        } else if (experience >= 5 || title.contains("mid")) {
            return "Mid-Level";
        } else if (experience >= 2 || title.contains("junior")) {
            return "Junior";
        } else {
            return "Entry-Level";
        }
    }

    /**
     * Determine match quality category
     */
    private String determineMatchQuality(double score) {
        if (score >= 90) return "Excellent Match";
        else if (score >= 80) return "Strong Match";
        else if (score >= 70) return "Good Match";
        else if (score >= 60) return "Fair Match";
        else return "Poor Match";
    }

    // Helper classes for structured results
    private static class SkillMatchResult {
        List<String> matchedSkills;
        List<String> missingSkills;
        double matchScore;

        SkillMatchResult(List<String> matchedSkills, List<String> missingSkills, double matchScore) {
            this.matchedSkills = matchedSkills;
            this.missingSkills = missingSkills;
            this.matchScore = matchScore;
        }
    }

    private static class ExperienceResult {
        double score;
        double relevanceRatio;

        ExperienceResult(double score, double relevanceRatio) {
            this.score = score;
            this.relevanceRatio = relevanceRatio;
        }
    }

    private static class EducationTitleResult {
        double score;

        EducationTitleResult(double score) {
            this.score = score;
        }
    }

    private List<String> parseSkills(String skillsString) {
        if (skillsString == null || skillsString.trim().isEmpty()) {
            return new ArrayList<>();
        }
        return Arrays.stream(skillsString.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toList());
    }

    private boolean containsSkillIgnoreCase(List<String> skillsList, String targetSkill) {
        return skillsList.stream()
                .anyMatch(skill -> skill.equalsIgnoreCase(targetSkill.trim()));
    }
}
