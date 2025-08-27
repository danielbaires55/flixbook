import { useState, useEffect } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import { useAuth } from '../context/useAuth';
import { Modal, Button } from 'react-bootstrap';
import './css/MedicoDashboard.css';

// --- Interfacce ---
interface Medico { id: number; nome: string; cognome: string; email: string; imgProfUrl?: string; imgUrl?: string; }
interface Paziente { id: number; nome: string; cognome: string; }
interface Prestazione { id: number; nome: string; costo: number; }
interface BloccoOrario { id: number; data: string; oraInizio: string; oraFine: string; }
interface SlotItem {
    id: number;
    dataEOraInizio: string;
    dataEOraFine: string;
    stato: 'DISPONIBILE' | 'DISABILITATO' | 'OCCUPATO';
}
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

const API_BASE_URL = "http://localhost:8080/api";
const SERVER_BASE_URL = API_BASE_URL.replace(/\/api$/, '');

const MedicoDashboard = () => {
    const { user } = useAuth();
    
    const [profile, setProfile] = useState<Medico | null>(null);
    const [appuntamenti, setAppuntamenti] = useState<Appuntamento[]>([]);
    const [blocchiOrario, setBlocchiOrario] = useState<BloccoOrario[]>([]);
    const [prestazioniMedico, setPrestazioniMedico] = useState<Prestazione[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    // Stato gestione slot
    const [bloccoAperto, setBloccoAperto] = useState<number | null>(null);
    const [slots, setSlots] = useState<SlotItem[]>([]);
    const [slotsLoading, setSlotsLoading] = useState<boolean>(false);
    const [slotsError, setSlotsError] = useState<string | null>(null);

    // Modali eleganti (info + conferma)
    const [infoModal, setInfoModal] = useState<{ show: boolean; title: string; message: string; onClose?: () => void }>({ show: false, title: '', message: '' });
    const openInfo = (title: string, message: string, onClose?: () => void) => setInfoModal({ show: true, title, message, onClose });
    const closeInfo = () => { setInfoModal((prev) => ({ ...prev, show: false })); infoModal.onClose?.(); };

    const [confirmModal, setConfirmModal] = useState<{ show: boolean; title: string; message: string; confirmText?: string; onConfirm?: () => Promise<void> | void; danger?: boolean; requireAck?: boolean; ackLabel?: string }>({ show: false, title: '', message: '' });
    const [confirmLoading, setConfirmLoading] = useState(false);
    const [ackChecked, setAckChecked] = useState(false);
    const closeConfirm = () => { if (!confirmLoading) setConfirmModal((prev) => ({ ...prev, show: false })); };
    const runConfirm = async () => {
        if (!confirmModal.onConfirm) { closeConfirm(); return; }
        try {
            setConfirmLoading(true);
            await confirmModal.onConfirm();
            closeConfirm();
        } finally {
            setConfirmLoading(false);
        }
    };

    useEffect(() => {
        if (!user || !user.medicoId) { 
            setLoading(false); 
            return; 
        }
        
        const fetchAllData = async () => {
            setLoading(true);
            setError(null);
            const headers = { Authorization: `Bearer ${user.token}` };
            const medicoId = user.medicoId;

            try {
                const [profileRes, appuntamentiRes, blocchiRes, prestazioniRes] = await Promise.all([
                    axios.get(`${API_BASE_URL}/medici/profile`, { headers }),
                    axios.get(`${API_BASE_URL}/appuntamenti/medico/${medicoId}`, { headers }),
                    axios.get(`${API_BASE_URL}/blocchi-orario/medico/${medicoId}`, { headers }),
                    axios.get(`${API_BASE_URL}/prestazioni/by-medico-loggato`, { headers })
                ]);

                setProfile(profileRes.data);
                setAppuntamenti(appuntamentiRes.data);
                setBlocchiOrario(blocchiRes.data);
                setPrestazioniMedico(prestazioniRes.data);

            } catch (err) {
                console.error("Errore nel recupero dei dati:", err);
                setError("Impossibile caricare i dati.");
            } finally {
                setLoading(false);
            }
        };

        fetchAllData();
    }, [user]);
    
        const fetchSlotsForBlocco = async (bloccoId: number) => {
            if (!user) return;
            setSlotsError(null);
            setSlotsLoading(true);
            try {
                const { data } = await axios.get(`${API_BASE_URL}/slots/blocchi/${bloccoId}`, {
                    headers: { Authorization: `Bearer ${user.token}` }
                });
                setSlots(data as SlotItem[]);
            } catch (e) {
                console.error('Errore nel recupero degli slot:', e);
                setSlotsError('Impossibile caricare gli slot.');
            } finally {
                setSlotsLoading(false);
            }
        };

        const handleApriChiudiSlot = async (bloccoId: number) => {
            if (bloccoAperto === bloccoId) {
                setBloccoAperto(null);
                setSlots([]);
                return;
            }
            setBloccoAperto(bloccoId);
            await fetchSlotsForBlocco(bloccoId);
        };

    const handleToggleSlot = async (slotId: number) => {
            if (!user || bloccoAperto == null) return;
            try {
                const { data } = await axios.put(`${API_BASE_URL}/slots/${slotId}/toggle`, null, {
                    headers: { Authorization: `Bearer ${user.token}` }
                });
                setSlots(prev => prev.map(s => s.id === slotId ? { ...s, stato: data.stato } : s));
            } catch (e: unknown) {
            const err = e as { response?: { data?: string } };
            const msg = err?.response?.data || 'Errore nel modificare lo slot.';
        openInfo('Errore', msg);
            }
        };

        const handleEliminaSlot = async (slotId: number) => {
            if (!user || bloccoAperto == null) return;
            setConfirmModal({
                show: true,
                title: 'Conferma eliminazione',
                message: 'Eliminare questo slot da 30 minuti? L\'operazione è irreversibile.',
                confirmText: 'Elimina',
                onConfirm: async () => {
                    try {
                        await axios.delete(`${API_BASE_URL}/slots/${slotId}`, {
                            headers: { Authorization: `Bearer ${user.token}` }
                        });
                        setSlots(prev => prev.filter(s => s.id !== slotId));
                    } catch (e: unknown) {
                        const err = e as { response?: { data?: string } };
                        const msg = err?.response?.data || 'Errore: lo slot potrebbe essere già prenotato.';
                        openInfo('Errore', msg);
                    }
                }
            });
        };


    const handleAnnullaAppuntamento = async (appuntamentoId: number) => {
        if (!user) return;
        setConfirmModal({
            show: true,
            title: 'Conferma annullamento',
            message: 'Sei sicuro di voler annullare questo appuntamento?',
            confirmText: 'Annulla appuntamento',
            onConfirm: async () => {
                try {
                    await axios.put(`${API_BASE_URL}/appuntamenti/medico/annulla/${appuntamentoId}`, null, { headers: { Authorization: `Bearer ${user.token}` } });
                    setAppuntamenti(prev => prev.map(app => app.id === appuntamentoId ? { ...app, stato: 'ANNULLATO' } : app));
                    openInfo('Operazione riuscita', 'Appuntamento annullato!');
                } catch (err) {
                    console.error("Errore nell'annullamento dell'appuntamento", err);
                    openInfo('Errore', 'Errore durante l\'annullamento.');
                }
            }
        });
    };

    const handleEliminaBlocco = async (bloccoId: number) => {
        if (!user) return;
        setConfirmModal({
            show: true,
            title: 'Conferma eliminazione blocco',
            message: 'Sei sicuro di voler eliminare questo blocco orario? L\'operazione non può essere annullata.',
            confirmText: 'Elimina blocco',
            onConfirm: async () => {
                try {
                    await axios.delete(`${API_BASE_URL}/blocchi-orario/${bloccoId}`, { headers: { Authorization: `Bearer ${user.token}` } });
                    setBlocchiOrario(prev => prev.filter(b => b.id !== bloccoId));
                    openInfo('Operazione riuscita', 'Blocco orario eliminato!');
                } catch (err) {
                    console.error("Errore nell'eliminazione del blocco orario", err);
                    openInfo('Errore', 'Errore: impossibile eliminare un blocco che contiene appuntamenti.');
                }
            }
        });
    };
    
    

    // Elimina appuntamento dallo storico (hard delete, solo non attivi)
    const handleEliminaStoricoAppuntamento = async (appuntamentoId: number) => {
        if (!user) return;
        setAckChecked(false);
        setConfirmModal({
            show: true,
            title: 'Attenzione: azione irreversibile',
            message: 'Questa operazione eliminerà definitivamente il record dal database. L\'azione è irreversibile e il dato non potrà essere recuperato.',
            confirmText: 'Elimina definitivamente',
            danger: true,
            requireAck: true,
            ackLabel: 'Ho compreso che l\'operazione è irreversibile e i dati saranno eliminati definitivamente.',
            onConfirm: async () => {
                try {
                    await axios.delete(`${API_BASE_URL}/appuntamenti/medico/${appuntamentoId}`, {
                        headers: { Authorization: `Bearer ${user.token}` }
                    });
                    setAppuntamenti(prev => prev.filter(app => app.id !== appuntamentoId));
                    openInfo('Operazione riuscita', 'Appuntamento eliminato dallo storico.');
                } catch (e: unknown) {
                    const err = e as { response?: { data?: string; status?: number } };
                    const msg = err?.response?.data || 'Impossibile eliminare questo appuntamento.';
                    openInfo('Errore', msg);
                }
            }
        });
    };

    // Filtro blocchi orario futuri: oggi | questa settimana
    type BlocchiPreset = 'oggi' | 'settimana' | 'due-settimane' | 'mese' | 'prossimo-mese';
    const [blocchiPreset, setBlocchiPreset] = useState<BlocchiPreset>('settimana');

    // Helper: format time labels as H:mm (hide seconds)
    const fmtHM = (time: string): string => {
        if (!time) return time;
        const parts = time.split(':');
        if (parts.length >= 2) {
            const h = Number(parts[0]);
            const m = parts[1];
            if (Number.isFinite(h)) return `${h}:${m}`;
        }
        return time;
    };

    // Helper for Date objects: format as H:mm
    const fmtTime = (d: Date): string => `${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;

    // Avatar helpers (foto profilo o iniziali)
    const getInitials = (n?: string, c?: string) => {
        const a = (n?.[0] || '').toUpperCase();
        const b = (c?.[0] || '').toUpperCase();
        return `${a}${b}` || '?';
    };
    const buildPhotoUrl = (m?: Medico | null): string | null => {
        if (!m) return null;
        const raw = (m.imgProfUrl?.trim() || m.imgUrl?.trim() || '');
        if (!raw) return null;
        if (/^https?:\/\//i.test(raw)) return raw;
        return `${SERVER_BASE_URL}${raw.startsWith('/') ? raw : `/${raw}`}`;
    };

    // Normalizza link videoconsulto (supporta URL assoluti o relativi al backend)
    const buildVideoUrl = (raw?: string | null): string | null => {
        const link = (raw || '').trim();
        if (!link) return null;
        if (/^https?:\/\//i.test(link)) return link;
        return `${SERVER_BASE_URL}${link.startsWith('/') ? link : `/${link}`}`;
    };

    // UI: storico appuntamenti in modale (completati/annullati)
    const [showStoricoModal, setShowStoricoModal] = useState<boolean>(false);
    const [storicoPage, setStoricoPage] = useState<number>(1);
    const pageSize = 20;
    type PresetType = 'all' | 'week' | 'month' | 'year';
    const [storicoPreset, setStoricoPreset] = useState<PresetType>('all');
    const [storicoSearch, setStoricoSearch] = useState<string>("");

    const renderStatusBadge = (stato: 'CONFERMATO' | 'COMPLETATO' | 'ANNULLATO') => {
        const map: Record<string, { cls: string; label: string }> = {
            CONFERMATO: { cls: 'success', label: 'confermato' },
            COMPLETATO: { cls: 'secondary', label: 'completato' },
            ANNULLATO: { cls: 'danger', label: 'annullato' }
        };
        const cfg = map[stato] ?? map.CONFERMATO;
        return (
            <span className={`status-chip ${cfg.cls}`}>
                <span className="status-label">{cfg.label}</span>
            </span>
        );
    };

    if (loading) return <div className="text-center mt-5"><h3>Caricamento...</h3></div>;
    if (error) return <div className="alert alert-danger mt-5">{error}</div>;

    return (
        <div className="container my-5">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h1 className="mb-0">Dashboard Medico</h1>
            </div>
            
            <div className="row">
                <div className="col-lg-5 mb-4">
                    <div className="card shadow-sm h-100">
                        <div className="card-body text-center d-flex flex-column align-items-center justify-content-center">
                            <h4 className="card-title">Il tuo profilo</h4>
                            {/* Avatar */}
                            {(() => {
                                const url = buildPhotoUrl(profile);
                                if (url) {
                                    return <img src={url} alt="Foto profilo" className="md-avatar-photo mt-3" />;
                                }
                                return <div className="md-avatar-circle mt-3">{getInitials(profile?.nome, profile?.cognome)}</div>;
                            })()}
                            {profile && <p className="lead mt-3 mb-1">{profile.nome} {profile.cognome}</p>}
                            {profile && <p className="text-muted mb-0">{profile.email}</p>}
                            <Link to="/medico/create-blocco-orario" className="btn btn-primary mt-3 align-self-center w-auto px-3">
                                Gestisci Orari di Lavoro
                            </Link>
                        </div>
                    </div>
                </div>
                <div className="col-lg-7 mb-4">
                    <div className="card shadow-sm h-100">
                        <div className="card-body">
                            <div className="d-flex justify-content-between align-items-center">
                                <h4 className="card-title mb-0">Appuntamenti</h4>
                                {(() => {
                                    const attiviCount = appuntamenti.filter(a => a.stato === 'CONFERMATO').length;
                                    const storiciCount = appuntamenti.length - attiviCount;
                                    return (
                                        <div className="d-flex align-items-center gap-2">
                                            <span className="badge text-bg-success">Attivi: {attiviCount}</span>
                                            <button
                                                type="button"
                                                className="btn btn-sm btn-outline-secondary"
                                                onClick={() => { setStoricoPage(1); setShowStoricoModal(true); }}
                                                title="Mostra storico"
                                            >
                                                {/* clock icon */}
                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16" aria-hidden>
                                                    <path d="M8 3.5a.5.5 0 0 1 .5.5v4l3 1.5a.5.5 0 1 1-.5.866l-3.5-1.75A.5.5 0 0 1 7 8V4a.5.5 0 0 1 .5-.5"/>
                                                    <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16m0-1A7 7 0 1 1 8 1a7 7 0 0 1 0 14"/>
                                                </svg>
                                                <span className="ms-1">Storico {storiciCount > 0 ? `(${storiciCount})` : ''}</span>
                                            </button>
                                        </div>
                                    );
                                })()}
                            </div>

                            {(() => {
                                const attivi = appuntamenti
                                    .filter(app => app.stato === 'CONFERMATO')
                                    .sort((a, b) => new Date(a.dataEOraInizio).getTime() - new Date(b.dataEOraInizio).getTime());

                                return (
                                    <>
                                        {/* Lista attivi */}
                                        {attivi.length > 0 ? (
                                            <ul className="list-group list-group-flush mt-3">
                                                {attivi.map((app) => (
                                                    <li key={app.id} className="list-group-item">
                                                        <div className="d-flex w-100 justify-content-between">
                                                            <div>
                                                                <strong>{new Date(app.dataEOraInizio).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}</strong> alle <strong>{fmtTime(new Date(app.dataEOraInizio))}</strong>
                                                                <br />
                                                                <small className="text-muted">Paziente: {app.paziente.nome} {app.paziente.cognome}</small>
                                                                <br />
                                                                <small className="text-muted">Prestazione: {app.prestazione.nome}</small>
                                                                {app.tipoAppuntamento === 'virtuale' && buildVideoUrl(app.linkVideocall) && (
                                                                    <>
                                                                        <br />
                                                                        <small className="text-muted">Videoconsulto: </small>
                                                                        <a
                                                                            href={buildVideoUrl(app.linkVideocall)!}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="small"
                                                                        >
                                                                            {buildVideoUrl(app.linkVideocall)}
                                                                        </a>
                                                                    </>
                                                                )}
                                                            </div>
                                                            {renderStatusBadge(app.stato)}
                                                        </div>
                                                        <div className="mt-2 d-flex gap-2 flex-wrap">
                                                            {app.tipoAppuntamento === 'virtuale' && buildVideoUrl(app.linkVideocall) && (
                                                                <a
                                                                    href={buildVideoUrl(app.linkVideocall)!}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="btn btn-success btn-sm"
                                                                    title="Apri videoconsulto"
                                                                >
                                                                    {/* camera icon */}
                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16" aria-hidden className="me-1">
                                                                        <path d="M0 5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v.5l3.146-1.573A1 1 0 0 1 16 4.846v6.308a1 1 0 0 1-1.854.919L11 10.5V11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2z"/>
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

                                        {/* Storico spostato in modale per evitare layout overflow */}
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

                        // Calcolo finestre temporali
                        const now = new Date();
                        const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
                        const endOfWeek = (() => {
                            const d = new Date(startToday);
                            const day = (d.getDay() + 6) % 7; // lun=0..dom=6
                            const startMonday = new Date(d);
                            startMonday.setDate(d.getDate() - day);
                            const endSunday = new Date(startMonday);
                            endSunday.setDate(startMonday.getDate() + 6);
                            endSunday.setHours(23,59,59,999);
                            // Manteniamo solo futuro: se oggi è dopo lunedì, partiamo da oggi
                            return endSunday;
                        })();
                        const endOfTwoWeeks = (() => {
                            const end = new Date(startToday);
                            end.setDate(end.getDate() + 13); // oggi + 13 = 14 giorni inclusivi
                            end.setHours(23,59,59,999);
                            return end;
                        })();
                        const endOfMonth = new Date(startToday.getFullYear(), startToday.getMonth() + 1, 0, 23, 59, 59, 999);
                        const startOfNextMonth = new Date(startToday.getFullYear(), startToday.getMonth() + 1, 1, 0, 0, 0, 0);
                        const endOfNextMonth = new Date(startToday.getFullYear(), startToday.getMonth() + 2, 0, 23, 59, 59, 999);

                        // Solo blocchi futuri (>= oggi)
                        let futuri = blocchiOrario.filter(b => {
                            const d = new Date(b.data + 'T00:00:00');
                            return d.getTime() >= startToday.getTime();
                        });

                        // Filtro preset
                        if (blocchiPreset === 'oggi') {
                            futuri = futuri.filter(b => {
                                const d = new Date(b.data + 'T00:00:00');
                                return d.getFullYear() === startToday.getFullYear() && d.getMonth() === startToday.getMonth() && d.getDate() === startToday.getDate();
                            });
                        } else if (blocchiPreset === 'settimana') {
                            futuri = futuri.filter(b => {
                                const d = new Date(b.data + 'T00:00:00');
                                return d.getTime() <= endOfWeek.getTime();
                            });
                        } else if (blocchiPreset === 'due-settimane') {
                            futuri = futuri.filter(b => {
                                const d = new Date(b.data + 'T00:00:00');
                                return d.getTime() <= endOfTwoWeeks.getTime();
                            });
                        } else if (blocchiPreset === 'mese') {
                            futuri = futuri.filter(b => {
                                const d = new Date(b.data + 'T00:00:00');
                                return d.getTime() <= endOfMonth.getTime();
                            });
                        } else if (blocchiPreset === 'prossimo-mese') {
                            futuri = futuri.filter(b => {
                                const d = new Date(b.data + 'T00:00:00');
                                return d.getTime() >= startOfNextMonth.getTime() && d.getTime() <= endOfNextMonth.getTime();
                            });
                        }

                        // Ordinamento: blocchi di oggi in primis, poi per data crescente e oraInizio
                        const toMinutes = (hhmm: string) => {
                            const [h,m] = hhmm.split(':').map(Number);
                            return (h||0)*60 + (m||0);
                        };
                        futuri.sort((a,b) => {
                            const da = new Date(a.data + 'T00:00:00');
                            const db = new Date(b.data + 'T00:00:00');
                            const isTodayA = da.getFullYear()===startToday.getFullYear() && da.getMonth()===startToday.getMonth() && da.getDate()===startToday.getDate();
                            const isTodayB = db.getFullYear()===startToday.getFullYear() && db.getMonth()===startToday.getMonth() && db.getDate()===startToday.getDate();
                            if (isTodayA && !isTodayB) return -1;
                            if (!isTodayA && isTodayB) return 1;
                            if (da.getTime() !== db.getTime()) return da.getTime() - db.getTime();
                            return toMinutes(a.oraInizio) - toMinutes(b.oraInizio);
                        });

                        return (
                            <>
                                <div className="d-flex align-items-center gap-2 mb-2">
                                    <label className="form-label mb-0">Visualizza</label>
                                    <select className="form-select form-select-sm" style={{maxWidth: 320}}
                                        value={blocchiPreset}
                                        onChange={(e) => setBlocchiPreset(e.target.value as BlocchiPreset)}
                                    >
                                        <option value="oggi">Solo oggi</option>
                                        <option value="settimana">Questa settimana</option>
                                        <option value="due-settimane">Prossime 2 settimane</option>
                                        <option value="mese">Questo mese</option>
                                        <option value="prossimo-mese">Prossimo mese</option>
                                    </select>
                                    <div className="ms-auto small text-muted">{futuri.length} blocco/i</div>
                                </div>
                                {futuri.length > 0 ? (() => {
                                    // Raggruppa per data
                                    const groups = futuri.reduce((acc, b) => {
                                        (acc[b.data] ||= []).push(b);
                                        return acc;
                                    }, {} as Record<string, BloccoOrario[]>);
                                    // Ordine date secondo l'ordinamento già calcolato in futuri
                                    const orderedDates = Array.from(new Set(futuri.map(b => b.data)));
                                    return (
                                        <ul className="list-group list-group-flush">
                                            {orderedDates.map(dateKey => {
                                                const blocks = [...groups[dateKey]].sort((a,b) => a.oraInizio.localeCompare(b.oraInizio));
                                                const dateLabel = new Date(dateKey + 'T00:00:00').toLocaleDateString('it-IT', {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'});
                                                const parts = blocks.map((b, i) => i === 0 ? `Dalle ${fmtHM(b.oraInizio)} alle ${fmtHM(b.oraFine)}` : ` e dalle ${fmtHM(b.oraInizio)} alle ${fmtHM(b.oraFine)}`);
                                                return (
                                                    <li key={dateKey} className="list-group-item">
                                                        <div className="d-flex justify-content-between align-items-start">
                                                            <div className="w-100">
                                                                <strong>{dateLabel}</strong>
                                                                <p className="mb-1">{parts.join('')}</p>
                                                                <div className="mt-2">
                                                                    <small className="text-muted">Prestazioni disponibili in questo giorno:</small>
                                                                    <div className="d-flex flex-wrap gap-1 mt-1">
                                                                        {prestazioniMedico.map(p => (
                                                                            <span key={p.id} className="badge bg-light text-dark border">{p.nome}</span>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                                {/* Azioni per ciascun blocco della giornata */}
                                                                {blocks.map(b => (
                                    <div key={b.id} className="mt-3">
                                                                        <div className="d-flex align-items-center gap-2">
                                        <span className="badge bg-light text-dark border">{fmtHM(b.oraInizio)}–{fmtHM(b.oraFine)}</span>
                                                                            <button className="btn btn-outline-primary btn-sm" onClick={() => handleApriChiudiSlot(b.id)}>
                                                                                {bloccoAperto === b.id ? 'Nascondi slot' : 'Gestisci slot'}
                                                                            </button>
                                                                            <button className="btn btn-outline-danger btn-sm" onClick={() => handleEliminaBlocco(b.id)}>
                                                                                Elimina
                                                                            </button>
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
                                                                                                        <strong>
                                                                                                            {fmtTime(new Date(s.dataEOraInizio))}
                                                                                                            {' - '}
                                                                                                            {fmtTime(new Date(s.dataEOraFine))}
                                                                                                        </strong>
                                                                                                        <span className={`ms-2 badge ${s.stato === 'DISPONIBILE' ? 'text-bg-success' : 'text-bg-secondary'}`}>
                                                                                                            {s.stato.toLowerCase()}
                                                                                                        </span>
                                                                                                    </div>
                                                                                                    <div className="d-flex gap-2">
                                                                                                        <button
                                                                                                            className="btn btn-sm btn-outline-secondary"
                                                                                                            onClick={() => handleToggleSlot(s.id)}
                                                                                                            disabled={s.stato === 'OCCUPATO'}
                                                                                                            title={s.stato === 'OCCUPATO' ? 'Slot occupato: non modificabile' : ''}
                                                                                                        >
                                                                                                            {s.stato === 'DISPONIBILE' ? 'Disabilita' : 'Abilita'}
                                                                                                        </button>
                                                                                                        <button
                                                                                                            className="btn btn-sm btn-outline-danger"
                                                                                                            onClick={() => handleEliminaSlot(s.id)}
                                                                                                            disabled={s.stato === 'OCCUPATO'}
                                                                                                            title={s.stato === 'OCCUPATO' ? 'Slot occupato: non eliminabile' : ''}
                                                                                                        >
                                                                                                            Elimina
                                                                                                        </button>
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
            {/* Modali eleganti */}
            <Modal show={infoModal.show} onHide={closeInfo} centered>
                <Modal.Header closeButton>
                    <Modal.Title>{infoModal.title || 'Informazione'}</Modal.Title>
                </Modal.Header>
                <Modal.Body>{infoModal.message}</Modal.Body>
                <Modal.Footer>
                    <Button variant="primary" onClick={closeInfo}>
                        OK
                    </Button>
                </Modal.Footer>
            </Modal>

            <Modal show={confirmModal.show} onHide={closeConfirm} centered>
                <Modal.Header closeButton>
                    <Modal.Title>
                        {confirmModal.danger ? (
                            <span className="text-danger">{confirmModal.title || 'Conferma'}</span>
                        ) : (
                            confirmModal.title || 'Conferma'
                        )}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>{confirmModal.message}</Modal.Body>
                <Modal.Footer>
                    {confirmModal.requireAck && (
                        <div className="form-check me-auto">
                            <input
                                id="ack-checkbox"
                                className="form-check-input"
                                type="checkbox"
                                checked={ackChecked}
                                onChange={(e) => setAckChecked(e.target.checked)}
                            />
                            <label className="form-check-label small" htmlFor="ack-checkbox">
                                {confirmModal.ackLabel || 'Confermo di aver compreso i rischi.'}
                            </label>
                        </div>
                    )}
                    <Button variant="secondary" onClick={closeConfirm} disabled={confirmLoading}>
                        Annulla
                    </Button>
                    <Button
                        variant={confirmModal.danger ? 'danger' : 'primary'}
                        onClick={runConfirm}
                        disabled={confirmLoading || (confirmModal.requireAck ? !ackChecked : false)}
                    >
                        {confirmModal.confirmText || 'Conferma'}
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Modale: Storico appuntamenti (COMPLETATO/ANNULLATO) */}
            <Modal show={showStoricoModal} onHide={() => setShowStoricoModal(false)} centered size="lg" scrollable>
                <Modal.Header closeButton>
                    <Modal.Title>Storico appuntamenti</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {/* Filtri storici: periodo e paziente */}
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
                                    <button className="btn btn-outline-secondary" onClick={() => { setStoricoSearch(""); setStoricoPage(1); }} title="Pulisci">×</button>
                                )}
                            </div>
                        </div>
                    </div>
                    {(() => {
                        // Base: tutti non confermati
                        let storici = appuntamenti
                            .filter(app => app.stato !== 'CONFERMATO')
                            .sort((a, b) => new Date(b.dataEOraInizio).getTime() - new Date(a.dataEOraInizio).getTime());
                        // Filtro periodo
                        const now = new Date();
                        let startDate: Date | null = null;
                        let endDate: Date | null = null;
                        if (storicoPreset === 'week') {
                            const d = new Date(now);
                            const day = (d.getDay() + 6) % 7; // 0 = Monday
                            startDate = new Date(d);
                            startDate.setDate(d.getDate() - day);
                            startDate.setHours(0,0,0,0);
                            endDate = new Date(startDate);
                            endDate.setDate(startDate.getDate() + 6);
                            endDate.setHours(23,59,59,999);
                        } else if (storicoPreset === 'month') {
                            startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0,0,0,0);
                            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23,59,59,999);
                        } else if (storicoPreset === 'year') {
                            startDate = new Date(now.getFullYear(), 0, 1, 0,0,0,0);
                            endDate = new Date(now.getFullYear(), 11, 31, 23,59,59,999);
                        }
                        if (startDate && endDate) {
                            storici = storici.filter(app => {
                                const t = new Date(app.dataEOraInizio).getTime();
                                return t >= startDate!.getTime() && t <= endDate!.getTime();
                            });
                        }

                        // Filtro paziente (client-side)
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
                                                {' alle '}
                                                <strong>{fmtTime(new Date(app.dataEOraInizio))}</strong>
                                                <br />
                                                <small className="text-muted">Paziente: {app.paziente.nome} {app.paziente.cognome}</small>
                                                <br />
                                                <small className="text-muted">Prestazione: {app.prestazione.nome}</small>
                                            </div>
                                            <div className="d-flex flex-column align-items-end gap-2">
                                                {renderStatusBadge(app.stato)}
                                                {/* Elimina solo per storico (non confermati). Il backend verifica comunque. */}
                                                {app.stato !== 'CONFERMATO' && (
                                                    <button
                                                        className="btn btn-outline-danger btn-sm"
                                                        onClick={() => handleEliminaStoricoAppuntamento(app.id)}
                                                        title="Elimina definitivamente dallo storico"
                                                    >
                                                        Elimina
                                                    </button>
                                                )}
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
    </div>
    );
};

export default MedicoDashboard;

// Modali riutilizzabili montati in coda al componente
// (inseriti qui per semplicità; restano nel DOM quando show=true)
// Nota: già importato Modal e Button da react-bootstrap