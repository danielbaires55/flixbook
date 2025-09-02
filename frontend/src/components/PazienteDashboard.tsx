import { useState, useEffect } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { Modal, Button } from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import { useAuth } from "../context/useAuth";
import "./css/PazienteDashboard.css";

// --- Interfacce Aggiornate ---
interface Medico { id: number; nome: string; cognome: string; imgProfUrl: string; }
interface Prestazione { id: number; nome: string; costo: number; }
// L'appuntamento ora ha Medico e Prestazione come campi diretti
interface Appuntamento { 
  id: number; 
  dataEOraInizio: string; 
  dataEOraFine: string; 
  stato: "CONFERMATO" | "COMPLETATO" | "ANNULLATO"; 
  tipoAppuntamento: "virtuale" | "fisico"; 
  medico: Medico;
  prestazione: Prestazione;
  linkVideocall?: string; 
  sedeId?: number;
  sedeNome?: string;
  sedeIndirizzo?: string;
  sedeCitta?: string;
  sedeProvincia?: string;
  sedeCap?: string;
}
interface PazienteProfile { nome: string; cognome: string; email: string; }
interface DocItem { id: number; originalName: string }
interface RefertoItem { id: number; originalName: string; mimeType?: string; fileSize?: number; uploadedAt?: string; appuntamentoId: number; medicoNome?: string; medicoCognome?: string; prestazioneNome?: string; dataEOraInizio?: string; downloadUrl: string }
// Slot shape used by /api/slots/prossimi-disponibili (subset)
interface SlotLite { data: string; oraInizio: string | number; slotId?: number; sedeId?: number; sedeNome?: string }

const API_BASE_URL = "http://localhost:8080/api";
import { SERVER_BASE_URL } from '../config/api';

