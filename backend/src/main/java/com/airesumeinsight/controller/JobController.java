package com.airesumeinsight.controller;

import com.airesumeinsight.model.JobDescription;
import com.airesumeinsight.service.JobService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@CrossOrigin(origins = "http://localhost:5173")
@RestController
@RequestMapping("/api/v1/jobs")
public class JobController {

    private final JobService jobService;

    public JobController(JobService jobService) {
        this.jobService = jobService;
    }

    @PostMapping
    public ResponseEntity<JobDescription> saveJob(@RequestBody JobDescription job) {
        return ResponseEntity.ok(jobService.saveJob(job));
    }

    @GetMapping
    public ResponseEntity<List<JobDescription>> getAllJobs() {
        return ResponseEntity.ok(jobService.getAllJobs());
    }
}
