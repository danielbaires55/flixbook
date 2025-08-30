import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Modal, Button } from 'react-bootstrap';
import { useAuth } from '../context/useAuth';

const API_BASE_URL = 'http://localhost:8080/api';

type Medico = { id: number; nome: string; cognome: string; email: string; telefono?: string };
type Specialita = { id: number; nome: string };
type Sede = { id: number; nome: string };

type CreateMedicoPayload = {
  nome: string;
  cognome: string;
  email: string;
  telefono?: string;
  password: string;
  specialitaIds?: number[];
  specialitaId?: number;
  sedeIds?: number[];
};

export default function AdminMediciPage() {
  const { user } = useAuth();
  const [medici, setMedici] = useState<Medico[]>([]);
  const [specialita, setSpecialita] = useState<Specialita[]>([]);
  const [sedi, setSedi] = useState<Sede[]>([]);
  const [form, setForm] = useState({ nome: '', cognome: '', email: '', telefono: '', password: '', specialitaIds: [] as string[], sedeIds: [] as string[] });
  const [medicoSpec, setMedicoSpec] = useState<Record<number, Specialita[]>>({});
  const [loadingSpec, setLoadingSpec] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [selectedMedico, setSelectedMedico] = useState<Medico | null>(null);
  const [manageIds, setManageIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [warn, setWarn] = useState<{ show: boolean; title: string; message: string }>(() => ({ show: false, title: '', message: '' }));
  const [info, setInfo] = useState<{ show: boolean; title: string; message: string }>(() => ({ show: false, title: '', message: '' }));
  const headers = useMemo(() => (user ? { Authorization: `Bearer ${user.token}` } : undefined), [user]);
  const isAdmin = user?.role === 'ROLE_ADMIN';

  useEffect(() => {
    (async () => {
      try {
        const { data } = await axios.get<Medico[]>(`${API_BASE_URL}/admin/medici`, { headers });
        setMedici(data);
        // Carica specialità assegnate per ogni medico
        setLoadingSpec(true);
        try {
          const entries = await Promise.all(
            data.map(async (m) => {
              try {
                const res = await axios.get<Specialita[]>(`${API_BASE_URL}/admin/medici/${m.id}/specialita`, { headers });
                return [m.id, res.data] as const;
              } catch {
                return [m.id, [] as Specialita[]] as const;
              }
            })
          );
          const map: Record<number, Specialita[]> = {};
          for (const [id, list] of entries) map[id] = list;
          setMedicoSpec(map);
        } finally {
          setLoadingSpec(false);
        }
  } catch {
        // Se non autorizzato, mostra un warning sobrio
        setWarn({ show: true, title: 'Accesso negato', message: 'Devi essere amministratore per gestire i medici.' });
      }
    })();
  }, [headers]);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await axios.get<Specialita[]>(`${API_BASE_URL}/specialita`);
        setSpecialita(data);
      } catch { setSpecialita([]); }
    })();
  }, []);

  // Carica le sedi gestite (admin)
  useEffect(() => {
    (async () => {
      if (!headers) return;
      try {
        const { data } = await axios.get<Sede[]>(`${API_BASE_URL}/admin/sedi`, { headers });
        setSedi(data);
      } catch { setSedi([]); }
    })();
  }, [headers]);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [e.target.name]: e.target.value });
  const toggleSpecialita = (idStr: string) => {
    const set = new Set(form.specialitaIds);
    if (set.has(idStr)) set.delete(idStr); else set.add(idStr);
    setForm({ ...form, specialitaIds: Array.from(set) });
  };
  const selectAll = () => setForm({ ...form, specialitaIds: specialita.map(s => String(s.id)) });
  const selectNone = () => setForm({ ...form, specialitaIds: [] });
  const toggleSede = (idStr: string) => {
    const set = new Set(form.sedeIds);
    if (set.has(idStr)) set.delete(idStr); else set.add(idStr);
    setForm({ ...form, sedeIds: Array.from(set) });
  };
  const selectAllSedi = () => setForm({ ...form, sedeIds: sedi.map(s => String(s.id)) });
  const selectNoneSedi = () => setForm({ ...form, sedeIds: [] });
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setWarn({ show: true, title: 'Non autenticato', message: 'Accedi come amministratore per creare un medico.' });
      return;
    }
    if (form.specialitaIds.length === 0) {
      alert('Seleziona almeno una specialità');
      return;
    }
    if (sedi.length > 0 && form.sedeIds.length === 0) {
      // opzionale: se ci sono sedi nel sistema, incoraggia ad associare almeno una sede
      const proceed = confirm('Nessuna sede selezionata. Creare comunque il medico senza sedi associate?');
      if (!proceed) return;
    }
    // Converte gli id selezionati in numeri per il backend
    const specIdsNum: number[] = form.specialitaIds
      .map(id => Number(id))
      .filter(id => Number.isInteger(id));
    const sedeIdsNum: number[] = form.sedeIds
      .map(id => Number(id))
      .filter(id => Number.isInteger(id));
    const payload: CreateMedicoPayload = {
      nome: form.nome,
      cognome: form.cognome,
      email: form.email,
      telefono: form.telefono || undefined,
      password: form.password,
      // Inviamo SEMPRE l'array numerico per compatibilità backend (List<Integer>)
      specialitaIds: specIdsNum,
      ...(sedeIdsNum.length ? { sedeIds: sedeIdsNum } : {})
    };
    try {
      const { data: created } = await axios.post<Medico>(`${API_BASE_URL}/admin/medici`, payload, { headers });
      setForm({ nome: '', cognome: '', email: '', telefono: '', password: '', specialitaIds: [], sedeIds: [] });
      const { data } = await axios.get<Medico[]>(`${API_BASE_URL}/admin/medici`, { headers });
      setMedici(data);
      // Success modal
      setInfo({
        show: true,
        title: 'Medico creato',
        message: `Creato ${created.cognome} ${created.nome}. Inviata un'email a ${created.email} con password temporanea e link per il primo accesso.`
      });
    } catch (err: unknown) {
      const ax = err as import('axios').AxiosError<{ error?: string }>; 
      if (ax.response?.status === 403) {
        setWarn({ show: true, title: 'Accesso negato', message: 'Non sei autorizzato a creare medici. Accedi come admin.' });
      } else if (ax.response?.status === 409) {
        setWarn({ show: true, title: 'Email in uso', message: ax.response.data?.error || 'Esiste già un utente con questa email.' });
      } else if (ax.response?.status === 400) {
        setWarn({ show: true, title: 'Dati non validi', message: ax.response.data?.error || 'Controlla i campi e riprova.' });
      } else {
        setWarn({ show: true, title: 'Errore', message: 'Creazione non riuscita. Riprova più tardi.' });
      }
    }
  };

  const openManage = (m: Medico) => {
    setSelectedMedico(m);
    const current = medicoSpec[m.id] || [];
    setManageIds(current.map(s => String(s.id)));
    setManageOpen(true);
  };
  const closeManage = () => { setManageOpen(false); setSelectedMedico(null); };
  const manageToggle = (idStr: string) => {
    const set = new Set(manageIds);
    if (set.has(idStr)) set.delete(idStr); else set.add(idStr);
    setManageIds(Array.from(set));
  };
  const manageSelectAll = () => setManageIds(specialita.map(s => String(s.id)));
  const manageSelectNone = () => setManageIds([]);
  const saveManage = async () => {
    if (!selectedMedico) return;
    setSaving(true);
    try {
      const current = new Set((medicoSpec[selectedMedico.id] || []).map(s => String(s.id)));
      const next = new Set(manageIds);
      const toAdd = Array.from(next).filter(id => !current.has(id));
      const toRemove = Array.from(current).filter(id => !next.has(id));
      await Promise.all([
        ...toAdd.map(id => axios.post(`${API_BASE_URL}/admin/medici/${selectedMedico.id}/specialita/${id}`, null, { headers })),
        ...toRemove.map(id => axios.delete(`${API_BASE_URL}/admin/medici/${selectedMedico.id}/specialita/${id}`, { headers })),
      ]);
      // refresh mapping for this medico
      const { data } = await axios.get<Specialita[]>(`${API_BASE_URL}/admin/medici/${selectedMedico.id}/specialita`, { headers });
      setMedicoSpec(prev => ({ ...prev, [selectedMedico.id]: data }));
      setManageOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const deleteMedico = async (m: Medico) => {
    if (!confirm(`Eliminare definitivamente ${m.cognome} ${m.nome}?`)) return;
    try {
      await axios.delete(`${API_BASE_URL}/admin/medici/${m.id}`, { headers });
      const { data } = await axios.get<Medico[]>(`${API_BASE_URL}/admin/medici`, { headers });
      setMedici(data);
    } catch (err) {
      type Conflict = { error?: string; appuntamenti?: number; blocchiOrario?: number; slot?: number };
      const ax = err as import('axios').AxiosError<Conflict>;
      if (ax.response?.status === 409) {
        const a = ax.response.data?.appuntamenti ?? 0;
        const b = ax.response.data?.blocchiOrario ?? 0;
        const s = ax.response.data?.slot ?? 0;
        setWarn({
          show: true,
          title: 'Medico non eliminabile',
          message: `Esistono ancora dati collegati (appuntamenti: ${a}, blocchi orario: ${b}, slot: ${s}). Rimuovi o archivia prima questi dati e riprova.`,
        });
      } else {
        setWarn({ show: true, title: 'Errore', message: 'Eliminazione non riuscita. Riprova più tardi.' });
      }
    }
  };

  return (
    <div>
      <h2>Gestione Medici (Admin)</h2>
      {!isAdmin && (
        <div className="alert alert-warning" role="alert">
          Devi essere amministratore per creare e gestire i medici.
        </div>
      )}
      <form onSubmit={onSubmit} style={{ maxWidth: 520 }}>
        <div className="mb-2"><input className="form-control" name="nome" placeholder="Nome" value={form.nome} onChange={onChange} required /></div>
        <div className="mb-2"><input className="form-control" name="cognome" placeholder="Cognome" value={form.cognome} onChange={onChange} required /></div>
        <div className="mb-2"><input className="form-control" type="email" name="email" placeholder="Email" value={form.email} onChange={onChange} required /></div>
        <div className="mb-2"><input className="form-control" name="telefono" placeholder="Telefono" value={form.telefono} onChange={onChange} /></div>
        <div className="mb-2">
          <label className="form-label">Specialità (una o più)</label>
          <div className="d-flex flex-wrap gap-2">
            {specialita.map(s => {
              const idStr = String(s.id);
              const inputId = `spec-${s.id}`;
              const active = form.specialitaIds.includes(idStr);
              return (
                <span key={s.id}>
                  <input type="checkbox" className="btn-check" id={inputId} autoComplete="off"
                         checked={active} onChange={() => toggleSpecialita(idStr)} />
                  <label className={`btn btn-sm ${active ? 'btn-primary' : 'btn-outline-primary'}`} htmlFor={inputId}>
                    {s.nome}
                  </label>
                </span>
              );
            })}
          </div>
          <div className="d-flex gap-2 mt-2">
            <button className="btn btn-outline-secondary btn-sm" type="button" onClick={selectAll}>Seleziona tutte</button>
            <button className="btn btn-outline-secondary btn-sm" type="button" onClick={selectNone}>Deseleziona tutte</button>
          </div>
        </div>

        <div className="mb-2">
          <label className="form-label">Sedi (opzionale, una o più)</label>
          {sedi.length === 0 ? (
            <div className="form-text">Nessuna sede configurata o caricata. Puoi associare le sedi in seguito da Admin → Ops.</div>
          ) : (
            <>
              <div className="d-flex flex-wrap gap-2">
                {sedi.map(s => {
                  const idStr = String(s.id);
                  const inputId = `sede-${s.id}`;
                  const active = form.sedeIds.includes(idStr);
                  return (
                    <span key={s.id}>
                      <input type="checkbox" className="btn-check" id={inputId} autoComplete="off"
                             checked={active} onChange={() => toggleSede(idStr)} />
                      <label className={`btn btn-sm ${active ? 'btn-success' : 'btn-outline-success'}`} htmlFor={inputId}>
                        {s.nome}
                      </label>
                    </span>
                  );
                })}
              </div>
              <div className="d-flex gap-2 mt-2">
                <button className="btn btn-outline-secondary btn-sm" type="button" onClick={selectAllSedi}>Seleziona tutte</button>
                <button className="btn btn-outline-secondary btn-sm" type="button" onClick={selectNoneSedi}>Deseleziona tutte</button>
              </div>
            </>
          )}
        </div>
        <div className="mb-2"><input className="form-control" type="password" name="password" placeholder="Password temporanea (min 6)" value={form.password} onChange={onChange} required minLength={6} /></div>
  <button className="btn btn-primary" type="submit" disabled={!isAdmin}>Crea Medico</button>
      </form>

      <h3 className="mt-4">Medici</h3>
      <div className="table-responsive">
        <table className="table table-striped table-hover align-middle">
          <thead>
            <tr>
              <th style={{width: '28%'}}>Medico</th>
              <th style={{width: '28%'}}>Email</th>
              <th style={{width: '16%'}}>Telefono</th>
              <th>Specialità</th>
              <th style={{width: '1%'}}></th>
              <th style={{width: '1%'}}></th>
            </tr>
          </thead>
          <tbody>
            {medici.map(m => (
              <tr key={m.id}>
                <td>{m.cognome} {m.nome}</td>
                <td>{m.email}</td>
                <td>{m.telefono || '—'}</td>
                <td>
                  {loadingSpec && !(m.id in medicoSpec) ? (
                    <span className="text-muted">Caricamento…</span>
                  ) : (
                    <div className="d-flex flex-wrap gap-2">
                      {(medicoSpec[m.id] && medicoSpec[m.id].length > 0) ? (
                        medicoSpec[m.id].map(s => (
                          <span key={s.id} className="badge rounded-pill text-bg-primary">{s.nome}</span>
                        ))
                      ) : (
                        <span className="text-muted">Nessuna</span>
                      )}
                    </div>
                  )}
                </td>
                <td className="text-end">
                  <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => openManage(m)}>Gestisci</button>
                </td>
                <td className="text-end">
                  <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => deleteMedico(m)}>Elimina</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal show={manageOpen} onHide={closeManage} centered>
        <Modal.Header closeButton>
          <Modal.Title>Gestisci specialità {selectedMedico ? `${selectedMedico.cognome} ${selectedMedico.nome}` : ''}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="d-flex flex-wrap gap-2">
            {specialita.map(s => {
              const idStr = String(s.id);
              const inputId = `manage-spec-${s.id}`;
              const active = manageIds.includes(idStr);
              return (
                <span key={s.id}>
                  <input type="checkbox" className="btn-check" id={inputId} autoComplete="off"
                         checked={active} onChange={() => manageToggle(idStr)} />
                  <label className={`btn btn-sm ${active ? 'btn-primary' : 'btn-outline-primary'}`} htmlFor={inputId}>
                    {s.nome}
                  </label>
                </span>
              );
            })}
          </div>
          <div className="d-flex gap-2 mt-3">
            <Button variant="outline-secondary" size="sm" onClick={manageSelectAll}>Seleziona tutte</Button>
            <Button variant="outline-secondary" size="sm" onClick={manageSelectNone}>Deseleziona tutte</Button>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeManage} disabled={saving}>Annulla</Button>
          <Button variant="primary" onClick={saveManage} disabled={saving}>{saving ? 'Salvataggio…' : 'Salva'}</Button>
        </Modal.Footer>
      </Modal>

      <Modal show={warn.show} onHide={() => setWarn(w => ({ ...w, show: false }))} centered>
        <Modal.Header closeButton>
          <Modal.Title>{warn.title}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="mb-0">{warn.message}</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setWarn(w => ({ ...w, show: false }))}>Chiudi</Button>
        </Modal.Footer>
      </Modal>

      <Modal show={info.show} onHide={() => setInfo(i => ({ ...i, show: false }))} centered>
        <Modal.Header closeButton>
          <Modal.Title>{info.title}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="mb-0">{info.message}</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="primary" onClick={() => setInfo(i => ({ ...i, show: false }))}>Ok</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
