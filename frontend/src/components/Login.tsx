import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();
    const { login } = useAuth();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        console.log("--- INIZIO DEBUG LOGIN ---");
        console.log("1. Funzione 'handleLogin' avviata.");

        try {
            console.log("2. Sto per inviare la richiesta ad Axios a 'http://localhost:8080/api/auth/login'");
            const response = await axios.post('http://localhost:8080/api/auth/login', { email, password });
            
            console.log("3. Richiesta Axios RIUSCITA. Dati ricevuti:", response.data);
            
            console.log("4. Sto per chiamare la funzione 'login' del contesto.");
            login(response.data);
            console.log("5. Funzione 'login' del contesto eseguita.");

            const { role } = response.data;
            const destination = role === 'ROLE_MEDICO' || role === 'ROLE_COLLABORATORE'
                ? '/medico-dashboard'
                : '/paziente-dashboard';

            console.log(`6. Ruolo riconosciuto: '${role}'. Sto per reindirizzare a: '${destination}'`);
            
            navigate(destination, { replace: true });
            
            console.log("7. Reindirizzamento eseguito. Se vedi questo messaggio ma non la pagina, il problema è nel routing di App.tsx.");

        } catch (err) {
            console.error("!!! ERRORE CATTURATO NEL BLOCCO CATCH !!!");
            console.error(err);
            setError('Email o password non valide.');
        }
    };
    
    return (
        <form onSubmit={handleLogin}>
            <h2>Login</h2>
            <div>
                <label>Email:</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
                <label>Password:</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            {error && <p style={{ color: 'red' }}>{error}</p>}
            <button type="submit">Login</button>
        </form>
    );
};

export default Login;