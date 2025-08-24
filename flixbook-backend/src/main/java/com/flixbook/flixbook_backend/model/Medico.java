package com.flixbook.flixbook_backend.model;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnore;

import jakarta.persistence.*;

@Entity
@Table(name = "medici")
public class Medico {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    private String nome;
    private String cognome;
    private String email;
    
    @Column(name = "password_hash")
    private String passwordHash;
    
    private String telefono;
    
    @Column(name = "img_prof_url")
    private String imgProfUrl;
    
    private String biografia;
    private String ruolo = "ROLE_MEDICO";

    // --- AGGIUNGI QUESTO BLOCCO ---
    @OneToMany(
        mappedBy = "medico", // 'medico' is the field name in the Collaboratore entity
        cascade = CascadeType.ALL,
        orphanRemoval = true
    )
    @JsonIgnore // Important to prevent serialization loops
    private List<Collaboratore> collaboratori;

    // Getters e Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    
    public String getNome() { return nome; }
    public void setNome(String nome) { this.nome = nome; }
    
    public String getCognome() { return cognome; }
    public void setCognome(String cognome) { this.cognome = cognome; }
    
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    
    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }
    
    public String getTelefono() { return telefono; }
    public void setTelefono(String telefono) { this.telefono = telefono; }
    
    public String getImgProfUrl() { return imgProfUrl; }
    public void setImgProfUrl(String imgProfUrl) { this.imgProfUrl = imgProfUrl; }
    
    public String getBiografia() { return biografia; }
    public void setBiografia(String biografia) { this.biografia = biografia; }
    
    public String getRuolo() { return ruolo; }
    public void setRuolo(String ruolo) { this.ruolo = ruolo; }
       // --- E I RELATIVI GETTER E SETTER ---
    public List<Collaboratore> getCollaboratori() {
        return collaboratori;
    }
      public void setCollaboratori(List<Collaboratore> collaboratori) {
        this.collaboratori = collaboratori;
    }

}