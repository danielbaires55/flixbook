import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Modal, Button } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import { useAuth } from '../context/useAuth';
import './css/MedicoDashboard.css';

// --- Interfacce ---
interface Medico { id: number; nome: string; cognome: string; email: string; imgProfUrl?: string; imgUrl?: string }
interface Paziente { id: number; nome: string; cognome: string }
interface Prestazione { id: number; nome: string; costo: number }
interface BloccoOrario {
    id: number;
    data: string;
    oraInizio: string;
    oraFine: string;
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
}

const API_BASE_URL = 'http://localhost:8080/api';
const SERVER_BASE_URL = API_BASE_URL.replace(/\/api$/, '');

const MedicoDashboard = () => {
    const { user } = useAuth();

    const [profile, setProfile] = useState<Medico | null>(null);
    const [appuntamenti, setAppuntamenti] = useState<Appuntamento[]>([]);
    const [blocchiOrario, setBlocchiOrario] = useState<BloccoOrario[]>([]);
    const [prestazioniMedico, setPrestazioniMedico] = useState<Prestazione[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [bloccoAperto, setBloccoAperto] = useState<number | null>(null);
    const [slots, setSlots] = useState<SlotItem[]>([]);
    const [slotsLoading, setSlotsLoading] = useState(false);
    const [slotsError, setSlotsError] = useState<string | null>(null);

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

    useEffect(() => {
        if (!user || !user.medicoId) { setLoading(false); return; }
        const headers = { Authorization: `Bearer ${user.token}` };
        const medicoId = user.medicoId;
        const fetchAll = async () => {
            try {
                setLoading(true);
                setError(null);
                const [p, a, b, pr] = await Promise.all([
                    axios.get(`${API_BASE_URL}/medici/profile`, { headers }),
                    axios.get(`${API_BASE_URL}/appuntamenti/medico/${medicoId}`, { headers }),
                    axios.get(`${API_BASE_URL}/blocchi-orario/medico/${medicoId}`, { headers }),
                    axios.get(`${API_BASE_URL}/prestazioni/by-medico-loggato`, { headers }),
                ]);
                setProfile(p.data);
                setAppuntamenti(a.data);
                setBlocchiOrario(b.data);
                setPrestazioniMedico(pr.data);
            } catch (e) {
                console.error('Errore nel recupero dei dati:', e);
                setError('Impossibile caricare i dati.');
            } finally {
                setLoading(false);
            }
        };
        fetchAll();
    }, [user]);

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
            alert('Errore nel modificare lo slot.');
        }
    };
    const handleEliminaSlot = async (slotId: number) => {
        if (!user) return;
        if (!window.confirm('Eliminare questo slot?')) return;
        try {
            await axios.delete(`${API_BASE_URL}/slots/${slotId}`, { headers: { Authorization: `Bearer ${user.token}` } });
            setSlots(prev => prev.filter(s => s.id !== slotId));
        } catch {
            alert('Errore: lo slot potrebbe essere già prenotato.');
        }
    };
    const handleEliminaBlocco = async (bloccoId: number) => {
        if (!user) return;
        // Verifica pre-delete per slot occupati
        try {
            let hasBooked = false;
            if (bloccoAperto === bloccoId && slots.length > 0) {
                hasBooked = slots.some(s => s.stato === 'OCCUPATO');
            } else {
                const { data } = await axios.get(`${API_BASE_URL}/slots/blocchi/${bloccoId}`, { headers: { Authorization: `Bearer ${user.token}` } });
                const fetchedSlots = (data as SlotItem[]) || [];
                hasBooked = fetchedSlots.some(s => s.stato === 'OCCUPATO');
            }
            if (hasBooked) {
                setDeleteModalError('Non puoi eliminare questo blocco: ci sono appuntamenti già prenotati. Annulla prima gli appuntamenti collegati.');
                setDeleteModalOpen(true);
                return;
            }
        } catch (e) {
            console.error('Impossibile verificare gli slot del blocco prima della cancellazione:', e);
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
    const handleAnnullaAppuntamento = async (appuntamentoId: number) => {
        if (!user) return;
        if (!window.confirm('Vuoi annullare questo appuntamento?')) return;
        try {
            await axios.put(`${API_BASE_URL}/appuntamenti/medico/annulla/${appuntamentoId}`, null, { headers: { Authorization: `Bearer ${user.token}` } });
            setAppuntamenti(prev => prev.map(a => a.id === appuntamentoId ? { ...a, stato: 'ANNULLATO' } : a));
        } catch {
            alert("Si è verificato un problema durante l'annullamento.");
        }
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
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h1 className="mb-0">La tua dashboard</h1>
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
                                                                <br /><small className="text-muted">Paziente: {app.paziente.nome} {app.paziente.cognome}</small>
                                                                <br /><small className="text-muted">Prestazione: {app.prestazione.nome}</small>
                                                                {app.tipoAppuntamento === 'virtuale' && buildVideoUrl(app.linkVideocall) && (
                                                                    <>
                                                                        <br /><small className="text-muted">Videoconsulto: </small>
                                                                        <a href={buildVideoUrl(app.linkVideocall)!} target="_blank" rel="noopener noreferrer" className="small">{buildVideoUrl(app.linkVideocall)}</a>
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
                                                            <button className="btn btn-danger btn-sm" onClick={() => handleAnnullaAppuntamento(app.id)}>Annulla</button>
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
                                                                <div className="d-flex flex-wrap gap-1 mt-2">
                                                                    {prestazioniMedico.map(p => (
                                                                        <span key={p.id} className="badge bg-light text-dark border">{p.nome}</span>
                                                                    ))}
                                                                </div>
                                                                {blocks.map(b => (
                                                                    <div key={b.id} className="mt-3">
                                                                        <div className="d-flex align-items-center gap-2 flex-wrap">
                                                                            <span className="badge bg-light text-dark border">{fmtHM(b.oraInizio)}–{fmtHM(b.oraFine)}</span>
                                                                            {b.createdByName && (
                                                                                <span className="badge text-bg-secondary">Inserito da: {b.createdByName}{b.createdByType ? ` (${b.createdByType === 'COLLABORATORE' ? 'collaboratore' : 'medico'})` : ''}</span>
                                                                            )}
                                                                            <button className="btn btn-outline-primary btn-sm" onClick={() => handleApriChiudiSlot(b.id)}>
                                                                                {bloccoAperto === b.id ? 'Nascondi slot' : 'Gestisci slot'}
                                                                            </button>
                                                                            <button className="btn btn-outline-danger btn-sm" onClick={() => handleEliminaBlocco(b.id)}>Elimina</button>
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
                                                                                                        <button className="btn btn-sm btn-outline-danger" onClick={() => handleEliminaSlot(s.id)} disabled={s.stato === 'OCCUPATO'}>Elimina</button>
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
                                                            <br /><small className="text-muted">Paziente: {app.paziente.nome} {app.paziente.cognome}</small>
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
        </div>
    );
};

export default MedicoDashboard;
