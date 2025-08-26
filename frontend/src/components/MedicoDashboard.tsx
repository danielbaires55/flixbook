import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import { useAuth } from '../context/useAuth';

// --- Interfacce ---
interface Medico { id: number; nome: string; cognome: string; email: string; }
interface Paziente { id: number; nome: string; cognome: string; }
interface Prestazione { id: number; nome: string; costo: number; }
interface BloccoOrario { id: number; data: string; oraInizio: string; oraFine: string; }
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
    

    const handleAnnullaAppuntamento = async (appuntamentoId: number) => {
        if (!window.confirm("Sei sicuro di voler annullare questo appuntamento?") || !user) return;
        try {
          await axios.put(`${API_BASE_URL}/appuntamenti/medico/annulla/${appuntamentoId}`, null, { headers: { Authorization: `Bearer ${user.token}` } });
          alert("Appuntamento annullato!");
          setAppuntamenti(prev => prev.map(app => app.id === appuntamentoId ? { ...app, stato: "ANNULLATO" } : app));
        } catch (err) {
          console.error("Errore nell'annullamento dell'appuntamento", err);
          alert("Errore durante l'annullamento.");
        }
    };

    const handleEliminaBlocco = async (bloccoId: number) => {
        if (!window.confirm("Sei sicuro di voler eliminare questo blocco orario?") || !user) return;
        try {
            await axios.delete(`${API_BASE_URL}/blocchi-orario/${bloccoId}`, { headers: { Authorization: `Bearer ${user.token}` } });
            alert("Blocco orario eliminato!");
            setBlocchiOrario(prev => prev.filter(b => b.id !== bloccoId));
        } catch (err) {
            console.error("Errore nell'eliminazione del blocco orario", err);
            alert("Errore: impossibile eliminare un blocco che contiene appuntamenti.");
        }
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
        </div>
    );
};

export default MedicoDashboard;