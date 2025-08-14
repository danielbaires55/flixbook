import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';

const API_BASE_URL = 'http://localhost:8080/api';

const PazienteRegistrationForm: React.FC = () => {
    const [formData, setFormData] = useState({
        nome: '',
        cognome: '',
        email: '',
        passwordHash: '', // Nome del campo corretto
        telefono: '',
        dataNascita: '',
        indirizzo: '',
        citta: '',
        provincia: '',
        cap: ''
    });
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const navigate = useNavigate();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prevData => ({
            ...prevData,
            [name]: value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        try {
            await axios.post(`${API_BASE_URL}/pazienti/register`, formData);
            setSuccess("Registrazione completata con successo! Ora puoi effettuare il login.");
            navigate('/login');
        } catch (err) {
            if (axios.isAxiosError(err) && err.response) {
                if (err.response.status === 409) {
                    setError("Questa email è già in uso. Prova con un'altra email.");
                } else {
                    // Gestione di altri errori, come "rawPassword cannot be null"
                    setError(err.response.data || "Errore nella registrazione. Riprova più tardi.");
                }
            } else {
                setError("Errore di rete. Controlla la tua connessione.");
            }
        }
    };

    return (
        <div className="container mt-5">
            <div className="row justify-content-center">
                <div className="col-md-6">
                    <div className="card">
                        <div className="card-body">
                            <h2 className="card-title text-center mb-4">Registrazione Paziente</h2>
                            {error && <div className="alert alert-danger">{error}</div>}
                            {success && <div className="alert alert-success">{success}</div>}
                            <form onSubmit={handleSubmit}>
                                <div className="mb-3">
                                    <label htmlFor="nome" className="form-label">Nome</label>
                                    <input type="text" className="form-control" id="nome" name="nome" value={formData.nome} onChange={handleChange} required />
                                </div>
                                <div className="mb-3">
                                    <label htmlFor="cognome" className="form-label">Cognome</label>
                                    <input type="text" className="form-control" id="cognome" name="cognome" value={formData.cognome} onChange={handleChange} required />
                                </div>
                                <div className="mb-3">
                                    <label htmlFor="email" className="form-label">Email</label>
                                    <input type="email" className="form-control" id="email" name="email" value={formData.email} onChange={handleChange} required />
                                </div>
                                <div className="mb-3">
                                    <label htmlFor="passwordHash" className="form-label">Password</label>
                                    <input type="password" className="form-control" id="passwordHash" name="passwordHash" value={formData.passwordHash} onChange={handleChange} required />
                                </div>
                                <div className="mb-3">
                                    <label htmlFor="telefono" className="form-label">Telefono</label>
                                    <input type="tel" className="form-control" id="telefono" name="telefono" value={formData.telefono} onChange={handleChange} />
                                </div>
                                <div className="mb-3">
                                    <label htmlFor="dataNascita" className="form-label">Data di Nascita</label>
                                    <input type="date" className="form-control" id="dataNascita" name="dataNascita" value={formData.dataNascita} onChange={handleChange} />
                                </div>
                                <div className="mb-3">
                                    <label htmlFor="indirizzo" className="form-label">Indirizzo</label>
                                    <input type="text" className="form-control" id="indirizzo" name="indirizzo" value={formData.indirizzo} onChange={handleChange} />
                                </div>
                                <div className="mb-3">
                                    <label htmlFor="citta" className="form-label">Città</label>
                                    <input type="text" className="form-control" id="citta" name="citta" value={formData.citta} onChange={handleChange} />
                                </div>
                                <div className="mb-3">
                                    <label htmlFor="provincia" className="form-label">Provincia</label>
                                    <input type="text" className="form-control" id="provincia" name="provincia" value={formData.provincia} onChange={handleChange} />
                                </div>
                                <div className="mb-3">
                                    <label htmlFor="cap" className="form-label">CAP</label>
                                    <input type="text" className="form-control" id="cap" name="cap" value={formData.cap} onChange={handleChange} />
                                </div>
                                <button type="submit" className="btn btn-primary w-100">Registrati</button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PazienteRegistrationForm;