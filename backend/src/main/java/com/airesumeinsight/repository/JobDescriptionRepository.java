package com.airesumeinsight.repository;

import com.airesumeinsight.model.JobDescription;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface JobDescriptionRepository extends JpaRepository<JobDescription, Long> {
}
