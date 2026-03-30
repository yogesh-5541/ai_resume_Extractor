package com.airesumeinsight.controller;

import com.airesumeinsight.model.dto.RankedCandidate;
import com.airesumeinsight.service.RankingService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@CrossOrigin(origins = "http://localhost:5173")
@RestController
@RequestMapping("/api/v1/candidates")
public class RankingController {

    private final RankingService rankingService;

    public RankingController(RankingService rankingService) {
        this.rankingService = rankingService;
    }

    @GetMapping("/rank/{jobId}")
    public ResponseEntity<List<RankedCandidate>> rankCandidatesForJob(@PathVariable Long jobId) {
        try {
            List<RankedCandidate> rankedCandidates = rankingService.rankCandidatesForJob(jobId);
            return ResponseEntity.ok(rankedCandidates);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }
}
