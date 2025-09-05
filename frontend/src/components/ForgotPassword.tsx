import { useState } from 'react';
import { FloatingLabel, Form } from 'react-bootstrap';
import axios from 'axios';
import { Link } from 'react-router-dom';
import InfoModal from './InfoModal';

import { API_BASE_URL } from '../config/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [modal, setModal] = useState<{show: boolean; title: string; message: string; variant?: 'info'|'success'|'danger'}>({show: false, title: '', message: '', variant: 'info'});
  const closeModal = () => setModal(m => ({...m, show: false}));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModal({show: true, title: 'Un attimo…', message: 'Invio della richiesta in corso.', variant: 'info'});
    try {
      await axios.post(`${API_BASE_URL}/auth/forgot-password`, { email });
      setModal({
        show: true,
        title: 'Controlla la tua email',
        message: "Se l'indirizzo è registrato, ti abbiamo inviato un link per creare una nuova password. Se non lo vedi, controlla nello spam.",
        variant: 'success'
      });
    } catch {
      setModal({
        show: true,
        title: 'Controlla la tua email',
        message: "Se l'indirizzo è registrato, ti abbiamo inviato un link per creare una nuova password. Se non lo vedi, controlla nello spam.",
        variant: 'info'
      });
    }
  };

  return (
    <div className="container py-5" style={{maxWidth: 480}}>
      <h1 className="h3 mb-3">Recupero password</h1>
      <form onSubmit={onSubmit} className="card p-3 shadow-sm">
        <FloatingLabel controlId="forgotEmail" label="Email">
          <Form.Control
            type="email"
            required
            value={email}
            onChange={e=>setEmail(e.target.value)}
            placeholder="name@example.com"
            autoComplete="email"
            aria-describedby="forgot-help"
          />
        </FloatingLabel>
        <div id="forgot-help" className="form-text">Ti invieremo un link per reimpostare la password.</div>
        <button className="btn btn-primary mt-3 w-auto d-block mx-auto px-4" type="submit">Invia link</button>
      </form>
      <div className="mt-3"><Link to="/login">Torna al login</Link></div>
      <InfoModal show={modal.show} title={modal.title} message={modal.message} variant={modal.variant} onClose={closeModal} />
    </div>
  );
}
