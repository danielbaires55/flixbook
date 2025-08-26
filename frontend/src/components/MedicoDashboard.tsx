import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import { useAuth } from '../context/useAuth';
import { Modal, Button } from 'react-bootstrap';

// --- Interfacce ---
interface Medico { id: number; nome: string; cognome: string; email: string; }
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

const MedicoDashboard = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    
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

    const [confirmModal, setConfirmModal] = useState<{ show: boolean; title: string; message: string; confirmText?: string; onConfirm?: () => Promise<void> | void }>({ show: false, title: '', message: '' });
    const [confirmLoading, setConfirmLoading] = useState(false);
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
    
    const handleLogout = () => {
        logout();
        navigate('/');
    };

    if (loading) return <div className="text-center mt-5"><h3>Caricamento...</h3></div>;
    if (error) return <div className="alert alert-danger mt-5">{error}</div>;

    return (
        <div className="container my-5">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h1 className="mb-0">Dashboard Medico</h1>
                <button className="btn btn-outline-secondary" onClick={handleLogout}>Logout</button>
            </div>
            
            <div className="row">
                <div className="col-lg-5 mb-4">
                    <div className="card shadow-sm h-100">
                        <div className="card-body text-center d-flex flex-column justify-content-center">
                            <h4 className="card-title">Il tuo profilo</h4>
                            {profile && <p className="lead mt-3 mb-1">{profile.nome} {profile.cognome}</p>}
                            <Link to="/medico/create-blocco-orario" className="btn btn-primary mt-3">
                                Gestisci Orari di Lavoro
                            </Link>
                        </div>
                    </div>
                </div>
                <div className="col-lg-7 mb-4">
                    <div className="card shadow-sm h-100">
                        <div className="card-body">
                            <h4 className="card-title text-center">Appuntamenti prenotati</h4>
                            {appuntamenti.length > 0 ? (
                                <ul className="list-group list-group-flush mt-3">
                                    {appuntamenti.map((app) => (
                                        <li key={app.id} className="list-group-item">
                                            <div className="d-flex w-100 justify-content-between">
                                                <div>
                                                    <strong>{new Date(app.dataEOraInizio).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}</strong> alle <strong>{new Date(app.dataEOraInizio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>
                                                    <br />
                                                    <small className="text-muted">Paziente: {app.paziente.nome} {app.paziente.cognome}</small>
                                                    <br />
                                                    <small className="text-muted">Prestazione: {app.prestazione.nome}</small>
                                                </div>
                                                <span className={`badge text-capitalize text-bg-${app.stato === 'CONFERMATO' ? 'success' : app.stato === 'COMPLETATO' ? 'secondary' : 'danger'}`}>{app.stato.toLowerCase()}</span>
                                            </div>
                                            <div className="mt-2 d-flex gap-2">
                                                {app.stato === 'CONFERMATO' && (
                                                    <button className="btn btn-danger btn-sm" onClick={() => handleAnnullaAppuntamento(app.id)}>Annulla</button>
                                                )}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="alert alert-info text-center mt-3">Nessun appuntamento prenotato.</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="card shadow-sm">
                <div className="card-header">
                    <h4 className="card-title text-center mb-0">I tuoi Blocchi Orario Futuri</h4>
                </div>
                <div className="card-body">
                    {blocchiOrario.length > 0 ? (
                        <ul className="list-group list-group-flush">
                            {blocchiOrario.map((blocco) => (
                                <li key={blocco.id} className="list-group-item">
                                    <div className="d-flex justify-content-between align-items-start">
                                        <div>
                                            <strong>{new Date(blocco.data + 'T00:00:00').toLocaleDateString('it-IT', {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'})}</strong>
                                            <p className="mb-1">Dalle <strong>{blocco.oraInizio}</strong> alle <strong>{blocco.oraFine}</strong></p>
                                            
                                            <div className="mt-2">
                                                <small className="text-muted">Prestazioni disponibili in questo blocco:</small>
                                                <div className="d-flex flex-wrap gap-1 mt-1">
                                                    {prestazioniMedico.map(p => (
                                                        <span key={p.id} className="badge bg-light text-dark border">{p.nome}</span>
                                                    ))}
                                                </div>
                                            </div>

                                                                                        {/* Gestione slot del blocco */}
                                                                                        <div className="mt-3">
                                                                                            <button className="btn btn-outline-primary btn-sm" onClick={() => handleApriChiudiSlot(blocco.id)}>
                                                                                                {bloccoAperto === blocco.id ? 'Nascondi slot' : 'Gestisci slot'}
                                                                                            </button>
                                                                                        </div>
                                                                                        {bloccoAperto === blocco.id && (
                                                                                            <div className="mt-3 border rounded p-2 bg-light">
                                                                                                {slotsLoading && <div className="small text-muted">Caricamento slot…</div>}
                                                                                                {slotsError && <div className="text-danger small">{slotsError}</div>}
                                                                                                {!slotsLoading && !slotsError && (
                                                                                                    slots.length > 0 ? (
                                                                                                        <ul className="list-group list-group-flush">
                                                                                                            {slots.map(s => (
                                                                                                                <li key={s.id} className="list-group-item d-flex justify-content-between align-items-center">
                                                                                                                    <div>
                                                                                                                        <strong>
                                                                                                                            {new Date(s.dataEOraInizio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                                                                            {' - '}
                                                                                                                            {new Date(s.dataEOraFine).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                                        <button className="btn btn-outline-danger btn-sm" onClick={() => handleEliminaBlocco(blocco.id)}>
                                            Elimina
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : <p className="text-center mt-3">Nessun blocco orario impostato.</p>}
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
                    <Modal.Title>{confirmModal.title || 'Conferma'}</Modal.Title>
                </Modal.Header>
                <Modal.Body>{confirmModal.message}</Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={closeConfirm} disabled={confirmLoading}>
                        Annulla
                    </Button>
                    <Button variant="danger" onClick={runConfirm} disabled={confirmLoading}>
                        {confirmModal.confirmText || 'Conferma'}
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default MedicoDashboard;

// Modali riutilizzabili montati in coda al componente
// (inseriti qui per semplicità; restano nel DOM quando show=true)
// Nota: già importato Modal e Button da react-bootstrap