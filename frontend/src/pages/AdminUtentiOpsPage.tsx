import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Modal, Button } from 'react-bootstrap';
import { useAuth } from '../context/useAuth';

import { API_BASE_URL } from '../config/api';

type Medico = { id: number; nome: string; cognome: string };
type Sede = { id: number; nome: string };
type Collaboratore = { id: number; nome: string; cognome: string; email: string; telefono?: string; medico?: Medico };

export default function AdminUtentiOpsPage() {
  const { user } = useAuth();
  const headers = useMemo(() => (user ? { Authorization: `Bearer ${user.token}` } : undefined), [user]);
  const [medici, setMedici] = useState<Medico[]>([]);
  const [sedi, setSedi] = useState<Sede[]>([]);
  const [selectedMedicoId, setSelectedMedicoId] = useState<number | ''>('');
  const [assignedSedi, setAssignedSedi] = useState<Sede[]>([]);
  const [collabs, setCollabs] = useState<Collaboratore[]>([]);
  const [allCollabs, setAllCollabs] = useState<Collaboratore[]>([]);
  const [selectedExistingCollabId, setSelectedExistingCollabId] = useState<number | ''>('');
  const [collabForm, setCollabForm] = useState({ medicoId: '', nome: '', cognome: '', email: '', telefono: '', password: '' });
  const [removingCollabId, setRemovingCollabId] = useState<number | null>(null);
  // Modals state
  const [confirmUnassignId, setConfirmUnassignId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [infoModal, setInfoModal] = useState<{show:boolean; title:string; message:string}>({show:false,title:'',message:''});
  const [errorModal, setErrorModal] = useState<{show:boolean; message:string}>({show:false,message:''});

  useEffect(() => {
    (async () => {
      const [m, s, c] = await Promise.all([
        axios.get<Medico[]>(`${API_BASE_URL}/admin/medici`, { headers }),
        axios.get<Sede[]>(`${API_BASE_URL}/admin/sedi`, { headers }),
        axios.get<Collaboratore[]>(`${API_BASE_URL}/admin/collaboratori`, { headers })
      ]);
      setMedici(m.data);
      setSedi(s.data);
      setAllCollabs(c.data);
    })();
  }, [headers]);

  const refreshAssignments = async (mid: number) => {
    const { data } = await axios.get<Sede[]>(`${API_BASE_URL}/admin/medici/${mid}/sedi`, { headers });
    setAssignedSedi(data);
  };
  const refreshCollabs = async (mid?: number) => {
    if (mid) {
      const { data } = await axios.get<Collaboratore[]>(`${API_BASE_URL}/admin/medici/${mid}/collaboratori`, { headers });
      setCollabs(data);
    } else {
      const { data } = await axios.get<Collaboratore[]>(`${API_BASE_URL}/admin/collaboratori`, { headers });
      setCollabs(data);
    }
  };

  const onMedicoChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const mid = Number(e.target.value);
    setSelectedMedicoId(mid);
    setCollabForm(cf => ({ ...cf, medicoId: String(mid) }));
    refreshAssignments(mid);
    refreshCollabs(mid);
  };

  const assign = async (sedeId: number) => {
    if (!selectedMedicoId) return;
    await axios.post(`${API_BASE_URL}/admin/medici/${selectedMedicoId}/sedi/${sedeId}`, null, { headers });
    refreshAssignments(selectedMedicoId);
  };
  const unassign = async (sedeId: number) => {
    if (!selectedMedicoId) return;
    await axios.delete(`${API_BASE_URL}/admin/medici/${selectedMedicoId}/sedi/${sedeId}`, { headers });
    refreshAssignments(selectedMedicoId);
  };

  const onCollabChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setCollabForm({ ...collabForm, [e.target.name]: e.target.value });
  const createCollab = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const resp = await axios.post(`${API_BASE_URL}/admin/collaboratori`, { ...collabForm, medicoId: Number(collabForm.medicoId) }, { headers, validateStatus: () => true });
      if (resp.status === 200) {
        const data = resp.data;
        setCollabForm({ medicoId: String(selectedMedicoId || ''), nome: '', cognome: '', email: '', telefono: '', password: '' });
        await refreshCollabs(selectedMedicoId || undefined);
        setAllCollabs(prev => [...prev, data as Collaboratore]);
        setInfoModal({show:true,title:'Collaboratore creato',message:'Nuovo collaboratore creato e associato al medico.'});
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
        await refreshCollabs(selectedMedicoId || undefined);
        setAllCollabs(prev => prev.filter(c => c.id !== id));
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

  const assignExistingCollab = async () => {
    if (!selectedMedicoId || !selectedExistingCollabId) return;
    await axios.post(`${API_BASE_URL}/admin/medici/${selectedMedicoId}/collaboratori/${selectedExistingCollabId}`, null, { headers });
    setSelectedExistingCollabId('');
    await refreshCollabs(selectedMedicoId);
  };

  const unassignExistingCollab = async (id: number) => {
    if (!selectedMedicoId) return;
    setRemovingCollabId(id);
    try {
      const resp = await axios.delete(`${API_BASE_URL}/admin/medici/${selectedMedicoId}/collaboratori/${id}`, { headers, validateStatus: () => true });
      if (resp.status === 204) {
        // Refresh assegnati e anche lista completa (per permettere ri-assegnazione immediata)
  // Optimistic: rimuovi subito dalla lista assegnati
  setCollabs(prev => prev.filter(c => c.id !== id));
        await refreshCollabs(selectedMedicoId);
  // Aggiorna lista completa per farlo ricomparire nel select "Aggiungi esistente"
  const { data } = await axios.get<Collaboratore[]>(`${API_BASE_URL}/admin/collaboratori`, { headers });
  setAllCollabs(data);
        setInfoModal({show:true,title:'Collaboratore rimosso',message:'Collaboratore scollegato dal medico. Ora puoi ri-assegnarlo o assegnarne un altro.'});
      } else if (resp.status === 404) {
        // Già non presente: aggiorna comunque
  await refreshCollabs(selectedMedicoId);
        setInfoModal({show:true,title:'Non assegnato',message:'Il collaboratore non risultava assegnato a questo medico.'});
      } else if (resp.status === 403) {
        setErrorModal({show:true,message:'Accesso negato: solo admin può scollegare collaboratori.'});
      } else {
        console.warn('Rimozione collaboratore risposta inattesa', resp.status);
        setErrorModal({show:true,message:`Risposta inattesa (${resp.status}).`});
      }
    } catch {
      console.error('Errore rimozione collaboratore');
      setErrorModal({show:true,message:'Errore durante la rimozione.'});
    } finally {
      setRemovingCollabId(null);
    }
  };

  const isAssigned = (s: Sede) => assignedSedi.some(a => a.id === s.id);

  return (
    <div>
      {user?.role !== 'ROLE_ADMIN' && (
        <div className="alert alert-danger mb-4">
          Accesso negato: questa pagina è riservata agli amministratori.
        </div>
      )}
      {user?.role !== 'ROLE_ADMIN' && null /* still render limited view below so user sees nothing interactive */}
      <h2>Operazioni Admin: Medico-Sedi e Collaboratori</h2>
      <div className="mb-3">
        <label className="form-label">Seleziona Medico</label>
        <select className="form-select" value={selectedMedicoId} onChange={onMedicoChange}>
          <option value="">-- seleziona --</option>
          {medici.map(m => (
            <option key={m.id} value={m.id}>{m.cognome} {m.nome}</option>
          ))}
        </select>
      </div>

      {!!selectedMedicoId && (
        <div className="row">
          <div className="col-md-6">
            <h4>Sedi</h4>
            <ul className="list-group">
              {sedi.map(s => (
                <li key={s.id} className="list-group-item d-flex justify-content-between align-items-center">
                  {s.nome}
                  {isAssigned(s) ? (
                    <button className="btn btn-sm btn-outline-danger" onClick={() => unassign(s.id)}>Rimuovi</button>
                  ) : (
                    <button className="btn btn-sm btn-outline-primary" onClick={() => assign(s.id)}>Assegna</button>
                  )}
                </li>
              ))}
            </ul>
          </div>
          <div className="col-md-6">
            <h4>Collaboratori del medico</h4>
            <div className="mb-2 d-flex gap-2">
              <select className="form-select" value={selectedExistingCollabId} onChange={(e) => setSelectedExistingCollabId(e.target.value ? Number(e.target.value) : '')}>
                <option value="">Aggiungi esistente...</option>
                {allCollabs
                  .filter(c => !collabs.some(ac => ac.id === c.id))
                  .map(c => (
                  <option key={c.id} value={c.id}>{c.cognome} {c.nome} · {c.email}</option>
                ))}
              </select>
              <button className="btn btn-outline-primary" disabled={!selectedExistingCollabId} onClick={assignExistingCollab}>Assegna</button>
            </div>
            <form onSubmit={createCollab} className="mb-2">
              <div className="row g-2">
                <div className="col-md-6"><input name="nome" className="form-control" placeholder="Nome" value={collabForm.nome} onChange={onCollabChange} required /></div>
                <div className="col-md-6"><input name="cognome" className="form-control" placeholder="Cognome" value={collabForm.cognome} onChange={onCollabChange} required /></div>
                <div className="col-md-8"><input name="email" type="email" className="form-control" placeholder="Email" value={collabForm.email} onChange={onCollabChange} required /></div>
                <div className="col-md-4"><input name="telefono" className="form-control" placeholder="Telefono" value={collabForm.telefono} onChange={onCollabChange} /></div>
                <div className="col-md-8"><input name="password" type="password" className="form-control" placeholder="Password (min 6)" value={collabForm.password} onChange={onCollabChange} required minLength={6} /></div>
                <div className="col-md-4 d-flex align-items-center">
                  {selectedMedicoId ? (
                    <span className="form-text">Medico selezionato: {medici.find(m => m.id === selectedMedicoId)?.cognome} {medici.find(m => m.id === selectedMedicoId)?.nome}</span>
                  ) : (
                    <select name="medicoId" className="form-select" value={collabForm.medicoId} onChange={onCollabChange} required>
                      <option value="">Medico</option>
                      {medici.map(m => (<option key={m.id} value={m.id}>{m.cognome} {m.nome}</option>))}
                    </select>
                  )}
                </div>
                <div className="col-12"><button className="btn btn-primary" type="submit">Aggiungi Collaboratore</button></div>
              </div>
            </form>
            <ul className="list-group">
              {collabs.map(c => (
                <li key={c.id} className="list-group-item d-flex justify-content-between align-items-center">
                  <div>
                    {c.cognome} {c.nome} · {c.email}
                    {/* Rimosso badge legacy per consentire gestione uniforme */}
                  </div>
                  <div className="d-flex gap-2">
                    <button
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() => setConfirmUnassignId(c.id)}
                      disabled={removingCollabId === c.id}
                    >
                      {removingCollabId === c.id ? 'Rimuovendo…' : 'Rimuovi dal medico'}
                    </button>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => setConfirmDeleteId(c.id)}>Elimina</button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      {/* Confirm Unassign Modal */}
      <Modal show={confirmUnassignId !== null} onHide={() => setConfirmUnassignId(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Rimuovere collaboratore?</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Verrà scollegato dal medico selezionato ma resterà disponibile per future assegnazioni.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setConfirmUnassignId(null)}>Annulla</Button>
          <Button variant="primary" onClick={() => { const id = confirmUnassignId!; setConfirmUnassignId(null); unassignExistingCollab(id); }}>Conferma</Button>
        </Modal.Footer>
      </Modal>
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
