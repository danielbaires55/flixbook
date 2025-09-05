import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import InfoModal from './InfoModal';

import { API_BASE_URL } from '../config/api';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [pwd, setPwd] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [valid, setValid] = useState<boolean>(true);
  const [modal, setModal] = useState<{show: boolean; title: string; message: string; variant?: 'info'|'success'|'danger'|'warning'}>({show: false, title: '', message: '', variant: 'info'});
  const closeModal = () => setModal(m => ({...m, show: false}));
  const navigate = useNavigate();
  const hasValidated = useRef(false);

  useEffect(() => {
    if (!token) {
      setModal({ show: true, title: 'Link non valido', message: 'Il link per reimpostare la password non è completo. Apri direttamente il link ricevuto nella tua email.', variant: 'warning' });
      setValid(false);
      return;
    }
    // Validate and mark as opened on first load (avoid double-run in React Strict Mode)
    if (hasValidated.current) return;
    hasValidated.current = true;
    (async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/auth/reset-password/validate`, { params: { token } });
        if (res.data && res.data.valid) {
          setValid(true);
          setModal({ show: true, title: 'Tutto pronto', message: 'Inserisci una nuova password e confermala qui sotto.', variant: 'success' });
        } else {
          const msg = res.data?.message || 'Questo link non è valido. Richiedi un nuovo link dal form “Password dimenticata”.';
          setModal({ show: true, title: 'Link non utilizzabile', message: msg, variant: 'warning' });
          setValid(false);
        }
      } catch (e: unknown) {
        const anyErr = e as { response?: { data?: { message?: string } } };
        const msg = anyErr?.response?.data?.message || 'Questo link non è più valido (potrebbe essere scaduto o già usato). Richiedi un nuovo link dal form “Password dimenticata”.';
        setModal({ show: true, title: 'Link non utilizzabile', message: msg, variant: 'warning' });
        setValid(false);
      }
    })();
  }, [token]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwd.length < 6) {
      const msg = 'La password deve avere almeno 6 caratteri.';
      setModal({ show: true, title: 'Controlla la password', message: msg, variant: 'warning' });
      return;
    }
    if (pwd !== confirm) {
      const msg = 'Le password non coincidono.';
      setModal({ show: true, title: 'Controlla la password', message: msg, variant: 'warning' });
      return;
    }
    try {
      await axios.post(`${API_BASE_URL}/auth/reset-password`, { token, newPassword: pwd });
      setModal({ show: true, title: 'Password aggiornata', message: 'La tua password è stata cambiata con successo. Ora puoi accedere con le nuove credenziali.', variant: 'success' });
      setTimeout(() => navigate('/login'), 1500);
    } catch {
      const msg = 'Il link non è più valido. Richiedi un nuovo link dal form “Password dimenticata”.';
      setModal({ show: true, title: 'Link non utilizzabile', message: msg, variant: 'warning' });
    }
  };

  return (
    <div className="container py-5" style={{maxWidth: 480}}>
      <h1 className="h3 mb-3">Imposta nuova password</h1>
      <form onSubmit={onSubmit} className="card p-3 shadow-sm">
        <label className="form-label">Nuova password</label>
        <div className="input-group">
          <input
            type={showPwd ? 'text' : 'password'}
            className="form-control"
            value={pwd}
            onChange={e=>setPwd(e.target.value)}
            required
            minLength={6}
            disabled={!valid}
            placeholder="Min 6 caratteri"
            aria-label="Nuova password"
          />
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => setShowPwd(s => !s)}
            aria-label={showPwd ? 'Nascondi password' : 'Mostra password'}
            disabled={!valid}
          >
            {showPwd ? 'Nascondi' : 'Mostra'}
          </button>
        </div>
        <label className="form-label mt-3">Conferma password</label>
        <div className="input-group">
          <input
            type={showConfirm ? 'text' : 'password'}
            className="form-control"
            value={confirm}
            onChange={e=>setConfirm(e.target.value)}
            required
            minLength={6}
            disabled={!valid}
            placeholder="Ripeti password"
            aria-label="Conferma password"
          />
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => setShowConfirm(s => !s)}
            aria-label={showConfirm ? 'Nascondi conferma password' : 'Mostra conferma password'}
            disabled={!valid}
          >
            {showConfirm ? 'Nascondi' : 'Mostra'}
          </button>
        </div>
  <button className="btn btn-success mt-3 w-auto d-block mx-auto px-4" type="submit" disabled={!valid}>Aggiorna password</button>
      </form>
      <div className="mt-3"><Link to="/login">Torna al login</Link></div>
      <InfoModal show={modal.show} title={modal.title} message={modal.message} variant={modal.variant} onClose={closeModal} />
    </div>
  );
}
