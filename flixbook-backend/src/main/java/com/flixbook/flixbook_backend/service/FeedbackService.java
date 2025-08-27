package com.flixbook.flixbook_backend.service;

import com.flixbook.flixbook_backend.model.Appuntamento;
import com.flixbook.flixbook_backend.model.StatoAppuntamento;
import com.flixbook.flixbook_backend.model.Feedback;
import com.flixbook.flixbook_backend.repository.AppuntamentoRepository;
import com.flixbook.flixbook_backend.repository.FeedbackRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@Transactional
public class FeedbackService {

    @Autowired
    private AppuntamentoRepository appuntamentoRepository;
    @Autowired
    private FeedbackRepository feedbackRepository;

    public Feedback submitFeedback(String pazienteEmail, Long appuntamentoId, Integer valutazione, String commento) {
        Appuntamento appuntamento = appuntamentoRepository.findById(appuntamentoId)
                .orElseThrow(() -> new IllegalArgumentException("Appuntamento non trovato."));

        // Autorizzazione: solo il paziente proprietario dell'appuntamento può lasciare feedback
        if (appuntamento.getPaziente() == null || !appuntamento.getPaziente().getEmail().equals(pazienteEmail)) {
            throw new SecurityException("Non sei autorizzato a lasciare un feedback per questo appuntamento.");
        }

        // Stato: feedback solo per appuntamenti completati
    if (appuntamento.getStato() != StatoAppuntamento.COMPLETATO) {
            throw new IllegalStateException("Puoi lasciare un feedback solo per appuntamenti completati.");
        }

        if (feedbackRepository.findByAppuntamentoId(appuntamentoId).isPresent()) {
            throw new IllegalStateException("Feedback per questo appuntamento già inviato.");
        }
        
        Feedback feedback = Feedback.builder()
                .appuntamento(appuntamento)
                .valutazione(valutazione)
                .commento(commento)
                .dataFeedback(LocalDateTime.now())
                .build();

        return feedbackRepository.save(feedback);
    }
}