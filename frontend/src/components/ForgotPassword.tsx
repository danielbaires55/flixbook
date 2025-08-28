import { useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import InfoModal from './InfoModal';

const API_BASE_URL = 'http://localhost:8080/api';

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
        <label className="form-label">Email</label>
        <input type="email" required className="form-control" value={email} onChange={e=>setEmail(e.target.value)} placeholder="La tua email" />
        <button className="btn btn-primary mt-3" type="submit">Invia link</button>
      </form>
      <div className="mt-3"><Link to="/login">Torna al login</Link></div>
  <InfoModal show={modal.show} title={modal.title} message={modal.message} variant={modal.variant} onClose={closeModal} />
    </div>
  );
}
