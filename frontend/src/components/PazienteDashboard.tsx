import React, { useState, useEffect } from 'react';
import axios from 'axios';
import type { Paziente } from '../types/types';

// Funzione per il recupero dei dati del paziente
const fetchPazienteProfile = async () => {
    const token = localStorage.getItem('jwtToken');
    if (!token) {
        console.error('Nessun token JWT trovato.');
        return null;
    }

    try {
        const response = await axios.get('http://localhost:8080/api/pazienti/profile', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        return response.data;
    } catch (err) {
        console.error('Errore nel recupero dei dati protetti:', err);
        return null;
    }
};

const PazienteDashboard = () => {
    const [profile, setProfile] = useState<Paziente | null>(null);

    useEffect(() => {
        const getProfile = async () => {
            const data = await fetchPazienteProfile();
            setProfile(data);
        };
        getProfile();
    }, []);

    if (!profile) {
        return <div>Caricamento profilo paziente...</div>;
    }

    return (
        <div>
            <h1>Dashboard Paziente</h1>
            <p>Benvenuto, {profile.nome} {profile.cognome}</p>
            {/* Qui puoi aggiungere altri dati specifici del paziente */}
        </div>
    );
};

export default PazienteDashboard;