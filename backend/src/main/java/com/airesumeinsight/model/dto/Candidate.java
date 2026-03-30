package com.airesumeinsight.model.dto;

import java.util.List;

public class Candidate {
    private String name;
    private String email;
    private String phone;
    private List<String> skills;
    private Double experienceYears;
    private String status;

    public Candidate() {}

    public Candidate(String name, String email, String phone, List<String> skills, Double experienceYears, String status) {
        this.name = name;
        this.email = email;
        this.phone = phone;
        this.skills = skills;
        this.experienceYears = experienceYears;
        this.status = status;
    }

    public static CandidateBuilder builder() {
        return new CandidateBuilder();
    }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public List<String> getSkills() { return skills; }
    public void setSkills(List<String> skills) { this.skills = skills; }

    public Double getExperienceYears() { return experienceYears; }
    public void setExperienceYears(Double experienceYears) { this.experienceYears = experienceYears; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public static class CandidateBuilder {
        private String name;
        private String email;
        private String phone;
        private List<String> skills;
        private Double experienceYears;
        private String status;

        public CandidateBuilder name(String name) { this.name = name; return this; }
        public CandidateBuilder email(String email) { this.email = email; return this; }
        public CandidateBuilder phone(String phone) { this.phone = phone; return this; }
        public CandidateBuilder skills(List<String> skills) { this.skills = skills; return this; }
        public CandidateBuilder experienceYears(Double experienceYears) { this.experienceYears = experienceYears; return this; }
        public CandidateBuilder status(String status) { this.status = status; return this; }

        public Candidate build() {
            return new Candidate(name, email, phone, skills, experienceYears, status);
        }
    }
}
