package com.flixbook.flixbook_backend.controller;

import com.flixbook.flixbook_backend.model.Feedback;
import com.flixbook.flixbook_backend.service.FeedbackService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/feedback")
public class FeedbackController {

    @Autowired
    private FeedbackService feedbackService;
    
    private static class FeedbackRequest {
        public Long appuntamentoId;
        public Integer valutazione;
        public String commento;
    }

    @PostMapping("/submit")
    public ResponseEntity<?> submitFeedback(@RequestBody FeedbackRequest request) {
        try {
            Feedback newFeedback = feedbackService.submitFeedback(request.appuntamentoId, request.valutazione, request.commento);
            return new ResponseEntity<>(newFeedback, HttpStatus.CREATED);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Errore interno durante l'invio del feedback.");
        }
    }
}