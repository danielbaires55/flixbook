import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Modal, Button, Form } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import { useAuth } from '../context/useAuth';
import './css/MedicoDashboard.css';

// --- Interfacce ---
interface Medico { id: number; nome: string; cognome: string; email: string; imgProfUrl?: string; imgUrl?: string }
interface Paziente {
    id: number;
    nome: string;
    cognome: string;
    email?: string;
    telefono?: string;
    dataNascita?: string; // ISO date
    indirizzo?: string;
    citta?: string;
    provincia?: string;
    cap?: string;
    codiceFiscale?: string;
}
interface Prestazione { id: number; nome: string; costo: number; tipoPrestazione?: 'fisico' | 'virtuale' }
interface BloccoOrario {
    id: number;
    data: string;
    oraInizio: string;
    oraFine: string;
    prestazioneIds?: number[];
    createdByType?: 'MEDICO' | 'COLLABORATORE';
    createdById?: number;
    createdByName?: string;
    createdAt?: string;
}
interface SlotItem { id: number; dataEOraInizio: string; dataEOraFine: string; stato: 'DISPONIBILE' | 'DISABILITATO' | 'OCCUPATO' }
interface Appuntamento {
    id: number;
    dataEOraInizio: string;
    dataEOraFine: string;
    stato: 'CONFERMATO' | 'COMPLETATO' | 'ANNULLATO';
    tipoAppuntamento: 'fisico' | 'virtuale';
    paziente: Paziente;
    medico: Medico;
    prestazione: Prestazione;
    linkVideocall?: string;
    sedeId?: number;
    sedeNome?: string;
    sedeIndirizzo?: string;
    sedeCitta?: string;
    sedeProvincia?: string;
    sedeCap?: string;
    privacyConsenso?: boolean;
}
interface DocItem { id: number; originalName: string }
interface SlotLite { data: string; oraInizio: string | number; slotId?: number; sedeId?: number; sedeNome?: string }

const API_BASE_URL = 'http://localhost:8080/api';
const SERVER_BASE_URL = API_BASE_URL.replace(/\/api$/, '');

