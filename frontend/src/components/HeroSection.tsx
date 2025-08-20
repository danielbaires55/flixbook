
import React from 'react';
import './HeroSection.css';
import Button from './Button';

import logoImage from '../assets/hero-logo.png'; 

function HeroSection() {
  return (
    <div className="hero-section">
      <div className="hero-content">
        <div className="hero-text-content">
          <h1 className="hero-title">Benvenuto in Flixbook!</h1>
          <p className="hero-description">
            La tua salute è la nostra priorità. Con la nostra nuova piattaforma online, puoi trovare lo specialista più adatto a te e prenotare una visita in pochi semplici click. Gestisci i tuoi appuntamenti in totale autonomia, con la professionalità e la cura che ci contraddistinguono.
          </p>
          <Button>Prenota</Button>
        </div>
        {/* Sostituisci il div con un'immagine */}
        <div className="hero-image-placeholder">
          <img src={logoImage} alt="Flixbook Logo" className="hero-logo" />
        </div>
      </div>
    </div>
  );
}

export default HeroSection;