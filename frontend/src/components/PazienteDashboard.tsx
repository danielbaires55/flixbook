import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';

// Assicurati che 'Paziente' sia importato dal tuo file di tipi
import type { Paziente } from '../types/types'; 

const API_BASE_URL = 'http://localhost:8080/api';

const PazienteDashboard = () => {
    const [profile, setProfile] = useState<Paziente | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchPazienteProfile = async () => {
            const token = localStorage.getItem('jwtToken');
            if (!token) {
                setError('Nessun token JWT trovato. Effettua il login.');
                setLoading(false);
                return;
            }

            try {
                const response = await axios.get<Paziente>(`${API_BASE_URL}/pazienti/profile`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                setProfile(response.data);
            } catch (err) {
                console.error('Errore nel recupero dei dati protetti:', err);
                setError('Impossibile caricare il profilo. Riprova più tardi.');
            } finally {
                setLoading(false);
            }
        };

        fetchPazienteProfile();
    }, []);

    if (loading) {
        return <div className="text-center mt-5">Caricamento profilo paziente...</div>;
    }

    if (error) {
        return <div className="alert alert-danger mt-5">{error}</div>;
    }

    if (!profile) {
        return <div className="alert alert-info mt-5">Nessun profilo trovato.</div>;
    }

    return (
        <div className="container mt-5">
            <div className="row justify-content-center">
                <div className="col-md-8">
                    <div className="card shadow-sm">
                        <div className="card-body text-center">
                            <h1 className="card-title">Benvenuto, {profile.nome}!</h1>
                            <p className="card-text text-muted">
                                Dashboard personale del paziente
                            </p>
                            <hr />
                            <div className="mt-4">
                                <h4>Le tue informazioni</h4>
                                <ul className="list-group list-group-flush text-start">
                                    <li className="list-group-item"><strong>Nome:</strong> {profile.nome}</li>
                                    <li className="list-group-item"><strong>Cognome:</strong> {profile.cognome}</li>
                                    <li className="list-group-item"><strong>Email:</strong> {profile.email}</li>
                                    {/* Aggiungi altri campi del profilo qui */}
                                </ul>
                            </div>

                            <div className="mt-5">
                                <h4 className="mb-3">Vuoi prenotare un nuovo appuntamento?</h4>
                                <p>Esplora le specialità disponibili e trova l'orario perfetto per te.</p>
                                
                                {/* Bottone che reindirizza al BookingCalendar */}
                                <Link to="/prenota-appuntamento" className="btn btn-primary btn-lg">
                                    Prenota un Appuntamento
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PazienteDashboard;