import { useState, useEffect, useCallback } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "bootstrap/dist/css/bootstrap.min.css";
import axios from "axios";
import "./css/BookingCalendar.css";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";

const API_BASE_URL = "http://localhost:8080/api";

// --- Interfacce ---
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

interface SlotDisponibile {
  data: string;
  oraInizio: string;
  medicoId: number;
  medicoNome: string;
  medicoCognome: string;
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

  // Stati per il calendario e la nuova lista di slot
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [prossimiSlot, setProssimiSlot] = useState<SlotDisponibile[]>([]);
  const [slotDelGiorno, setSlotDelGiorno] = useState<string[]>([]);

  // Stati di UI
  const [loadingSlots, setLoadingSlots] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const toYYYYMMDD = (date: Date): string => {
    const offset = date.getTimezoneOffset();
    const adjustedDate = new Date(date.getTime() - offset * 60 * 1000);
    return adjustedDate.toISOString().split("T")[0];
  };

  // Caricamento iniziale delle specialità
  useEffect(() => {
    axios
      .get<Specialita[]>(`${API_BASE_URL}/specialita`)
      .then((response) => setSpecialitaList(response.data))
      .catch((error) => console.error("Errore nel recupero delle specialità", error));
  }, []);

  // Caricamento prestazioni quando cambia la specialità
  useEffect(() => {
    if (selectedSpecialitaId) {
      setPrestazioniList([]);
      setMediciList([]);
      setProssimiSlot([]);
      setSelectedPrestazioneId("");
      setSelectedMedicoId("");

      axios
        .get<Prestazione[]>(`${API_BASE_URL}/prestazioni/bySpecialita/${selectedSpecialitaId}`)
        .then((response) => {
          setPrestazioniList(response.data);
        })
        .catch((error) => console.error("Errore nel recupero delle prestazioni", error));
    }
  }, [selectedSpecialitaId]);

  // Caricamento medici quando cambia la prestazione
  useEffect(() => {
    if (selectedPrestazioneId) {
      setMediciList([]);
      setProssimiSlot([]);
      setSelectedMedicoId("");

      axios
        .get<Medico[]>(`${API_BASE_URL}/medici/byPrestazione/${selectedPrestazioneId}`)
        .then((response) => {
          setMediciList(response.data);
        })
        .catch((error) => console.error("Errore nel recupero dei medici", error));
    }
  }, [selectedPrestazioneId]);

  // Svuota gli slot mostrati quando cambia il medico selezionato
  useEffect(() => {
    setProssimiSlot([]);
    setSlotDelGiorno([]);
    setError(null);
    // il caricamento reale verrà innescato dall'effetto più sotto
  }, [selectedMedicoId]);

  // Funzione per ottenere i prossimi giorni con disponibilità
  const getProssimiGiorni = useCallback((numGiorni: number = 10): string[] => {
    const giorni: string[] = [];
    const oggi = new Date();
    
    for (let i = 0; i < numGiorni; i++) {
      const data = new Date(oggi);
      data.setDate(oggi.getDate() + i);
      giorni.push(toYYYYMMDD(data));
    }
    
    return giorni;
  }, []);