const PazienteDashboard = () => {
  const { user } = useAuth();
  
  const [profile, setProfile] = useState<PazienteProfile | null>(null);
  const [appuntamenti, setAppuntamenti] = useState<Appuntamento[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  // Documenti modal
  const [docModalOpen, setDocModalOpen] = useState(false);
  const [docTargetApp, setDocTargetApp] = useState<Appuntamento | null>(null);
  const [docList, setDocList] = useState<DocItem[]>([]);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docPrivacy, setDocPrivacy] = useState<boolean>(false);
  const [docLoading, setDocLoading] = useState<boolean>(false);
  // Reschedule modal
  const [resModalOpen, setResModalOpen] = useState(false);
  const [resTargetApp, setResTargetApp] = useState<Appuntamento | null>(null);
  const [resAllSlots, setResAllSlots] = useState<SlotLite[]>([]);
  const [resSlots, setResSlots] = useState<SlotLite[]>([]);
  const [resLoading, setResLoading] = useState(false);
  const [resError, setResError] = useState<string | null>(null);
  const [resSelectedSedeId, setResSelectedSedeId] = useState<number | ''>('');
  const [resSediOptions, setResSediOptions] = useState<Array<{ id?: number; nome?: string }>>([]);
  const [resSuccessOpen, setResSuccessOpen] = useState(false);
  // Referti (documenti caricati dal medico) per il paziente
  const [referti, setReferti] = useState<RefertoItem[]>([]);
  const [refertiLoading, setRefertiLoading] = useState<boolean>(false);

  // Action feedback/confirmations
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [cancelTargetId, setCancelTargetId] = useState<number | null>(null);
  const [cancelSuccessOpen, setCancelSuccessOpen] = useState(false);
  const [docDeleteConfirmOpen, setDocDeleteConfirmOpen] = useState(false);
  const [docDeleteId, setDocDeleteId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionErrorOpen, setActionErrorOpen] = useState(false);

  // Storico modal (past appointments)
  const [storicoOpen, setStoricoOpen] = useState(false);
  const [storicoPeriod, setStoricoPeriod] = useState<'week' | 'month' | 'year'>('month');
  const [storicoMedicoId, setStoricoMedicoId] = useState<number | ''>('');
  const [storicoPage, setStoricoPage] = useState(1);
  const STORICO_PAGE_SIZE = 5;

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchAllData = async () => {
      setLoading(true);
      const headers = { Authorization: `Bearer ${user.token}` };

      try {
        const [profileResponse, appuntamentiResponse] = await Promise.all([
          axios.get(`${API_BASE_URL}/pazienti/profile`, { headers }),
          axios.get(`${API_BASE_URL}/appuntamenti/paziente`, { headers }),
        ]);

  setProfile(profileResponse.data);
  setAppuntamenti(appuntamentiResponse.data);
      // carica referti
      try {
        setRefertiLoading(true);
        const { data } = await axios.get<RefertoItem[]>(`${API_BASE_URL}/pazienti/referti`, { headers });
        setReferti(data);
      } catch {
        setReferti([]);
      } finally { setRefertiLoading(false); }
      } catch (err) {
        console.error("Errore nel recupero dei dati:", err);
        setError("Impossibile caricare i dati. Riprova più tardi.");
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [user]);

  const handleAnnulla = (appuntamentoId: number) => {
    setCancelTargetId(appuntamentoId);
    setCancelConfirmOpen(true);
  };

  const confirmAnnulla = async () => {
    if (!user || !cancelTargetId) return;
    try {
      await axios.put(
        `${API_BASE_URL}/appuntamenti/annulla/${cancelTargetId}`, null,
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      setAppuntamenti((prev) =>
        prev.map((app) => (app.id === cancelTargetId ? { ...app, stato: "ANNULLATO" } : app))
      );
      setCancelConfirmOpen(false);
      setCancelTargetId(null);
      setCancelSuccessOpen(true);
    } catch (err) {
      console.error("Errore nell'annullamento dell'appuntamento", err);
      setActionError("Si è verificato un errore durante l'annullamento. Riprova.");
      setActionErrorOpen(true);
    }
  };

  const openReschedule = async (app: Appuntamento) => {
    setResTargetApp(app);
    setResModalOpen(true);
    setResLoading(true);
    setResError(null);
    setResAllSlots([]);
    setResSlots([]);
    setResSediOptions([]);
    setResSelectedSedeId(app.tipoAppuntamento === 'fisico' ? (app.sedeId ?? '') : '');
    try {
      if (!user) return;
      // Carica i prossimi slot del MEDICO dell'appuntamento per la STESSA prestazione
      const params: Record<string, string | number> = {
        prestazioneId: app.prestazione.id,
        medicoId: app.medico.id,
        limit: 30,
        fromDate: new Date().toISOString().slice(0,10),
      };
      const { data } = await axios.get<SlotLite[]>(`${API_BASE_URL}/slots/prossimi-disponibili`, { params });
      // Filtra slot con slotId disponibile (persisted) e data>oggi e orario dopo adesso se oggi
      const now = new Date();
      const toIsoTime = (t: string | number) => {
        if (typeof t === 'number') return `${t.toString().padStart(2,'0')}:00:00`;
        const s = String(t);
        return /^\d{2}:\d{2}$/.test(s) ? `${s}:00` : s; // assume HH:mm or HH:mm:ss
      };
      const future = data.filter(s => s.slotId).filter(s => {
        const dt = new Date(`${s.data}T${toIsoTime(s.oraInizio)}`);
        return dt.getTime() > now.getTime();
      });
      setResAllSlots(future);
      // Build sedi options from slots
      const sediMap = new Map<number, string>();
      for (const s of future) {
        if (typeof s.sedeId === 'number') {
          sediMap.set(s.sedeId, s.sedeNome || 'Sede');
        }
      }
      const sediOpts = Array.from(sediMap.entries()).map(([id, nome]) => ({ id, nome }));
      setResSediOptions(sediOpts);
      // Apply sede filter for physical visits by default
      if (app.tipoAppuntamento === 'fisico' && app.sedeId) {
        setResSlots(future.filter((s) => s.sedeId === app.sedeId));
      } else {
        setResSlots(future);
      }
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: unknown } })?.response?.data;
      setResError(typeof msg === 'string' ? msg : 'Impossibile caricare le disponibilità.');
    } finally {
      setResLoading(false);
    }
  };

  const doReschedule = async (slotId: number) => {
    if (!user || !resTargetApp) return;
    try {
      await axios.put(`${API_BASE_URL}/appuntamenti/${resTargetApp.id}/sposta`, { slotId }, { headers: { Authorization: `Bearer ${user.token}` } });
      // Aggiorna stato UI: ricarica lista appuntamenti dal server per coerenza
      const { data } = await axios.get(`${API_BASE_URL}/appuntamenti/paziente`, { headers: { Authorization: `Bearer ${user.token}` } });
      setAppuntamenti(data);
      setResModalOpen(false);
      setResTargetApp(null);
  setResSuccessOpen(true);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: unknown } })?.response?.data;
      const raw = typeof msg === 'string' ? msg : 'Impossibile spostare: verifica che lo slot sia ancora disponibile.';
      let friendly = raw;
      if (/massimo di 2 volte/i.test(raw) || /numero massimo di 2/i.test(raw)) {
        friendly = 'Hai raggiunto il numero massimo di 2 spostamenti per questo appuntamento.';
      } else if (/24\s*ore/i.test(raw) || /24h/i.test(raw)) {
        friendly = "Non è possibile spostare l'appuntamento nelle 24 ore precedenti all'orario previsto.";
      }
      setResError(friendly);
    }
  };

  const applySedeFilter = (sedeId: number | '') => {
    setResSelectedSedeId(sedeId);
  if (sedeId === '') { setResSlots(resAllSlots); return; }
  setResSlots(resAllSlots.filter((s) => s.sedeId === sedeId));
  };

  // Logout gestito dalla navbar; bottone rimosso per evitare ridondanza.

  const openDocModal = async (app: Appuntamento) => {
    setDocTargetApp(app);
    setDocModalOpen(true);
    setDocPrivacy(false);
    setDocFile(null);
    setDocLoading(true);
    setDocList([]);
    try {
      if (!user) return;
      const { data } = await axios.get(`${API_BASE_URL}/appuntamenti/${app.id}/documenti`, { headers: { Authorization: `Bearer ${user.token}` } });
      setDocList(data);
  } catch {
      setDocList([]);
    } finally { setDocLoading(false); }
  };
  const uploadDoc = async () => {
    if (!user || !docTargetApp || !docFile) return;
    setDocLoading(true);
    try {
      const form = new FormData();
      form.append('file', docFile);
      form.append('privacyConsenso', String(docPrivacy));
      const { data } = await axios.post(`${API_BASE_URL}/appuntamenti/${docTargetApp.id}/documenti`, form, { headers: { Authorization: `Bearer ${user.token}` } });
      setDocList(prev => [data, ...prev]);
      setDocFile(null);
  } catch {
      // ignore
    } finally { setDocLoading(false); }
  };
  const askDeleteDoc = (docId: number) => {
    setDocDeleteId(docId);
    setDocDeleteConfirmOpen(true);
  };
  const deleteDoc = async () => {
    if (!user || !docTargetApp || !docDeleteId) return;
    try {
      await axios.delete(`${API_BASE_URL}/appuntamenti/${docTargetApp.id}/documenti/${docDeleteId}`, { headers: { Authorization: `Bearer ${user.token}` } });
      setDocList(prev => prev.filter(d => d.id !== docDeleteId));
      setDocDeleteConfirmOpen(false);
      setDocDeleteId(null);
    } catch {
      setActionError("Non è stato possibile eliminare il documento. Riprova.");
      setActionErrorOpen(true);
    }
  };

  // Helpers for upcoming vs past and filtering
  const now = new Date();
  const isUpcoming = (app: Appuntamento) => app.stato === "CONFERMATO" && new Date(app.dataEOraInizio) >= now;
  const upcomingAppointments = appuntamenti.filter(isUpcoming).sort((a,b) => new Date(a.dataEOraInizio).getTime() - new Date(b.dataEOraInizio).getTime());

  const pastAppointmentsAll = appuntamenti.filter(a => a.stato === "COMPLETATO" || a.stato === "ANNULLATO");

  const startOfWeek = (d: Date) => {
    const date = new Date(d);
    const day = (date.getDay() + 6) % 7; // Monday=0
    date.setDate(date.getDate() - day);
    date.setHours(0,0,0,0);
    return date;
  };
  const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1, 0,0,0,0);
  const startOfYear = (d: Date) => new Date(d.getFullYear(), 0, 1, 0,0,0,0);
  const periodStart = storicoPeriod === 'week' ? startOfWeek(now) : storicoPeriod === 'month' ? startOfMonth(now) : startOfYear(now);

  const storicoFiltered = pastAppointmentsAll
    .filter(a => !storicoMedicoId || a.medico?.id === storicoMedicoId)
    .filter(a => new Date(a.dataEOraInizio) >= periodStart)
    .sort((a,b) => new Date(b.dataEOraInizio).getTime() - new Date(a.dataEOraInizio).getTime());

  const totalPages = Math.max(1, Math.ceil(storicoFiltered.length / STORICO_PAGE_SIZE));
  const currentPage = Math.min(storicoPage, totalPages);
  const storicoPageItems = storicoFiltered.slice((currentPage-1)*STORICO_PAGE_SIZE, currentPage*STORICO_PAGE_SIZE);

  // Distinct medici for filter
  const storicoMediciDistinct = Array.from(new Map(pastAppointmentsAll.map(a => [a.medico?.id, a.medico])).values())
    .filter(Boolean) as Medico[];

  if (loading) return <div className="text-center mt-5"><h3>Caricamento...</h3></div>;
  if (error) return <div className="alert alert-danger mt-5">{error}</div>;

  return (
  <div className="container mt-5 paziente-dashboard">
      <h1 className="text-center mb-4">La Tua Area Personale</h1>
      <div className="row">
        <div className="col-lg-5 mb-4">
          <div className="card shadow-sm h-100">
            <div className="card-body d-flex flex-column">
              <h4 className="card-title text-center">Le tue informazioni</h4>
              {profile ? (
                <ul className="list-group list-group-flush text-start mt-3">
                  <li className="list-group-item"><strong>Nome:</strong> {profile.nome}</li>
                  <li className="list-group-item"><strong>Cognome:</strong> {profile.cognome}</li>
                  <li className="list-group-item"><strong>Email:</strong> {profile.email}</li>
                </ul>
              ) : <p>Informazioni non disponibili.</p>}
              <div className="mt-auto text-center pt-3">
                <Link to="/book" className="btn btn-primary px-4">
                  Prenota un Nuovo Appuntamento
                </Link>
              </div>
            </div>
          </div>
          {/* Referti card */}
          <div className="card shadow-sm mt-4">
            <div className="card-body">
              <h4 className="card-title text-center mb-2">I tuoi referti</h4>
              {refertiLoading ? (
                <div>Caricamento…</div>
              ) : referti.length === 0 ? (
                <div className="text-muted text-center">Nessun referto disponibile.</div>
              ) : (
                <ul className="list-group list-group-flush">
                  {referti.map(r => (
                    <li key={r.id} className="list-group-item d-flex justify-content-between align-items-center">
                      <div className="me-2">
                        <div className="fw-semibold">{r.originalName}</div>
                        <div className="small text-muted">
                          {r.prestazioneNome ? `${r.prestazioneNome} · ` : ''}
                          {r.medicoCognome || r.medicoNome ? `Dr. ${r.medicoNome || ''} ${r.medicoCognome || ''}` : ''}
                          {r.dataEOraInizio ? ` · ${new Date(r.dataEOraInizio).toLocaleDateString('it-IT')}` : ''}
                        </div>
                      </div>
                      <a className="btn btn-sm btn-outline-primary" href={`${SERVER_BASE_URL}${r.downloadUrl}`} target="_blank" rel="noopener noreferrer" title="Scarica referto">Scarica</a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        <div className="col-lg-7 mb-4">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <h4 className="card-title text-center mb-0">I tuoi appuntamenti</h4>
                <button
                  className="btn btn-outline-secondary btn-sm rounded-circle d-inline-flex align-items-center justify-content-center"
                  style={{ width: 34, height: 34, padding: 0, lineHeight: 1 }}
                  onClick={() => { setStoricoOpen(true); setStoricoPage(1); }}
                  aria-label="Storico appuntamenti"
                  title="Storico"
                >
                  {/* history (circular arrow) icon */}
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" aria-hidden>
                    <path fill-rule="evenodd" d="M8 3a5 5 0 1 1-4.546 2.914.5.5 0 1 0-.908-.417A6 6 0 1 0 8 2v1z"/>
                    <path d="M8 0a.5.5 0 0 1 .5.5V2h1a.5.5 0 0 1 0 1H7.5A.5.5 0 0 1 7 2.5v-2A.5.5 0 0 1 7.5 0h.5z"/>
                  </svg>
                </button>
              </div>
              {upcomingAppointments.length > 0 ? (
                <ul className="list-group list-group-flush mt-3">
                  {upcomingAppointments.map((app) => (
                    <li key={app.id} className="list-group-item">
                      <div>
                        <strong>{new Date(app.dataEOraInizio).toLocaleDateString("it-IT", { year: 'numeric', month: 'long', day: 'numeric' })}</strong> alle <strong>{new Date(app.dataEOraInizio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>
                        
                        {/* --- CORREZIONE: Legge i dati direttamente da app.medico e app.prestazione --- */}
                        {app.medico && app.prestazione ? (
                          <>
                            <br />
                            <div className="d-flex align-items-center mt-2">
                              {app.medico.imgProfUrl && (
                                <img 
                                  src={`${SERVER_BASE_URL}${app.medico.imgProfUrl}`} 
                                  alt={`Profilo del Dott. ${app.medico.cognome}`} 
                                  className="rounded-circle me-2" 
                                  style={{ width: '30px', height: '30px', objectFit: 'cover' }}
                                />
                              )}
                              <small className="text-muted">Dott. {app.medico.nome} {app.medico.cognome}</small>
                            </div>
                            <small className="text-muted d-block mt-1">Prestazione: {app.prestazione.nome} ({app.prestazione.costo}€)</small>
                          </>
                        ) : (
                          <><br /><small className="text-muted">Dettagli non più disponibili.</small></>
                        )}
                        <br />
                        <span className={`badge text-capitalize mt-2 ${app.stato === "CONFERMATO" ? "bg-success" : app.stato === "COMPLETATO" ? "bg-secondary" : "bg-danger"}`}>
                          {app.stato.toLowerCase()}
                        </span>
                      </div>
                      <div className="mt-2 d-flex gap-2">
                        {app.tipoAppuntamento === "virtuale" && app.stato === "CONFERMATO" && app.linkVideocall && (
                          <a href={app.linkVideocall} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-info">
                            Vai alla Videocall
                          </a>
                        )}
                        {app.tipoAppuntamento === "virtuale" && (
                          <button className="btn btn-outline-secondary btn-sm" onClick={() => openDocModal(app)}>
                            Documenti per videoconsulto
                          </button>
                        )}
                        {app.tipoAppuntamento === "fisico" && app.stato === "CONFERMATO" && (
                          <span className="badge text-bg-light align-self-center">
                            {app.sedeNome ? (
                              <>
                                Sede: {app.sedeNome}
                                {app.sedeIndirizzo ? ` — ${app.sedeIndirizzo}` : ''}
                                {app.sedeCap || app.sedeCitta || app.sedeProvincia ? `, ${[app.sedeCap, app.sedeCitta, app.sedeProvincia && `(${app.sedeProvincia})`].filter(Boolean).join(' ')}` : ''}
                              </>
                            ) : 'Sede: —'}
                          </span>
                        )}
                        {app.stato === "CONFERMATO" && (
                          <button className="btn btn-danger btn-sm" onClick={() => handleAnnulla(app.id)}>
                            Annulla
                          </button>
                        )}
                        {app.stato === "CONFERMATO" && (
                          <button className="btn btn-outline-primary btn-sm" onClick={() => openReschedule(app)}>
                            Sposta
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="empty-state text-center mt-3">
                  Nessun appuntamento in programma.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* Modal storico */}
      <StoricoModal
        open={storicoOpen}
        onClose={() => setStoricoOpen(false)}
        items={storicoPageItems}
        total={storicoFiltered.length}
        page={currentPage}
        totalPages={totalPages}
        setPage={setStoricoPage}
        medici={storicoMediciDistinct}
        medicoId={storicoMedicoId}
        setMedicoId={setStoricoMedicoId}
        period={storicoPeriod}
        setPeriod={(p) => { setStoricoPage(1); setStoricoPeriod(p); }}
      />
      {/* Modal documenti */}
      <DocsModal
        open={docModalOpen}
        onClose={() => setDocModalOpen(false)}
        app={docTargetApp}
        list={docList}
        setFile={setDocFile}
        upload={uploadDoc}
        del={askDeleteDoc}
        loading={docLoading}
        setPrivacy={setDocPrivacy}
      />

      {/* Modal spostamento appuntamento */}
      <RescheduleModal
        open={resModalOpen}
        onClose={() => setResModalOpen(false)}
        loading={resLoading}
        error={resError}
  slots={resSlots}
  isFisico={resTargetApp?.tipoAppuntamento === 'fisico'}
  selectedSedeId={resSelectedSedeId}
  sediOptions={resSediOptions}
  onChangeSede={applySedeFilter}
        doReschedule={doReschedule}
      />
      {/* Modal successo spostamento */}
      <Modal show={resSuccessOpen} onHide={() => setResSuccessOpen(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Appuntamento spostato</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          L'appuntamento è stato spostato con successo.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="primary" onClick={() => setResSuccessOpen(false)}>OK</Button>
        </Modal.Footer>
      </Modal>

      {/* Modal conferma annullamento */}
      <Modal show={cancelConfirmOpen} onHide={() => setCancelConfirmOpen(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Conferma annullamento</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Sei sicuro di voler annullare questo appuntamento?
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setCancelConfirmOpen(false)}>No</Button>
          <Button variant="danger" onClick={confirmAnnulla}>Sì, annulla</Button>
        </Modal.Footer>
      </Modal>

      {/* Modal esito annullamento */}
      <Modal show={cancelSuccessOpen} onHide={() => setCancelSuccessOpen(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Appuntamento annullato</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          L'appuntamento è stato annullato con successo.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="primary" onClick={() => setCancelSuccessOpen(false)}>OK</Button>
        </Modal.Footer>
      </Modal>

      {/* Modal conferma eliminazione documento */}
      <Modal show={docDeleteConfirmOpen} onHide={() => setDocDeleteConfirmOpen(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Elimina documento</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Vuoi eliminare questo documento?
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setDocDeleteConfirmOpen(false)}>Annulla</Button>
          <Button variant="danger" onClick={deleteDoc}>Elimina</Button>
        </Modal.Footer>
      </Modal>

      {/* Modal errore azione */}
      <Modal show={actionErrorOpen} onHide={() => setActionErrorOpen(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Errore</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {actionError || 'Si è verificato un errore. Riprova.'}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setActionErrorOpen(false)}>Chiudi</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

// Modal doc upload/list (paziente)
const DocsModal = ({ open, onClose, app, list, setFile, upload, del, loading, setPrivacy }:
  { open: boolean; onClose: () => void; app: Appuntamento|null; list: DocItem[]; setFile: (f: File|null)=>void; upload: ()=>void; del: (id:number)=>void; loading: boolean; setPrivacy: (b:boolean)=>void }) => {
  return (
    <Modal show={open} onHide={onClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>Documenti per videoconsulto</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="mb-3">
          <label className="form-label">Carica documento (PDF/JPG/PNG)</label>
          <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="form-control" onChange={(e) => setFile(e.target.files?.[0] || null)} disabled={loading} />
          <div className="form-check mt-2">
            <input className="form-check-input" type="checkbox" id="privacyConsenso" onChange={(e) => setPrivacy(e.target.checked)} />
            <label className="form-check-label" htmlFor="privacyConsenso">Autorizzo il medico a visionare i documenti caricati per questo appuntamento</label>
          </div>
          <Button className="mt-2" onClick={upload} disabled={loading || !app}>Carica</Button>
        </div>
        <hr />
        <div>
          <h6>Documenti caricati</h6>
      {loading ? <div>Caricamento…</div> : list.length === 0 ? <div className="text-muted">Nessun documento</div> : (
            <ul className="list-group">
              {list.map((d) => (
                <li key={d.id} className="list-group-item d-flex justify-content-between align-items-center">
                  <a href={`${SERVER_BASE_URL}/api/appuntamenti/${app!.id}/documenti/${d.id}`} target="_blank" rel="noopener noreferrer">{d.originalName}</a>
                  <button className="btn btn-sm btn-outline-danger" onClick={() => del(d.id)}>Elimina</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>Chiudi</Button>
      </Modal.Footer>
    </Modal>
  );
};

export default PazienteDashboard;
// Modal Sposta (paziente)
const RescheduleModal = ({ open, onClose, loading, error, slots, isFisico, selectedSedeId, sediOptions, onChangeSede, doReschedule }:
  { open: boolean; onClose: () => void; loading: boolean; error: string | null; slots: SlotLite[]; isFisico?: boolean; selectedSedeId: number | ''; sediOptions: Array<{id?: number; nome?: string}>; onChangeSede: (id: number | '') => void; doReschedule: (slotId: number) => void }) => {
  const fmtIso = (t: string | number) => {
    if (typeof t === 'number') return `${t.toString().padStart(2,'0')}:00:00`;
    const s = String(t);
    return /^\d{2}:\d{2}$/.test(s) ? `${s}:00` : s; // HH:mm -> HH:mm:ss, or already HH:mm:ss
  };
  return (
    <Modal show={open} onHide={onClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>Sposta appuntamento</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {isFisico && (
          <div className="mb-3">
            <label className="form-label">Sede</label>
            <select className="form-select" value={selectedSedeId === '' ? '' : selectedSedeId}
              onChange={(e) => onChangeSede(e.target.value ? Number(e.target.value) : '')}>
              <option value="">Tutte le sedi</option>
              {sediOptions.map(s => (
                <option key={s.id} value={s.id}>{s.nome || `Sede ${s.id}`}</option>
              ))}
            </select>
          </div>
        )}
        {loading ? <div>Caricamento disponibilità…</div> : error ? <div className="alert alert-danger">{error}</div> : (
          slots.length === 0 ? <div className="text-muted">Nessuno slot disponibile.</div> : (
            <ul className="list-group">
              {slots.map((s, idx) => (
        <li key={idx} className="list-group-item d-flex justify-content-between align-items-center">
                  <div>
                    <div><strong>{new Date(`${s.data}T${fmtIso(s.oraInizio)}`).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}</strong> alle <strong>{fmtIso(s.oraInizio).slice(0,5)}</strong></div>
                    {s.sedeNome && <div className="small text-muted">Sede: {s.sedeNome}</div>}
                  </div>
                  <Button size="sm" onClick={() => s.slotId && doReschedule(s.slotId)} disabled={!s.slotId}>Scegli</Button>
                </li>
              ))}
            </ul>
          )
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>Chiudi</Button>
      </Modal.Footer>
    </Modal>
  );
};
// Render modal alongside component (export stays default above)
// Note: Inlined for simplicity; could be separated later

// Modal Storico (paziente)
const StoricoModal = ({ open, onClose, items, total, page, totalPages, setPage, medici, medicoId, setMedicoId, period, setPeriod }:
  { open: boolean; onClose: () => void; items: Appuntamento[]; total: number; page: number; totalPages: number; setPage: (n:number)=>void; medici: Medico[]; medicoId: number|''; setMedicoId: (v:number|'')=>void; period: 'week'|'month'|'year'; setPeriod: (p:'week'|'month'|'year')=>void }) => {
  const formatDate = (iso: string) => new Date(iso).toLocaleString('it-IT', { dateStyle: 'medium', timeStyle: 'short' });
  return (
    <Modal show={open} onHide={onClose} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>Storico appuntamenti</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="d-flex flex-wrap gap-2 align-items-center mb-3">
          <div className="btn-group" role="group" aria-label="Periodo">
            <button className={`btn btn-sm ${period==='week'?'btn-primary':'btn-outline-primary'}`} onClick={() => setPeriod('week')}>Questa settimana</button>
            <button className={`btn btn-sm ${period==='month'?'btn-primary':'btn-outline-primary'}`} onClick={() => setPeriod('month')}>Questo mese</button>
            <button className={`btn btn-sm ${period==='year'?'btn-primary':'btn-outline-primary'}`} onClick={() => setPeriod('year')}>Quest'anno</button>
          </div>
          <div className="ms-auto">
            <select className="form-select form-select-sm" value={medicoId || ''} onChange={e => setMedicoId(e.target.value ? Number(e.target.value) : '')}>
              <option value="">Tutti i medici</option>
              {medici.map(m => <option key={m.id} value={m.id}>{m.cognome} {m.nome}</option>)}
            </select>
          </div>
        </div>
        {items.length === 0 ? (
          <div className="text-muted">Nessun appuntamento nel periodo selezionato.</div>
        ) : (
          <ul className="list-group">
            {items.map(app => (
              <li key={app.id} className="list-group-item">
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <div><strong>{formatDate(app.dataEOraInizio)}</strong></div>
                    <div className="small text-muted">Dott. {app.medico?.nome} {app.medico?.cognome} · {app.prestazione?.nome}</div>
                  </div>
                  <span className={`badge ${app.stato === 'COMPLETATO' ? 'bg-secondary' : 'bg-danger'}`}>{app.stato.toLowerCase()}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Modal.Body>
      <Modal.Footer className="d-flex justify-content-between align-items-center">
        <div className="small text-muted">Totale: {total}</div>
        <div className="d-flex align-items-center gap-2">
          <button className="btn btn-sm btn-outline-secondary" onClick={() => setPage(Math.max(1, page-1))} disabled={page<=1}>Prev</button>
          <span className="small">{page} / {totalPages}</span>
          <button className="btn btn-sm btn-outline-secondary" onClick={() => setPage(Math.min(totalPages, page+1))} disabled={page>=totalPages}>Next</button>
          <Button variant="secondary" onClick={onClose}>Chiudi</Button>
        </div>
      </Modal.Footer>
    </Modal>
  );
};