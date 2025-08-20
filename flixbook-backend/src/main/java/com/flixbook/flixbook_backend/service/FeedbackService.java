package com.flixbook.flixbook_backend.service;

import com.flixbook.flixbook_backend.model.Appuntamento;
import com.flixbook.flixbook_backend.model.StatoAppuntamento;
import com.flixbook.flixbook_backend.repository.AppuntamentoRepository;
import com.flixbook.flixbook_backend.repository.FeedbackRepository;
import com.flixbook.flixbook_backend.model.Feedback;
// import jakarta.annotation.PostConstruct;
// import jakarta.mail.MessagingException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
//import java.util.Optional;

@Service
public class FeedbackService {

    @Autowired
    private AppuntamentoRepository appuntamentoRepository;

    @Autowired
    private FeedbackRepository feedbackRepository;

    @Autowired
    private EmailService emailService;

    // @PostConstruct
    @Transactional
    public void sendFeedbackRequestsOnStartup() {
        System.out.println("Invio richieste di feedback all'avvio del server...");

        List<Appuntamento> appuntamentiCompletati = appuntamentoRepository
                .findByStatoAndFeedbackInviatoIsFalse(StatoAppuntamento.completato);

        if (!appuntamentiCompletati.isEmpty()) {
            for (Appuntamento appuntamento : appuntamentiCompletati) {
                String destinatario = appuntamento.getPaziente().getEmail();
                String oggetto = "Lascia il tuo feedback per l'appuntamento su Flixbook";

                String feedbackLink = "http://localhost:5173/feedback/" + appuntamento.getId();

                String corpo = "Gentile " + appuntamento.getPaziente().getNome() + ",\n\n"
                        + "Il tuo appuntamento con il Dr. " + appuntamento.getDisponibilita().getMedico().getCognome()
                        + " è stato completato.\n"
                        + "Aiutaci a migliorare la qualità dei nostri servizi lasciando un feedback.\n\n"
                        + "Clicca qui per lasciare la tua valutazione: " + feedbackLink + "\n\n"
                        + "Grazie per aver usato Flixbook!";

                emailService.sendEmail(destinatario, oggetto, corpo);

                appuntamento.setFeedbackInviato(true);
                appuntamentoRepository.save(appuntamento);
            }
        }
        System.out.println(String.format("Inviate %d richieste di feedback all'avvio.", appuntamentiCompletati.size()));
    }

    /**
     * Metodo per inviare un nuovo feedback.
     * @param appuntamentoId L'ID dell'appuntamento.
     * @param valutazione La valutazione data dal paziente (1-5).
     * @param commento Il commento opzionale.
     * @return L'oggetto Feedback salvato.
     */
    public Feedback submitFeedback(Long appuntamentoId, Integer valutazione, String commento) {
        Appuntamento appuntamento = appuntamentoRepository.findById(appuntamentoId)
                .orElseThrow(() -> new IllegalArgumentException("Appuntamento non trovato."));

        if (feedbackRepository.findByAppuntamentoId(appuntamentoId).isPresent()) {
            throw new IllegalArgumentException("Feedback per questo appuntamento già inviato.");
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