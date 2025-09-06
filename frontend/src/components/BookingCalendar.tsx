import { useState, useEffect, useCallback, useMemo } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "bootstrap/dist/css/bootstrap.min.css";
import axios from "axios";
import "./css/BookingCalendar.css";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { Modal, Button, Toast, ToastContainer, OverlayTrigger, Tooltip } from "react-bootstrap";
// Lightweight map embed component (iframe-based)
import SedeMapEmbed from "./SedeMapEmbed.tsx";
import NavBar from "./NavBar";

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
  imgProfUrl?: string;
  avgRating?: number | null;
  ratingCount?: number;
}

interface Sede {
  id: number; nome: string;
  indirizzo?: string | null;
  citta?: string | null;
  provincia?: string | null;
  cap?: string | null;
  lat?: number; lng?: number;
}

interface SlotDisponibile {
  data: string;
  oraInizio: string;
  medicoId: number;
  medicoNome: string;
  medicoCognome: string;
  sedeId?: number;
  sedeNome?: string;
  sedeIndirizzo?: string;
  sedeCitta?: string;
  sedeProvincia?: string;
  sedeCap?: string;
}

const BookingCalendar: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Stati per i filtri
  const [specialitaList, setSpecialitaList] = useState<Specialita[]>([]);
  const [prestazioniList, setPrestazioniList] = useState<Prestazione[]>([]);
  const [mediciList, setMediciList] = useState<Medico[]>([]);
  const [sediList, setSediList] = useState<Sede[]>([]);

  const [selectedSpecialitaId, setSelectedSpecialitaId] = useState<string>("");
  const [selectedPrestazioneId, setSelectedPrestazioneId] = useState<string>("");
  const [selectedMedicoId, setSelectedMedicoId] = useState<string>("");
  const [selectedSedeId, setSelectedSedeId] = useState<string>("");

  // Prestazione selezionata e natura (virtuale/fisico)
  const selectedPrestazioneObj = useMemo(
    () => prestazioniList.find((p) => p.id === parseInt(selectedPrestazioneId || "0")),
    [prestazioniList, selectedPrestazioneId]
  );
  const isVirtualSelected = selectedPrestazioneObj?.tipoPrestazione === "virtuale";

  // Quando la prestazione selezionata è virtuale, azzera il filtro Sede per evitare residui
  useEffect(() => {
    if (isVirtualSelected && selectedSedeId) {
      setSelectedSedeId("");
    }
  }, [isVirtualSelected, selectedSedeId]);

  // Stati per il calendario e la nuova lista di slot
  const [selectedDate] = useState<Date>(new Date());
  const [selectedDateFilter, setSelectedDateFilter] = useState<Date | null>(null);
  const [selectedDateToFilter, setSelectedDateToFilter] = useState<Date | null>(null);
  const rangeInvalid = !!(selectedDateFilter && selectedDateToFilter && (selectedDateToFilter.getTime() < selectedDateFilter.getTime()));
  const [showDateModal, setShowDateModal] = useState<boolean>(false);
  const [prossimiSlot, setProssimiSlot] = useState<SlotDisponibile[]>([]);
  // Giorni con disponibilità (per evidenziare nel calendario)
  const [availableDaysSet, setAvailableDaysSet] = useState<Set<string>>(new Set());

  // Filtro orario: "all" | "morning" (09-12) | "afternoon" (13-17) | "range-<start>-<end>" (es. range-9-10)
  const [timeFilter, setTimeFilter] = useState<string>("all");

  // Stati di UI
  const [loadingSlots, setLoadingSlots] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  // Suggestion: nearest sede based on geolocation
  const [suggestedSede, setSuggestedSede] = useState<{ sede: Sede; distanceKm: number } | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [locating, setLocating] = useState<boolean>(false);
  // Preferred sede auto-apply
  const [preferredSedeId, setPreferredSedeId] = useState<string>("");
  // Help UI states
  const [showHelpToast, setShowHelpToast] = useState<boolean>(false);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const [helpDontShowAgain, setHelpDontShowAgain] = useState<boolean>(false);
  // Conferma prenotazione
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [pendingSlot, setPendingSlot] = useState<SlotDisponibile | null>(null);
  const [bookingSubmitting, setBookingSubmitting] = useState<boolean>(false);
  // Mappa sede
  const [showMapModal, setShowMapModal] = useState<boolean>(false);
  const [mapSede, setMapSede] = useState<{ nome: string; indirizzo?: string | null; lat: number; lng: number } | null>(null);

  const toYYYYMMDD = (date: Date): string => {
    const offset = date.getTimezoneOffset();
    const adjustedDate = new Date(date.getTime() - offset * 60 * 1000);
    return adjustedDate.toISOString().split("T")[0];
  };

  // (UI) evidenziazione disponibilità: i parametri orari verranno calcolati inline

  // Helper per costruire la URL assoluta della foto profilo del medico
  const buildPhotoUrl = (url?: string | null): string | null => {
    if (!url) return null;
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    // Prefissa il backend host se è un path relativo (es. /prof_img/..)
    if (url.startsWith("/")) return `http://localhost:8080${url}`;
    return `http://localhost:8080/${url}`;
  };

  // Carica i giorni con almeno una disponibilità nel mese visibile (prestazione obbligatoria, medico opzionale)
  const caricaGiorniDisponibiliMese = useCallback(async (activeDate: Date) => {
    if (!selectedPrestazioneId) {
      setAvailableDaysSet(new Set());
      return;
    }
    try {
      const monthStart = new Date(activeDate.getFullYear(), activeDate.getMonth(), 1);
      const monthEnd = new Date(activeDate.getFullYear(), activeDate.getMonth() + 1, 0);
  const params: Record<string, string | number> = {
        prestazioneId: selectedPrestazioneId,
        medicoId: selectedMedicoId,
        fromDate: toYYYYMMDD(monthStart),
        toDate: toYYYYMMDD(monthEnd),
        limit: 1000, // sufficiente per un mese
      };
  if (!isVirtualSelected && selectedSedeId) params.sedeId = selectedSedeId; // sede ignorata per prestazioni virtuali
      // Aggiungi filtro orario coerente con la tendina (inline per evitare deps del callback)
      if (timeFilter === "morning") { params.fromHour = 9; params.toHour = 12; }
      else if (timeFilter === "afternoon") { params.fromHour = 13; params.toHour = 17; }
      else if (timeFilter.startsWith("range-")) {
        const [, sh, eh] = timeFilter.split("-");
        params.fromHour = parseInt(sh, 10);
        params.toHour = parseInt(eh, 10);
      }
      const { data } = await axios.get<SlotDisponibile[]>(`${API_BASE_URL}/slots/prossimi-disponibili`, { params });
      const days = new Set<string>();
      for (const s of data) {
        days.add(s.data);
      }
      setAvailableDaysSet(days);
    } catch {
      // Silenzioso: l'evidenziazione è "best-effort"
      setAvailableDaysSet(new Set());
    }
  }, [selectedPrestazioneId, selectedMedicoId, timeFilter, selectedSedeId, isVirtualSelected]);

  // Caricamento iniziale delle specialità
  useEffect(() => {
    axios
      .get<Specialita[]>(`${API_BASE_URL}/specialita`)
      .then((response) => setSpecialitaList(response.data))
      .catch((error) => console.error("Errore nel recupero delle specialità", error));
    axios
      .get<Sede[]>(`${API_BASE_URL}/sedi`)
      .then((response) => setSediList(response.data))
      .catch(() => setSediList([]));
  }, []);

  // Mostra un aiuto automatico la prima volta (una sola volta per sessione)
  useEffect(() => {
    try {
      const seen = localStorage.getItem("booking_help_seen");
      if (!seen) {
        setShowHelpToast(true);
        const t = setTimeout(() => setShowHelpToast(false), 6000);
        return () => clearTimeout(t);
      }
    } catch {
      // ignora
    }
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

  // Load preferred sede from storage once
  useEffect(() => {
    try {
      const pref = localStorage.getItem('preferred_sede_id') || '';
      setPreferredSedeId(pref);
    } catch { /* ignore */ }
  }, []);

  // Auto-apply preferred sede when selecting una prestazione fisica e nessuna sede scelta
  useEffect(() => {
    if (!selectedPrestazioneId || isVirtualSelected) return;
    if (selectedSedeId) return;
    if (!preferredSedeId) return;
    const exists = sediList.some(s => String(s.id) === String(preferredSedeId));
    if (exists) setSelectedSedeId(String(preferredSedeId));
  }, [selectedPrestazioneId, isVirtualSelected, selectedSedeId, preferredSedeId, sediList]);

  // Handler opzionale: geolocalizza su richiesta e suggerisce la sede più vicina
  const handleFindNearestSede = async () => {
    setGeoError(null);
    setSuggestedSede(null);
    if (!selectedPrestazioneId || isVirtualSelected) return;
    if (!sediList || sediList.length === 0) return;
    const toNum = (v: unknown) => {
      if (typeof v === 'number') return v;
      if (typeof v === 'string') {
        const s = v.trim().replace(',', '.');
        const n = parseFloat(s);
        return Number.isFinite(n) ? n : NaN;
      }
      return NaN;
    };
    const valid = sediList
      .map(s => ({ ...s, lat: toNum(s.lat as unknown), lng: toNum(s.lng as unknown) }))
      .filter(s => Number.isFinite(s.lat as number) && Number.isFinite(s.lng as number));
    if (valid.length === 0) { setGeoError('Coordinate sedi non disponibili.'); return; }
    const haversine = (lat1: number, lon1: number, lat2: number, lon2: number) => {
      const toRad = (x: number) => (x * Math.PI) / 180;
      const R = 6371; // km
      const dLat = toRad(lat2 - lat1);
      const dLon = toRad(lon2 - lon1);
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };
    const compute = (coords: { latitude: number; longitude: number }) => {
      try { sessionStorage.setItem('geo_last_pos', JSON.stringify(coords)); } catch { /* ignore */ }
      const distances = valid.map(s => ({ sede: s, distanceKm: haversine(coords.latitude, coords.longitude, s.lat as number, s.lng as number) }));
      distances.sort((a, b) => a.distanceKm - b.distanceKm);
      const best = distances[0];
      setSuggestedSede(best ? { sede: best.sede, distanceKm: Math.round(best.distanceKm * 10) / 10 } : null);
    };
    if (!('geolocation' in navigator)) {
      // fallback su cache se geolocalizzazione non disponibile
      const cached = sessionStorage.getItem('geo_last_pos');
      if (cached) {
        try { compute(JSON.parse(cached)); return; } catch { /* ignore */ }
      }
      setGeoError('Geolocalizzazione non supportata.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLocating(false); setGeoError(null); compute({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }); },
      (err) => {
        setLocating(false);
        // Se fallisce, prova con la cache
        const cached = sessionStorage.getItem('geo_last_pos');
        if (cached) {
          try { compute(JSON.parse(cached)); return; } catch { /* ignore */ }
        }
        setGeoError(err?.message || 'Impossibile ottenere la posizione');
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 8000 }
    );
  };

  // Caricamento medici quando cambia la prestazione
  useEffect(() => {
    if (selectedPrestazioneId) {
      setMediciList([]);
      setProssimiSlot([]);
      setSelectedMedicoId("");

      axios
        .get<Medico[]>(`${API_BASE_URL}/medici/byPrestazione/${selectedPrestazioneId}/withRatings`)
        .then((response) => {
          setMediciList(response.data);
        })
        .catch((error) => console.error("Errore nel recupero dei medici", error));
    }
  }, [selectedPrestazioneId]);

  // Svuota gli slot mostrati quando cambia il medico selezionato
  useEffect(() => {
    setProssimiSlot([]);
    setError(null);
    // il caricamento reale verrà innescato dall'effetto più sotto
  }, [selectedMedicoId]);

  // Funzione per ottenere i prossimi giorni con disponibilità
  // (rimosso: calcolo client-side dei giorni, ora delegato all'endpoint)

  // Carica i prossimi slot disponibili (server-side, fino a 15)
  const caricaPrimeVisite = useCallback(async () => {
    if (!selectedPrestazioneId) return;
    setLoadingSlots(true);
    setError(null);
    setProssimiSlot([]);
    try {
      const params: Record<string, string | number> = {
        prestazioneId: selectedPrestazioneId,
        // Richiedi un numero maggiore per consentire filtri orari senza esaurire i risultati
        limit: 60,
      };
  if (selectedMedicoId) params.medicoId = selectedMedicoId;
      // Se c'è un range attivo, passalo all'endpoint
      if (selectedDateFilter) params.fromDate = toYYYYMMDD(selectedDateFilter);
      if (selectedDateToFilter) params.toDate = toYYYYMMDD(selectedDateToFilter);
      // Passiamo anche un filtro orario server-side coerente con la tendina (ottimizzazione):
      if (timeFilter === "morning") { params.fromHour = 9; params.toHour = 12; }
      else if (timeFilter === "afternoon") { params.fromHour = 13; params.toHour = 17; }
      else if (timeFilter.startsWith("range-")) {
        const [, sh, eh] = timeFilter.split("-");
        params.fromHour = parseInt(sh, 10);
        params.toHour = parseInt(eh, 10);
      }
  if (!isVirtualSelected && selectedSedeId) params.sedeId = selectedSedeId; // sede ignorata per prestazioni virtuali
  const { data } = await axios.get<SlotDisponibile[]>(`${API_BASE_URL}/slots/prossimi-disponibili`, { params });
      // Ordina cronologicamente per sicurezza
      const ordinati = [...data].sort((a, b) => {
        const da = new Date(`${a.data}T${a.oraInizio}`);
        const db = new Date(`${b.data}T${b.oraInizio}`);
        return da.getTime() - db.getTime();
      });
  // Non tagliare qui: i filtri orari vengono applicati dopo; taglio a 30 solo in render
  setProssimiSlot(ordinati);
    } catch  {
      setError("Errore nel caricamento delle prime visite.");
    } finally {
      setLoadingSlots(false);
    }
  }, [selectedPrestazioneId, selectedMedicoId, selectedDateFilter, selectedDateToFilter, timeFilter, selectedSedeId, isVirtualSelected]);

  // Helper per caricare gli slot del giorno corrente del filtro
  const caricaSlotPerDataSelezionata = useCallback(async () => {
    if (!selectedPrestazioneId || !selectedDateFilter) return;
    setLoadingSlots(true);
    setError(null);
    try {
  const params: Record<string, string | number> = {
        prestazioneId: selectedPrestazioneId,
        data: toYYYYMMDD(selectedDateFilter),
      };
      if (selectedMedicoId) params.medicoId = selectedMedicoId;
  if (!isVirtualSelected && selectedSedeId) params.sedeId = selectedSedeId; // sede ignorata per prestazioni virtuali
  const { data } = await axios.get<SlotDisponibile[]>(`${API_BASE_URL}/slots/available-by-day`, { params });
      const ordinati = [...data].sort((a, b) => {
        const da = new Date(`${a.data}T${a.oraInizio}`);
        const db = new Date(`${b.data}T${b.oraInizio}`);
        return da.getTime() - db.getTime();
      });
  // Non tagliare qui: i filtri orari vengono applicati dopo; taglio a 30 solo in render
  setProssimiSlot(ordinati);
    } catch  {
      setError("Errore nel caricamento degli slot per la data selezionata.");
    } finally {
      setLoadingSlots(false);
    }
  }, [selectedPrestazioneId, selectedDateFilter, selectedMedicoId, selectedSedeId, isVirtualSelected]);

  // Caricamento slot quando cambia prestazione o medico: rispetta singolo giorno o range
  useEffect(() => {
    if (!selectedPrestazioneId) return;
    if (selectedDateToFilter) {
      // Range attivo: usa endpoint prossimi-disponibili con from/to
      caricaPrimeVisite();
    } else if (selectedDateFilter) {
      caricaSlotPerDataSelezionata();
    } else {
      caricaPrimeVisite();
    }
  }, [selectedPrestazioneId, selectedMedicoId, selectedDateFilter, selectedDateToFilter, selectedSedeId, caricaPrimeVisite, caricaSlotPerDataSelezionata]);

  // Applica filtro per data (via modal) caricando gli slot del giorno
  const applicaFiltroData = async () => {
  if (!selectedPrestazioneId || !selectedDateFilter) {
      setShowDateModal(false);
      return;
    }
    // Se è stato scelto anche "al", esegui ricerca range; altrimenti singolo giorno
    if (selectedDateToFilter) {
      await caricaPrimeVisite();
    } else {
      await caricaSlotPerDataSelezionata();
    }
    setShowDateModal(false);
  };

  // Quando apro il modal, carico le disponibilità del mese corrente (se medico selezionato)
  useEffect(() => {
    if (!showDateModal) return;
    const base = selectedDateFilter || new Date();
    caricaGiorniDisponibiliMese(base);
  }, [showDateModal, selectedPrestazioneId, selectedMedicoId, selectedDateFilter, timeFilter, caricaGiorniDisponibiliMese]);

  const resetFiltri = () => {
    setSelectedDateFilter(null);
    setSelectedDateToFilter(null);
    setTimeFilter("all");
    caricaPrimeVisite();
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

  // Apre la modale di conferma con il riepilogo
  const openConfirm = (slot: SlotDisponibile) => {
    if (!user) {
      navigate("/login");
      return;
    }
    setPendingSlot(slot);
    setShowConfirmModal(true);
  };

  // Conferma definitiva: chiama l'API di prenotazione
  const confirmBooking = async () => {
    if (!pendingSlot) return;
    setBookingSubmitting(true);
    setError(null);
    try {
      await handleBooking(pendingSlot);
      setShowConfirmModal(false);
      setPendingSlot(null);
    } finally {
      setBookingSubmitting(false);
    }
  };

  return (
    <>
      <NavBar />
      <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-lg-10">
          <div className="card shadow-sm">
            <div className="card-body p-4">
              <h1 className="card-title text-center mb-2">Prenota il tuo appuntamento</h1>
              <div className="d-flex justify-content-end mb-3">
                <OverlayTrigger
                  placement="left"
                  overlay={<Tooltip id="help-tooltip">Come prenotare</Tooltip>}
                >
                  <button
                    type="button"
                    aria-label="Guida: come prenotare"
                    className="btn btn-sm btn-outline-info rounded-circle d-inline-flex align-items-center justify-content-center"
                    style={{ width: 34, height: 34, padding: 0, lineHeight: 1 }}
                    onClick={() => {
                      setShowHelpModal(true);
                      try {
                        localStorage.setItem("booking_help_seen", "1");
                      } catch {
                        /* ignore storage error */
                      }
                      setShowHelpToast(false);
                    }}
                  >
                    {/* Inline SVG question-circle icon */}
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" aria-hidden>
                      <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1m0 1.5a5.5 5.5 0 1 1 0 11A5.5 5.5 0 0 1 8 2.5"/>
                      <path d="M5.255 5.786a.237.237 0 0 0 .241.247h.825c.138 0 .248-.113.266-.25.09-.656.54-1.134 1.342-1.134.686 0 1.314.343 1.314 1 0 .486-.228.777-.856 1.106-.778.392-1.267.9-1.267 1.777v.07c0 .146.12.265.266.265h.808a.27.27 0 0 0 .27-.27c0-.705.273-.928 1.01-1.3.609-.304 1.244-.82 1.244-1.73 0-1.328-1.115-2.048-2.334-2.048-1.19 0-2.23.595-2.309 1.917m1.557 4.345c0 .364.287.65.667.65.395 0 .673-.286.673-.65 0-.373-.278-.66-.673-.66-.38 0-.667.287-.667.66"/>
                    </svg>
                  </button>
                </OverlayTrigger>
              </div>

              {/* Toast di aiuto (auto) */}
              <ToastContainer position="top-end" className="p-3">
                <Toast
                  show={showHelpToast}
                  onClose={() => {
                    setShowHelpToast(false);
                    try { localStorage.setItem("booking_help_seen", "1"); } catch { /* ignore */ }
                  }}
                  delay={6000}
                  autohide
                  bg="light"
                >
                  <Toast.Header closeButton>
                    <strong className="me-auto">Come prenotare</strong>
                  </Toast.Header>
                  <Toast.Body>
                    1) Scegli specialità e prestazione, 2) (opzionale) medico, 3) filtra per data/orario,
                    4) scegli uno slot e premi "Prenota".
                  </Toast.Body>
                </Toast>
              </ToastContainer>
              
              {error && <div className="alert alert-danger">{error}</div>}
              {success && <div className="alert alert-success">{success}</div>}

              {/* Filtri di selezione */}
              <div className="row g-3 mb-4">
                <div className="col-md-4">
                  <label className="form-label fw-semibold mb-1">Specialità</label>
                  <select
                    className="form-select"
                    onChange={(e) => setSelectedSpecialitaId(e.target.value)}
                    value={selectedSpecialitaId}
                  >
                    <option value="">Seleziona specialità…</option>
                    {specialitaList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nome}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="col-md-4">
                  <label className="form-label fw-semibold mb-1">Prestazione</label>
                  <select
                    className="form-select"
                    onChange={(e) => setSelectedPrestazioneId(e.target.value)}
                    value={selectedPrestazioneId}
                    disabled={!selectedSpecialitaId}
                  >
                    <option value="">Seleziona prestazione…</option>
                    {prestazioniList.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nome} - {p.costo}€
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="col-md-4">
                  <label className="form-label d-flex align-items-center justify-content-between fw-semibold mb-1">
                    <span>Medico</span>
                    <span className="badge rounded-pill text-bg-secondary">Opzionale</span>
                  </label>
                  <select
                    className="form-select"
                    onChange={(e) => setSelectedMedicoId(e.target.value)}
                    value={selectedMedicoId}
                    disabled={!selectedPrestazioneId}
                  >
                    <option value="">Tutti i medici disponibili</option>
                    {mediciList.map((m) => {
                      const r = m.avgRating ?? null;
                      const stars = r ? ` (${"★".repeat(Math.round(r))}${"☆".repeat(5 - Math.round(r))} · ${m.ratingCount})` : " (nessuna valutazione)";
                      return (
                        <option key={m.id} value={m.id}>
                          Dott. {m.nome} {m.cognome}{stars}
                        </option>
                      );
                    })}
                  </select>
                  <div className="form-text">Lascia vuoto per vedere tutti i medici</div>
                </div>

                {!isVirtualSelected && (
                  <div className="col-md-4">
                    <label className="form-label fw-semibold mb-1">Sede</label>
                    <select
                      className="form-select"
                      onChange={(e) => setSelectedSedeId(e.target.value)}
                      value={selectedSedeId}
                      disabled={!selectedPrestazioneId}
                    >
                      <option value="">Tutte le sedi</option>
                      {sediList.map((s) => (
                        <option key={s.id} value={s.id}>{s.nome}</option>
                      ))}
                    </select>
                    {preferredSedeId && !isVirtualSelected && (
                      <div className="form-text mt-1">
                        Sede predefinita impostata
                        <button
                          type="button"
                          className="btn btn-link btn-sm ms-2 p-0 align-baseline"
                          onClick={() => { try { localStorage.removeItem('preferred_sede_id'); } catch { /* ignore */ } setPreferredSedeId(""); }}
                        >
                          Rimuovi preferenza
                        </button>
                      </div>
                    )}
                    <div className="d-flex align-items-center gap-2 mt-2">
                      <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm"
                        disabled={!selectedPrestazioneId || isVirtualSelected || locating}
                        onClick={handleFindNearestSede}
                        title="Trova la sede più vicina a me"
                      >
                        {locating ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden></span>
                            Cercando…
                          </>
                        ) : (
                          <>
                            {/* geo-alt icon */}
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16" aria-hidden className="me-1">
                              <path d="M12.166 8.94c-.524 1.062-1.234 2.12-1.96 3.058A31.493 31.493 0 0 1 8 14.58a31.49 31.49 0 0 1-2.206-2.582c-.726-.937-1.436-1.996-1.96-3.058C3.304 7.867 3 6.862 3 6a5 5 0 1 1 10 0c0 .862-.304 1.867-.834 2.94M8 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4"/>
                            </svg>
                            Trova la sede più vicina a me
                          </>
                        )}
                      </button>
                    </div>
                    {selectedPrestazioneId && !selectedSedeId && suggestedSede && (
                      <div className="form-text mt-2">
                        Vicino a te: <strong>{suggestedSede.sede.nome}</strong>
                        {Number.isFinite(suggestedSede.distanceKm) && (
                          <span> (~{suggestedSede.distanceKm} km)</span>
                        )}
                        <button
                          type="button"
                          className="btn btn-link btn-sm ms-2 p-0 align-baseline"
                          onClick={() => setSelectedSedeId(String(suggestedSede.sede.id))}
                        >
                          Usa questa sede
                        </button>
                        <button
                          type="button"
                          className="btn btn-link btn-sm ms-2 p-0 align-baseline"
                          onClick={() => { try { localStorage.setItem('preferred_sede_id', String(suggestedSede.sede.id)); } catch { /* ignore */ } setPreferredSedeId(String(suggestedSede.sede.id)); setSelectedSedeId(String(suggestedSede.sede.id)); }}
                        >
                          Imposta automaticamente
                        </button>
                      </div>
                    )}
                    {geoError && !selectedSedeId && (
                      <div className="form-text text-muted mt-2">Suggerimento sede non disponibile: {geoError}</div>
                    )}
                  </div>
                )}
              </div>

              {/* Sezione filtri rapidi */}
              {selectedPrestazioneId && (
                <div className="card mb-3 border-0 shadow-sm">
                  <div className="card-body d-flex flex-wrap gap-3 align-items-center">
                    <Button variant="outline-primary" size="sm" onClick={() => setShowDateModal(true)} className="d-inline-flex align-items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16" aria-hidden>
                        <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v1H0V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5"/>
                        <path d="M16 14V5H0v9a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2M2 7h2v2H2zm3 0h2v2H5zm3 0h2v2H8zm3 0h2v2h-2zM2 10h2v2H2zm3 0h2v2H5zm3 0h2v2H8zm3 0h2v2h-2z"/>
                      </svg>
                      Filtra per data
                    </Button>
                    <div className="ms-2">
                      <label className="form-label me-2 mb-0 fw-semibold">Orario</label>
                      <select
                        className="form-select form-select-sm d-inline-block"
                        style={{ width: 220 }}
                        value={timeFilter}
                        onChange={(e) => setTimeFilter(e.target.value)}
                      >
                        <option value="all">Tutto il giorno</option>
                        <option value="morning">Mattina (09:00 - 12:00)</option>
                        <option value="afternoon">Pomeriggio (13:00 - 17:00)</option>
                        <option value="range-9-10">09:00 - 10:00</option>
                        <option value="range-10-11">10:00 - 11:00</option>
                        <option value="range-11-12">11:00 - 12:00</option>
                        <option value="range-13-14">13:00 - 14:00</option>
                        <option value="range-14-15">14:00 - 15:00</option>
                        <option value="range-15-16">15:00 - 16:00</option>
                        <option value="range-16-17">16:00 - 17:00</option>
                      </select>
                    </div>
                    <button className="btn btn-link btn-sm ms-auto" onClick={resetFiltri}>Pulisci filtri</button>
                  </div>
                </div>
              )}

              {/* Sezione slot disponibili */}
              {selectedPrestazioneId && (
                <div className="card mt-4">
                  <div className="card-header bg-white">
                    <div className="d-flex justify-content-between align-items-center" style={{gap: 12}}>
          <span className="fw-semibold">Prime visite disponibili (max 30)</span>
            {selectedMedicoId && (
                        <small className="text-muted">
        {(() => { const mm = mediciList.find(m => m.id === parseInt(selectedMedicoId)); if (!mm) return ""; const r = mm.avgRating ?? null; const stars = r ? ` (${"★".repeat(Math.round(r))}${"☆".repeat(5 - Math.round(r))} · ${mm.ratingCount})` : " (nessuna valutazione)"; return `Filtrato per: Dott. ${mm.nome} ${mm.cognome}${stars}`; })()}
                        </small>
                      )}
                      {selectedDateToFilter && selectedDateFilter ? (
                        <small className="text-muted">
                          Dal {selectedDateFilter.toLocaleDateString("it-IT")} al {selectedDateToFilter.toLocaleDateString("it-IT")}
                        </small>
                      ) : selectedDateFilter ? (
                        <small className="text-muted">
                          Data: {selectedDateFilter.toLocaleDateString("it-IT")}
                        </small>
                      ) : null}
                    </div>
                    {/* Riepilogo filtri attivi */}
                    <div className="mt-2 d-flex flex-wrap gap-2">
                      {selectedPrestazioneId && (
                        <span className="badge text-bg-light d-inline-flex align-items-center gap-1">
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16" aria-hidden>
                            <path d="M8 0a5 5 0 0 0-5 5v3.5L2 10v1h12v-1l-1-.5V5a5 5 0 0 0-5-5"/>
                          </svg>
                          Prestazione
                        </span>
                      )}
                      {selectedMedicoId && (
                        <span className="badge text-bg-light">Dott. {mediciList.find(m => m.id === parseInt(selectedMedicoId))?.nome} {mediciList.find(m => m.id === parseInt(selectedMedicoId))?.cognome}</span>
                      )}
                      {selectedDateToFilter && selectedDateFilter ? (
                        <span className="badge text-bg-light">Dal {selectedDateFilter.toLocaleDateString("it-IT")} al {selectedDateToFilter.toLocaleDateString("it-IT")}</span>
                      ) : selectedDateFilter ? (
                        <span className="badge text-bg-light">{selectedDateFilter.toLocaleDateString("it-IT")}</span>
                      ) : null}
                      {timeFilter !== 'all' && (
                        <span className="badge text-bg-light d-inline-flex align-items-center gap-1">
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16" aria-hidden>
                            <path d="M8 3.5a.5.5 0 0 1 .5.5v4l3 1.5a.5.5 0 1 1-.5.866l-3.5-1.75A.5.5 0 0 1 7 8V4a.5.5 0 0 1 .5-.5"/>
                            <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16m0-1A7 7 0 1 1 8 1a7 7 0 0 1 0 14"/>
                          </svg>
                          Orario: {timeFilter.replace('range-', '').replace('-', ':00-')}{timeFilter.startsWith('range-') ? ':00' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="list-group list-group-flush">
                    {loadingSlots && (
                      <div className="list-group-item text-center">
                        <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                        Caricamento slot disponibili...
                      </div>
                    )}

                    {!loadingSlots && prossimiSlot.length === 0 && (
                      <div className="list-group-item text-center text-muted">
                        Nessuna disponibilità trovata per questa prestazione.
                        {selectedMedicoId && " Prova a rimuovere il filtro medico."}
                      </div>
                    )}

                    {(() => {
                      const withinTime = (s: SlotDisponibile) => {
                        // Estrai ora: gestisce 'HH:mm' o 'HH:mm:ss'
                        const [hStr] = s.oraInizio.split(":");
                        const h = parseInt(hStr, 10);
                        if (timeFilter === "all") return true;
                        if (timeFilter === "morning") return h >= 9 && h < 12;
                        if (timeFilter === "afternoon") return h >= 13 && h <= 17;
                        if (timeFilter.startsWith("range-")) {
                          const [, start, end] = timeFilter.split("-");
                          const sh = parseInt(start, 10);
                          const eh = parseInt(end, 10);
                          return h >= sh && h < eh;
                        }
                        return true;
                      };

                      const base = selectedMedicoId
                        ? prossimiSlot.filter(s => s.medicoId === parseInt(selectedMedicoId))
                        : prossimiSlot;
                      const filteredAll = base.filter(withinTime).slice(0, 30);
                      const left = filteredAll.slice(0, 15);
                      const right = filteredAll.slice(15, 30);

                      const renderItem = (slot: SlotDisponibile) => {
                        const dataSlot = new Date(`${slot.data}T${slot.oraInizio}`);
                        const isOggi = slot.data === toYYYYMMDD(new Date());
                        const initials = `${slot.medicoNome?.[0] || ''}${slot.medicoCognome?.[0] || ''}`.toUpperCase();
                        const medico = mediciList.find(m => m.id === slot.medicoId);
                        const photoUrl = buildPhotoUrl(medico?.imgProfUrl || null);
                        const sedeForSlot = slot.sedeId ? sediList.find(s => s.id === slot.sedeId) : null;
                        const hasCoords = sedeForSlot && typeof sedeForSlot.lat === 'number' && typeof sedeForSlot.lng === 'number';
                        return (
                          <li
                            key={`${slot.data}-${slot.oraInizio}-${slot.medicoId}`}
                            className="list-group-item d-flex justify-content-between align-items-center"
                          >
                            <div className="d-flex align-items-center gap-3">
                              {photoUrl ? (
                                <img
                                  src={photoUrl}
                                  alt={`Foto profilo di Dott. ${slot.medicoNome} ${slot.medicoCognome}`}
                                  className="avatar-photo"
                                  loading="lazy"
                                  width={36}
                                  height={36}
                                />
                              ) : (
                                <div className="avatar-circle" aria-hidden>{initials || 'DR'}</div>
                              )}
                              <div className="d-flex flex-column">
                                <div className="fw-semibold">Dott. {slot.medicoNome} {slot.medicoCognome}</div>
                                <div className="text-muted small d-flex flex-wrap align-items-center" style={{gap:4}}>
                                  <span>
                                    {isOggi ? "Oggi" : dataSlot.toLocaleDateString("it-IT", {
                                      weekday: "long",
                                      year: "numeric",
                                      month: "2-digit",
                                      day: "2-digit",
                                    })}
                                  </span>
                                  <span className="badge rounded-pill text-bg-light">{slot.oraInizio.slice(0,5)}</span>
                                  {slot.sedeNome && (
                                    <>
                                      <span>• {slot.sedeNome}</span>
                                      {hasCoords && (
                                        <button
                                          type="button"
                                          className="btn btn-link btn-sm p-0 ms-1"
                                          onClick={() => {
                                            if (sedeForSlot) {
                                              setMapSede({ nome: sedeForSlot.nome, indirizzo: sedeForSlot.indirizzo, lat: sedeForSlot.lat as number, lng: sedeForSlot.lng as number });
                                              setShowMapModal(true);
                                            }
                                          }}
                                          title="Mostra mappa"
                                        >
                                          Mappa
                                        </button>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                            <button
                              className="btn btn-sm btn-success"
                              onClick={() => openConfirm(slot)}
                            >
                              Prenota
                            </button>
                          </li>
                        );
                      };

                      return (
                        <div className="row g-0">
                          <div className="col-md-6">
                            <ul className="list-group list-group-flush">
                              {left.map(renderItem)}
                            </ul>
                          </div>
                          <div className="col-md-6">
                            <ul className="list-group list-group-flush">
                              {right.map(renderItem)}
                            </ul>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* Modal filtro data */}
              <Modal show={showDateModal} onHide={() => setShowDateModal(false)} centered>
                <Modal.Header closeButton>
                  <Modal.Title>Seleziona una data</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                  <div className="row g-3">
                    <div className="col-12 d-flex justify-content-center">
                      <Calendar
                        onChange={(date) => setSelectedDateFilter(date as Date)}
                        value={selectedDateFilter || selectedDate}
                        minDate={new Date()}
                        onActiveStartDateChange={({ activeStartDate }) => {
                          if (activeStartDate) {
                            caricaGiorniDisponibiliMese(activeStartDate);
                          }
                        }}
                        tileClassName={({ date, view }) => {
                          if (view !== 'month') return undefined;
                          const key = toYYYYMMDD(date);
                          if (!availableDaysSet.has(key)) return undefined;
                          return timeFilter !== 'all' ? 'available-day available-dot' : 'available-day';
                        }}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Dal (opzionale)</label>
                      <input
                        type="date"
                        className="form-control"
                        value={selectedDateFilter ? toYYYYMMDD(selectedDateFilter) : ""}
                        min={toYYYYMMDD(new Date())}
                        onChange={(e) => setSelectedDateFilter(e.target.value ? new Date(e.target.value) : null)}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Al (opzionale)</label>
                      <input
                        type="date"
                        className="form-control"
                        value={selectedDateToFilter ? toYYYYMMDD(selectedDateToFilter) : ""}
                        min={toYYYYMMDD(selectedDateFilter || new Date())}
                        onChange={(e) => setSelectedDateToFilter(e.target.value ? new Date(e.target.value) : null)}
                      />
                      {rangeInvalid && (
                        <small className="text-danger">La data "Al" deve essere uguale o successiva alla data "Dal".</small>
                      )}
                    </div>
                  </div>
                </Modal.Body>
                <Modal.Footer>
                  <Button variant="secondary" onClick={() => setShowDateModal(false)}>
                    Annulla
                  </Button>
                  <Button
                    variant="primary"
                    onClick={applicaFiltroData}
                    disabled={!selectedPrestazioneId || (!!selectedDateToFilter && rangeInvalid) || (!selectedDateToFilter && !selectedDateFilter)}
                  >
                    Applica
                  </Button>
                </Modal.Footer>
              </Modal>

              {/* Modal guida prenotazione */}
              <Modal show={showHelpModal} onHide={() => setShowHelpModal(false)} centered>
                <Modal.Header closeButton>
                  <Modal.Title>Guida alla prenotazione</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                  <ol className="mb-3">
                    <li>
                      Seleziona la <strong>specialità</strong> e poi la <strong>prestazione</strong>.
                      Per le prestazioni <em>virtuali</em> il filtro sede è disattivato; per quelle <em>in presenza</em> puoi scegliere la <strong>sede</strong>.
                    </li>
                    <li>
                      (Opzionale) Scegli un <strong>medico</strong> specifico. Accanto al nome vedi le <strong>stelle</strong> (media delle valutazioni) o la scritta “nessuna valutazione”.
                    </li>
                    <li>
                      Premi <strong>Filtra per data</strong> per scegliere una <em>data</em> o un <em>intervallo</em>.
                      I giorni in <span className="text-success">verde</span> hanno disponibilità; se imposti anche un filtro <strong>orario</strong>, vedrai un <strong>pallino</strong> nei giorni compatibili.
                    </li>
                    <li>
                      (Opzionale) Filtra per <strong>orario</strong> (mattina, pomeriggio o fascia), oppure lascia “Tutto il giorno”.
                    </li>
                    <li>
                      Seleziona una <strong>sede</strong> per le visite in presenza. Puoi usare “<em>Trova la sede più vicina a me</em>” e, se vuoi, impostarla come preferita.
                    </li>
                    <li>
                      Scorri le <strong>prime visite</strong> elencate (max 30) e clicca <strong>Prenota</strong>; conferma nel riepilogo.
                    </li>
                  </ol>
                  <div className="text-muted small">
                    Suggerimenti:
                    <ul className="mt-1 mb-0">
                      <li>Lascia il medico non selezionato per vedere più disponibilità.</li>
                      <li>Per prenotare devi essere autenticato: se non lo sei, verrai indirizzato alla pagina di accesso.</li>
                      <li>Dopo la prenotazione riceverai un’email di conferma con invito calendario (ICS) e link Google Calendar.</li>
                      <li>Puoi <strong>spostare</strong> o <strong>annullare</strong> dalla tua Dashboard, rispettando le policy (max 2 spostamenti, non nelle 24h precedenti).</li>
                    </ul>
                  </div>
                </Modal.Body>
                <Modal.Footer className="d-flex justify-content-between align-items-center">
                  <label className="form-check m-0 d-inline-flex align-items-center gap-2">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      checked={helpDontShowAgain}
                      onChange={(e) => {
                        setHelpDontShowAgain(e.target.checked);
                        try { localStorage.setItem('booking_help_seen', e.target.checked ? '1' : ''); } catch { /* ignore */ }
                      }}
                    />
                    <span className="form-check-label">Non mostrare più</span>
                  </label>
                  <Button variant="primary" onClick={() => setShowHelpModal(false)}>Ho capito</Button>
                </Modal.Footer>
              </Modal>

              {/* Modal conferma prenotazione */}
              <Modal show={showConfirmModal} onHide={() => !bookingSubmitting && setShowConfirmModal(false)} centered>
                <Modal.Header closeButton={!bookingSubmitting}>
                  <Modal.Title>Conferma prenotazione</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                  {(() => {
                    if (!pendingSlot) return null;
                    const dataSlot = new Date(`${pendingSlot.data}T${pendingSlot.oraInizio}`);
                    const prestazione = prestazioniList.find((p) => p.id === parseInt(selectedPrestazioneId));
                    const costo = prestazione?.costo != null ? `${prestazione.costo}€` : "-";
                    const tipo = prestazione?.tipoPrestazione === 'virtuale' ? 'Virtuale' : 'In presenza';
                    return (
                      <div className="d-flex flex-column gap-2">
                        <div>
                          <div className="fw-semibold">Dott. {pendingSlot.medicoNome} {pendingSlot.medicoCognome}</div>
                          <div className="text-muted small">Medico</div>
                        </div>
                        <div>
                          <div>
                            Data e ora: <strong>{dataSlot.toLocaleDateString('it-IT', { weekday: 'long', year: 'numeric', month: '2-digit', day: '2-digit' })}</strong>
                            <span className="badge rounded-pill text-bg-light ms-2">{pendingSlot.oraInizio.slice(0,5)}</span>
                          </div>
                        </div>
                        <div>
                          Prestazione: <strong>{prestazione?.nome ?? '—'}</strong>
                          {prestazione && (
                            <>
                              <span className="ms-2 badge text-bg-secondary">{tipo}</span>
                              <span className="ms-2 text-muted">Costo: {costo}</span>
                            </>
                          )}
                        </div>
                        {prestazione?.tipoPrestazione === 'fisico' && (
                          <div className="small text-muted">
                            Sede: {pendingSlot.sedeNome ?? '-'}
                            {pendingSlot.sedeIndirizzo && (
                              <>
                                <br />
                                Indirizzo: {pendingSlot.sedeIndirizzo}
                                {pendingSlot.sedeCap || pendingSlot.sedeCitta || pendingSlot.sedeProvincia ? (
                                  <> — {pendingSlot.sedeCap ?? ''} {pendingSlot.sedeCitta ?? ''}{pendingSlot.sedeProvincia ? ` (${pendingSlot.sedeProvincia})` : ''}</>
                                ) : null}
                              </>
                            )}
                          </div>
                        )}
                        <div className="alert alert-info mb-0">
                          Confermando verrà prenotato lo slot selezionato. Potrai vedere i dettagli nella tua dashboard.
                        </div>
                      </div>
                    );
                  })()}
                </Modal.Body>
                <Modal.Footer>
                  <Button variant="secondary" onClick={() => setShowConfirmModal(false)} disabled={bookingSubmitting}>
                    Annulla
                  </Button>
                  <Button variant="success" onClick={confirmBooking} disabled={bookingSubmitting || !pendingSlot}>
                    {bookingSubmitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden></span>
                        Confermo…
                      </>
                    ) : (
                      'Conferma'
                    )}
                  </Button>
                </Modal.Footer>
              </Modal>
            </div>
          </div>
        </div>
      </div>
    </div>
    {/* Modal mappa sede */}
  <Modal show={showMapModal} onHide={() => setShowMapModal(false)} centered size="lg" backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>Mappa sede {mapSede?.nome}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {mapSede ? (
          <SedeMapEmbed lat={mapSede.lat} lng={mapSede.lng} indirizzo={mapSede.indirizzo} />
        ) : <div className="text-muted">Nessuna sede selezionata.</div>}
      </Modal.Body>
    </Modal>
    </>
  );
};

export default BookingCalendar;