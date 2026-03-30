package com.airesumeinsight.model;

import jakarta.persistence.*;

@Entity
public class JobDescription {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String title;
    
    @Column(columnDefinition = "TEXT")
    private String requiredSkills; // Comma-separated
    
    private Double minExperience;
    
    @Column(columnDefinition = "LONGTEXT")
    private String description;

    public JobDescription() {}

    public JobDescription(String title, String requiredSkills, Double minExperience, String description) {
        this.title = title;
        this.requiredSkills = requiredSkills;
        this.minExperience = minExperience;
        this.description = description;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getRequiredSkills() {
        return requiredSkills;
    }

    public void setRequiredSkills(String requiredSkills) {
        this.requiredSkills = requiredSkills;
    }

    public Double getMinExperience() {
        return minExperience;
    }

    public void setMinExperience(Double minExperience) {
        this.minExperience = minExperience;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }
}
