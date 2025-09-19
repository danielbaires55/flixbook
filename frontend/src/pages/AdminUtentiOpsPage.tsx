import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Modal, Button } from 'react-bootstrap';
import { useAuth } from '../context/useAuth';

import { API_BASE_URL } from '../config/api';

type Collaboratore = { id: number; nome: string; cognome: string; email: string; telefono?: string; attivo?: boolean };

export default function AdminUtentiOpsPage() {
  const { user } = useAuth();
  const headers = useMemo(() => (user ? { Authorization: `Bearer ${user.token}` } : undefined), [user]);
  const [collabs, setCollabs] = useState<Collaboratore[]>([]);
  const [collabForm, setCollabForm] = useState({ nome: '', cognome: '', email: '', telefono: '', password: '' });
  // Modals state
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [confirmDeactivateId, setConfirmDeactivateId] = useState<number | null>(null);
  const [infoModal, setInfoModal] = useState<{show:boolean; title:string; message:string}>({show:false,title:'',message:''});
  const [errorModal, setErrorModal] = useState<{show:boolean; message:string}>({show:false,message:''});

  useEffect(() => {
    (async () => {
      const c = await axios.get<Collaboratore[]>(`${API_BASE_URL}/admin/collaboratori`, { headers });
      setCollabs(c.data);
    })();
  }, [headers]);

  const onCollabChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setCollabForm({ ...collabForm, [e.target.name]: e.target.value });
  const createCollab = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const resp = await axios.post(`${API_BASE_URL}/admin/collaboratori`, { ...collabForm }, { headers, validateStatus: () => true });
      if (resp.status === 200) {
        const data = resp.data;
        setCollabForm({ nome: '', cognome: '', email: '', telefono: '', password: '' });
        setCollabs(prev => [...prev, data as Collaboratore]);
        setInfoModal({show:true,title:'Collaboratore creato',message:'Nuovo collaboratore creato. Assegna il collaboratore ai medici dalla gestione medici.'});
      } else if (resp.status === 400) {
        setErrorModal({show:true,message: resp.data?.error || 'Dati non validi.'});
      } else if (resp.status === 409) {
        setErrorModal({show:true,message: resp.data?.error || 'Email già in uso.'});
      } else if (resp.status === 403) {
        setErrorModal({show:true,message: 'Accesso negato: solo admin può creare collaboratori.'});
      } else {
        setErrorModal({show:true,message: `Creazione fallita (status ${resp.status}).`});
      }
  } catch {
      setErrorModal({show:true,message:'Errore di rete durante la creazione.'});
    }
  };
  const delCollab = async (id: number) => {
    try {
      const resp = await axios.delete(`${API_BASE_URL}/admin/collaboratori/${id}`, { headers, validateStatus: () => true });
      if (resp.status === 204) {
        setCollabs(prev => prev.filter(c => c.id !== id));
        setInfoModal({show:true,title:'Collaboratore eliminato',message:'Il collaboratore è stato rimosso dal sistema.'});
      } else if (resp.status === 404) {
        setErrorModal({show:true,message:'Collaboratore non trovato (già eliminato).'});
      } else if (resp.status === 403) {
        setErrorModal({show:true,message:'Accesso negato: solo admin.'});
      } else {
        setErrorModal({show:true,message:`Eliminazione non riuscita (status ${resp.status}).`});
      }
  } catch {
      setErrorModal({show:true,message:'Errore di rete durante eliminazione.'});
    }
  };

  return (
    <div>
      {user?.role !== 'ROLE_ADMIN' && (
        <div className="alert alert-danger mb-4">
          Accesso negato: questa pagina è riservata agli amministratori.
        </div>
      )}
      {user?.role !== 'ROLE_ADMIN' && null /* still render limited view below so user sees nothing interactive */}
  <h2>Collaboratori</h2>
      <div className="row">
        <div className="col-md-6">
          <h4>Crea collaboratore</h4>
          <form onSubmit={createCollab} className="mb-2">
              <div className="row g-2">
                <div className="col-md-6"><input name="nome" className="form-control" placeholder="Nome" value={collabForm.nome} onChange={onCollabChange} required /></div>
                <div className="col-md-6"><input name="cognome" className="form-control" placeholder="Cognome" value={collabForm.cognome} onChange={onCollabChange} required /></div>
                <div className="col-md-8"><input name="email" type="email" className="form-control" placeholder="Email" value={collabForm.email} onChange={onCollabChange} required /></div>
                <div className="col-md-4"><input name="telefono" className="form-control" placeholder="Telefono" value={collabForm.telefono} onChange={onCollabChange} /></div>
                <div className="col-md-8"><input name="password" type="password" className="form-control" placeholder="Password (min 6)" value={collabForm.password} onChange={onCollabChange} required minLength={6} /></div>
                <div className="col-12"><button className="btn btn-primary" type="submit">Aggiungi Collaboratore</button></div>
              </div>
            </form>
        </div>
        <div className="col-md-6">
          <h4>Elenco collaboratori</h4>
          <ul className="list-group">
            {collabs.map(c => {
              const active = c.attivo !== false; // default true
              return (
                <li key={c.id} className="list-group-item d-flex justify-content-between align-items-center">
                  <div>
                    {c.cognome} {c.nome} · {c.email}{' '}
                    {active ? (
                      <span className="badge text-bg-success">attivo</span>
                    ) : (
                      <span className="badge text-bg-secondary">disattivato</span>
                    )}
                  </div>
                  <div className="d-flex gap-2">
                    <button
                      className="btn btn-sm btn-outline-warning"
                      onClick={async () => {
                        if (active) {
                          setConfirmDeactivateId(c.id);
                        } else {
                          const resp = await axios.post<Collaboratore>(`${API_BASE_URL}/admin/collaboratori/${c.id}/toggle-attivo`, null, { headers });
                          setCollabs(prev => prev.map(x => x.id === c.id ? resp.data : x));
                        }
                      }}
                    >{active ? 'Disattiva' : 'Attiva'}</button>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => setConfirmDeleteId(c.id)}>Elimina</button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
      {/* Removed Unassign modal: gestione assegnazioni avviene nella pagina Medici */}
      {/* Confirm Delete Modal */}
      <Modal show={confirmDeleteId !== null} onHide={() => setConfirmDeleteId(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Eliminare collaboratore?</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          L'utente verrà eliminato definitivamente dal sistema. Questa azione non è reversibile.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setConfirmDeleteId(null)}>Annulla</Button>
          <Button variant="danger" onClick={() => { const id = confirmDeleteId!; setConfirmDeleteId(null); delCollab(id); }}>Elimina</Button>
        </Modal.Footer>
      </Modal>
      {/* Confirm Deactivate Modal */}
      <Modal show={confirmDeactivateId !== null} onHide={() => setConfirmDeactivateId(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Disattivare collaboratore?</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Il collaboratore non potrà più accedere finché non verrà riattivato. Confermi la disattivazione?
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setConfirmDeactivateId(null)}>Annulla</Button>
          <Button variant="warning" onClick={async () => {
            const id = confirmDeactivateId!;
            setConfirmDeactivateId(null);
            const resp = await axios.post<Collaboratore>(`${API_BASE_URL}/admin/collaboratori/${id}/toggle-attivo`, null, { headers });
            setCollabs(prev => prev.map(x => x.id === id ? resp.data : x));
          }}>Disattiva</Button>
        </Modal.Footer>
      </Modal>
      {/* Info Modal */}
      <Modal show={infoModal.show} onHide={() => setInfoModal(i => ({...i, show:false}))} centered>
        <Modal.Header closeButton><Modal.Title>{infoModal.title || 'Operazione completata'}</Modal.Title></Modal.Header>
        <Modal.Body>{infoModal.message}</Modal.Body>
        <Modal.Footer><Button variant="primary" onClick={() => setInfoModal(i => ({...i, show:false}))}>OK</Button></Modal.Footer>
      </Modal>
      {/* Error Modal */}
      <Modal show={errorModal.show} onHide={() => setErrorModal({show:false,message:''})} centered backdrop="static">
        <Modal.Header closeButton><Modal.Title>Errore</Modal.Title></Modal.Header>
        <Modal.Body>{errorModal.message || 'Si è verificato un errore.'}</Modal.Body>
        <Modal.Footer><Button variant="secondary" onClick={() => setErrorModal({show:false,message:''})}>Chiudi</Button></Modal.Footer>
      </Modal>
    </div>
  );
}
