import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import type { Medico } from '../types/types';

// La funzione per recuperare il profilo del medico rimane invariata
const fetchMedicoProfile = async () => {
    const token = localStorage.getItem('jwtToken');
    if (!token) {
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
    const navigate = useNavigate();

    useEffect(() => {
        const getProfile = async () => {
            const data = await fetchMedicoProfile();
            setProfile(data);
        };
        getProfile();
    }, []);

    const handleRedirectToCreate = () => {
        // Usa `Maps` per reindirizzare al form di creazione disponibilità
        navigate('/medico/create-disponibilita');
    };

    if (!profile) {
        return <div>Caricamento profilo...</div>;
    }

    return (
        <div>
            <h1>Dashboard Medico</h1>
            <p>Benvenuto, {profile.nome} {profile.cognome}</p>
            {/* Aggiungi un pulsante per reindirizzare */}
            <button onClick={handleRedirectToCreate}>
                Crea Nuova Disponibilità
            </button>
            {/* Qui potresti aggiungere altri componenti, come la lista delle sue disponibilità */}
        </div>
    );
};

export default MedicoDashboard;