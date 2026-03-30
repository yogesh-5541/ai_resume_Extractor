package com.airesumeinsight.service;

import com.airesumeinsight.model.Resume;
import com.airesumeinsight.repository.ResumeRepository;
import org.springframework.stereotype.Service;
import java.util.List;

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
}
