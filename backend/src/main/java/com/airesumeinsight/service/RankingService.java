package com.airesumeinsight.service;

import com.airesumeinsight.model.JobDescription;
import com.airesumeinsight.model.Resume;
import com.airesumeinsight.model.dto.RankedCandidate;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

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

        for (Resume candidate : allCandidates) {
            List<String> candidateSkillsList = parseSkills(candidate.getSkills());

            // A. Skill Matching
            List<String> matchedSkills = new ArrayList<>();
            List<String> missingSkills = new ArrayList<>();

            for (String reqSkill : requiredSkillsList) {
                if (containsSkillIgnoreCase(candidateSkillsList, reqSkill)) {
                    matchedSkills.add(reqSkill);
                } else {
                    missingSkills.add(reqSkill);
                }
            }

            double skillMatchScore = 0.0;
            if (!requiredSkillsList.isEmpty()) {
                skillMatchScore = ((double) matchedSkills.size() / requiredSkillsList.size()) * 100.0;
            }

            // B. Experience Matching
            Double candidateExp = candidate.getExperienceYears() != null ? candidate.getExperienceYears() : 0.0;
            double experienceMatchScore = 0.0;

            if (minExp > 0) {
                if (candidateExp >= minExp) {
                    experienceMatchScore = 100.0;
                } else {
                    experienceMatchScore = (candidateExp / minExp) * 100.0;
                }
            } else {
                experienceMatchScore = 100.0; // If job requires 0 exp, candidate always passes
            }

            // C. Final Score Formula (Skill * 0.6 + Exp * 0.4)
            double finalScore = (skillMatchScore * 0.6) + (experienceMatchScore * 0.4);

            rankedCandidates.add(new RankedCandidate(
                    candidate.getApplicantName() != null ? candidate.getApplicantName() : "Unknown",
                    candidate.getId(),
                    Math.round(finalScore * 100.0) / 100.0, // round to 2 decimals
                    matchedSkills,
                    missingSkills
            ));
        }

        // Sort Highest score first
        rankedCandidates.sort(Comparator.comparing(RankedCandidate::getScore).reversed());

        return rankedCandidates;
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
