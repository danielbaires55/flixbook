import React, { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import axios from 'axios';
import './BookingCalendar.css';

const API_BASE_URL = 'http://localhost:8080/api';

// Definizione dei tipi di dato per la risposta del backend
interface Specialita {
  id: number;
  nome: string;
}

interface Prestazione {
  id: number;
  nome: string;
}

interface Disponibilita {
  id: number;
  data: string;
  oraInizio: string;
  oraFine: string;
  medico: {
    id: number;
    nome: string;
    cognome: string;
  };
}

const BookingCalendar: React.FC = () => {
  const [specialitaList, setSpecialitaList] = useState<Specialita[]>([]);
  const [prestazioniList, setPrestazioniList] = useState<Prestazione[]>([]);
  const [mediciList, setMediciList] = useState<Disponibilita['medico'][]>([]);
  const [disponibilitaList, setDisponibilitaList] = useState<Disponibilita[]>([]);
  
  const [selectedSpecialitaId, setSelectedSpecialitaId] = useState<string>('');
  const [selectedPrestazioneId, setSelectedPrestazioneId] = useState<string>('');
  const [selectedMedicoId, setSelectedMedicoId] = useState<string>('');
  
  const [date, setDate] = useState<Date>(new Date());
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // useEffect 1: Carica tutte le specialità all'avvio
  useEffect(() => {
    axios.get<Specialita[]>(`${API_BASE_URL}/specialita`)
      .then(response => setSpecialitaList(response.data))
      .catch(error => console.error("Errore nel recupero delle specialità", error));
  }, []);

  // useEffect 2: Carica le prestazioni quando la specialità cambia
  useEffect(() => {
    if (selectedSpecialitaId) {
      setLoading(true);
      axios.get<Prestazione[]>(`${API_BASE_URL}/prestazioni/bySpecialita/${selectedSpecialitaId}`)
        .then(response => {
          setPrestazioniList(response.data);
          setDisponibilitaList([]);
          setMediciList([]);
          setSelectedPrestazioneId('');
          setSelectedMedicoId('');
        })
        .catch(error => console.error("Errore nel recupero delle prestazioni", error))
        .finally(() => setLoading(false));
    }
  }, [selectedSpecialitaId]);

  // useEffect 3: Carica le disponibilità quando la prestazione (o il medico) cambia
  useEffect(() => {
    if (selectedPrestazioneId) {
      setLoading(true);
      // L'URL corretto per l'endpoint pubblico delle disponibilità
      let url = `${API_BASE_URL}/disponibilita/available?prestazioneId=${selectedPrestazioneId}`;
      if (selectedMedicoId) {
        url += `&medicoId=${selectedMedicoId}`;
      }

      axios.get<Disponibilita[]>(url)
        .then(response => {
          setDisponibilitaList(response.data);
          
          const uniqueMedici = [...new Map(response.data.map(item => [item.medico.id, item.medico])).values()];
          setMediciList(uniqueMedici);

          const dates = response.data.map(slot => slot.data);
          setAvailableDates(dates);
        })
        .catch(error => console.error("Errore nel recupero delle disponibilità", error))
        .finally(() => setLoading(false));
    } else {
      setDisponibilitaList([]);
      setMediciList([]);
      setAvailableDates([]);
    }
  }, [selectedPrestazioneId, selectedMedicoId]);

  const tileClassName = ({ date, view }: { date: Date; view: string; }) => {
    if (view === 'month' && availableDates.some(d => new Date(d).toDateString() === date.toDateString())) {
      return 'available-day';
    }
    return null;
  };

  const selectedSlots = disponibilitaList.filter(
    slot => new Date(slot.data).toDateString() === date.toDateString()
  );

  return (
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-md-8">
          <div className="card">
            <div className="card-body">
              <h1 className="card-title text-center mb-4">Prenota il tuo appuntamento</h1>
              <div className="row g-3 mb-4">
                <div className="col-md-4">
                  <select className="form-select" onChange={(e) => setSelectedSpecialitaId(e.target.value)} value={selectedSpecialitaId}>
                    <option value="">Seleziona specialità</option>
                    {specialitaList.map(s => (
                      <option key={s.id} value={s.id}>{s.nome}</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-4">
                  <select className="form-select" onChange={(e) => setSelectedPrestazioneId(e.target.value)} value={selectedPrestazioneId} disabled={!selectedSpecialitaId}>
                    <option value="">Seleziona prestazione</option>
                    {prestazioniList.map(p => (
                      <option key={p.id} value={p.id}>{p.nome}</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-4">
                  <select className="form-select" onChange={(e) => setSelectedMedicoId(e.target.value)} value={selectedMedicoId} disabled={!selectedPrestazioneId || mediciList.length === 0}>
                    <option value="">Filtra per medico</option>
                    {mediciList.map(m => (
                      <option key={m.id} value={m.id}>{m.nome} {m.cognome}</option>
                    ))}
                  </select>
                </div>
              </div>

              {loading ? (
                <div className="d-flex justify-content-center">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
              ) : (
                <>
                  <div className="d-flex justify-content-center mb-4">
                    <Calendar
                      onChange={(newDate) => setDate(newDate as Date)}
                      value={date}
                      tileClassName={tileClassName}
                    />
                  </div>

                  {selectedSlots.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-center">Disponibilità per il {date.toLocaleDateString()}</h4>
                      <ul className="list-group">
                        {selectedSlots.map(slot => (
                          <li key={slot.id} className="list-group-item d-flex justify-content-between align-items-center">
                            <div>
                              <strong>Dr. {slot.medico.nome} {slot.medico.cognome}</strong> - dalle {slot.oraInizio} alle {slot.oraFine}
                            </div>
                            <button className="btn btn-primary btn-sm">Prenota</button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingCalendar;