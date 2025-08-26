// package com.flixbook.flixbook_backend.config;

// import org.springframework.stereotype.Component;
// import org.springframework.beans.factory.annotation.Autowired;
// import com.flixbook.flixbook_backend.repository.DisponibilitaRepository;
// import com.flixbook.flixbook_backend.model.Disponibilita;
// import com.flixbook.flixbook_backend.model.Appuntamento;
// import com.flixbook.flixbook_backend.repository.AppuntamentoRepository;

// import jakarta.annotation.PostConstruct;
// import jakarta.transaction.Transactional;

// import java.time.LocalDate;
// import java.util.List;

// @Component
// public class DatabaseCleanup {

//     @Autowired
//     private DisponibilitaRepository disponibilitaRepository;

//     @Autowired
//     private AppuntamentoRepository appuntamentoRepository;

//     @PostConstruct
//     @Transactional
//     public void init() {
//         System.out.println("Avvio del task di pulizia delle disponibilità scadute...");
//         LocalDate yesterday = LocalDate.now().minusDays(1);

//         // Passo 1: Trova le disponibilità scadute
//         List<Disponibilita> expiredDisponibilita = disponibilitaRepository.findByDataBefore(yesterday);

//         // Passo 2: Elimina tutti gli appuntamenti collegati alle disponibilità scadute
//         for (Disponibilita disp : expiredDisponibilita) {
//             // Trova e poi elimina gli appuntamenti collegati
//             List<Appuntamento> appointmentsToDelete = appuntamentoRepository.findByDisponibilita(disp);
//             appuntamentoRepository.deleteAll(appointmentsToDelete);
//         }

//         // Passo 3: Ora puoi eliminare le disponibilità
//         long deletedCount = disponibilitaRepository.deleteByDataBefore(yesterday);

//         System.out.println(String.format("Rimossi %d slot di disponibilità scaduti.", deletedCount));
//     }
// }