import React, { useState, useEffect } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "bootstrap/dist/css/bootstrap.min.css";
import axios from "axios";
import "./css/BookingCalendar.css";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = "http://localhost:8080/api";

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

interface Disponibilita {
  id: number;
  data: string;
  oraInizio: string;
  oraFine: string;
  medico: Medico;
  prestazione: Prestazione
}

const BookingCalendar: React.FC = () => {
  const [specialitaList, setSpecialitaList] = useState<Specialita[]>([]);
  const [prestazioniList, setPrestazioniList] = useState<Prestazione[]>([]);
  const [mediciList, setMediciList] = useState<Medico[]>([]);
  const [disponibilitaList, setDisponibilitaList] = useState<Disponibilita[]>(
    []
  );
  const [selectedSpecialitaId, setSelectedSpecialitaId] = useState<string>("");
  const [selectedPrestazioneId, setSelectedPrestazioneId] =
    useState<string>("");
  const [selectedMedicoId, setSelectedMedicoId] = useState<string>("");
  const [date, setDate] = useState<Date>(new Date());
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const navigate = useNavigate();

  // 1. Recupera la lista delle specialità al caricamento
  useEffect(() => {
    axios
      .get<Specialita[]>(`${API_BASE_URL}/specialita`)
      .then((response) => setSpecialitaList(response.data))
      .catch((error) =>
        console.error("Errore nel recupero delle specialità", error)
      );
  }, []);

  // 2. Recupera la lista delle prestazioni quando la specialità cambia
  useEffect(() => {
    if (selectedSpecialitaId) {
      setLoading(true);
      axios
        .get<Prestazione[]>(
          `${API_BASE_URL}/prestazioni/bySpecialita/${selectedSpecialitaId}`
        )
        .then((response) => {
          setPrestazioniList(response.data);
          setMediciList([]);
          setDisponibilitaList([]);
          setSelectedPrestazioneId("");
          setSelectedMedicoId("");
        })
        .catch((error) =>
          console.error("Errore nel recupero delle prestazioni", error)
        )
        .finally(() => setLoading(false));
    }
  }, [selectedSpecialitaId]);

  // 3. Recupera la lista dei medici quando la prestazione cambia
  useEffect(() => {
    if (selectedPrestazioneId) {
      setLoading(true);
      axios
        .get<Medico[]>(
          `${API_BASE_URL}/medici/byPrestazione/${selectedPrestazioneId}`
        )
        .then((response) => {
          setMediciList(response.data);
          setDisponibilitaList([]);
          setAvailableDates([]);
          setSelectedMedicoId("");
        })
        .catch((error) =>
          console.error("Errore nel recupero dei medici", error)
        )
        .finally(() => setLoading(false));
    } else {
      setMediciList([]);
    }
  }, [selectedPrestazioneId]);

  // 4. Recupera le disponibilità quando sono stati selezionati sia prestazione che medico
  useEffect(() => {
  if (selectedPrestazioneId && selectedMedicoId) {
    setLoading(true);

    const token = localStorage.getItem("jwtToken");

    // Scegli l'URL in base alla presenza del token
    const url = token
      ? `${API_BASE_URL}/disponibilita/available-authenticated?prestazioneId=${selectedPrestazioneId}&medicoId=${selectedMedicoId}`
      : `${API_BASE_URL}/disponibilita/available?prestazioneId=${selectedPrestazioneId}&medicoId=${selectedMedicoId}`;

    // Aggiungi l'header di autorizzazione solo se il token esiste
    const config = token
      ? { headers: { Authorization: `Bearer ${token}` } }
      : {};

    axios
      .get<Disponibilita[]>(url, config)
      .then((response) => {
        setDisponibilitaList(response.data);
        const dates = response.data.map((slot) => slot.data);
        setAvailableDates(dates);
      })
      .catch((error) => {
        console.error("Errore nel recupero delle disponibilità", error);
        if (axios.isAxiosError(error) && error.response?.status === 403) {
          console.log("Accesso negato. Reindirizzamento al login.");
          navigate("/login");
        }
      })
      .finally(() => setLoading(false));
  } else {
    setDisponibilitaList([]);
    setAvailableDates([]);
  }
}, [selectedPrestazioneId, selectedMedicoId, navigate]);

  const tileClassName = ({ date, view }: { date: Date; view: string }) => {
    if (
      view === "month" &&
      availableDates.some(
        (d) => new Date(d).toDateString() === date.toDateString()
      )
    ) {
      return "available-day";
    }
    return null;
  };

  const selectedSlots = disponibilitaList.filter(
    (slot) => new Date(slot.data).toDateString() === date.toDateString()
  );

  const handleBooking = async (disponibilitaId: number) => {
    setError(null);
    setSuccess(null);
    const token = localStorage.getItem("jwtToken");

    if (!token) {
      setError("Devi essere loggato per prenotare un appuntamento.");
      navigate("/login");
      return;
    }

    // Trova la prestazione selezionata per determinare il suo tipo
    const prestazione = prestazioniList.find(
      (p) => p.id === parseInt(selectedPrestazioneId)
    );
    if (!prestazione) {
      setError("Prestazione non trovata. Impossibile prenotare.");
      return;
    }

    try {
      // Passa il tipo di appuntamento basato sulla prestazione
      const response = await axios.post(
        `${API_BASE_URL}/appuntamenti/prenota?disponibilitaId=${disponibilitaId}&tipo=${prestazione.tipoPrestazione}`,
        null,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setSuccess("Appuntamento prenotato con successo!");
      console.log("Appuntamento prenotato:", response.data);
      // Reindirizza l'utente dopo la prenotazione
      navigate("/dashboard");
    } catch (err) {
      if (axios.isAxiosError(err) && err.response) {
        setError(err.response.data || "Errore nella prenotazione. Riprova.");
      } else {
        setError("Errore di rete. Controlla la tua connessione.");
      }
    }
  };

  return (
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-md-8">
          <div className="card">
            <div className="card-body">
              <h1 className="card-title text-center mb-4">
                Prenota il tuo appuntamento
              </h1>
              {error && <div className="alert alert-danger">{error}</div>}
              {success && <div className="alert alert-success">{success}</div>}
              <div className="row g-3 mb-4">
                <div className="col-md-4">
                  <select
                    className="form-select"
                    onChange={(e) => setSelectedSpecialitaId(e.target.value)}
                    value={selectedSpecialitaId}
                  >
                    <option value="">Seleziona specialità</option>
                    {specialitaList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nome}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-4">
                  <select
                    className="form-select"
                    onChange={(e) => setSelectedPrestazioneId(e.target.value)}
                    value={selectedPrestazioneId}
                    disabled={!selectedSpecialitaId}
                  >
                    <option value="">Seleziona prestazione</option>
                    {prestazioniList.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nome} - {p.costo}€
                        {p.tipoPrestazione === "virtuale" && " (Virtuale)"}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-4">
                  <select
                    className="form-select"
                    onChange={(e) => setSelectedMedicoId(e.target.value)}
                    value={selectedMedicoId}
                    disabled={!selectedPrestazioneId || mediciList.length === 0}
                  >
                    <option value="">Filtra per medico</option>
                    {mediciList.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nome} {m.cognome}
                      </option>
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
                      <h4 className="text-center">
                        Disponibilità per il {date.toLocaleDateString()}
                      </h4>
                      <ul className="list-group">
                        {selectedSlots.map((slot) => (
                          <li
                            key={slot.id}
                            className="list-group-item d-flex justify-content-between align-items-center"
                          >
                            <div>
                              <strong>
                                Dr. {slot.medico.nome} {slot.medico.cognome}
                              </strong>{" "}
                              - dalle {slot.oraInizio} alle {slot.oraFine}
                            </div>
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => handleBooking(slot.id)}
                            >
                              Prenota
                            </button>
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
