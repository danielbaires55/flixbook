import React from 'react';
import './css/SpecialitaSection.css';

interface SpecialtyCardProps {
  name: string;
}

function SpecialtyCard({ name }: SpecialtyCardProps) {
  return (
    <div className="specialty-card">
      <div className="specialty-icon">
        <svg width="60" height="61" viewBox="0 0 60 61" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="30" cy="30.5" r="30" fill="#D9D9D9"/>
        </svg>
      </div>
      <div className="specialty-name">{name}</div>
    </div>
  );
}

function SpecialitaSection() {
  const specialties = [
    { name: "Cardiologia" },
    { name: "Cardiologia" },
    { name: "Cardiologia" },
    { name: "Cardiologia" },
    { name: "Cardiologia" }
  ];

  return (
    <div className="specialita-section">
      <h2 className="specialita-title">Specialità</h2>
      <div className="specialties-grid">
        {specialties.map((specialty, index) => (
          <SpecialtyCard
            key={index}
            name={specialty.name}
          />
        ))}
      </div>
    </div>
  );
}

export default SpecialitaSection;
