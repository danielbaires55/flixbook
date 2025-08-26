import { useState, useEffect } from 'react';
import axios from 'axios';
import './css/MediciSection.css';

const API_BASE_URL = 'http://localhost:8080/api';

// 1. Definiamo un'interfaccia completa per il Medico
interface Medico {
  id: number;
  nome: string;
  cognome: string;
  biografia: string;
  imgProfUrl: string; // Il percorso dell'immagine
}

// 2. Aggiorniamo DoctorCard per usare i dati reali, inclusa l'immagine
interface DoctorCardProps {
  medico: Medico;
}

function DoctorCard({ medico }: DoctorCardProps) {
  // Costruiamo l'URL completo per l'immagine
  const imageUrl = `${API_BASE_URL.replace("/api", "")}${medico.imgProfUrl}`;

  return (
    <div className="doctor-card">
      <div className="doctor-profile-image">
        <img 
          src={imageUrl} 
          alt={`Profilo del Dr. ${medico.nome} ${medico.cognome}`} 
        />
      </div>
      <div className="doctor-name">{medico.nome} {medico.cognome}</div>
      <div className="doctor-description">{medico.biografia}</div>
    </div>
  );
}

function MediciSection() {
  // 3. Usiamo useState per memorizzare la lista dei medici caricata dal backend
  const [medici, setMedici] = useState<Medico[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 4. Usiamo useEffect per caricare i dati quando il componente viene montato
  useEffect(() => {
    const fetchMedici = async () => {
      try {
        setLoading(true);
        const response = await axios.get<Medico[]>(`${API_BASE_URL}/medici`);
        setMedici(response.data);
      } catch (err) {
        setError('Impossibile caricare la lista dei medici.');
        console.error('Errore nel recupero dei medici:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMedici();
  }, []); // L'array vuoto [] assicura che venga eseguito solo una volta

  if (loading) {
    return <div className="medici-section"><h2 className="medici-title">Caricamento...</h2></div>;
  }

  if (error) {
    return <div className="medici-section"><h2 className="medici-title text-danger">{error}</h2></div>;
  }

  return (
    <div className="medici-section">
      <h2 className="medici-title">I nostri medici</h2>
      <div className="doctors-grid">
        {/* 5. Mappiamo la lista di medici (reale) per creare le card */}
        {medici.map((medico) => (
          <DoctorCard
            key={medico.id}
            medico={medico}
          />
        ))}
      </div>
    </div>
  );
}

export default MediciSection;