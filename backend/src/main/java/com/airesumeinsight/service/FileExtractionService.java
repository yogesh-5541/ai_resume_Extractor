package com.airesumeinsight.service;

import org.apache.tika.Tika;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import java.io.File;
import java.io.IOException;
import java.util.UUID;
import java.nio.file.Files;
import java.nio.file.Path;

@Service
public class FileExtractionService {

    public String extractText(MultipartFile multipartFile) throws IOException {
        Tika tika = new Tika();
        
        // Ensure temporary processing directory exists
        Path tempDir = Files.createTempDirectory("resume_uploads_");
        File tempFile = new File(tempDir.toFile(), UUID.randomUUID() + "_" + multipartFile.getOriginalFilename());
        
        try {
            // Save the multipart file to local disk temporarily
            multipartFile.transferTo(tempFile);
            
            // Extract the text using Apache Tika (will auto-detect PDF, Word, and Image types)
            return tika.parseToString(tempFile);
        } catch (Exception e) {
            throw new IOException("Failed to parse document: " + e.getMessage());
        } finally {
            // Clean up temporary files
            if (tempFile.exists()) {
                tempFile.delete();
            }
            if (tempDir.toFile().exists()) {
                tempDir.toFile().delete();
            }
        }
    }
}
