package com.airesumeinsight.model.dto;

import java.util.List;

public class RankedCandidate {
    
    private String candidateName;
    private Long resumeId;
    private Double score;
    private List<String> matchedSkills;
    private List<String> missingSkills;

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
}
