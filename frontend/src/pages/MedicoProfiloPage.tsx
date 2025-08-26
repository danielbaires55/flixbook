import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/useAuth';
import 'bootstrap/dist/css/bootstrap.min.css';

const API_BASE_URL = 'http://localhost:8080/api';
const SERVER_BASE_URL = 'http://localhost:8080';

interface MedicoProfile {
  nome: string;
  cognome: string;
  email: string;
  telefono: string;
  biografia: string;
  imgProfUrl: string;
}

const MedicoProfiloPage: React.FC = () => {
    const { user } = useAuth();
    const [profile, setProfile] = useState<MedicoProfile | null>(null);
    const [formData, setFormData] = useState({ nome: '', cognome: '', telefono: '', biografia: '' });
    const [passwordData, setPasswordData] = useState({ vecchiaPassword: '', nuovaPassword: '', confermaPassword: '' });
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (user) {
            const headers = { Authorization: `Bearer ${user.token}` };
            axios.get<MedicoProfile>(`${API_BASE_URL}/medici/profile`, { headers })
                .then(response => {
                    setProfile(response.data);
                    setFormData({
                        nome: response.data.nome || '',
                        cognome: response.data.cognome || '',
                        telefono: response.data.telefono || '',
                        biografia: response.data.biografia || '',
                    });
                })
                .catch(console.error);
        }
    }, [user]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const handleProfileSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setMessage('');
        setError('');
        
        try {
            const headers = { Authorization: `Bearer ${user.token}` };

            // Task 1: Aggiorna i dati del profilo (testo)
            await axios.put(`${API_BASE_URL}/medici/profilo`, formData, { headers });

            // Task 2: Se è stato selezionato un nuovo file, caricalo
            if (selectedFile) {
                const fileUploadData = new FormData();
                fileUploadData.append('file', selectedFile);
                
                await axios.post(`${API_BASE_URL}/medici/profilo/immagine`, fileUploadData, { headers });
            }

            setMessage('Profilo aggiornato con successo! La pagina verrà ricaricata per mostrare le modifiche.');
            setTimeout(() => window.location.reload(), 2000);

        } catch {
            setError('Errore nell\'aggiornamento del profilo.');
        }
    };

    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setMessage('');
        setError('');

        if (passwordData.nuovaPassword !== passwordData.confermaPassword) {
            setError('Le nuove password non corrispondono.');
            return;
        }

        try {
            const headers = { Authorization: `Bearer ${user.token}` };
            const payload = { vecchiaPassword: passwordData.vecchiaPassword, nuovaPassword: passwordData.nuovaPassword };
            await axios.put(`${API_BASE_URL}/medici/profilo/password`, payload, { headers });
            setMessage('Password aggiornata con successo!');
            setPasswordData({ vecchiaPassword: '', nuovaPassword: '', confermaPassword: '' });
        } catch (err: unknown) {
            if (axios.isAxiosError(err) && err.response) {
                setError(err.response.data || 'Errore nell\'aggiornamento della password. Controlla che la vecchia password sia corretta.');
            } else {
                setError('Errore nell\'aggiornamento della password. Controlla che la vecchia password sia corretta.');
            }
        }
    };

    if (!profile) return <div className="container mt-5 text-center"><h3>Caricamento...</h3></div>;

    return (
        <div className="container my-5">
            {message && <div className="alert alert-success">{message}</div>}
            {error && <div className="alert alert-danger">{error}</div>}

            <div className="row g-5">
                {/* --- Form Dati Profilo --- */}
                <div className="col-lg-7">
                    <div className="card shadow-sm h-100">
                        <div className="card-body p-4">
                            <h3 className="card-title text-center mb-4">Modifica Profilo</h3>
                            <form onSubmit={handleProfileSubmit}>
                                <div className="row">
                                    <div className="col-md-4 text-center">
                                        <img 
                                            src={`${SERVER_BASE_URL}${profile.imgProfUrl}?t=${new Date().getTime()}`} 
                                            alt="Profilo" 
                                            className="rounded-circle mb-3"
                                            style={{ width: '150px', height: '150px', objectFit: 'cover' }}
                                        />
                                        <label htmlFor="immagineProfilo" className="form-label">Cambia immagine</label>
                                        <input 
                                            className="form-control form-control-sm" 
                                            type="file" 
                                            id="immagineProfilo" 
                                            onChange={handleFileChange} 
                                            accept="image/png, image/jpeg" 
                                        />
                                    </div>
                                    <div className="col-md-8">
                                        <div className="mb-3"><label className="form-label">Nome</label><input type="text" className="form-control" value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} /></div>
                                        <div className="mb-3"><label className="form-label">Cognome</label><input type="text" className="form-control" value={formData.cognome} onChange={e => setFormData({...formData, cognome: e.target.value})} /></div>
                                        <div className="mb-3"><label className="form-label">Telefono</label><input type="tel" className="form-control" value={formData.telefono} onChange={e => setFormData({...formData, telefono: e.target.value})} /></div>
                                    </div>
                                </div>
                                <div className="mb-3 mt-3"><label className="form-label">Biografia</label><textarea className="form-control" rows={4} value={formData.biografia} onChange={e => setFormData({...formData, biografia: e.target.value})} /></div>
                                <button type="submit" className="btn btn-primary w-100">Salva Dati Profilo</button>
                            </form>
                        </div>
                    </div>
                </div>

                {/* --- Form Cambio Password --- */}
                <div className="col-lg-5">
                    <div className="card shadow-sm h-100">
                        <div className="card-body p-4 d-flex flex-column">
                            <h3 className="card-title text-center">Cambia Password</h3>
                            <form onSubmit={handlePasswordSubmit} className="d-flex flex-column flex-grow-1">
                                <div className="mb-3">
                                    <label className="form-label">Vecchia Password</label>
                                    <input type="password" required className="form-control" value={passwordData.vecchiaPassword} onChange={e => setPasswordData({...passwordData, vecchiaPassword: e.target.value})} />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label">Nuova Password</label>
                                    <input type="password" required className="form-control" value={passwordData.nuovaPassword} onChange={e => setPasswordData({...passwordData, nuovaPassword: e.target.value})} />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label">Conferma Nuova Password</label>
                                    <input type="password" required className="form-control" value={passwordData.confermaPassword} onChange={e => setPasswordData({...passwordData, confermaPassword: e.target.value})} />
                                </div>
                                <div className="mt-auto">
                                    <button type="submit" className="btn btn-secondary w-100">Cambia Password</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MedicoProfiloPage;