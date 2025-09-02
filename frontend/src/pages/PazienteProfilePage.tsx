import { useState, useEffect, type FC } from 'react';
import axios from 'axios';
import { useAuth } from '../context/useAuth';
import 'bootstrap/dist/css/bootstrap.min.css';

const API_BASE_URL = 'http://localhost:8080/api';

// Interfaccia per i dati del profilo del paziente
interface PazienteProfile {
  nome: string;
  cognome: string;
  email: string;
  telefono: string;
  dataNascita: string;
  indirizzo: string;
  citta: string;
  provincia: string;
  cap: string;
    codiceFiscale?: string;
}

const PazienteProfiloPage: FC = () => {
    const { user } = useAuth();
    // Stato per i dati del profilo che verranno modificati
    const [formData, setFormData] = useState<Partial<PazienteProfile>>({});
    // Stato separato per i dati della password
    const [passwordData, setPasswordData] = useState({ vecchiaPassword: '', nuovaPassword: '', confermaPassword: '' });
    // Stato per mostrare/nascondere la sezione sicurezza
    const [showSecurity, setShowSecurity] = useState(false);
    
    // Stati per i messaggi di feedback all'utente
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    // Carica i dati attuali del profilo quando il componente viene montato
    useEffect(() => {
        if (user) {
            const headers = { Authorization: `Bearer ${user.token}` };
            axios.get<PazienteProfile>(`${API_BASE_URL}/pazienti/profile`, { headers })
                .then(response => {
                    // Pre-compila il form con i dati esistenti
                    setFormData(response.data);
                })
                .catch(err => {
                    console.error("Errore nel caricamento del profilo", err);
                    setError("Impossibile caricare i dati del profilo.");
                });
        }
    }, [user]);

    // Gestore per la modifica dei campi del profilo
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // Gestore per l'invio del form del profilo
    const handleProfileSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setMessage(''); setError('');
        // Validazione Codice Fiscale (16 caratteri alfanumerici)
        const cf = (formData.codiceFiscale || '').toUpperCase().trim();
        const cfOk = /^[A-Z0-9]{16}$/.test(cf);
        if (!cfOk) {
            setError('Inserisci un Codice Fiscale valido (16 caratteri alfanumerici).');
            return;
        }
        try {
            const headers = { Authorization: `Bearer ${user.token}` };
            await axios.put(`${API_BASE_URL}/pazienti/profilo`, { ...formData, codiceFiscale: cf }, { headers });
            setMessage('Profilo aggiornato con successo!');
        } catch {
            setError('Errore durante l\'aggiornamento del profilo.');
        }
    };

    // Gestore per l'invio del form della password
    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setMessage(''); setError('');

        if (passwordData.nuovaPassword !== passwordData.confermaPassword) {
            setError('Le nuove password non corrispondono.');
            return;
        }
        try {
            const headers = { Authorization: `Bearer ${user.token}` };
            const payload = { 
                vecchiaPassword: passwordData.vecchiaPassword, 
                nuovaPassword: passwordData.nuovaPassword 
            };
            await axios.put(`${API_BASE_URL}/pazienti/profilo/password`, payload, { headers });
            setMessage('Password aggiornata con successo!');
            setPasswordData({ vecchiaPassword: '', nuovaPassword: '', confermaPassword: '' });
        } catch (err: unknown) {
            if (axios.isAxiosError(err)) {
                setError(err.response?.data || 'Errore durante l\'aggiornamento della password.');
            } else {
                setError('Errore durante l\'aggiornamento della password.');
            }
        }
    };

    if (!formData.nome) return <div className="container mt-5 text-center"><h3>Caricamento...</h3></div>;

    return (
        <div className="container my-5">
            <h2 className="text-center mb-4">Gestisci il Tuo Profilo</h2>
            {message && <div className="alert alert-success">{message}</div>}
            {error && <div className="alert alert-danger">{error}</div>}
            
            <div className="row g-4">
                {/* --- Form Dati Personali --- */}
                <div className="col-lg-7">
                    <div className="card shadow-sm h-100">
                        <div className="card-body p-4">
                            <h4 className="card-title mb-3">Dati Personali</h4>
                            <form onSubmit={handleProfileSubmit}>
                                <div className="row">
                                    <div className="col-md-6 mb-3"><label className="form-label">Nome</label><input type="text" name="nome" className="form-control" value={formData.nome || ''} onChange={handleChange} /></div>
                                    <div className="col-md-6 mb-3"><label className="form-label">Cognome</label><input type="text" name="cognome" className="form-control" value={formData.cognome || ''} onChange={handleChange} /></div>
                                    <div className="col-md-6 mb-3"><label className="form-label">Telefono</label><input type="tel" name="telefono" className="form-control" value={formData.telefono || ''} onChange={handleChange} /></div>
                                    <div className="col-md-6 mb-3"><label className="form-label">Data di Nascita</label><input type="date" name="dataNascita" className="form-control" value={formData.dataNascita || ''} onChange={handleChange} /></div>
                                    <div className="col-12 mb-3">
                                        <label className="form-label">Codice Fiscale</label>
                                        <input
                                            type="text"
                                            name="codiceFiscale"
                                            className="form-control"
                                            value={(formData.codiceFiscale || '').toUpperCase()}
                                            onChange={(e) => setFormData({ ...formData, codiceFiscale: e.target.value.toUpperCase() })}
                                            placeholder="ES. RSSMRA85M01H501Z"
                                            maxLength={16}
                                            required
                                        />
                                        <div className="form-text">Obbligatorio per emettere documenti fiscali e per le videoconsulenze.</div>
                                    </div>
                                    <div className="col-12 mb-3"><label className="form-label">Indirizzo</label><input type="text" name="indirizzo" className="form-control" value={formData.indirizzo || ''} onChange={handleChange} /></div>
                                    <div className="col-md-5 mb-3"><label className="form-label">Città</label><input type="text" name="citta" className="form-control" value={formData.citta || ''} onChange={handleChange} /></div>
                                    <div className="col-md-4 mb-3"><label className="form-label">Provincia</label><input type="text" name="provincia" className="form-control" value={formData.provincia || ''} onChange={handleChange} /></div>
                                    <div className="col-md-3 mb-3"><label className="form-label">CAP</label><input type="text" name="cap" className="form-control" value={formData.cap || ''} onChange={handleChange} /></div>
                                </div>
                                                                <div className="d-flex justify-content-end">
                                                                    <button type="submit" className="btn btn-primary px-4">Salva Dati</button>
                                                                </div>
                            </form>
                        </div>
                    </div>
                </div>
                {/* --- Form Cambio Password --- */}
                <div className="col-lg-5">
                    <div className="card shadow-sm h-100">
                                                <div className="card-body p-4">
                                                        <div className="d-flex align-items-center justify-content-between mb-2">
                                                            <h4 className="card-title mb-0">Sicurezza</h4>
                                                            <button
                                                                type="button"
                                                                className={`btn btn-sm ${showSecurity ? 'btn-outline-secondary' : 'btn-secondary'}`}
                                                                onClick={() => setShowSecurity(v => !v)}
                                                                aria-expanded={showSecurity}
                                                                aria-controls="security-section"
                                                                title={showSecurity ? 'Chiudi impostazioni sicurezza' : 'Apri impostazioni sicurezza'}
                                                            >
                                                                {/* lock icon */}
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" aria-hidden>
                                                                    <path d="M8 1a3 3 0 0 0-3 3v3H4a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-1V4a3 3 0 0 0-3-3m2 6V4a2 2 0 1 0-4 0v3z"/>
                                                                </svg>
                                                                <span className="ms-2">{showSecurity ? 'Chiudi' : 'Sicurezza'}</span>
                                                            </button>
                                                        </div>
                                                        {!showSecurity && (
                                                            <p className="text-muted small mb-0">Gestisci le impostazioni di sicurezza del tuo account.</p>
                                                        )}
                                                        {showSecurity && (
                                                            <div id="security-section" className="mt-3">
                                                                <h6 className="mb-3">Cambia Password</h6>
                                                                <form onSubmit={handlePasswordSubmit}>
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
                                                                    <div className="d-flex justify-content-end">
                                                                        <button type="submit" className="btn btn-secondary px-4">Cambia Password</button>
                                                                    </div>
                                                                </form>
                                                            </div>
                                                        )}
                                                </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PazienteProfiloPage;