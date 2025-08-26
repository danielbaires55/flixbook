import React, { useState, useEffect } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "bootstrap/dist/css/bootstrap.min.css";
import axios from "axios";
import "./css/BookingCalendar.css";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";

const API_BASE_URL = "http://localhost:8080/api";

// --- Interfacce per i dati dei filtri ---
interface Specialita {
  id: number;
  nome: string;
}

interface Prestazione {
  id: number;
  nome: string;
  tipoPrestazione: "fisico" | "virtuale";
  costo: number;
}

interface Medico {
  id: number;
  nome: string;
  cognome: string;
}

const BookingCalendar: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Stati per i filtri
  const [specialitaList, setSpecialitaList] = useState<Specialita[]>([]);
  const [prestazioniList, setPrestazioniList] = useState<Prestazione[]>([]);
  const [mediciList, setMediciList] = useState<Medico[]>([]);

  const [selectedSpecialitaId, setSelectedSpecialitaId] = useState<string>("");
  const [selectedPrestazioneId, setSelectedPrestazioneId] = useState<string>("");
  const [selectedMedicoId, setSelectedMedicoId] = useState<string>("");

  // Stati per il calendario e gli slot
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);

  // Stati di UI
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Funzione helper per formattare una data in YYYY-MM-DD in modo sicuro, neutralizzando il fuso orario
  const toYYYYMMDD = (date: Date): string => {
    const offset = date.getTimezoneOffset();
    const adjustedDate = new Date(date.getTime() - (offset * 60 * 1000));
    return adjustedDate.toISOString().split('T')[0];
  };

  // Caricamento dati per i filtri
  useEffect(() => {
    axios
      .get<Specialita[]>(`${API_BASE_URL}/specialita`)
      .then((response) => setSpecialitaList(response.data))
      .catch((error) => console.error("Errore nel recupero delle specialità", error));
  }, []);

  useEffect(() => {
    if (selectedSpecialitaId) {
      axios
        .get<Prestazione[]>(`${API_BASE_URL}/prestazioni/bySpecialita/${selectedSpecialitaId}`)
        .then((response) => {
          setPrestazioniList(response.data);
          setMediciList([]);
          setAvailableSlots([]);
          setSelectedPrestazioneId("");
          setSelectedMedicoId("");
        });
    }
  }, [selectedSpecialitaId]);

  useEffect(() => {
    if (selectedPrestazioneId) {
      axios
        .get<Medico[]>(`${API_BASE_URL}/medici/byPrestazione/${selectedPrestazioneId}`)
        .then((response) => {
          setMediciList(response.data);
          setAvailableSlots([]);
          setSelectedMedicoId("");
        });
    }
  }, [selectedPrestazioneId]);

  // Caricamento degli slot dinamici
  useEffect(() => {
    if (selectedPrestazioneId && selectedMedicoId && selectedDate) {
      setLoading(true);
      setAvailableSlots([]);
      const dataFormattata = toYYYYMMDD(selectedDate);

      axios
        .get<string[]>(`${API_BASE_URL}/slots/available`, {
          params: {
            prestazioneId: selectedPrestazioneId,
            medicoId: selectedMedicoId,
            data: dataFormattata,
          },
        })
        .then((response) => {
          setAvailableSlots(response.data);
        })
        .catch((error) => console.error("Errore nel recupero degli slot", error))
        .finally(() => setLoading(false));
    }
  }, [selectedPrestazioneId, selectedMedicoId, selectedDate]);

  // Gestione della prenotazione
  const handleBooking = async (oraInizio: string) => {
    setError(null);
    setSuccess(null);

    if (!user) {
      setError("Devi essere loggato per prenotare.");
      navigate("/login");
      return;
    }

    const prestazione = prestazioniList.find((p) => p.id === parseInt(selectedPrestazioneId));
    if (!prestazione) {
      setError("Errore: prestazione non valida.");
      return;
    }

    const dataFormattata = toYYYYMMDD(selectedDate);

    const params = new URLSearchParams({
      pazienteId: user.userId.toString(),
      medicoId: selectedMedicoId,
      prestazioneId: selectedPrestazioneId,
      data: dataFormattata,
      oraInizio: oraInizio,
      tipoAppuntamento: prestazione.tipoPrestazione,
    }).toString();

    try {
      await axios.post(`${API_BASE_URL}/appuntamenti/create?${params}`, null, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      setSuccess("Appuntamento prenotato con successo! Sarai reindirizzato alla tua dashboard.");
      setTimeout(() => navigate("/paziente-dashboard"), 2000);
    } catch (err) {
      setError("Errore durante la prenotazione. Lo slot potrebbe non essere più disponibile.");
      console.error("Errore di prenotazione:", err);
    }
  };

  return (
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-lg-10">
          <div className="card shadow-sm">
            <div className="card-body p-4">
              <h1 className="card-title text-center mb-4">Prenota il tuo appuntamento</h1>
              {error && <div className="alert alert-danger">{error}</div>}
              {success && <div className="alert alert-success">{success}</div>}

              <div className="row g-3 mb-4">
                <div className="col-md-4">
                  <label htmlFor="specialita-select" className="form-label">1. Seleziona Specialità</label>
                  <select
                    id="specialita-select"
                    className="form-select"
                    onChange={(e) => setSelectedSpecialitaId(e.target.value)}
                    value={selectedSpecialitaId}
                  >
                    <option value="">Scegli...</option>
                    {specialitaList.map((s) => (
                      <option key={s.id} value={s.id}>{s.nome}</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-4">
                  <label htmlFor="prestazione-select" className="form-label">2. Seleziona Prestazione</label>
                  <select
                    id="prestazione-select"
                    className="form-select"
                    onChange={(e) => setSelectedPrestazioneId(e.target.value)}
                    value={selectedPrestazioneId}
                    disabled={!selectedSpecialitaId}
                  >
                    <option value="">Scegli...</option>
                    {prestazioniList.map((p) => (
                      <option key={p.id} value={p.id}>{p.nome} - {p.costo}€</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-4">
                  <label htmlFor="medico-select" className="form-label">3. Seleziona Medico</label>
                  <select
                    id="medico-select"
                    className="form-select"
                    onChange={(e) => setSelectedMedicoId(e.target.value)}
                    value={selectedMedicoId}
                    disabled={!selectedPrestazioneId}
                  >
                    <option value="">Scegli...</option>
                    {mediciList.map((m) => (
                      <option key={m.id} value={m.id}>{m.nome} {m.cognome}</option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedPrestazioneId && selectedMedicoId && (
                <div className="row mt-4">
                  <div className="col-md-6 d-flex justify-content-center">
                    <Calendar
                      onChange={(date) => setSelectedDate(date as Date)}
                      value={selectedDate}
                      minDate={new Date()}
                    />
                  </div>
                  <div className="col-md-6">
                    <h4 className="text-center">Orari disponibili per il {selectedDate.toLocaleDateString("it-IT")}</h4>
                    {loading ? (
                      <p className="text-center">Ricerca orari...</p>
                    ) : (
                      <div className="d-flex flex-wrap gap-2 justify-content-center mt-3">
                        {availableSlots.length > 0 ? (
                          availableSlots.map((slot) => (
                            <button
                              key={slot}
                              className="btn btn-outline-primary"
                              onClick={() => handleBooking(slot)}
                            >
                              {slot}
                            </button>
                          ))
                        ) : (
                          <p>Nessun orario disponibile per questa data.</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingCalendar;