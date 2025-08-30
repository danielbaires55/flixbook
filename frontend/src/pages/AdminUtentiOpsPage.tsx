import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/useAuth';

const API_BASE_URL = 'http://localhost:8080/api';

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
    const { data } = await axios.post(`${API_BASE_URL}/admin/collaboratori`, { ...collabForm, medicoId: Number(collabForm.medicoId) }, { headers });
    setCollabForm({ medicoId: String(selectedMedicoId || ''), nome: '', cognome: '', email: '', telefono: '', password: '' });
    await refreshCollabs(selectedMedicoId || undefined);
    setAllCollabs(prev => [...prev, data as Collaboratore]);
  };
  const delCollab = async (id: number) => {
    await axios.delete(`${API_BASE_URL}/admin/collaboratori/${id}`, { headers });
    await refreshCollabs(selectedMedicoId || undefined);
    setAllCollabs(prev => prev.filter(c => c.id !== id));
  };

  const assignExistingCollab = async () => {
    if (!selectedMedicoId || !selectedExistingCollabId) return;
    await axios.post(`${API_BASE_URL}/admin/medici/${selectedMedicoId}/collaboratori/${selectedExistingCollabId}`, null, { headers });
    setSelectedExistingCollabId('');
    await refreshCollabs(selectedMedicoId);
  };

  const unassignExistingCollab = async (id: number) => {
    if (!selectedMedicoId) return;
    await axios.delete(`${API_BASE_URL}/admin/medici/${selectedMedicoId}/collaboratori/${id}`, { headers });
    await refreshCollabs(selectedMedicoId);
  };

  const isAssigned = (s: Sede) => assignedSedi.some(a => a.id === s.id);

  return (
    <div>
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
                    {c.medico && selectedMedicoId && c.medico.id === selectedMedicoId ? (
                      <span className="badge text-bg-warning ms-2">assegnazione legacy</span>
                    ) : null}
                  </div>
                  <div className="d-flex gap-2">
                    <button
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() => unassignExistingCollab(c.id)}
                      disabled={!!(c.medico && selectedMedicoId && c.medico.id === selectedMedicoId)}
                      title={c.medico && selectedMedicoId && c.medico.id === selectedMedicoId ? 'Non rimovibile: assegnazione legacy' : ''}
                    >
                      Rimuovi dal medico
                    </button>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => delCollab(c.id)}>Elimina</button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
