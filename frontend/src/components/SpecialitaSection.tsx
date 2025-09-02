import { useState, useEffect } from 'react';
import axios from 'axios';
import './css/SpecialitaSection.css'; // Assicurati che il percorso al file CSS sia corretto

import { API_BASE_URL, SERVER_BASE_URL } from '../config/api';

// Interfaccia per i dati della specialità
interface Specialita {
  id: number;
  nome: string;
  iconUrl: string;
}

// Interfaccia per le props della Card
interface SpecialtyCardProps {
  specialita: Specialita;
}

function SpecialtyCard({ specialita }: SpecialtyCardProps) {
  // Costruisce l'URL completo e pulito per l'icona
  const finalIconUrl = `${SERVER_BASE_URL}${specialita.iconUrl}`;

  return (
    <div className="specialty-card">
      <div className="specialty-icon">
        <img 
          src={finalIconUrl} 
          alt={`Icona per ${specialita.nome}`} 
        />
      </div>
      <div className="specialty-name">{specialita.nome}</div>
    </div>
  );
}

function SpecialitaSection() {
  const [specialitaList, setSpecialitaList] = useState<Specialita[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSpecialita = async () => {
      try {
        setLoading(true);
        // La chiamata ora usa l'URL corretto con /api
        const response = await axios.get<Specialita[]>(`${API_BASE_URL}/specialita`);
        setSpecialitaList(response.data);
      } catch (err) {
        setError('Impossibile caricare le specialità.');
        console.error('Errore nel recupero delle specialità:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSpecialita();
  }, []);

  if (loading) {
    return <div className="specialita-section"><h2 className="specialita-title">Caricamento...</h2></div>;
  }

  if (error) {
    return <div className="specialita-section"><h2 className="specialita-title" style={{color: 'red'}}>{error}</h2></div>;
  }

  return (
    <div className="specialita-section">
  <h2 className="specialita-title">Le nostre specialità</h2>
      <div className="specialties-grid">
        {specialitaList.map((specialita) => (
          <SpecialtyCard
            key={specialita.id}
            specialita={specialita}
          />
        ))}
      </div>
    </div>
  );
}

export default SpecialitaSection;