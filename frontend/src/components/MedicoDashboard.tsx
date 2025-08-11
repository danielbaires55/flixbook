import React, { useState, useEffect } from 'react';
import axios from 'axios';
import type { Medico } from '../types/types';
const fetchMedicoProfile = async () => {
    const token = localStorage.getItem('jwtToken');
    if (!token) {
        // Puoi reindirizzare l'utente al login qui
        console.error('Nessun token JWT trovato.');
        return null;
    }

    try {
        const response = await axios.get('http://localhost:8080/api/medici/profile', {
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

const MedicoDashboard = () => {
 
const [profile, setProfile] = useState<Medico | null>(null);
    // useEffect esegue la funzione una volta che il componente è montato
    useEffect(() => {
        const getProfile = async () => {
            const data = await fetchMedicoProfile();
            setProfile(data);
        };
        getProfile();
    }, []); // L'array vuoto assicura che venga eseguito una sola volta

    if (!profile) {
        return <div>Caricamento profilo...</div>;
    }

    return (
        <div>
            <h1>Dashboard Medico</h1>
            <p>Benvenuto, {profile.nome} {profile.cognome}</p>
            {/* Ora TypeScript sa che profile ha le proprietà nome e cognome */}
        </div>
    );
};

export default MedicoDashboard;