import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/useAuth';
import { useNavigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';

const API_BASE_URL = 'http://localhost:8080/api';

const CreateBloccoOrarioForm: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // 1. Aggiunti i campi per la pausa allo stato
  const [formData, setFormData] = useState({
    data: '',
    oraInizio: '09:00',
    oraFine: '17:00',
    includePausa: true,
    pausaInizio: '13:00',
    pausaFine: '14:00',
  });
  
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 2. Aggiornato handleChange per gestire anche le checkbox
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError('Devi essere autenticato per creare un blocco orario.');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    setMessage(null);

    const { data, oraInizio, oraFine, includePausa, pausaInizio, pausaFine } = formData;

    if (oraFine <= oraInizio || (includePausa && (pausaFine <= pausaInizio || pausaInizio < oraInizio || pausaFine > oraFine))) {
        setError("Gli orari inseriti non sono validi. Controlla che l'ora di fine sia successiva a quella di inizio e che la pausa sia contenuta nell'orario di lavoro.");
        setIsSubmitting(false);
        return;
    }

    try {
      const headers = { Authorization: `Bearer ${user.token}` };
      const requests = [];

      if (includePausa) {
        // Crea il blocco prima della pausa
        const bloccoMattina = { data, oraInizio, oraFine: pausaInizio };
        requests.push(axios.post(`${API_BASE_URL}/blocchi-orario/create`, bloccoMattina, { headers }));

        // Crea il blocco dopo la pausa
        const bloccoPomeriggio = { data, oraInizio: pausaFine, oraFine };
        requests.push(axios.post(`${API_BASE_URL}/blocchi-orario/create`, bloccoPomeriggio, { headers }));
        
        setMessage('Blocchi orario (mattina e pomeriggio) creati con successo.');
      } else {
        // Crea un singolo blocco orario
        const bloccoUnico = { data, oraInizio, oraFine };
        requests.push(axios.post(`${API_BASE_URL}/blocchi-orario/create`, bloccoUnico, { headers }));

        setMessage('Blocco orario creato con successo.');
      }

      await Promise.all(requests);
      setFormData({ ...formData, data: '' });

    } catch (err) {
      console.error('Errore nella creazione del blocco orario:', err);
      setError('Si è verificato un errore. Assicurati che l\'intervallo orario sia valido.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-md-8 col-lg-7">
          <div className="card shadow-sm">
            <div className="card-body p-4 p-md-5">
              <h2 className="card-title text-center mb-4">Crea Blocco di Lavoro</h2>
              <p className="text-center text-muted mb-4">
                Definisci i tuoi orari di disponibilità, con la possibilità di inserire una pausa.
              </p>
              <form onSubmit={handleSubmit}>
                {error && <div className="alert alert-danger">{error}</div>}
                {message && <div className="alert alert-success">{message}</div>}

                <div className="row g-3 justify-content-center mb-3 border-bottom pb-3">
                  <div className="col-md-4">
                    <label htmlFor="data" className="form-label fw-bold">Data</label>
                    <input type="date" className="form-control" id="data" name="data" value={formData.data} onChange={handleChange} required />
                  </div>
                  <div className="col-md-4">
                    <label htmlFor="oraInizio" className="form-label fw-bold">Dalle ore</label>
                    <input type="time" className="form-control" id="oraInizio" name="oraInizio" value={formData.oraInizio} onChange={handleChange} required step="1800" />
                  </div>
                  <div className="col-md-4">
                    <label htmlFor="oraFine" className="form-label fw-bold">Alle ore</label>
                    <input type="time" className="form-control" id="oraFine" name="oraFine" value={formData.oraFine} onChange={handleChange} required step="1800" />
                  </div>
                </div>

                <div className="row g-3 justify-content-center align-items-end pt-3">
                  <div className="col-12 text-center mb-2">
                      <div className="form-check form-switch d-inline-block">
                          <input className="form-check-input" type="checkbox" role="switch" id="includePausa" name="includePausa" checked={formData.includePausa} onChange={handleChange} />
                          <label className="form-check-label fw-bold" htmlFor="includePausa">
                              Includi Pausa
                          </label>
                      </div>
                  </div>
                  <div className="col-md-4">
                    <label htmlFor="pausaInizio" className="form-label">Inizio Pausa</label>
                    <input type="time" className="form-control" id="pausaInizio" name="pausaInizio" value={formData.pausaInizio} onChange={handleChange} disabled={!formData.includePausa} />
                  </div>
                  <div className="col-md-4">
                    <label htmlFor="pausaFine" className="form-label">Fine Pausa</label>
                    <input type="time" className="form-control" id="pausaFine" name="pausaFine" value={formData.pausaFine} onChange={handleChange} disabled={!formData.includePausa} />
                  </div>
                </div>

                <div className="d-grid mt-4">
                  <button type="submit" className="btn btn-primary btn-lg" disabled={isSubmitting}>
                    {isSubmitting ? 'Salvataggio in corso...' : 'Salva Blocco Orario'}
                  </button>
                </div>
                <div className="text-center mt-3">
                    <button type="button" className="btn btn-link" onClick={() => navigate('/medico-dashboard')}>
                        Torna alla Dashboard
                    </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateBloccoOrarioForm;