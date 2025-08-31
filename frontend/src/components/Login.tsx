import { useEffect, useState, type FC } from 'react';
import './css/Login.css'; 

import axios from 'axios';
import { useNavigate, useLocation, Link } from 'react-router-dom'; // 1. Aggiungi Link
import { useAuth } from '../context/useAuth';
import logoImage from '../assets/benessere-logo.png';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';


interface LoginProps {
  onClose?: () => void;
  // onRegistratiClick non è più necessario se usiamo un Link diretto
}

const Login: FC<LoginProps> = () => { // Rimosso onRegistratiClick dalle props

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberEmail, setRememberEmail] = useState(true);
    const [savedEmails, setSavedEmails] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useAuth();
    
    const from = location.state?.from?.pathname || null;

    const STORAGE_KEY = 'flixbook.savedEmails';

    useEffect(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const list = JSON.parse(raw) as string[];
                if (Array.isArray(list)) {
                    setSavedEmails(list.filter(Boolean));
                }
            }
        } catch (e) {
            // Ignora errori di parsing/localStorage non disponibili (es. privacy mode)
            console.warn('Impossibile leggere email salvate', e);
        }
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        try {
            const response = await axios.post('http://localhost:8080/api/auth/login', { email, password });
            
            login(response.data);
            const { role } = response.data;

            // Salva l'email se richiesto
            if (rememberEmail && email) {
                try {
                    const next = Array.from(new Set([email.trim(), ...savedEmails])).filter(Boolean).slice(0, 5);
                    setSavedEmails(next);
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
                } catch (e) {
                    console.warn('Impossibile salvare email', e);
                }
            }

            if (from) {
                navigate(from, { replace: true });
            } else {
                if (role === 'ROLE_MEDICO' || role === 'ROLE_COLLABORATORE') {
                    navigate('/medico-dashboard', { replace: true });
                } else if (role === 'ROLE_PAZIENTE') {
                    navigate('/paziente-dashboard', { replace: true });
                } else if (role === 'ROLE_ADMIN') {
                    // Admin: manda alla sezione admin (medici) o alla dashboard medico condivisa
                    navigate('/admin/medici', { replace: true });
                } else {
                    setError('Ruolo utente non valido.');
                }
            }
        } catch (err) {
            console.error('Errore di login:', err);
            setError('Credenziali non valide.');
        }
    };

    return (
        <div className="login-bozza-container">
            <div className="login-bozza-modal">
                <div className="login-header">
                    <h1 className="login-title">Accedi</h1>
                    <img src={logoImage} alt="Logo Clinica Benessere" className="login-logo" />
                </div>
                <form onSubmit={handleLogin} className="login-form">
                    <div className="form-field">
                        <label className="field-label">
                            <span className="required-asterisk">*</span> Email
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Inserisci email"
                            className="form-input"
                            list="saved-emails"
                            required
                        />
                        {savedEmails.length > 0 && (
                            <datalist id="saved-emails">
                                {savedEmails.map((em) => (
                                    <option key={em} value={em} />
                                ))}
                            </datalist>
                        )}
                        <label className="inline-checkbox">
                            <input
                                type="checkbox"
                                checked={rememberEmail}
                                onChange={(e) => setRememberEmail(e.target.checked)}
                            />
                            <span>Ricorda email</span>
                        </label>
                    </div>

                    <div className="form-field">
                        <label className="field-label">
                            <span className="required-asterisk">*</span> Password
                        </label>
                        <div className="password-row">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Inserisci password"
                                className="form-input"
                                required
                                aria-label="Password"
                            />
                            <button
                                type="button"
                                className="toggle-password-btn"
                                onClick={() => setShowPassword((v) => !v)}
                                aria-pressed={showPassword}
                                aria-label={showPassword ? 'Nascondi password' : 'Mostra password'}
                            >
                                {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                            </button>
                        </div>
                    </div>

                    {error && <p className="login-error-message">{error}</p>}

                    <button type="submit" className="login-submit-btn">
                        Accedi
                    </button>
                    <div className="forgot-link">
                        <Link to="/forgot-password" className="text-decoration-none">Hai dimenticato la password?</Link>
                    </div>
                </form>

                <div className="registration-link">
                    <span className="registration-text">Non hai un account? </span>
                    <Link to="/register" className="registration-btn">
                        Registrati
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default Login;