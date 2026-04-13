package com.airesumeinsight.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.airesumeinsight.model.JobDescription;
import com.airesumeinsight.model.dto.RankedCandidate;
import com.airesumeinsight.service.JobService;
import com.airesumeinsight.service.RankingService;

@CrossOrigin(origins = "http://localhost:5173")
@RestController
@RequestMapping("/api/v1/jobs")
public class JobController {

    private final JobService jobService;
    private final RankingService rankingService;

    public JobController(JobService jobService, RankingService rankingService) {
        this.jobService = jobService;
        this.rankingService = rankingService;
    }

    @PostMapping
    public ResponseEntity<JobDescription> saveJob(@RequestBody JobDescription job) {
        return ResponseEntity.ok(jobService.saveJob(job));
    }

    @GetMapping
    public ResponseEntity<List<JobDescription>> getAllJobs() {
        return ResponseEntity.ok(jobService.getAllJobs());
    }

    @GetMapping("/{jobId}/rank")
    public ResponseEntity<List<RankedCandidate>> rankCandidatesForJob(@PathVariable Long jobId) {
        try {
            List<RankedCandidate> rankedCandidates = rankingService.rankCandidatesForJob(jobId);
            return ResponseEntity.ok(rankedCandidates);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
}