  // Funzione per caricare i primi 5 slot realmente disponibili
  const caricaPrimiSlotDisponibili = useCallback(async () => {
    if (!selectedPrestazioneId) return;

    setLoadingSlots(true);
    setError(null);
    setProssimiSlot([]);

    try {
      const prossimiGiorni = getProssimiGiorni(14); // Controlla i prossimi 14 giorni
      const tuttiSlot: SlotDisponibile[] = [];

      // Se c'è un medico selezionato, usa solo quello
      const mediciDaControllare = selectedMedicoId 
        ? [{ id: parseInt(selectedMedicoId), nome: '', cognome: '' }]
        : mediciList;

      for (const giorno of prossimiGiorni) {
        if (tuttiSlot.length >= 5) break; // Fermiamo quando abbiamo già 5 slot

        for (const medico of mediciDaControllare) {
          if (tuttiSlot.length >= 5) break;

          try {
            const response = await axios.get<string[]>(`${API_BASE_URL}/slots/available`, {
              params: {
                prestazioneId: selectedPrestazioneId,
                medicoId: medico.id.toString(),
                data: giorno,
              },
            });

            if (response.data.length > 0) {
              // Trova i dati del medico
              const medicoInfo = mediciList.find(m => m.id === medico.id);
              
              // Aggiungi tutti gli slot di questo medico per questo giorno
              for (const ora of response.data) {
                if (tuttiSlot.length >= 5) break;
                
                tuttiSlot.push({
                  data: giorno,
                  oraInizio: ora,
                  medicoId: medico.id,
                  medicoNome: medicoInfo?.nome || '',
                  medicoCognome: medicoInfo?.cognome || ''
                });
              }
            }
          } catch  {
            // Ignora errori per singoli giorni/medici
            console.log(`Nessun slot disponibile per ${giorno} con medico ${medico.id}`);
          }
        }
      }

      // Ordina tutti gli slot trovati cronologicamente
      const slotsOrdinati = tuttiSlot.sort((a, b) => {
        const dataA = new Date(`${a.data}T${a.oraInizio}`);
        const dataB = new Date(`${b.data}T${b.oraInizio}`);
        return dataA.getTime() - dataB.getTime();
      });

      setProssimiSlot(slotsOrdinati.slice(0, 5));
    } catch  {
      setError("Errore nel caricamento delle disponibilità.");
    } finally {
      setLoadingSlots(false);
    }
  }, [selectedPrestazioneId, selectedMedicoId, mediciList, getProssimiGiorni]);

