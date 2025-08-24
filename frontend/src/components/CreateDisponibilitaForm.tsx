// src/components/CreateDisponibilitaForm.tsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/useAuth'; // Assicurati che il percorso sia corretto

// Interfaccia per la Prestazione
interface Prestazione {
  id: number;
  nome: string;
}

const API_BASE_URL = 'http://localhost:8080/api';

const CreateDisponibilitaForm = () => {
  const { user } = useAuth(); // <-- 1. USA IL CONTESTO
  
  const [prestazioni, setPrestazioni] = useState<Prestazione[]>([]);
  const [selectedPrestazioneId, setSelectedPrestazioneId] = useState<string>(''); // Usa stringa per il value del select
  const [formData, setFormData] = useState({
    data: '',
    oraInizio: '',
    oraFine: '',
  });
  const [message, setMessage] = useState('');

  // Recupera la lista delle prestazioni associate al medico/collaboratore
  useEffect(() => {
    // Esegui solo se l'utente è loggato
    if (!user) return;

    const fetchPrestazioni = async () => {
      try {
        // --- 2. USA IL TOKEN DAL CONTESTO ---
        const headers = { Authorization: `Bearer ${user.token}` };
        const response = await axios.get<Prestazione[]>(`${API_BASE_URL}/prestazioni/by-medico-loggato`, { headers });
        setPrestazioni(response.data);
      } catch (error) {
        setMessage('Errore nel caricamento delle prestazioni.');
        console.error('Errore nel caricamento delle prestazioni:', error);
      }
    };

    fetchPrestazioni();
  }, [user]); // L'effetto dipende dall'utente

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
    if (!user) {
      setMessage('Sessione scaduta. Effettua nuovamente il login.');
      return;
    }

    try {
      // --- 3. USA IL TOKEN DAL CONTESTO ANCHE QUI ---
      const headers = { Authorization: `Bearer ${user.token}` };
      await axios.post(`${API_BASE_URL}/disponibilita/create`, {
        prestazioneId: Number(selectedPrestazioneId), // Converte in numero prima di inviare
        ...formData,
      }, { headers });
      setMessage('Disponibilità creata con successo!');
      // Resetta il form
      setFormData({ data: '', oraInizio: '', oraFine: '' });
      setSelectedPrestazioneId('');
    } catch (error) {
      setMessage('Errore nella creazione della disponibilità.');
      console.error('Errore:', error);
    }
  };

  return (
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-md-8 col-lg-6">
          <div className="card shadow-sm">
            <div className="card-body">
              <h2 className="card-title text-center mb-4">Crea Nuova Disponibilità</h2>
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label htmlFor="prestazioneId" className="form-label">Prestazione:</label>
                  <select 
                    id="prestazioneId"
                    className="form-select"
                    name="prestazioneId" 
                    value={selectedPrestazioneId} 
                    onChange={(e) => setSelectedPrestazioneId(e.target.value)}
                    required
                  >
                    <option value="" disabled>Seleziona una prestazione</option>
                    {prestazioni.length > 0 ? (
                      prestazioni.map(p => (
                        <option key={p.id} value={p.id}>{p.nome}</option>
                      ))
                    ) : (
                      <option disabled>Nessuna prestazione trovata...</option>
                    )}
                  </select>
                </div>
                <div className="mb-3">
                  <label htmlFor="data" className="form-label">Data:</label>
                  <input id="data" className="form-control" type="date" name="data" value={formData.data} onChange={handleChange} required />
                </div>
                <div className="mb-3">
                  <label htmlFor="oraInizio" className="form-label">Ora Inizio:</label>
                  <input id="oraInizio" className="form-control" type="time" name="oraInizio" value={formData.oraInizio} onChange={handleChange} required />
                </div>
                <div className="mb-3">
                  <label htmlFor="oraFine" className="form-label">Ora Fine:</label>
                  <input id="oraFine" className="form-control" type="time" name="oraFine" value={formData.oraFine} onChange={handleChange} required />
                </div>
                <div className="d-grid">
                  <button type="submit" className="btn btn-primary">Salva Disponibilità</button>
                </div>
              </form>
              {message && <p className="mt-3 text-center">{message}</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateDisponibilitaForm;