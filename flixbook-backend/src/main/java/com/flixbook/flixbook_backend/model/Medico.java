package com.flixbook.flixbook_backend.model;

// import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Data;
import java.util.List;

@Entity
@Table(name = "medici")
@Data
public class Medico {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    private String nome;
    private String cognome;
    private String email;
    
    // Assicurati che la mappatura sia corretta, con la tabella di join esplicita
    @ManyToMany
    @JoinTable(
        name = "medici_prestazioni",
        joinColumns = @JoinColumn(name = "medico_id"),
        inverseJoinColumns = @JoinColumn(name = "prestazione_id")
    )
    private List<Prestazione> prestazioni;
}