const MedicoDashboard = () => {
    const { user } = useAuth();

    const [profile, setProfile] = useState<Medico | null>(null);
    const [appuntamenti, setAppuntamenti] = useState<Appuntamento[]>([]);
    const [blocchiOrario, setBlocchiOrario] = useState<BloccoOrario[]>([]);
    const [prestazioniMedico, setPrestazioniMedico] = useState<Prestazione[]>([]);
    type Sede = { id: number; nome: string };
    const [sedi, setSedi] = useState<Sede[]>([]);
    const [sedeFilterId, setSedeFilterId] = useState<number | ''>('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [bloccoAperto, setBloccoAperto] = useState<number | null>(null);
    const [slots, setSlots] = useState<SlotItem[]>([]);
    const [slotsLoading, setSlotsLoading] = useState(false);
    const [slotsError, setSlotsError] = useState<string | null>(null);
    // Patient info modal
    const [patientModalOpen, setPatientModalOpen] = useState(false);
    const [patientTarget, setPatientTarget] = useState<Paziente | null>(null);

        // Storico appuntamenti (modal + filtri basilari)
        const [showStoricoModal, setShowStoricoModal] = useState(false);
        const [storicoPage, setStoricoPage] = useState(1);
        const pageSize = 20;
        type PresetType = 'all' | 'week' | 'month' | 'year';
        const [storicoPreset, setStoricoPreset] = useState<PresetType>('all');
        const [storicoSearch, setStoricoSearch] = useState('');

    // Modal conferma/errore per eliminazione blocco
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [deleteModalError, setDeleteModalError] = useState<string | null>(null);
    const [pendingDeleteBloccoId, setPendingDeleteBloccoId] = useState<number | null>(null);
    // Docs modal (read-only)
    const [docModalOpen, setDocModalOpen] = useState(false);
    const [docTargetApp, setDocTargetApp] = useState<Appuntamento | null>(null);
    const [docList, setDocList] = useState<DocItem[]>([]);
    const [docLoading, setDocLoading] = useState(false);
    // Reschedule modal
    const [resModalOpen, setResModalOpen] = useState(false);
    const [resTargetApp, setResTargetApp] = useState<Appuntamento | null>(null);
    const [resAllSlots, setResAllSlots] = useState<SlotLite[]>([]);
    const [resSlots, setResSlots] = useState<SlotLite[]>([]);
    const [resLoading, setResLoading] = useState(false);
    const [resError, setResError] = useState<string | null>(null);
    const [resSuccessOpen, setResSuccessOpen] = useState(false);
    const [resSelectedSedeId, setResSelectedSedeId] = useState<number | ''>('');
    const [resSediOptions, setResSediOptions] = useState<Array<{ id?: number; nome?: string }>>([]);

    // Generic error modal
    const [errorModalOpen, setErrorModalOpen] = useState(false);
    const [errorModalMessage, setErrorModalMessage] = useState<string>('');

    // Confirm modals
    const [slotDeleteConfirmOpen, setSlotDeleteConfirmOpen] = useState(false);
    const [slotIdToDelete, setSlotIdToDelete] = useState<number | null>(null);
    const [appCancelConfirmOpen, setAppCancelConfirmOpen] = useState(false);
    const [appIdToCancel, setAppIdToCancel] = useState<number | null>(null);

    useEffect(() => {
        if (!user || !user.medicoId) { setLoading(false); return; }
        const headers = { Authorization: `Bearer ${user.token}` };
        const medicoId = user.medicoId;
        const fetchAll = async () => {
            try {
                setLoading(true);
                setError(null);
                const [p, a, b, pr, sd] = await Promise.all([
                    axios.get(`${API_BASE_URL}/medici/profile`, { headers }),
                    axios.get(`${API_BASE_URL}/appuntamenti/medico/${medicoId}`, { headers }),
                    axios.get(`${API_BASE_URL}/blocchi-orario/medico/${medicoId}${sedeFilterId ? `?sedeId=${sedeFilterId}` : ''}`, { headers }),
                    axios.get(`${API_BASE_URL}/prestazioni/by-medico-loggato`, { headers }),
                    axios.get(`${API_BASE_URL}/medici/sedi`, { headers }),
                ]);
                setProfile(p.data);
                setAppuntamenti(a.data);
                setBlocchiOrario(b.data);
                setPrestazioniMedico(pr.data);
                const list = (sd.data as { id: number; nome: string }[]).filter(s => s && typeof s.id === 'number');
                setSedi(list);
            } catch (e) {
                console.error('Errore nel recupero dei dati:', e);
                setError('Impossibile caricare i dati.');
            } finally {
                setLoading(false);
            }
        };
        fetchAll();
    }, [user, sedeFilterId]);

    const buildPhotoUrl = (m?: Medico | null): string | null => {
        if (!m) return null;
        const raw = (m.imgProfUrl?.trim() || m.imgUrl?.trim() || '');
        if (!raw) return null;
        if (/^https?:\/\//i.test(raw)) return raw;
        return `${SERVER_BASE_URL}${raw.startsWith('/') ? raw : `/${raw}`}`;
    };
    const buildVideoUrl = (raw?: string | null): string | null => {
        const link = (raw || '').trim();
        if (!link) return null;
        if (/^https?:\/\//i.test(link)) return link;
        return `${SERVER_BASE_URL}${link.startsWith('/') ? link : `/${link}`}`;
    };
    const getInitials = (n?: string, c?: string) => `${(n?.[0] || '?').toUpperCase()}${(c?.[0] || '').toUpperCase()}`;
    const fmtTime = (d: Date) => `${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;
    const fmtHM = (t: string) => t?.split(':').slice(0, 2).join(':');

    // Regola di visibilità del tasto Elimina per un blocco
    const isBloccoDeletable = (b: BloccoOrario) => {
        const inizio = new Date(`${b.data}T${b.oraInizio.length === 5 ? b.oraInizio + ':00' : b.oraInizio}`);
        const fine = new Date(`${b.data}T${b.oraFine.length === 5 ? b.oraFine + ':00' : b.oraFine}`);
        const hasAttivi = appuntamenti.some(a => a.stato === 'CONFERMATO' && new Date(a.dataEOraInizio) < fine && new Date(a.dataEOraFine) > inizio);
        if (hasAttivi) return false;
        const hasCompletati = appuntamenti.some(a => a.stato === 'COMPLETATO' && new Date(a.dataEOraInizio) < fine && new Date(a.dataEOraFine) > inizio);
        if (hasCompletati && fine > new Date()) return false;
        return true;
    };

    const fetchSlotsForBlocco = async (bloccoId: number) => {
        if (!user) return;
        try {
            setSlotsLoading(true); setSlotsError(null);
            const { data } = await axios.get(`${API_BASE_URL}/slots/blocchi/${bloccoId}`, { headers: { Authorization: `Bearer ${user.token}` } });
            setSlots(data as SlotItem[]);
        } catch (e) {
            console.error('Errore nel recupero degli slot:', e);
            setSlotsError('Impossibile caricare gli slot.');
        } finally { setSlotsLoading(false); }
    };
    const handleApriChiudiSlot = async (bloccoId: number) => {
        if (bloccoAperto === bloccoId) { setBloccoAperto(null); setSlots([]); return; }
        setBloccoAperto(bloccoId);
        await fetchSlotsForBlocco(bloccoId);
    };
    const handleToggleSlot = async (slotId: number) => {
        if (!user) return;
        try {
            const { data } = await axios.put(`${API_BASE_URL}/slots/${slotId}/toggle`, null, { headers: { Authorization: `Bearer ${user.token}` } });
            setSlots(prev => prev.map(s => s.id === slotId ? { ...s, stato: data.stato } : s));
        } catch {
            setErrorModalMessage('Errore nel modificare lo slot.');
            setErrorModalOpen(true);
        }
    };
    const openEliminaSlotConfirm = (slotId: number) => {
        setSlotIdToDelete(slotId);
        setSlotDeleteConfirmOpen(true);
    };
    const confirmEliminaSlot = async () => {
        if (!user || slotIdToDelete == null) { setSlotDeleteConfirmOpen(false); return; }
        try {
            await axios.delete(`${API_BASE_URL}/slots/${slotIdToDelete}`, { headers: { Authorization: `Bearer ${user.token}` } });
            setSlots(prev => prev.filter(s => s.id !== slotIdToDelete));
            setSlotDeleteConfirmOpen(false);
            setSlotIdToDelete(null);
        } catch {
            setSlotDeleteConfirmOpen(false);
            setErrorModalMessage('Errore: lo slot potrebbe essere già prenotato.');
            setErrorModalOpen(true);
        }
    };
    const handleEliminaBlocco = async (bloccoId: number) => {
        if (!user) return;
        // Verifica pre-delete: consenti l'eliminazione se NON ci sono appuntamenti attivi (CONFERMATI) nel range del blocco.
        try {
            const blocco = blocchiOrario.find(b => b.id === bloccoId);
            if (!blocco) {
                setDeleteModalError('Blocco non trovato.');
                setDeleteModalOpen(true);
                return;
            }
            const inizio = new Date(`${blocco.data}T${blocco.oraInizio.length === 5 ? blocco.oraInizio + ':00' : blocco.oraInizio}`);
            const fine = new Date(`${blocco.data}T${blocco.oraFine.length === 5 ? blocco.oraFine + ':00' : blocco.oraFine}`);
            const hasAttivi = appuntamenti.some(a => a.stato === 'CONFERMATO' && new Date(a.dataEOraInizio) < fine && new Date(a.dataEOraFine) > inizio);
            if (hasAttivi) {
                setDeleteModalError('Non puoi eliminare questo blocco: ci sono appuntamenti attivi (confermati) nel suo intervallo. Annulla o sposta prima tali appuntamenti.');
                setDeleteModalOpen(true);
                return;
            }
            // Se ci sono COMPLETATI e il blocco non è ancora terminato, blocca
            const now = new Date();
            const hasCompletati = appuntamenti.some(a => a.stato === 'COMPLETATO' && new Date(a.dataEOraInizio) < fine && new Date(a.dataEOraFine) > inizio);
            if (hasCompletati && fine > now) {
                setDeleteModalError('Puoi eliminare blocchi con appuntamenti completati solo dopo la fine del blocco (orario già passato).');
                setDeleteModalOpen(true);
                return;
            }
        } catch (e) {
            console.error('Impossibile verificare gli appuntamenti del blocco prima della cancellazione:', e);
            setDeleteModalError('Controllo non riuscito. Riprova più tardi.');
            setDeleteModalOpen(true);
            return;
        }

        // Apri modal di conferma
        setPendingDeleteBloccoId(bloccoId);
        setDeleteModalError(null);
        setDeleteModalOpen(true);
    };

    const confirmDeleteBlocco = async () => {
        if (!user || pendingDeleteBloccoId == null) { setDeleteModalOpen(false); return; }
        try {
            await axios.delete(`${API_BASE_URL}/blocchi-orario/${pendingDeleteBloccoId}`, { headers: { Authorization: `Bearer ${user.token}` } });
            const wasOpen = bloccoAperto === pendingDeleteBloccoId;
            setBlocchiOrario(prev => prev.filter(b => b.id !== pendingDeleteBloccoId));
            if (wasOpen) { setBloccoAperto(null); setSlots([]); }
            setDeleteModalOpen(false);
            setPendingDeleteBloccoId(null);
        } catch (e: unknown) {
            const err = e as { response?: { data?: unknown } };
            const msg = err?.response?.data ?? 'Errore: impossibile eliminare il blocco (potrebbero esserci appuntamenti associati).';
            setDeleteModalError(typeof msg === 'string' ? msg : JSON.stringify(msg));
        }
    };
    const handleAnnullaAppuntamento = (appuntamentoId: number) => {
        if (!user) return;
        setAppIdToCancel(appuntamentoId);
        setAppCancelConfirmOpen(true);
    };
    const confirmAnnullaAppuntamento = async () => {
        if (!user || appIdToCancel == null) { setAppCancelConfirmOpen(false); return; }
        try {
            await axios.put(`${API_BASE_URL}/appuntamenti/medico/annulla/${appIdToCancel}`, null, { headers: { Authorization: `Bearer ${user.token}` } });
            setAppuntamenti(prev => prev.map(a => a.id === appIdToCancel ? { ...a, stato: 'ANNULLATO' } : a));
            setAppCancelConfirmOpen(false);
            setAppIdToCancel(null);
        } catch {
            setAppCancelConfirmOpen(false);
            setErrorModalMessage("Si è verificato un problema durante l'annullamento.");
            setErrorModalOpen(true);
        }
    };

    const openReschedule = async (app: Appuntamento) => {
        if (!user) return;
        setResTargetApp(app);
        setResModalOpen(true);
        setResLoading(true);
        setResError(null);
    setResAllSlots([]);
    setResSlots([]);
    setResSediOptions([]);
    setResSelectedSedeId(app.tipoAppuntamento === 'fisico' ? (app.sedeId ?? '') : '');
        try {
            const params: Record<string, string | number> = {
                prestazioneId: app.prestazione.id,
                medicoId: app.medico.id,
                limit: 30,
                fromDate: new Date().toISOString().slice(0,10),
            };
            const { data } = await axios.get<SlotLite[]>(`${API_BASE_URL}/slots/prossimi-disponibili`, { params });
            const now = new Date();
            const toIsoTime = (t: string | number) => {
                if (typeof t === 'number') return `${t.toString().padStart(2,'0')}:00:00`;
                const s = String(t);
                return /^\d{2}:\d{2}$/.test(s) ? `${s}:00` : s; // accept HH:mm or HH:mm:ss
            };
            const filtered = data.filter(s => s.slotId).filter(s => {
                const dt = new Date(`${s.data}T${toIsoTime(s.oraInizio)}`);
                return dt.getTime() > now.getTime();
            });
            setResAllSlots(filtered);
            const sediMap = new Map<number, string>();
            for (const s of filtered) {
                if (typeof s.sedeId === 'number') sediMap.set(s.sedeId, s.sedeNome || 'Sede');
            }
            setResSediOptions(Array.from(sediMap.entries()).map(([id, nome]) => ({ id, nome })));
            if (app.tipoAppuntamento === 'fisico' && app.sedeId) setResSlots(filtered.filter(s => s.sedeId === app.sedeId));
            else setResSlots(filtered);
        } catch (e: unknown) {
            const msg = (e as { response?: { data?: unknown } })?.response?.data;
            setResError(typeof msg === 'string' ? msg : 'Impossibile caricare le disponibilità.');
        } finally {
            setResLoading(false);
        }
    };
    const applySedeFilter = (sedeId: number | '') => {
        setResSelectedSedeId(sedeId);
        if (sedeId === '') { setResSlots(resAllSlots); return; }
        setResSlots(resAllSlots.filter(s => s.sedeId === sedeId));
    };
    const doReschedule = async (slotId: number) => {
        if (!user || !resTargetApp) return;
        try {
            await axios.put(`${API_BASE_URL}/appuntamenti/${resTargetApp.id}/sposta`, { slotId }, { headers: { Authorization: `Bearer ${user.token}` } });
            // Refresh appointments list
            const medicoId = user.medicoId;
            const { data } = await axios.get(`${API_BASE_URL}/appuntamenti/medico/${medicoId}`, { headers: { Authorization: `Bearer ${user.token}` } });
            setAppuntamenti(data);
            setResModalOpen(false);
            setResTargetApp(null);
            setResSuccessOpen(true);
        } catch (e: unknown) {
            const msg = (e as { response?: { data?: unknown } })?.response?.data;
            const raw = typeof msg === 'string' ? msg : 'Impossibile spostare: lo slot potrebbe non essere più disponibile.';
            let friendly = raw;
            if (/massimo di 2 volte/i.test(raw) || /numero massimo di 2/i.test(raw)) {
                friendly = 'Il paziente ha raggiunto il numero massimo di 2 spostamenti per questo appuntamento.';
            } else if (/24\s*ore/i.test(raw) || /24h/i.test(raw)) {
                friendly = "Non è possibile spostare l'appuntamento nelle 24 ore precedenti all'orario previsto (regola lato paziente).";
            }
            setResError(friendly);
        }
    };

    const openPatientInfo = (p: Paziente) => {
        setPatientTarget(p);
        setPatientModalOpen(true);
    };

    const openDocs = async (app: Appuntamento) => {
        if (!user) return;
        setDocTargetApp(app);
        setDocModalOpen(true);
        setDocLoading(true);
        setDocList([]);
        try {
            const { data } = await axios.get(`${API_BASE_URL}/appuntamenti/${app.id}/documenti`, { headers: { Authorization: `Bearer ${user.token}` } });
            setDocList(data);
        } catch {
            setDocList([]);
        } finally { setDocLoading(false); }
    };

    // Filtro blocchi: aggiunte opzioni 'tutti' e 'settimana prossima'
    type BlocchiPreset = 'tutti' | 'oggi' | 'settimana' | 'settimana-prossima' | 'mese' | 'prossimo-mese';
    const [blocchiPreset, setBlocchiPreset] = useState<BlocchiPreset>('settimana');

    const renderStatusBadge = (stato: 'CONFERMATO' | 'COMPLETATO' | 'ANNULLATO') => {
        const map: Record<string, { cls: string; label: string }> = {
            CONFERMATO: { cls: 'success', label: 'confermato' },
            COMPLETATO: { cls: 'secondary', label: 'completato' },
            ANNULLATO: { cls: 'danger', label: 'annullato' },
        };
        const cfg = map[stato] ?? map.CONFERMATO;
        return <span className={`status-chip ${cfg.cls}`}><span className="status-label">{cfg.label}</span></span>;
    };

    if (loading) return <div className="text-center mt-5"><h3>Caricamento...</h3></div>;
    if (error) return <div className="alert alert-danger mt-5">{error}</div>;

    return (
        <div className="container my-5">
            <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
                <h1 className="mb-0">La tua dashboard</h1>
                <div className="d-flex align-items-center gap-2">
                    <Form.Select size="sm" style={{maxWidth: 260}}
                        value={sedeFilterId}
                        onChange={(e) => setSedeFilterId(e.target.value ? Number(e.target.value) : '')}
                    >
                        <option value="">Tutte le sedi</option>
                        {sedi.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                    </Form.Select>
                    
                </div>
            </div>

            <div className="row">
                <div className="col-lg-5 mb-4">
                    <div className="card shadow-sm h-100">
                        <div className="card-body text-center d-flex flex-column align-items-center justify-content-center">
                            <h4 className="card-title">Il tuo profilo</h4>
                            {(() => {
                                const url = buildPhotoUrl(profile);
                                if (url) return <img src={url} alt="Foto profilo" className="md-avatar-photo mt-3" />;
                                return <div className="md-avatar-circle mt-3">{getInitials(profile?.nome, profile?.cognome)}</div>;
                            })()}
                            {profile && <p className="lead mt-3 mb-1">{profile.nome} {profile.cognome}</p>}
                            {profile && <p className="text-muted mb-0">{profile.email}</p>}
                            <Link to="/medico/create-blocco-orario" className="btn btn-primary mt-3 align-self-center w-auto px-3">Pianifica orari</Link>
                        </div>
                    </div>
                </div>

                <div className="col-lg-7 mb-4">
                    <div className="card shadow-sm h-100">
                        <div className="card-body">
                            <div className="d-flex justify-content-between align-items-center">
                                <h4 className="card-title mb-0">Appuntamenti in agenda</h4>
                                {(() => {
                                    const attiviCount = appuntamenti.filter(a => a.stato === 'CONFERMATO').length;
                                    const storiciCount = appuntamenti.length - attiviCount;
                                    return (
                                        <div className="d-flex align-items-center gap-2">
                                            <span className="badge text-bg-success">In agenda: {attiviCount}</span>
                                                                    <button
                                                                        type="button"
                                                                        className="btn btn-sm btn-outline-secondary"
                                                                        onClick={() => { setStoricoPage(1); setShowStoricoModal(true); }}
                                                                        title="Mostra storico"
                                                                    >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16" aria-hidden>
                                                    <path d="M8 3.5a.5.5 0 0 1 .5.5v4l3 1.5a.5.5 0 1 1-.5.866l-3.5-1.75A.5.5 0 0 1 7 8V4a.5.5 0 0 1 .5-.5" />
                                                    <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16m0-1A7 7 0 1 1 8 1a7 7 0 0 1 0 14" />
                                                </svg>
                                                <span className="ms-1">Storico {storiciCount > 0 ? `(${storiciCount})` : ''}</span>
                                            </button>
                                        </div>
                                    );
                                })()}
                            </div>

                            {(() => {
                                const attivi = appuntamenti.filter(a => a.stato === 'CONFERMATO').sort((a, b) => new Date(a.dataEOraInizio).getTime() - new Date(b.dataEOraInizio).getTime());
                                return (
                                    <>
                                        {attivi.length > 0 ? (
                                            <ul className="list-group list-group-flush mt-3">
                                                {attivi.map(app => (
                                                    <li key={app.id} className="list-group-item">
                                                        <div className="d-flex w-100 justify-content-between">
                                                            <div>
                                                                <strong>{new Date(app.dataEOraInizio).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}</strong> alle <strong>{fmtTime(new Date(app.dataEOraInizio))}</strong>
                                                                <br /><small className="text-muted">Paziente: <button type="button" className="btn btn-link btn-sm p-0 align-baseline" onClick={() => openPatientInfo(app.paziente)}>{app.paziente.nome} {app.paziente.cognome}</button></small>
                                                                <br /><small className="text-muted">Prestazione: {app.prestazione.nome}</small>
                                                                {app.tipoAppuntamento === 'virtuale' && buildVideoUrl(app.linkVideocall) && (
                                                                    <>
                                                                        <br /><small className="text-muted">Videoconsulto: </small>
                                                                        <a href={buildVideoUrl(app.linkVideocall)!} target="_blank" rel="noopener noreferrer" className="small">{buildVideoUrl(app.linkVideocall)}</a>
                                                                    </>
                                                                )}
                                                                {app.tipoAppuntamento === 'fisico' && (
                                                                    <>
                                                                        <br />
                                                                        <small className="text-muted">
                                                                            {app.sedeNome ? (
                                                                                <>Sede: {app.sedeNome}{app.sedeIndirizzo ? ` — ${app.sedeIndirizzo}` : ''}{app.sedeCap || app.sedeCitta || app.sedeProvincia ? `, ${[app.sedeCap, app.sedeCitta, app.sedeProvincia && `(${app.sedeProvincia})`].filter(Boolean).join(' ')}` : ''}</>
                                                                            ) : 'Sede: —'}
                                                                        </small>
                                                                    </>
                                                                )}
                                                            </div>
                                                            {renderStatusBadge(app.stato)}
                                                        </div>
                                                        <div className="mt-2 d-flex gap-2 flex-wrap">
                                                            {app.tipoAppuntamento === 'virtuale' && buildVideoUrl(app.linkVideocall) && (
                                                                <a href={buildVideoUrl(app.linkVideocall)!} target="_blank" rel="noopener noreferrer" className="btn btn-success btn-sm" title="Apri videoconsulto">
                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16" aria-hidden className="me-1">
                                                                        <path d="M0 5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v.5l3.146-1.573A1 1 0 0 1 16 4.846v6.308a1 1 0 0 1-1.854.919L11 10.5V11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2z" />
                                                                    </svg>
                                                                    Videoconsulto
                                                                </a>
                                                            )}
                                                            {app.tipoAppuntamento === 'virtuale' && (
                                                                <button className="btn btn-outline-secondary btn-sm" onClick={() => openDocs(app)}>Documenti</button>
                                                            )}
                                                            {app.tipoAppuntamento === 'fisico' && (
                                                                <span className="badge text-bg-light align-self-center">
                                                                    {app.sedeNome || 'Sede —'}
                                                                </span>
                                                            )}
                                                            <button className="btn btn-danger btn-sm" onClick={() => handleAnnullaAppuntamento(app.id)}>Annulla</button>
                                                            {app.stato === 'CONFERMATO' && (
                                                                <button className="btn btn-outline-primary btn-sm" onClick={() => openReschedule(app)}>Sposta</button>
                                                            )}
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <div className="alert alert-info text-center mt-3">Nessun appuntamento attivo.</div>
                                        )}
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            </div>

            <div className="card shadow-sm">
                <div className="card-header">
                    <h4 className="card-title text-center mb-0">I tuoi Blocchi Orario Futuri</h4>
                </div>
                <div className="card-body">
                    {(() => {
                        if (blocchiOrario.length === 0) return <p className="text-center mt-3">Nessun blocco orario impostato.</p>;

                        const now = new Date();
                        const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
                        const endOfWeek = (() => {
                            const d = new Date(startToday);
                            const day = (d.getDay() + 6) % 7; // lun=0..dom=6
                            const startMonday = new Date(d);
                            startMonday.setDate(d.getDate() - day);
                            const endSunday = new Date(startMonday);
                            endSunday.setDate(startMonday.getDate() + 6);
                            endSunday.setHours(23, 59, 59, 999);
                            return endSunday;
                        })();
                        const nextWeekStart = (() => {
                            const d = new Date(startToday);
                            const day = (d.getDay() + 6) % 7; // 0..6
                            const nextMon = new Date(d);
                            nextMon.setDate(d.getDate() - day + 7);
                            nextMon.setHours(0, 0, 0, 0);
                            return nextMon;
                        })();
                        const nextWeekEnd = (() => {
                            const e = new Date(nextWeekStart);
                            e.setDate(nextWeekStart.getDate() + 6);
                            e.setHours(23, 59, 59, 999);
                            return e;
                        })();
                        const endOfMonth = new Date(startToday.getFullYear(), startToday.getMonth() + 1, 0, 23, 59, 59, 999);
                        const startOfNextMonth = new Date(startToday.getFullYear(), startToday.getMonth() + 1, 1, 0, 0, 0, 0);
                        const endOfNextMonth = new Date(startToday.getFullYear(), startToday.getMonth() + 2, 0, 23, 59, 59, 999);

                        // Solo blocchi futuri (>= oggi)
                        let futuri = blocchiOrario.filter(b => new Date(b.data + 'T00:00:00').getTime() >= startToday.getTime());
                        if (blocchiPreset === 'oggi') {
                            futuri = futuri.filter(b => {
                                const d = new Date(b.data + 'T00:00:00');
                                return d.getFullYear() === startToday.getFullYear() && d.getMonth() === startToday.getMonth() && d.getDate() === startToday.getDate();
                            });
                        } else if (blocchiPreset === 'settimana') {
                            futuri = futuri.filter(b => new Date(b.data + 'T00:00:00').getTime() <= endOfWeek.getTime());
                        } else if (blocchiPreset === 'settimana-prossima') {
                            futuri = futuri.filter(b => {
                                const d = new Date(b.data + 'T00:00:00').getTime();
                                return d >= nextWeekStart.getTime() && d <= nextWeekEnd.getTime();
                            });
                        } else if (blocchiPreset === 'mese') {
                            futuri = futuri.filter(b => new Date(b.data + 'T00:00:00').getTime() <= endOfMonth.getTime());
                        } else if (blocchiPreset === 'prossimo-mese') {
                            futuri = futuri.filter(b => {
                                const d = new Date(b.data + 'T00:00:00').getTime();
                                return d >= startOfNextMonth.getTime() && d <= endOfNextMonth.getTime();
                            });
                        } // 'tutti' => nessun filtro addizionale

                        const toMinutes = (hhmm: string) => {
                            const [h, m] = hhmm.split(':').map(Number); return (h || 0) * 60 + (m || 0);
                        };
                        futuri.sort((a, b) => {
                            const da = new Date(a.data + 'T00:00:00');
                            const db = new Date(b.data + 'T00:00:00');
                            if (da.getTime() !== db.getTime()) return da.getTime() - db.getTime();
                            return toMinutes(a.oraInizio) - toMinutes(b.oraInizio);
                        });

                        return (
                            <>
                                <div className="d-flex align-items-center gap-2 mb-2">
                                    <label className="form-label mb-0">Visualizza</label>
                                    <select className="form-select form-select-sm" style={{ maxWidth: 320 }} value={blocchiPreset} onChange={(e) => setBlocchiPreset(e.target.value as BlocchiPreset)}>
                                        <option value="tutti">Tutti</option>
                                        <option value="oggi">Solo oggi</option>
                                        <option value="settimana">Questa settimana</option>
                                        <option value="settimana-prossima">Settimana prossima</option>
                                        <option value="mese">Questo mese</option>
                                        <option value="prossimo-mese">Prossimo mese</option>
                                    </select>
                                    <div className="ms-auto small text-muted">{futuri.length} blocco/i</div>
                                </div>
                                {futuri.length > 0 ? (() => {
                                    const groups = futuri.reduce((acc, b) => { (acc[b.data] ||= []).push(b); return acc; }, {} as Record<string, BloccoOrario[]>);
                                    const orderedDates = Array.from(new Set(futuri.map(b => b.data)));
                                    return (
                                        <ul className="list-group list-group-flush">
                                            {orderedDates.map(dateKey => {
                                                const blocks = [...groups[dateKey]].sort((a, b) => a.oraInizio.localeCompare(b.oraInizio));
                                                const dateLabel = new Date(dateKey + 'T00:00:00').toLocaleDateString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                                                return (
                                                    <li key={dateKey} className="list-group-item">
                                                        <div className="d-flex justify-content-between align-items-start">
                                                            <div className="w-100">
                                                                <strong>{dateLabel}</strong>
                                                                {/* RIMOSSA lista prestazioni globale per data per evitare confusione */}
                                                                {blocks.map(b => (
                                                                    <div key={b.id} className="mt-3">
                                                                        <div className="d-flex align-items-center gap-2 flex-wrap">
                                                                            <span className="badge bg-light text-dark border">{fmtHM(b.oraInizio)}–{fmtHM(b.oraFine)}</span>
                                                                            {(() => {
                                                                                // Prestazioni per singolo blocco
                                                                                const ids = b.prestazioneIds;
                                                                                const selected = (!ids || ids.length === 0)
                                                                                    ? prestazioniMedico
                                                                                    : prestazioniMedico.filter(p => ids.includes(p.id));
                                                                                const isAll = selected.length === prestazioniMedico.length;
                                                                                if (isAll) {
                                                                                    return <span className="badge bg-secondary">Tutte le prestazioni</span>;
                                                                                }
                                                                                // Mostra i nomi selezionati (limita a 6 badge max per leggibilità)
                                                                                const max = 6;
                                                                                const head = selected.slice(0, max);
                                                                                const rest = selected.length - head.length;
                                                                                return (
                                                                                    <div className="d-flex flex-wrap gap-1">
                                                                                        {head.map(p => (
                                                                                            <span key={p.id} className="badge bg-light text-dark border">{p.nome}</span>
                                                                                        ))}
                                                                                        {rest > 0 && (
                                                                                            <span className="badge text-bg-light">+{rest}</span>
                                                                                        )}
                                                                                    </div>
                                                                                );
                                                                            })()}
                                                                            {(() => {
                                                                                // Badge tipo blocco: Solo virtuali / Solo fisiche / Miste
                                                                                const ids = b.prestazioneIds;
                                                                                const selected = (!ids || ids.length === 0)
                                                                                    ? prestazioniMedico
                                                                                    : prestazioniMedico.filter(p => ids.includes(p.id));
                                                                                if (!selected || selected.length === 0) return null;
                                                                                const allVirtual = selected.every(p => p.tipoPrestazione === 'virtuale');
                                                                                const allFisico = selected.every(p => (p.tipoPrestazione ?? 'fisico') === 'fisico');
                                                                                const label = allVirtual ? 'Solo virtuali' : allFisico ? 'Solo fisiche' : 'Miste';
                                                                                const cls = allVirtual ? 'text-bg-success' : allFisico ? 'text-bg-primary' : 'text-bg-warning';
                                                                                return <span className={`badge ${cls}`}>{label}</span>;
                                                                            })()}
                                                                            {b.createdByName && (
                                                                                <span className="badge text-bg-secondary">Inserito da: {b.createdByName}{b.createdByType ? ` (${b.createdByType === 'COLLABORATORE' ? 'collaboratore' : 'medico'})` : ''}</span>
                                                                            )}
                                                                            <button className="btn btn-outline-primary btn-sm" onClick={() => handleApriChiudiSlot(b.id)}>
                                                                                {bloccoAperto === b.id ? 'Nascondi slot' : 'Gestisci slot'}
                                                                            </button>
                                                                            {isBloccoDeletable(b) && (
                                                                                <button className="btn btn-outline-danger btn-sm" onClick={() => handleEliminaBlocco(b.id)}>Elimina</button>
                                                                            )}
                                                                        </div>
                                                                        {bloccoAperto === b.id && (
                                                                            <div className="mt-2 border rounded p-2 bg-light">
                                                                                {slotsLoading && <div className="small text-muted">Caricamento slot…</div>}
                                                                                {slotsError && <div className="text-danger small">{slotsError}</div>}
                                                                                {!slotsLoading && !slotsError && (
                                                                                    slots.length > 0 ? (
                                                                                        <ul className="list-group list-group-flush">
                                                                                            {slots.map(s => (
                                                                                                <li key={s.id} className="list-group-item d-flex justify-content-between align-items-center">
                                                                                                    <div>
                                                                                                        <strong>{fmtTime(new Date(s.dataEOraInizio))} - {fmtTime(new Date(s.dataEOraFine))}</strong>
                                                                                                        <span className={`ms-2 badge ${s.stato === 'DISPONIBILE' ? 'text-bg-success' : 'text-bg-secondary'}`}>{s.stato.toLowerCase()}</span>
                                                                                                    </div>
                                                                                                    <div className="d-flex gap-2">
                                                                                                        <button className="btn btn-sm btn-outline-secondary" onClick={() => handleToggleSlot(s.id)} disabled={s.stato === 'OCCUPATO'}>
                                                                                                            {s.stato === 'DISPONIBILE' ? 'Disabilita' : 'Abilita'}
                                                                                                        </button>
                                                                                                        <button className="btn btn-sm btn-outline-danger" onClick={() => openEliminaSlotConfirm(s.id)} disabled={s.stato === 'OCCUPATO'}>Elimina</button>
                                                                                                    </div>
                                                                                                </li>
                                                                                            ))}
                                                                                        </ul>
                                                                                    ) : (
                                                                                        <div className="small">Nessuno slot trovato per questo blocco.</div>
                                                                                    )
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    );
                                })() : (
                                    <div className="text-center text-muted mt-3">Nessun blocco nel periodo selezionato.</div>
                                )}
                            </>
                        );
                    })()}
                </div>
            </div>

                    {/* Modale: Storico appuntamenti */}
                    <Modal show={showStoricoModal} onHide={() => setShowStoricoModal(false)} centered size="lg" scrollable>
                        <Modal.Header closeButton>
                            <Modal.Title>Storico appuntamenti</Modal.Title>
                        </Modal.Header>
                        <Modal.Body>
                            <div className="d-flex flex-wrap gap-2 align-items-center mb-3">
                                <div className="d-flex align-items-center gap-2">
                                    <label className="form-label mb-0">Periodo</label>
                                    <select
                                        className="form-select form-select-sm"
                                        value={storicoPreset}
                                        onChange={(e) => { setStoricoPreset(e.target.value as PresetType); setStoricoPage(1); }}
                                    >
                                        <option value="all">Tutto</option>
                                        <option value="week">Questa settimana</option>
                                        <option value="month">Questo mese</option>
                                        <option value="year">Quest'anno</option>
                                    </select>
                                </div>
                                <div className="ms-auto" style={{ minWidth: 240 }}>
                                    <div className="input-group input-group-sm">
                                        <span className="input-group-text" id="basic-addon1" title="Cerca paziente">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
                                                <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85Zm-5.242 1.156a5 5 0 1 1 0-10 5 5 0 0 1 0 10"/>
                                            </svg>
                                        </span>
                                        <input type="text" className="form-control" placeholder="Cerca paziente…" value={storicoSearch} onChange={e => { setStoricoSearch(e.target.value); setStoricoPage(1); }} />
                                        {storicoSearch && (
                                            <button className="btn btn-outline-secondary" onClick={() => { setStoricoSearch(''); setStoricoPage(1); }} title="Pulisci">×</button>
                                        )}
                                    </div>
                                </div>
                            </div>
                            {(() => {
                                // Base: appuntamenti non confermati (storico)
                                let storici = appuntamenti
                                    .filter(app => app.stato !== 'CONFERMATO')
                                    .sort((a, b) => new Date(b.dataEOraInizio).getTime() - new Date(a.dataEOraInizio).getTime());

                                // Filtro periodo
                                const now = new Date();
                                let startDate: Date | null = null;
                                let endDate: Date | null = null;
                                if (storicoPreset === 'week') {
                                    const d = new Date(now);
                                    const day = (d.getDay() + 6) % 7; // lun=0..dom=6
                                    startDate = new Date(d);
                                    startDate.setDate(d.getDate() - day);
                                    startDate.setHours(0, 0, 0, 0);
                                    endDate = new Date(startDate);
                                    endDate.setDate(startDate.getDate() + 6);
                                    endDate.setHours(23, 59, 59, 999);
                                } else if (storicoPreset === 'month') {
                                    startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
                                    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
                                } else if (storicoPreset === 'year') {
                                    startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
                                    endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
                                }
                                if (startDate && endDate) {
                                    storici = storici.filter(app => {
                                        const t = new Date(app.dataEOraInizio).getTime();
                                        return t >= startDate!.getTime() && t <= endDate!.getTime();
                                    });
                                }

                                // Filtro ricerca paziente
                                if (storicoSearch.trim()) {
                                    const q = storicoSearch.trim().toLowerCase();
                                    storici = storici.filter(app => `${app.paziente.nome} ${app.paziente.cognome}`.toLowerCase().includes(q));
                                }

                                if (storici.length === 0) return <div className="text-muted">Nessun appuntamento nello storico.</div>;

                                const pageCount = Math.max(1, Math.ceil(storici.length / pageSize));
                                const startIndex = (storicoPage - 1) * pageSize;
                                const endIndex = Math.min(startIndex + pageSize, storici.length);
                                const slice = storici.slice(startIndex, endIndex);
                                return (
                                    <>
                                        <div className="d-flex justify-content-between align-items-center mb-2">
                                            <small className="text-muted">Mostrando {startIndex + 1}-{endIndex} di {storici.length}</small>
                                            <div className="btn-group btn-group-sm" role="group" aria-label="Paginazione storico">
                                                <button className="btn btn-outline-secondary" disabled={storicoPage <= 1} onClick={() => setStoricoPage(p => Math.max(1, p - 1))}>«</button>
                                                <button className="btn btn-outline-secondary disabled">Pagina {storicoPage} / {pageCount}</button>
                                                <button className="btn btn-outline-secondary" disabled={storicoPage >= pageCount} onClick={() => setStoricoPage(p => Math.min(pageCount, p + 1))}>»</button>
                                            </div>
                                        </div>
                                        <ul className="list-group list-group-flush">
                                            {slice.map(app => (
                                                <li key={app.id} className="list-group-item">
                                                    <div className="d-flex w-100 justify-content-between">
                                                        <div>
                                                            <strong>{new Date(app.dataEOraInizio).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}</strong>
                                                            {' alle '}<strong>{new Date(app.dataEOraInizio).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</strong>
                                                            <br /><small className="text-muted">Paziente: <button type="button" className="btn btn-link btn-sm p-0 align-baseline" onClick={() => openPatientInfo(app.paziente)}>{app.paziente.nome} {app.paziente.cognome}</button></small>
                                                            <br /><small className="text-muted">Prestazione: {app.prestazione.nome}</small>
                                                        </div>
                                                        <div className="d-flex flex-column align-items-end gap-2">
                                                            {renderStatusBadge(app.stato)}
                                                        </div>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    </>
                                );
                            })()}
                        </Modal.Body>
                        <Modal.Footer>
                            <Button variant="secondary" onClick={() => setShowStoricoModal(false)}>Chiudi</Button>
                        </Modal.Footer>
                    </Modal>

                            {/* Modal conferma/errore eliminazione blocco */}
                            <Modal show={deleteModalOpen} onHide={() => { setDeleteModalOpen(false); setPendingDeleteBloccoId(null); setDeleteModalError(null); }} centered>
                                <Modal.Header closeButton>
                                    <Modal.Title>{deleteModalError ? 'Operazione non possibile' : 'Eliminare questo blocco?'}</Modal.Title>
                                </Modal.Header>
                                <Modal.Body>
                                    {deleteModalError ? (
                                        <div className="alert alert-danger mb-0" role="alert">{deleteModalError}</div>
                                    ) : (
                                        <p className="mb-0">Questa azione rimuoverà il blocco e tutti gli slot liberi associati. Procedere?</p>
                                    )}
                                </Modal.Body>
                                <Modal.Footer>
                                    {deleteModalError ? (
                                        <Button variant="secondary" onClick={() => { setDeleteModalOpen(false); setDeleteModalError(null); setPendingDeleteBloccoId(null); }}>Chiudi</Button>
                                    ) : (
                                        <>
                                            <Button variant="secondary" onClick={() => { setDeleteModalOpen(false); setPendingDeleteBloccoId(null); }}>Annulla</Button>
                                            <Button variant="danger" onClick={confirmDeleteBlocco}>Elimina</Button>
                                        </>
                                    )}
                                </Modal.Footer>
                            </Modal>
                            {/* Modal documenti appuntamento (solo lettura) */}
                            <DocsModal
                                open={docModalOpen}
                                onClose={() => setDocModalOpen(false)}
                                app={docTargetApp}
                                list={docList}
                                loading={docLoading}
                                token={user?.token}
                            />
                            {/* Modal informazioni paziente */}
                            <PatientInfoModal
                                open={patientModalOpen}
                                onClose={() => setPatientModalOpen(false)}
                                paziente={patientTarget}
                            />
                            {/* Modal spostamento appuntamento */}
                            <Modal show={resModalOpen} onHide={() => setResModalOpen(false)} centered>
                                <Modal.Header closeButton>
                                    <Modal.Title>Sposta appuntamento</Modal.Title>
                                </Modal.Header>
                                <Modal.Body>
                                    {(() => { /* helper scope for formatting */ return null; })()}
                                    {resTargetApp?.tipoAppuntamento === 'fisico' && (
                                        <div className="mb-3">
                                            <label className="form-label">Sede</label>
                                            <select className="form-select" value={resSelectedSedeId === '' ? '' : resSelectedSedeId}
                                                onChange={(e) => applySedeFilter(e.target.value ? Number(e.target.value) : '')}>
                                                <option value="">Tutte le sedi</option>
                                                {resSediOptions.map(s => (
                                                    <option key={s.id} value={s.id}>{s.nome || `Sede ${s.id}`}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                     {resLoading ? <div>Caricamento disponibilità…</div> : resError ? <div className="alert alert-danger">{resError}</div> : (
                                        resSlots.length === 0 ? <div className="text-muted">Nessuno slot disponibile.</div> : (
                                            <ul className="list-group">
                                                {resSlots.map((s, idx) => (
                                                    <li key={idx} className="list-group-item d-flex justify-content-between align-items-center">
                                                        <div>
                                                            {(() => {
                                                                const fmtIso = (t: string | number) => {
                                                                    if (typeof t === 'number') return `${t.toString().padStart(2,'0')}:00:00`;
                                                                    const ss = String(t);
                                                                    return /^\d{2}:\d{2}$/.test(ss) ? `${ss}:00` : ss;
                                                                };
                                                                const iso = fmtIso(s.oraInizio);
                                                                return (
                                                                    <div><strong>{new Date(`${s.data}T${iso}`).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}</strong> alle <strong>{iso.slice(0,5)}</strong></div>
                                                                );
                                                            })()}
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
                                    <Button variant="secondary" onClick={() => setResModalOpen(false)}>Chiudi</Button>
                                </Modal.Footer>
                            </Modal>
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

                            {/* Modal errore generico */}
                            <Modal show={errorModalOpen} onHide={() => setErrorModalOpen(false)} centered>
                                <Modal.Header closeButton>
                                    <Modal.Title>Errore</Modal.Title>
                                </Modal.Header>
                                <Modal.Body>
                                    {errorModalMessage || 'Si è verificato un errore inatteso.'}
                                </Modal.Body>
                                <Modal.Footer>
                                    <Button variant="secondary" onClick={() => setErrorModalOpen(false)}>Chiudi</Button>
                                </Modal.Footer>
                            </Modal>

                            {/* Conferma eliminazione slot */}
                            <Modal show={slotDeleteConfirmOpen} onHide={() => setSlotDeleteConfirmOpen(false)} centered>
                                <Modal.Header closeButton>
                                    <Modal.Title>Elimina slot</Modal.Title>
                                </Modal.Header>
                                <Modal.Body>
                                    Eliminare questo slot?
                                </Modal.Body>
                                <Modal.Footer>
                                    <Button variant="secondary" onClick={() => setSlotDeleteConfirmOpen(false)}>Annulla</Button>
                                    <Button variant="danger" onClick={confirmEliminaSlot}>Elimina</Button>
                                </Modal.Footer>
                            </Modal>

                            {/* Conferma annullamento appuntamento */}
                            <Modal show={appCancelConfirmOpen} onHide={() => setAppCancelConfirmOpen(false)} centered>
                                <Modal.Header closeButton>
                                    <Modal.Title>Annulla appuntamento</Modal.Title>
                                </Modal.Header>
                                <Modal.Body>
                                    Vuoi annullare questo appuntamento?
                                </Modal.Body>
                                <Modal.Footer>
                                    <Button variant="secondary" onClick={() => setAppCancelConfirmOpen(false)}>Indietro</Button>
                                    <Button variant="danger" onClick={confirmAnnullaAppuntamento}>Annulla appuntamento</Button>
                                </Modal.Footer>
                            </Modal>
        </div>
    );
};

const DocsModal = ({ open, onClose, app, list, loading, token }:
    { open: boolean; onClose: () => void; app: Appuntamento | null; list: DocItem[]; loading: boolean; token?: string | null }) => {
    const [docErrorOpen, setDocErrorOpen] = useState(false);
    const [docErrorMessage, setDocErrorMessage] = useState('');
    const handleDownload = async (docId: number, filename: string) => {
        if (!app || !token) return;
        try {
            const res = await axios.get(`${API_BASE_URL}/appuntamenti/${app.id}/documenti/${docId}`, {
                headers: { Authorization: `Bearer ${token}` },
                responseType: 'blob',
            });
            const blobUrl = URL.createObjectURL(res.data);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = filename || 'documento';
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(blobUrl);
        } catch {
            setDocErrorMessage('Impossibile scaricare il documento.');
            setDocErrorOpen(true);
        }
    };
    return (
        <Modal show={open} onHide={onClose} centered>
            <Modal.Header closeButton>
                <Modal.Title>
                    Documenti del paziente
                    {app && (
                        <span className={`badge ms-2 ${app.privacyConsenso ? 'text-bg-success' : 'text-bg-secondary'}`} title="Consenso privacy per documenti">
                            {app.privacyConsenso ? 'Consenso privacy: Sì' : 'Consenso privacy: No'}
                        </span>
                    )}
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {loading ? <div>Caricamento…</div> : (!list || list.length === 0 ? (
                    <div className="text-muted">Nessun documento</div>
                ) : (
                    <ul className="list-group">
                        {list.map(d => (
                            <li key={d.id} className="list-group-item d-flex justify-content-between align-items-center">
                                <span>{d.originalName}</span>
                                <button className="btn btn-sm btn-outline-primary" onClick={() => handleDownload(d.id, d.originalName)}>Scarica</button>
                            </li>
                        ))}
                    </ul>
                ))}
                <Modal show={docErrorOpen} onHide={() => setDocErrorOpen(false)} centered>
                    <Modal.Header closeButton>
                        <Modal.Title>Errore</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>{docErrorMessage || 'Operazione non riuscita.'}</Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setDocErrorOpen(false)}>Chiudi</Button>
                    </Modal.Footer>
                </Modal>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={onClose}>Chiudi</Button>
            </Modal.Footer>
        </Modal>
    );
};

export default MedicoDashboard;

const FieldRow = ({ label, value }: { label: string; value?: string | null }) => (
    <div className="row mb-2">
        <div className="col-4 text-muted">{label}</div>
        <div className="col-8">{value && value.trim() ? value : '—'}</div>
    </div>
);

const PatientInfoModal = ({ open, onClose, paziente }: { open: boolean; onClose: () => void; paziente: Paziente | null }) => (
    <Modal show={open} onHide={onClose} centered>
        <Modal.Header closeButton>
            <Modal.Title>Dettagli paziente</Modal.Title>
        </Modal.Header>
        <Modal.Body>
            {!paziente ? (
                <div className="text-muted">Nessun paziente selezionato.</div>
            ) : (
                <div>
                    <div className="mb-3"><strong>{paziente.nome} {paziente.cognome}</strong></div>
                    <FieldRow label="Codice Fiscale" value={paziente.codiceFiscale} />
                    <FieldRow label="Email" value={paziente.email} />
                    <FieldRow label="Telefono" value={paziente.telefono} />
                    <FieldRow label="Data di nascita" value={paziente.dataNascita ? new Date(paziente.dataNascita).toLocaleDateString('it-IT') : undefined} />
                    <FieldRow label="Indirizzo" value={paziente.indirizzo} />
                    <FieldRow label="Città" value={paziente.citta} />
                    <FieldRow label="Provincia" value={paziente.provincia} />
                    <FieldRow label="CAP" value={paziente.cap} />
                </div>
            )}
        </Modal.Body>
        <Modal.Footer>
            <Button variant="secondary" onClick={onClose}>Chiudi</Button>
        </Modal.Footer>
    </Modal>
);