  // Caricamento slot disponibili quando cambia prestazione o medico
  useEffect(() => {
    if (selectedPrestazioneId && mediciList.length > 0) {
      caricaPrimiSlotDisponibili();
    }
  }, [selectedPrestazioneId, selectedMedicoId, mediciList, caricaPrimiSlotDisponibili]);

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);

    if (!selectedPrestazioneId || !selectedMedicoId) {
      alert("Per favore, seleziona prima una prestazione e un medico per vedere gli orari.");
      return;
    }

    setLoadingSlots(true);
    setSlotDelGiorno([]);
    const dataFormattata = toYYYYMMDD(date);

    axios
      .get<string[]>(`${API_BASE_URL}/slots/available`, {
        params: {
          prestazioneId: selectedPrestazioneId,
          medicoId: selectedMedicoId,
          data: dataFormattata,
        },
      })
      .then((res) => setSlotDelGiorno(res.data))
      .catch(() => setError("Errore nel caricare gli orari per questa data."))
      .finally(() => setLoadingSlots(false));
  };

  const handleBooking = async (
    slot: SlotDisponibile | { data: string; oraInizio: string; medicoId: number }
  ) => {
    if (!user) {
      navigate("/login");
      return;
    }

    // Sicurezza lato client: se è selezionato un medico, non permettere prenotazione di slot di un altro medico
    if (selectedMedicoId && String(slot.medicoId) !== selectedMedicoId) {
      alert("Il medico selezionato non corrisponde allo slot. Ricarica gli slot e riprova.");
      return;
    }

    const prestazione = prestazioniList.find((p) => p.id === parseInt(selectedPrestazioneId));
    if (!prestazione) return;

    const params = new URLSearchParams({
      pazienteId: user.userId.toString(),
      medicoId: slot.medicoId.toString(),
      prestazioneId: selectedPrestazioneId,
      data: slot.data,
      oraInizio: slot.oraInizio,
      tipoAppuntamento: prestazione.tipoPrestazione,
    }).toString();

    try {
      await axios.post(`${API_BASE_URL}/appuntamenti/create?${params}`, null, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      
      setSuccess("Appuntamento prenotato con successo!");
      setTimeout(() => navigate("/paziente-dashboard"), 2000);
    } catch  {
      setError("Errore durante la prenotazione.");
    }
  };

  return (
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-lg-10">
          <div className="card shadow-sm">
            <div className="card-body p-4">
              <h1 className="card-title text-center mb-4">
                Prenota il tuo appuntamento
              </h1>
              
              {error && <div className="alert alert-danger">{error}</div>}
              {success && <div className="alert alert-success">{success}</div>}

              {/* Filtri di selezione */}
              <div className="row g-3 mb-4">
                <div className="col-md-4">
                  <label className="form-label">Specialità</label>
                  <select
                    className="form-select"
                    onChange={(e) => setSelectedSpecialitaId(e.target.value)}
                    value={selectedSpecialitaId}
                  >
                    <option value="">Scegli...</option>
                    {specialitaList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nome}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="col-md-4">
                  <label className="form-label">Prestazione</label>
                  <select
                    className="form-select"
                    onChange={(e) => setSelectedPrestazioneId(e.target.value)}
                    value={selectedPrestazioneId}
                    disabled={!selectedSpecialitaId}
                  >
                    <option value="">Scegli...</option>
                    {prestazioniList.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nome} - {p.costo}€
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="col-md-4">
                  <label className="form-label">
                    Medico (Opzionale)
                    <small className="text-muted d-block">Lascia vuoto per vedere tutti i medici</small>
                  </label>
                  <select
                    className="form-select"
                    onChange={(e) => setSelectedMedicoId(e.target.value)}
                    value={selectedMedicoId}
                    disabled={!selectedPrestazioneId}
                  >
                    <option value="">Tutti i medici disponibili</option>
                    {mediciList.map((m) => (
                      <option key={m.id} value={m.id}>
                        Dr. {m.nome} {m.cognome}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Sezione slot disponibili */}
              {selectedPrestazioneId && (
                <div className="card mt-4">
                  <div className="card-header">
                    <div className="d-flex justify-content-between align-items-center">
                      <span>Primi 5 slot disponibili</span>
                      {selectedMedicoId && (
                        <small className="text-muted">
                          Filtrato per: Dr. {mediciList.find(m => m.id === parseInt(selectedMedicoId))?.nome} {mediciList.find(m => m.id === parseInt(selectedMedicoId))?.cognome}
                        </small>
                      )}
                    </div>
                  </div>
                  <ul className="list-group list-group-flush">
                    {loadingSlots && (
                      <li className="list-group-item text-center">
                        <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                        Caricamento slot disponibili...
                      </li>
                    )}
                    
                    {!loadingSlots && prossimiSlot.length === 0 && (
                      <li className="list-group-item text-center text-muted">
                        Nessuna disponibilità trovata per questa prestazione.
                        {selectedMedicoId && " Prova a rimuovere il filtro medico."}
                      </li>
                    )}
                    
                    {(selectedMedicoId
                        ? prossimiSlot.filter(s => s.medicoId === parseInt(selectedMedicoId))
                        : prossimiSlot
                      ).map((slot, index) => {
                      const dataSlot = new Date(`${slot.data}T${slot.oraInizio}`);
                      const isOggi = slot.data === toYYYYMMDD(new Date());
                      
                      return (
                        <li
                          key={`${slot.data}-${slot.oraInizio}-${slot.medicoId}`}
                          className="list-group-item d-flex justify-content-between align-items-center"
                        >
                          <div>
                            <strong>Dr. {slot.medicoNome} {slot.medicoCognome}</strong>
                            <br />
                            <small className="text-muted">
                              {isOggi ? "Oggi" : dataSlot.toLocaleDateString("it-IT", {
                                weekday: "long",
                                day: "numeric",
                                month: "long",
                              })} alle <strong>{slot.oraInizio}</strong>
                            </small>
                            {index === 0 && (
                              <span className="badge bg-success ms-2">Più vicino</span>
                            )}
                          </div>
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => handleBooking(slot)}
                          >
                            Prenota
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {/* Sezione calendario */}
              <div className="card mt-4">
                <div className="card-header">
                  Oppure, cerca per giorno specifico
                </div>
                <div className="row p-3">
                  <div className="col-md-6 d-flex justify-content-center">
                    <Calendar
                      onChange={(date) => handleDateClick(date as Date)}
                      value={selectedDate}
                      minDate={new Date()}
                    />
                  </div>
                  
                  <div className="col-md-6">
                    <h5 className="text-center">
                      Orari per il {selectedDate.toLocaleDateString("it-IT")}
                    </h5>
                    <div className="d-flex flex-wrap gap-2 justify-content-center mt-3">
                      {loadingSlots && <p>...</p>}
                      
                      {slotDelGiorno.length > 0 ? (
                        slotDelGiorno.map((ora) => (
                          <button
                            key={ora}
                            className="btn btn-outline-primary"
                            onClick={() =>
                              handleBooking({
                                data: toYYYYMMDD(selectedDate),
                                oraInizio: ora,
                                medicoId: Number(selectedMedicoId),
                              })
                            }
                          >
                            {ora}
                          </button>
                        ))
                      ) : (
                        <p>Seleziona un medico per vedere gli orari.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingCalendar;