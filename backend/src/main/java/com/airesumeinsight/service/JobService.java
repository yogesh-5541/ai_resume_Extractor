package com.airesumeinsight.service;

import com.airesumeinsight.model.JobDescription;
import com.airesumeinsight.repository.JobDescriptionRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class JobService {
    
    private final JobDescriptionRepository jobDescriptionRepository;

    public JobService(JobDescriptionRepository jobDescriptionRepository) {
        this.jobDescriptionRepository = jobDescriptionRepository;
    }

    public JobDescription saveJob(JobDescription job) {
        return jobDescriptionRepository.save(job);
    }

    public List<JobDescription> getAllJobs() {
        return jobDescriptionRepository.findAll();
    }

    public Optional<JobDescription> getJobById(Long id) {
        return jobDescriptionRepository.findById(id);
    }
}
