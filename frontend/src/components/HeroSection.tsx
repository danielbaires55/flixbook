import { useState, useEffect } from 'react';
import './css/HeroSection.css';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import type { JwtPayload } from 'jwt-decode';
import Button from './Button';

// Assicurati che il percorso dell'immagine sia corretto
import logoImage from '../assets/hero-logo.png'; 

interface MyJwtPayload extends JwtPayload {
    role: 'MEDICO' | 'PAZIENTE';
    sub: string;
}

interface UserProfile {
    nome: string;
    ruolo: string;
}

const getStoredUser = (): UserProfile | null => {
    const token = localStorage.getItem('jwtToken');
    if (!token) return null;
    try {
        const decodedToken = jwtDecode<MyJwtPayload>(token);
        const userRole = decodedToken.role;
        const userName = decodedToken.sub.split('@')[0];
        return { nome: userName, ruolo: userRole };
    } catch {
        return null;
    }
};

function HeroSection() {
    const navigate = useNavigate();
    const [user, setUser] = useState<UserProfile | null>(null);

    useEffect(() => {
        setUser(getStoredUser());
    }, []);

const handlePrenotaClick = () => {
    // Controlla se l'utente è loggato
    if (user) {
        // Se l'utente è loggato, lo reindirizziamo al calendario di prenotazione o alla sua dashboard
        if (user.ruolo === 'PAZIENTE') {
            navigate('/book');
        } else if (user.ruolo === 'MEDICO') {
            navigate('/medico-dashboard');
        }
    } else {
        // Se l'utente non è loggato, lo reindirizziamo alla pagina di login
        navigate('/login');
    }
};

    return (
        <div className="hero-section">
            <div className="hero-content">
                <div className="hero-text-content">
                    <h1 className="hero-title">Benvenuto in Flixbook!</h1>
                    <p className="hero-description">
                        La tua salute è la nostra priorità. Con la nostra nuova piattaforma online, puoi trovare lo specialista più adatto a te e prenotare una visita in pochi semplici click. Gestisci i tuoi appuntamenti in totale autonomia, con la professionalità e la cura che ci contraddistinguono.
                    </p>
                    <Button onClick={handlePrenotaClick}>Prenota</Button>
                </div>
                <div className="hero-image-placeholder">
                    <img src={logoImage} alt="Flixbook Logo" className="hero-logo" />
                </div>
            </div>
        </div>
    );
}

export default HeroSection;