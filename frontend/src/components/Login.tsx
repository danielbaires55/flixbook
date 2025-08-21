import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import type { JwtPayload } from 'jwt-decode';

// Interfaccia personalizzata per il token
interface MyJwtPayload extends JwtPayload {
    role: 'MEDICO' | 'PAZIENTE'; 
}

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const response = await axios.post('http://localhost:8080/api/auth/login', { email, password });
            const { token } = response.data;

            localStorage.setItem('jwtToken', token);
            console.log('Login riuscito:', response.data);

            const decodedToken = jwtDecode<MyJwtPayload>(token);
            const userRole = decodedToken.role;

            if (userRole === 'MEDICO') {
                navigate('/medico-dashboard');
            } else if (userRole === 'PAZIENTE') {
                navigate('/paziente-dashboard');
            } else {
                console.error('Ruolo utente non riconosciuto:', userRole);
            }

        } catch (error) {
            console.error('Errore di login:', error);
            alert('Credenziali non valide');
        }
    };
    
    return (
        <form onSubmit={handleLogin}>
            <div>
                <label>Email:</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
                <label>Password:</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <button type="submit">Login</button>
        </form>
    );
};

export default Login;