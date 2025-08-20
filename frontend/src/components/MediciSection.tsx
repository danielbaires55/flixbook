import React from 'react';
import './MediciSection.css';

interface DoctorCardProps {
  name: string;
  description: string;
}

function DoctorCard({ name, description }: DoctorCardProps) {
  return (
    <div className="doctor-card">
      <div className="doctor-profile-icon">
        <svg width="81" height="81" viewBox="0 0 81 81" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="40.5" cy="40.5" r="40" fill="#D9D9D9"/>
        </svg>
      </div>
      <div className="doctor-name">{name}</div>
      <div className="doctor-description">{description}</div>
    </div>
  );
}

function MediciSection() {
  const doctors = [
    {
      name: "Nome Cognome",
      description: "Specializzato in cardiologia e malattie cardiovascolari. Vanta 15 anni di esperienza in ospedali di eccellenza."
    },
    {
      name: "Nome Cognome", 
      description: "Specializzato in cardiologia e malattie cardiovascolari. Vanta 15 anni di esperienza in ospedali di eccellenza."
    },
    {
      name: "Nome Cognome",
      description: "Specializzato in cardiologia e malattie cardiovascolari. Vanta 15 anni di esperienza in ospedali di eccellenza."
    },
    {
      name: "Nome Cognome",
      description: "Specializzato in cardiologia e malattie cardiovascolari. Vanta 15 anni di esperienza in ospedali di eccellenza."
    },
    {
      name: "Nome Cognome",
      description: "Specializzato in cardiologia e malattie cardiovascolari. Vanta 15 anni di esperienza in ospedali di eccellenza."
    }
  ];

  return (
    <div className="medici-section">
      <h2 className="medici-title">I nostri medici</h2>
      <div className="doctors-grid">
        {doctors.map((doctor, index) => (
          <DoctorCard
            key={index}
            name={doctor.name}
            description={doctor.description}
          />
        ))}
      </div>
    </div>
  );
}

export default MediciSection;
