import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
// import './PazienteDashboard.css';

interface Medico {
    id: number;
    nome: string;
    cognome: string;
}

interface Prestazione {
    id: number;
    nome: string;
    costo: number;
}

interface Disponibilita {
    id: number;
    data: string;
    oraInizio: string;
    oraFine: string;
    medico: Medico;
    prestazione: Prestazione;
}

interface Appuntamento {
    id: number;
    dataEOraInizio: string;
    dataEOraFine: string;
    stato: 'confermato' | 'completato' | 'annullato';
    tipoAppuntamento: 'fisico' | 'virtuale';
    disponibilita: Disponibilita;
    linkVideocall?: string; 
}

interface PazienteProfile {
    nome: string;
    cognome: string;
    email: string;
}

const API_BASE_URL = 'http://localhost:8080/api';

const PazienteDashboard = () => {
    const [profile, setProfile] = useState<PazienteProfile | null>(null);
    const [appuntamenti, setAppuntamenti] = useState<Appuntamento[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('jwtToken');
        if (!token) {
            navigate('/login');
            return;
        }

        const fetchAllData = async () => {
            setLoading(true);
            try {
                const profileResponse = await axios.get(`${API_BASE_URL}/pazienti/profile`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                setProfile(profileResponse.data);

                const appuntamentiResponse = await axios.get(`${API_BASE_URL}/appuntamenti/paziente`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                setAppuntamenti(appuntamentiResponse.data);
            } catch (err) {
                console.error('Errore nel recupero dei dati:', err);
                setError('Impossibile caricare i dati. Riprova più tardi.');
            } finally {
                setLoading(false);
            }
        };

        fetchAllData();
    }, [navigate]);

    const handleAnnulla = async (appuntamentoId: number) => {
        if (!window.confirm("Sei sicuro di voler annullare questo appuntamento?")) {
            return;
        }

        const token = localStorage.getItem('jwtToken');
        try {
            await axios.put(`${API_BASE_URL}/appuntamenti/annulla/${appuntamentoId}`, null, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            alert("Appuntamento annullato con successo!");
            
            const updatedAppuntamenti = appuntamenti.map(app => 
                app.id === appuntamentoId ? { ...app, stato: 'annullato' as const } : app
            );
            setAppuntamenti(updatedAppuntamenti);

        } catch (err) {
            console.error("Errore nell'annullamento dell'appuntamento", err);
            if (axios.isAxiosError(err) && err.response) {
                alert(`Errore: ${err.response.data}`);
            } else {
                alert("Errore nell'annullamento. Riprova.");
            }
        }
    };

    if (loading) {
        return <div className="text-center mt-5">Caricamento dati...</div>;
    }

    if (error) {
        return <div className="alert alert-danger mt-5">{error}</div>;
    }

    return (
        <div className="container mt-5">
            <h1 className="text-center mb-4">Dashboard Paziente</h1>
            <div className="row">
                <div className="col-md-6 mb-4">
                    <div className="card shadow-sm h-100">
                        <div className="card-body">
                            <h4 className="card-title text-center">Le tue informazioni </h4>
                            {profile && (
                                <ul className="list-group list-group-flush text-start mt-3">
                                    <li className="list-group-item"><strong>Nome:</strong> {profile.nome}</li>
                                    <li className="list-group-item"><strong>Cognome:</strong> {profile.cognome}</li>
                                    <li className="list-group-item"><strong>Email:</strong> {profile.email}</li>
                                </ul>
                            )}
                            <div className="mt-4 text-center">
                                <Link to="/prenota-appuntamento" className="btn btn-primary">
                                    Prenota un Appuntamento
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="col-md-6 mb-4">
                    <div className="card shadow-sm h-100">
                        <div className="card-body">
                            <h4 className="card-title text-center">I tuoi appuntamenti </h4>
                            {appuntamenti.length > 0 ? (
                                <ul className="list-group list-group-flush mt-3">
                                    {appuntamenti.map(app => (
                                        <li key={app.id} className="list-group-item d-flex justify-content-between align-items-center">
                                            <div>
                                                <strong>{new Date(app.dataEOraInizio).toLocaleDateString()}</strong> alle <strong>{new Date(app.dataEOraInizio).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</strong>
                                                <br />
                                                <small className="text-muted">Dr. {app.disponibilita.medico.nome} {app.disponibilita.medico.cognome}</small>
                                                <br />
                                                <small className="text-muted">Prestazione: {app.disponibilita.prestazione.nome}</small>
                                                <small className="text-muted"> Costo: {app.disponibilita.prestazione.costo}€</small>
                                                <br />
                                                <span className={`badge ${app.stato === 'confermato' ? 'bg-success' : app.stato === 'completato' ? 'bg-secondary' : 'bg-danger'}`}>
                                                    {app.stato}
                                                </span>
                                                {/* <-- LOGICA PER IL PULSANTE VIDEOCALL --> */}
                                                {app.tipoAppuntamento === 'virtuale' && app.stato === 'confermato' && app.linkVideocall && (
                                                    <div className="mt-2">
                                                        <a 
                                                            href={app.linkVideocall} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer" 
                                                            className="btn btn-sm btn-info"
                                                        >
                                                            Vai alla Videocall
                                                        </a>
                                                        {/* MESSAGGIO INFORMATIVO AGGIUNTO */}
                                                        <p className="mt-2 text-info">
                                                            Una volta entrato, potresti dover attendere l'approvazione del medico.
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                            {app.stato === 'confermato' && (
                                                <button className="btn btn-danger btn-sm" onClick={() => handleAnnulla(app.id)}>
                                                    Annulla
                                                </button>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="alert alert-info text-center mt-3">Nessun appuntamento trovato.</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PazienteDashboard;