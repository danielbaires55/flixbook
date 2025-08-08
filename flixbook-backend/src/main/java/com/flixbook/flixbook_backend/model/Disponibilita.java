package com.flixbook.flixbook_backend.model;

// import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDate;
import java.time.LocalTime;

@Entity
@Table(name = "disponibilita")
@Data
public class Disponibilita {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Carichiamo subito i dati del medico, perche' il frontend ne ha bisogno
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "medico_id")
    private Medico medico;

    // Carichiamo subito i dati della prestazione, perche' il frontend ne ha bisogno
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "prestazione_id")
    private Prestazione prestazione;
    
    private LocalDate data;
    private LocalTime oraInizio;
    private LocalTime oraFine;
    private boolean prenotato;
}