import React, { useState } from 'react';
import './css/Login.css'; 

import axios from 'axios';
import { useNavigate, useLocation, Link } from 'react-router-dom'; // 1. Aggiungi Link
import { useAuth } from '../context/useAuth';
import logoImage from '../assets/logo-notext.png';


interface LoginProps {
  onClose?: () => void;
  // onRegistratiClick non è più necessario se usiamo un Link diretto
}

const Login: React.FC<LoginProps> = () => { // Rimosso onRegistratiClick dalle props

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useAuth();
    
    const from = location.state?.from?.pathname || null;

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        try {
            const response = await axios.post('http://localhost:8080/api/auth/login', { email, password });
            
            login(response.data);
            const { role } = response.data;

            if (from) {
                navigate(from, { replace: true });
            } else {
                if (role === 'ROLE_MEDICO' || role === 'ROLE_COLLABORATORE') {
                    navigate('/medico-dashboard', { replace: true });
                } else if (role === 'ROLE_PAZIENTE') {
                    navigate('/paziente-dashboard', { replace: true });
                } else {
                    setError('Ruolo utente non valido.');
                }
            }
        } catch (err) {
            console.error("Errore di login:", err);
            setError('Email o password non valide.');
        }
    };

    return (
        <div className="login-bozza-container">
            <div className="login-bozza-modal">
                <div className="login-logo-container">
                    <img src={logoImage} alt="Logo" className="login-logo" />
                </div>
                <h1 className="login-title">Accedi</h1>
                <form onSubmit={handleLogin} className="login-form">
                    <div className="form-field">
                        <label className="field-label">
                            <span className="required-asterisk">*</span> Email
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Inserire email"
                            className="form-input"
                            required
                        />
                    </div>

                    <div className="form-field">
                        <label className="field-label">
                            <span className="required-asterisk">*</span> Password
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Inserire password"
                            className="form-input"
                            required
                        />
                    </div>

                    {error && <p className="login-error-message">{error}</p>}

                    <button type="submit" className="login-submit-btn">
                        Accedi
                    </button>
                </form>

                <div className="registration-link">
                    <span className="registration-text">Non hai ancora un account? </span>
                    <Link to="/register" className="registration-btn">
                        Registrati
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default Login;