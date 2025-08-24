package com.flixbook.flixbook_backend.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Data;
import java.util.List;

@Entity
@Table(name = "specialita")
@Data
public class Specialita {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String nome;
    @Column(name = "icon_url")
    private String iconUrl;
    
    @OneToMany(mappedBy = "specialita")
    @JsonIgnore
    private List<Prestazione> prestazioni;
}