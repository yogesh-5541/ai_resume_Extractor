package com.airesumeinsight.model.dto;

import java.util.List;

public class RankedCandidate {
    
    private String candidateName;
    private Long resumeId;
    private Double score;
    private List<String> matchedSkills;
    private List<String> missingSkills;
    
    // Enhanced quantitative metrics
    private Double skillMatchScore;
    private Double experienceScore;
    private Double educationScore;
    private Double overallFitScore;
    private Integer totalSkillsMatched;
    private Integer totalSkillsRequired;
    private Double experienceRelevanceRatio;
    private String candidateLevel;
    private String matchQuality;

    public RankedCandidate() {}

    public RankedCandidate(String candidateName, Long resumeId, Double score, List<String> matchedSkills, List<String> missingSkills) {
        this.candidateName = candidateName;
        this.resumeId = resumeId;
        this.score = score;
        this.matchedSkills = matchedSkills;
        this.missingSkills = missingSkills;
    }

    public String getCandidateName() {
        return candidateName;
    }

    public void setCandidateName(String candidateName) {
        this.candidateName = candidateName;
    }

    public Long getResumeId() {
        return resumeId;
    }

    public void setResumeId(Long resumeId) {
        this.resumeId = resumeId;
    }

    public Double getScore() {
        return score;
    }

    public void setScore(Double score) {
        this.score = score;
    }

    public List<String> getMatchedSkills() {
        return matchedSkills;
    }

    public void setMatchedSkills(List<String> matchedSkills) {
        this.matchedSkills = matchedSkills;
    }

    public List<String> getMissingSkills() {
        return missingSkills;
    }

    public void setMissingSkills(List<String> missingSkills) {
        this.missingSkills = missingSkills;
    }

    public Double getSkillMatchScore() {
        return skillMatchScore;
    }

    public void setSkillMatchScore(Double skillMatchScore) {
        this.skillMatchScore = skillMatchScore;
    }

    public Double getExperienceScore() {
        return experienceScore;
    }

    public void setExperienceScore(Double experienceScore) {
        this.experienceScore = experienceScore;
    }

    public Double getEducationScore() {
        return educationScore;
    }

    public void setEducationScore(Double educationScore) {
        this.educationScore = educationScore;
    }

    public Double getOverallFitScore() {
        return overallFitScore;
    }

    public void setOverallFitScore(Double overallFitScore) {
        this.overallFitScore = overallFitScore;
    }

    public Integer getTotalSkillsMatched() {
        return totalSkillsMatched;
    }

    public void setTotalSkillsMatched(Integer totalSkillsMatched) {
        this.totalSkillsMatched = totalSkillsMatched;
    }

    public Integer getTotalSkillsRequired() {
        return totalSkillsRequired;
    }

    public void setTotalSkillsRequired(Integer totalSkillsRequired) {
        this.totalSkillsRequired = totalSkillsRequired;
    }

    public Double getExperienceRelevanceRatio() {
        return experienceRelevanceRatio;
    }

    public void setExperienceRelevanceRatio(Double experienceRelevanceRatio) {
        this.experienceRelevanceRatio = experienceRelevanceRatio;
    }

    public String getCandidateLevel() {
        return candidateLevel;
    }

    public void setCandidateLevel(String candidateLevel) {
        this.candidateLevel = candidateLevel;
    }

    public String getMatchQuality() {
        return matchQuality;
    }

    public void setMatchQuality(String matchQuality) {
        this.matchQuality = matchQuality;
    }
}
