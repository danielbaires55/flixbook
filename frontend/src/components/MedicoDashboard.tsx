import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import { useAuth } from '../context/useAuth';

// --- Interfacce ---
interface Medico { id: number; nome: string; cognome: string; email: string; }
interface Paziente { id: number; nome: string; cognome: string; }
interface Prestazione { id: number; nome: string; costo: number; }
interface Disponibilita { id: number; data: string; oraInizio: string; oraFine: string; medico: Medico; prestazione: Prestazione; prenotato: boolean; }
interface Appuntamento { id: number; dataEOraInizio: string; dataEOraFine: string; stato: 'CONFERMATO' | 'COMPLETATO' | 'ANNULLATO'; tipoAppuntamento: 'fisico' | 'virtuale'; paziente: Paziente; disponibilita: Disponibilita; linkVideocall?: string; }


const API_BASE_URL = "http://localhost:8080/api";

const MedicoDashboard = () => {
    const { user, logout } = useAuth(); // Ottieni anche la funzione di logout
    const navigate = useNavigate();
    
    const [profile, setProfile] = useState<Medico | null>(null);
    const [appuntamenti, setAppuntamenti] = useState<Appuntamento[]>([]);
    const [disponibilitaList, setDisponibilitaList] = useState<Disponibilita[]>([]);
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
                const [profileResponse, appuntamentiResponse, disponibilitaResponse] =
                    await Promise.all([
                        axios.get(`${API_BASE_URL}/medici/profile`, { headers }),
                        axios.get(`${API_BASE_URL}/appuntamenti/medico/${medicoId}`, { headers }),
                        axios.get(`${API_BASE_URL}/disponibilita/medico/${medicoId}`, { headers }),
                    ]);

                setProfile(profileResponse.data);
                setAppuntamenti(appuntamentiResponse.data);
                setDisponibilitaList(disponibilitaResponse.data);

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
        if (!window.confirm("Sei sicuro di voler annullare questo appuntamento?") || !user) {
          return;
        }
    
        try {
          await axios.put(
            `${API_BASE_URL}/appuntamenti/medico/annulla/${appuntamentoId}`,
            null,
            { headers: { Authorization: `Bearer ${user.token}` } }
          );
          alert("Appuntamento annullato con successo!");
    
          setAppuntamenti(prev =>
            prev.map((app) =>
              app.id === appuntamentoId
                ? { ...app, stato: "ANNULLATO" }
                : app
            )
          );
        } catch (err) {
          console.error("Errore nell'annullamento dell'appuntamento", err);
          alert("Errore durante l'annullamento.");
        }
    };

    const handleEliminaDisponibilita = async (disponibilitaId: number) => {
        if (!window.confirm("Sei sicuro di voler eliminare questa disponibilità?") || !user) {
            return;
        }
    
        try {
            await axios.delete(`${API_BASE_URL}/disponibilita/medico/${disponibilitaId}`, {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            alert("Disponibilità eliminata con successo!");
            
            setDisponibilitaList(prev => prev.filter(disp => disp.id !== disponibilitaId));
        } catch (err) {
            console.error("Errore nell'eliminazione della disponibilità", err);
            alert("Errore durante l'eliminazione.");
        }
    };

    const handleRedirectToCreate = () => {
        navigate("/medico/create-disponibilita");
    };

    const handleLogout = () => {
        logout();
        navigate('/'); // Reindirizza alla home page dopo il logout
    };

    if (loading) return <div className="text-center mt-5"><h3>Caricamento...</h3></div>;
    if (error) return <div className="alert alert-danger mt-5">{error}</div>;

    return (
        <div className="container mt-5">
            <h1 className="text-center mb-4">Dashboard Medico</h1>
            <div className="row">
                <div className="col-lg-5 mb-4">
                    <div className="card shadow-sm h-100">
                        <div className="card-body text-center d-flex flex-column justify-content-center">
                            <h4 className="card-title">Il tuo profilo</h4>
                            {profile ? (
                                <>
                                    <p className="lead mt-3 mb-1">{profile.nome} {profile.cognome}</p>
                                    <p className="text-muted">{profile.email}</p>
                                </>
                            ) : <p>Caricamento...</p>}
                            <button className="btn btn-primary mt-3" onClick={handleRedirectToCreate}>
                                Gestisci disponibilità
                            </button>
                            <button className="btn btn-outline-secondary mt-2" onClick={handleLogout}>
                                Logout
                            </button>
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
                                                    <strong>{new Date(app.dataEOraInizio).toLocaleDateString('it-IT', { day: '2-digit', month: 'long' })}</strong> alle <strong>{new Date(app.dataEOraInizio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>
                                                    <br />
                                                    <small className="text-muted">Paziente: {app.paziente.nome} {app.paziente.cognome}</small>
                                                    <br />
                                                    <small className="text-muted">Prestazione: {app.disponibilita.prestazione.nome}</small>
                                                </div>
                                                <span className={`badge text-capitalize text-bg-${app.stato === 'CONFERMATO' ? 'success' : app.stato === 'COMPLETATO' ? 'secondary' : 'danger'}`}>{app.stato.toLowerCase()}</span>
                                            </div>
                                            <div className="mt-2 d-flex gap-2">
                                                {app.tipoAppuntamento === 'virtuale' && app.stato === 'CONFERMATO' && app.linkVideocall && (
                                                    <a href={app.linkVideocall} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-info">
                                                        Vai alla Videocall
                                                    </a>
                                                )}
                                                {app.stato === 'CONFERMATO' && (
                                                    <button className="btn btn-danger btn-sm" onClick={() => handleAnnullaAppuntamento(app.id)}>
                                                        Annulla
                                                    </button>
                                                )}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="alert alert-info text-center mt-3">
                                    Nessun appuntamento prenotato.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="row">
                <div className="col-12 mb-4">
                    <div className="card shadow-sm">
                        <div className="card-body">
                            <h4 className="card-title text-center">Le tue disponibilità attive</h4>
                            {disponibilitaList.length > 0 ? (
                                <ul className="list-group list-group-flush mt-3">
                                    {disponibilitaList.map((disp) => (
                                        <li key={disp.id} className="list-group-item d-flex justify-content-between align-items-center">
                                            <div>
                                                <strong>{new Date(disp.data).toLocaleDateString('it-IT')}</strong> dalle <strong>{disp.oraInizio}</strong> alle <strong>{disp.oraFine}</strong>
                                                <br/>
                                                <small className="text-muted">Prestazione: {disp.prestazione.nome} ({disp.prestazione.costo}€)</small>
                                                <br/>
                                                {disp.prenotato ? (
                                                    <span className="badge bg-secondary">Prenotata</span>
                                                ) : (
                                                    <span className="badge bg-success">Libera</span>
                                                )}
                                            </div>
                                            <button 
                                                className="btn btn-outline-danger btn-sm" 
                                                onClick={() => handleEliminaDisponibilita(disp.id)}
                                                disabled={disp.prenotato}
                                                title={disp.prenotato ? "Non puoi eliminare una disponibilità già prenotata" : "Elimina disponibilità"}
                                            >
                                                Elimina
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="alert alert-info text-center mt-3">
                                    Nessuna disponibilità attiva trovata.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MedicoDashboard;