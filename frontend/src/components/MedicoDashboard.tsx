import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import type { Medico, Appuntamento, Prestazione, Paziente } from '../types/types';

const API_BASE_URL = 'http://localhost:8080/api';

// Interfaccia per la disponibilità con l'aggiunta di paziente e prestazione
interface Disponibilita {
    id: number;
    data: string;
    oraInizio: string;
    oraFine: string;
    medico: Medico;
    prestazione: Prestazione;
    dataInizio: string;
    dataFine: string;
    attiva: boolean;
}

// Interfaccia per l'appuntamento con tutti i campi necessari
interface AppuntamentoDetails extends Appuntamento {
    paziente: Paziente;
    disponibilita: Disponibilita;
}

const MedicoDashboard = () => {
    const [profile, setProfile] = useState<Medico | null>(null);
    const [appuntamenti, setAppuntamenti] = useState<AppuntamentoDetails[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    // Funzione per il recupero di tutti i dati
    useEffect(() => {
        const token = localStorage.getItem('jwtToken');
        if (!token) {
            navigate('/login');
            return;
        }

        const fetchAllData = async () => {
            setLoading(true);
            try {
                // Fetch del profilo del medico
                const profileResponse = await axios.get(`${API_BASE_URL}/medici/profile`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                setProfile(profileResponse.data);

                // Fetch degli appuntamenti del medico
                const appuntamentiResponse = await axios.get(`${API_BASE_URL}/appuntamenti/medico`, {
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
    
    // Funzione per gestire l'annullamento di un appuntamento
    const handleAnnulla = async (appuntamentoId: number) => {
        if (!window.confirm("Sei sicuro di voler annullare questo appuntamento?")) {
            return;
        }
    
        const token = localStorage.getItem('jwtToken');
        try {
            await axios.put(`${API_BASE_URL}/appuntamenti/medico/annulla/${appuntamentoId}`, null, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            alert("Appuntamento annullato con successo!");
            
            // Aggiorna lo stato dell'appuntamento nel frontend senza ricaricare la pagina
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
    
    // Funzione per reindirizzare alla creazione delle disponibilità
    const handleRedirectToCreate = () => {
        navigate('/medico/create-disponibilita');
    };

    if (loading) {
        return <div className="text-center mt-5">Caricamento dati...</div>;
    }

    if (error) {
        return <div className="alert alert-danger mt-5">{error}</div>;
    }

    return (
        <div className="container mt-5">
            <h1 className="text-center mb-4">Dashboard Medico</h1>
            <div className="row">
                <div className="col-md-6 mb-4">
                    <div className="card shadow-sm h-100">
                        <div className="card-body text-center">
                            <h4 className="card-title">Il tuo profilo</h4>
                            {profile && (
                                <>
                                    <p className="lead mt-3">{profile.nome} {profile.cognome}</p>
                                    <p className="text-muted">{profile.email}</p>
                                </>
                            )}
                            <button className="btn btn-primary mt-3" onClick={handleRedirectToCreate}>
                                Gestisci le tue disponibilità
                            </button>
                        </div>
                    </div>
                </div>
                
                <div className="col-md-6 mb-4">
                    <div className="card shadow-sm h-100">
                        <div className="card-body">
                            <h4 className="card-title text-center">Appuntamenti prenotati</h4>
                            {appuntamenti.length > 0 ? (
                                <ul className="list-group list-group-flush mt-3">
                                    {appuntamenti.map(app => (
                                        <li key={app.id} className="list-group-item d-flex flex-column flex-sm-row justify-content-between align-items-center">
                                            <div className="text-start">
                                                <strong>{new Date(app.dataEOraInizio).toLocaleDateString()}</strong> alle <strong>{new Date(app.dataEOraInizio).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</strong>
                                                <br />
                                                <small className="text-muted">Paziente: {app.paziente.nome} {app.paziente.cognome}</small>
                                                <br />
                                                <small className="text-muted">Prestazione: {app.disponibilita.prestazione.nome}</small>
                                                <br />
                                                <span className={`badge ${app.stato === 'confermato' ? 'bg-success' : app.stato === 'completato' ? 'bg-secondary' : 'bg-danger'}`}>
                                                    {app.stato}
                                                </span>
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
                                                            Clicca sul link e attendi l'accesso del paziente per accettarlo nella stanza.
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                            {app.stato === 'confermato' && (
                                                <button className="btn btn-danger btn-sm mt-2 mt-sm-0" onClick={() => handleAnnulla(app.id)}>
                                                    Annulla Appuntamento
                                                </button>
                                            )}
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
        </div>
    );
};

export default MedicoDashboard;