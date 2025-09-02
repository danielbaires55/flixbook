import { useState, useEffect, type FC } from 'react';
import axios from 'axios';
import { useAuth } from '../context/useAuth';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Modal, Button, Collapse } from 'react-bootstrap';
import './MedicoProfiloPage.css';

import { API_BASE_URL, SERVER_BASE_URL } from '../config/api';

interface MedicoProfile {
  nome: string;
  cognome: string;
  email: string;
  telefono: string;
  biografia: string;
  imgProfUrl: string;
}

const MedicoProfiloPage: FC = () => {
    const { user } = useAuth();
    const [profile, setProfile] = useState<MedicoProfile | null>(null);
    const [formData, setFormData] = useState({ nome: '', cognome: '', telefono: '', biografia: '' });
    const [passwordData, setPasswordData] = useState({ vecchiaPassword: '', nuovaPassword: '', confermaPassword: '' });
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [savingProfile, setSavingProfile] = useState(false);
    // UI stato per sezione password
    const [showPwdSection, setShowPwdSection] = useState(false);
    const [showPasswords, setShowPasswords] = useState(false);
    // Modale informativo (successo/errore)
    const [infoModal, setInfoModal] = useState<{ show: boolean; title: string; message: string; variant?: 'primary' | 'success' | 'danger'; onClose?: () => void }>({ show: false, title: '', message: '' });
    const openInfo = (title: string, message: string, variant: 'primary' | 'success' | 'danger' = 'primary', onClose?: () => void) => setInfoModal({ show: true, title, message, variant, onClose });
    const closeInfo = () => { setInfoModal((p) => ({ ...p, show: false })); infoModal.onClose?.(); };

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
        // Se collaboratore, non è permesso modificare il profilo del medico
        if (user.role === 'ROLE_COLLABORATORE') {
            openInfo('Azione non consentita', 'Solo il medico titolare può modificare questo profilo.', 'danger');
            return;
        }
        // azzera eventuali modali pendenti
        if (infoModal.show) closeInfo();
        setSavingProfile(true);
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

            openInfo('Fatto', 'Profilo aggiornato. La pagina si ricaricherà per mostrare le modifiche.', 'success');
            setTimeout(() => window.location.reload(), 2000);

        } catch {
            openInfo('Errore', 'Non è stato possibile aggiornare il profilo.', 'danger');
        }
        finally {
            setSavingProfile(false);
        }
    };

    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
    if (infoModal.show) closeInfo();

        if (passwordData.nuovaPassword !== passwordData.confermaPassword) {
            openInfo('Errore', 'Le due password non coincidono.', 'danger');
            return;
        }

        try {
            const headers = { Authorization: `Bearer ${user.token}` };
            const payload = { vecchiaPassword: passwordData.vecchiaPassword, nuovaPassword: passwordData.nuovaPassword };
            const endpoint = user.role === 'ROLE_COLLABORATORE'
                ? `${API_BASE_URL}/collaboratori/profilo/password`
                : `${API_BASE_URL}/medici/profilo/password`;
            await axios.put(endpoint, payload, { headers });
            openInfo('Fatto', 'Password aggiornata.', 'success');
            setPasswordData({ vecchiaPassword: '', nuovaPassword: '', confermaPassword: '' });
            setShowPasswords(false);
            setShowPwdSection(false);
        } catch (err: unknown) {
            if (axios.isAxiosError(err) && err.response) {
                openInfo('Errore', err.response.data || 'Impossibile aggiornare la password. Controlla la password attuale.', 'danger');
            } else {
                openInfo('Errore', 'Impossibile aggiornare la password. Controlla la password attuale.', 'danger');
            }
        }
    };

    if (!profile) return <div className="container mt-5 text-center"><h3>Caricamento...</h3></div>;

    return (
    <div className="container my-5">

            <div className="row g-5">
                {/* --- Form Dati Profilo --- */}
                <div className="col-lg-7">
                    <div className="card shadow-sm h-100">
                        <div className="card-body p-4">
                            <h3 className="card-title text-center mb-4">Modifica profilo</h3>
                            <form onSubmit={handleProfileSubmit}>
                                <div className="row">
                                    <div className="col-md-4 text-center">
                                        <img 
                                            src={`${SERVER_BASE_URL}${profile.imgProfUrl}?t=${new Date().getTime()}`} 
                                            alt="Profilo" 
                                            className="rounded-circle mb-3"
                                            style={{ width: '150px', height: '150px', objectFit: 'cover' }}
                                        />
                                        <label htmlFor="immagineProfilo" className="form-label">Cambia foto</label>
                                        <input 
                                            className="form-control form-control-sm" 
                                            type="file" 
                                            id="immagineProfilo" 
                                            onChange={handleFileChange} 
                                            accept="image/png, image/jpeg" 
                                            disabled={user?.role === 'ROLE_COLLABORATORE'}
                                        />
                                    </div>
                                    <div className="col-md-8">
                                        <div className="mb-3"><label className="form-label">Nome</label><input type="text" className="form-control" value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} disabled={user?.role === 'ROLE_COLLABORATORE'} /></div>
                                        <div className="mb-3"><label className="form-label">Cognome</label><input type="text" className="form-control" value={formData.cognome} onChange={e => setFormData({...formData, cognome: e.target.value})} disabled={user?.role === 'ROLE_COLLABORATORE'} /></div>
                                        <div className="mb-3"><label className="form-label">Telefono</label><input type="tel" className="form-control" value={formData.telefono} onChange={e => setFormData({...formData, telefono: e.target.value})} disabled={user?.role === 'ROLE_COLLABORATORE'} /></div>
                                    </div>
                                </div>
                                <div className="mb-3 mt-3">
                                    <label className="form-label">Biografia</label>
                                    <textarea
                                        className="form-control bio-textarea"
                                        rows={4}
                                        value={formData.biografia}
                                        onChange={e => setFormData({ ...formData, biografia: e.target.value })}
                                        disabled={user?.role === 'ROLE_COLLABORATORE'}
                                        aria-label="Biografia del medico"
                                    />
                                </div>
                                <div className="d-flex justify-content-center">
                                    <button type="submit" className="btn btn-primary px-4 d-inline-flex align-items-center" aria-label="Salva dati profilo" disabled={savingProfile || user?.role === 'ROLE_COLLABORATORE'}>
                                        {savingProfile ? (
                                            <>
                                                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                                Salvataggio...
                                            </>
                                        ) : (
                                            <>
                                                {/* save icon */}
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" aria-hidden className="me-2">
                                                    <path d="M2 1a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4.5L11.5 1zM2 2h8v3H2zM2 6h12v8H2z"/>
                                                    <path d="M10 2.5v2H3v-2z"/>
                                                    <path d="M4 10a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v3H4z"/>
                                                </svg>
                                                Salva modifiche
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>

                {/* --- Form Cambio Password --- */}
                <div className="col-lg-5">
                    <div className="card shadow-sm h-100">
                        <div className="card-body p-4 d-flex flex-column">
                            <div className="d-flex justify-content-between align-items-center">
                                <div>
                                    <h5 className="card-title mb-0">Sicurezza</h5>
                                    <small className="text-muted">Gestisci la password del tuo account</small>
                                </div>
                                <button
                                    type="button"
                                    className="btn btn-sm btn-outline-secondary"
                                    aria-controls="pwd-collapse"
                                    aria-expanded={showPwdSection}
                                    onClick={() => setShowPwdSection(v => !v)}
                                >
                                    {/* lock icon */}
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16" aria-hidden className="me-1">
                                        <path d="M8 1a2 2 0 0 0-2 2v3H5a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2H10V3a2 2 0 0 0-2-2m1 5V3a1 1 0 1 0-2 0v3z"/>
                                    </svg>
                                    Cambia password
                                </button>
                            </div>

                <Collapse in={showPwdSection}>
                                <div id="pwd-collapse">
                    <form onSubmit={handlePasswordSubmit} className="mt-3">
                                        <div className="mb-2">
                                            <label className="form-label small">Password attuale</label>
                                            <input
                                                type={showPasswords ? 'text' : 'password'}
                                                required className="form-control form-control-sm"
                                                autoComplete="current-password"
                                                value={passwordData.vecchiaPassword}
                                                onChange={e => setPasswordData({ ...passwordData, vecchiaPassword: e.target.value })}
                                            />
                                        </div>
                                        <div className="mb-2">
                                            <label className="form-label small">Nuova password</label>
                                            <input
                                                type={showPasswords ? 'text' : 'password'}
                                                required className="form-control form-control-sm"
                                                autoComplete="new-password"
                                                value={passwordData.nuovaPassword}
                                                onChange={e => setPasswordData({ ...passwordData, nuovaPassword: e.target.value })}
                                            />
                                        </div>
                                        <div className="mb-2">
                                            <label className="form-label small">Conferma nuova password</label>
                                            <input
                                                type={showPasswords ? 'text' : 'password'}
                                                required className="form-control form-control-sm"
                                                autoComplete="new-password"
                                                value={passwordData.confermaPassword}
                                                onChange={e => setPasswordData({ ...passwordData, confermaPassword: e.target.value })}
                                            />
                                        </div>
                                        <div className="d-flex justify-content-between align-items-center mb-2">
                                            <div className="form-check">
                                                <input id="toggleShowPwd" className="form-check-input" type="checkbox" checked={showPasswords} onChange={(e) => setShowPasswords(e.target.checked)} />
                                                <label className="form-check-label small" htmlFor="toggleShowPwd">Mostra password</label>
                                            </div>
                                            <small className="text-muted">Suggerimento: usa almeno 8 caratteri con lettere e numeri.</small>
                                        </div>
                                        <button type="submit" className="btn btn-secondary btn-sm w-100">Aggiorna password</button>
                                    </form>
                                </div>
                            </Collapse>
                        </div>
                    </div>
                </div>
            </div>
            {/* Modale informativo */}
            <Modal show={infoModal.show} onHide={closeInfo} centered>
                <Modal.Header closeButton>
                    <Modal.Title>{infoModal.title || 'Messaggio'}</Modal.Title>
                </Modal.Header>
                <Modal.Body>{infoModal.message}</Modal.Body>
                <Modal.Footer>
                    <Button variant={infoModal.variant || 'primary'} onClick={closeInfo}>OK</Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default MedicoProfiloPage;