import { useState, useEffect } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { Modal, Button } from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import { useAuth } from "../context/useAuth";

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

const API_BASE_URL = "http://localhost:8080/api";
const SERVER_BASE_URL = 'http://localhost:8080';

const PazienteDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
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
      } catch (err) {
        console.error("Errore nel recupero dei dati:", err);
        setError("Impossibile caricare i dati. Riprova più tardi.");
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [user]);

  const handleAnnulla = async (appuntamentoId: number) => {
    if (!window.confirm("Sei sicuro di voler annullare questo appuntamento?") || !user) {
      return;
    }

    try {
      await axios.put(
        `${API_BASE_URL}/appuntamenti/annulla/${appuntamentoId}`, null,
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      alert("Appuntamento annullato con successo!");
      setAppuntamenti((prev) =>
        prev.map((app) =>
          app.id === appuntamentoId ? { ...app, stato: "ANNULLATO" } : app
        )
      );
    } catch (err) {
      console.error("Errore nell'annullamento dell'appuntamento", err);
      alert("Si è verificato un errore durante l'annullamento. Riprova.");
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

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
  const deleteDoc = async (docId: number) => {
    if (!user || !docTargetApp) return;
    if (!window.confirm('Eliminare questo documento?')) return;
    try {
      await axios.delete(`${API_BASE_URL}/appuntamenti/${docTargetApp.id}/documenti/${docId}`, { headers: { Authorization: `Bearer ${user.token}` } });
      setDocList(prev => prev.filter(d => d.id !== docId));
  } catch {/* ignore */}
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
  <div className="container mt-5">
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
                <Link to="/book" className="btn btn-primary w-100">
                  Prenota un Nuovo Appuntamento
                </Link>
                <button className="btn btn-outline-secondary w-100 mt-2" onClick={handleLogout}>
                    Logout
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-7 mb-4">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <h4 className="card-title text-center mb-0">I tuoi appuntamenti</h4>
                <button className="btn btn-outline-secondary btn-sm" onClick={() => { setStoricoOpen(true); setStoricoPage(1); }}>
                  Storico
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
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="alert alert-info text-center mt-3">
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
        del={deleteDoc}
        loading={docLoading}
        setPrivacy={setDocPrivacy}
      />
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