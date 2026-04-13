package com.airesumeinsight.service;

import java.util.List;

import org.springframework.stereotype.Service;

import com.airesumeinsight.model.Resume;
import com.airesumeinsight.repository.ResumeRepository;

@Service
public class ResumeService {
    private final ResumeRepository resumeRepository;

    public ResumeService(ResumeRepository resumeRepository) {
        this.resumeRepository = resumeRepository;
    }

    public List<Resume> getAllResumes() {
        return resumeRepository.findAll();
    }

    public Resume saveResume(Resume resume) {
        return resumeRepository.save(resume);
    }

    public void deleteAllResumes() {
        resumeRepository.deleteAll();
    }

    public void deleteResumeById(Long id) {
        if (!resumeRepository.existsById(id)) {
            throw new RuntimeException("Resume not found with id: " + id);
        }
        resumeRepository.deleteById(id);
    }
}
