import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Supponiamo che tu abbia un'interfaccia per la Prestazione
interface Prestazione {
  id: number;
  nome: string;
}

const CreateDisponibilitaForm = () => {
  const [prestazioni, setPrestazioni] = useState<Prestazione[]>([]);
  const [selectedPrestazioneId, setSelectedPrestazioneId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    data: '',
    oraInizio: '',
    oraFine: '',
  });
  const [message, setMessage] = useState('');
  
  // Ottieni il token JWT dal localStorage
  const token = localStorage.getItem('jwtToken');
  const headers = React.useMemo(() => (
    token ? { Authorization: `Bearer ${token}` } : undefined
  ), [token]);

  // Recupera la lista delle prestazioni dal backend
  useEffect(() => {
    if (!token) return;
    const fetchPrestazioni = async () => {
      try {
        const response = await axios.get<Prestazione[]>('http://localhost:8080/api/prestazioni/by-medico-loggato', { headers });
        setPrestazioni(response.data);
      } catch (error) {
        setMessage('Errore nel caricamento delle prestazioni. Assicurati di essere loggato.');
        console.error('Errore nel caricamento delle prestazioni:', error);
      }
    };
    fetchPrestazioni();
  }, [token, headers]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPrestazioneId) {
      setMessage('Seleziona una prestazione.');
      return;
    }

    try {
      const response = await axios.post('http://localhost:8080/api/disponibilita/create', {
        prestazioneId: selectedPrestazioneId,
        ...formData,
      }, { headers });
      setMessage('Disponibilità creata con successo!');
      console.log('Disponibilità creata:', response.data);
    } catch (error) {
      setMessage('Errore nella creazione della disponibilità. Permesso negato o dati non validi.');
      console.error('Errore:', error);
    }
  };

  return (
    <div>
      <h2>Crea Nuova Disponibilità</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Prestazione:</label>
          <select 
            name="prestazioneId" 
            value={selectedPrestazioneId || ''} 
            onChange={(e) => setSelectedPrestazioneId(Number(e.target.value))}
            required
          >
            <option value="" disabled>Seleziona una prestazione</option>
            {prestazioni.map(p => (
              <option key={p.id} value={p.id}>{p.nome}</option>
            ))}
          </select>
        </div>
        <div>
          <label>Data:</label>
          <input type="date" name="data" value={formData.data} onChange={handleChange} required />
        </div>
        <div>
          <label>Ora Inizio:</label>
          <input type="time" name="oraInizio" value={formData.oraInizio} onChange={handleChange} required />
        </div>
        <div>
          <label>Ora Fine:</label>
          <input type="time" name="oraFine" value={formData.oraFine} onChange={handleChange} required />
        </div>
        <button type="submit">Salva Disponibilità</button>
      </form>
      {message && <p>{message}</p>}
    </div>
  );
};

export default CreateDisponibilitaForm;