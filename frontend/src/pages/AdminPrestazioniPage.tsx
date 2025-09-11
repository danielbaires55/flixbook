import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import type { AxiosResponse } from 'axios';
import { API_BASE_URL } from '../config/api';
import { useAuth } from '../context/useAuth';
import { Modal, Button } from 'react-bootstrap';

interface Specialita { id: number; nome: string; }
interface Prestazione { id: number; nome: string; descrizione?: string; durataMinuti: number; tipoPrestazione: string; }
interface PrestazionePayload { nome: string; descrizione: string | null; durataMinuti: number | null; tipoPrestazione: string; sedePrezzi: Record<string, number>; }
interface ErrorResponse { error?: string; details?: string[] | string; }

export default function AdminPrestazioniPage() {
  const { user } = useAuth();
  const headers = useMemo(() => (user ? { Authorization: `Bearer ${user.token}` } : undefined), [user]);
  const [specialita, setSpecialita] = useState<Specialita[]>([]);
  const [selectedSpecId, setSelectedSpecId] = useState<number | ''>('');
  const [prestazioni, setPrestazioni] = useState<Prestazione[]>([]);
  const [form, setForm] = useState({ nome:'', descrizione:'', durataMinuti:'30', tipoPrestazione:'fisico' });
  const [sedi, setSedi] = useState<Array<{id:number; nome:string}>>([]);
  const [sedePrezzi, setSedePrezzi] = useState<Record<string,string>>({});
  const [editing, setEditing] = useState<Prestazione | null>(null);
  const [loading, setLoading] = useState(false);
  const [infoModal, setInfoModal] = useState<{show:boolean; title:string; msg:string}>({show:false,title:'',msg:''});
  const [errorModal, setErrorModal] = useState<{show:boolean; msg:string}>({show:false,msg:''});
  const [confirmDeleteId, setConfirmDeleteId] = useState<number|null>(null);

  useEffect(() => { (async () => {
    try {
      const [specResp, sediResp] = await Promise.all([
        axios.get<Specialita[]>(`${API_BASE_URL}/specialita`, { headers }),
        axios.get<Array<{id:number; nome:string}>>(`${API_BASE_URL}/admin/sedi`, { headers })
      ]);
      setSpecialita(specResp.data);
      setSedi(sediResp.data);
    } catch {
      setErrorModal({show:true,msg:'Errore caricamento specialità'});
    }
  })(); }, [headers]);

  const loadPrestazioni = async (specId: number) => {
    try {
      const { data } = await axios.get<Prestazione[]>(`${API_BASE_URL}/admin/specialita/${specId}/prestazioni`, { headers });
      setPrestazioni(data);
    } catch {
      setErrorModal({show:true,msg:'Errore caricamento prestazioni'});
    }
  };

  const onSpecChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value ? Number(e.target.value) : '';
    setSelectedSpecId(val);
    setPrestazioni([]);
    if (val) loadPrestazioni(val);
  };

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const resetForm = () => { setForm({ nome:'', descrizione:'', durataMinuti:'30', tipoPrestazione:'fisico' }); setSedePrezzi({}); setEditing(null); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSpecId) { setErrorModal({show:true,msg:'Seleziona una specialità'}); return; }
    setLoading(true);
    const prezziValidi: Record<string, number> = {};
    Object.entries(sedePrezzi).forEach(([k,v]) => { if (v !== '') { const num = Number(v); if (!isNaN(num)) prezziValidi[k]=num; }});
    const payload: PrestazionePayload = {
      nome: form.nome.trim(),
      descrizione: form.descrizione.trim() || null,
  durataMinuti: 30,
      tipoPrestazione: form.tipoPrestazione,
      
      sedePrezzi: prezziValidi
    };
    try {
      if (editing) {
        const resp: AxiosResponse = await axios.put(`${API_BASE_URL}/admin/prestazioni/${editing.id}`, payload, { headers, validateStatus: () => true });
        if (resp.status === 200) {
          setInfoModal({show:true,title:'Aggiornata',msg:'Prestazione aggiornata.'});
          await loadPrestazioni(selectedSpecId as number);
          resetForm();
        } else handleError(resp);
      } else {
        const resp: AxiosResponse = await axios.post(`${API_BASE_URL}/admin/specialita/${selectedSpecId}/prestazioni`, payload, { headers, validateStatus: () => true });
        if (resp.status === 200) {
          setInfoModal({show:true,title:'Creata',msg:'Nuova prestazione creata.'});
          await loadPrestazioni(selectedSpecId as number);
          resetForm();
        } else handleError(resp);
      }
    } catch {
      setErrorModal({show:true,msg:'Errore rete'});
    } finally { setLoading(false); }
  };

  const handleError = (resp: AxiosResponse<unknown>) => {
    const data = resp.data as ErrorResponse | undefined;
    const detailsJoined = data?.details ? (Array.isArray(data.details) ? data.details.join(', ') : data.details) : undefined;
    if (resp.status === 400) setErrorModal({show:true,msg: detailsJoined || data?.error || 'Dati non validi'});
    else if (resp.status === 409) setErrorModal({show:true,msg: data?.error || 'Duplicato'});
    else if (resp.status === 404) setErrorModal({show:true,msg:'Risorsa non trovata'});
    else if (resp.status === 403) setErrorModal({show:true,msg:'Accesso negato'});
    else setErrorModal({show:true,msg:`Errore (${resp.status})`});
  };

  const edit = (p: Prestazione) => {
    setEditing(p);
    setForm({
      nome: p.nome || '',
      descrizione: p.descrizione || '',
  durataMinuti: '30',
      tipoPrestazione: p.tipoPrestazione,
      
    });
  // Edit: fetch existing per-sede costs (not currently returned in list; future enhancement could preload)
  setSedePrezzi({});
  };

  const confirmDelete = async () => {
    if (!confirmDeleteId) return;
    try {
      const resp: AxiosResponse = await axios.delete(`${API_BASE_URL}/admin/prestazioni/${confirmDeleteId}`, { headers, validateStatus: () => true });
      if (resp.status === 204) {
        setInfoModal({show:true,title:'Eliminata',msg:'Prestazione eliminata.'});
        setPrestazioni(prev => prev.filter(p => p.id !== confirmDeleteId));
      } else handleError(resp);
    } catch { setErrorModal({show:true,msg:'Errore rete'}); }
    finally { setConfirmDeleteId(null); }
  };

  return (
    <div>
      <h2>Gestione Prestazioni per Specialità</h2>
      <div className="mb-3">
        <label className="form-label">Specialità</label>
        <select className="form-select" value={selectedSpecId} onChange={onSpecChange}>
          <option value="">-- seleziona --</option>
          {specialita.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
        </select>
      </div>
      {selectedSpecId && (
        <div className="row">
          <div className="col-md-5">
            <h4>{editing ? 'Modifica Prestazione' : 'Nuova Prestazione'}</h4>
            <form onSubmit={submit}>
              <div className="mb-2"><input name="nome" className="form-control" placeholder="Nome" value={form.nome} onChange={onChange} required minLength={3} /></div>
              <div className="mb-2"><textarea name="descrizione" className="form-control" placeholder="Descrizione" value={form.descrizione} onChange={onChange} rows={2}></textarea></div>
              <div className="row g-2 mb-2">
                <div className="col-4"><input name="durataMinuti" type="number" className="form-control" value={form.durataMinuti} disabled readOnly /></div>
                <div className="col-4 d-flex align-items-center"><span className="small text-muted">Costo per sede ↓</span></div>
                <div className="col-4">
                  <select name="tipoPrestazione" className="form-select" value={form.tipoPrestazione} onChange={onChange}>
                    <option value="fisico">Fisico</option>
                    <option value="virtuale">Virtuale</option>
                  </select>
                </div>
              </div>
              {sedi.length>0 && (
                <div className="mb-2 border rounded p-2" style={{maxHeight:220, overflowY:'auto'}}>
                  <div className="small fw-semibold mb-1">Prezzi per sede (lascia vuoto per non impostare)</div>
                  {sedi.map(s => (
                    <div key={s.id} className="d-flex align-items-center mb-1 gap-2">
                      <label className="form-label flex-grow-1 mb-0 small">{s.nome}</label>
                      <input
                        type="number"
                        step="0.01"
                        className="form-control form-control-sm"
                        style={{maxWidth:130}}
                        value={sedePrezzi[s.id]?.toString() || ''}
                        onChange={(e)=> setSedePrezzi(prev => ({...prev, [s.id]: e.target.value}))}
                        placeholder="€"
                        min={0}
                        max={10000}
                      />
                    </div>
                  ))}
                </div>
              )}
              
              <div className="d-flex gap-2">
                <button className="btn btn-primary" type="submit" disabled={loading}>{editing ? 'Salva' : 'Crea'}</button>
                {editing && <button type="button" className="btn btn-secondary" onClick={resetForm}>Annulla</button>}
              </div>
            </form>
          </div>
          <div className="col-md-7">
            <h4>Prestazioni</h4>
            {prestazioni.length === 0 && <p className="text-muted">Nessuna prestazione per questa specialità.</p>}
            <ul className="list-group">
              {prestazioni.map(p => (
                <li key={p.id} className="list-group-item d-flex justify-content-between align-items-center">
                  <div>
                    <strong>{p.nome}</strong> ({p.durataMinuti}m {p.tipoPrestazione})
                    {p.descrizione && <div className="small text-muted">{p.descrizione}</div>}
                  </div>
                  <div className="d-flex gap-2">
                    <button className="btn btn-sm btn-outline-secondary" onClick={() => edit(p)}>Modifica</button>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => setConfirmDeleteId(p.id)}>Elimina</button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Modals */}
      <Modal show={infoModal.show} onHide={() => setInfoModal(i=>({...i,show:false}))} centered>
        <Modal.Header closeButton><Modal.Title>{infoModal.title || 'Info'}</Modal.Title></Modal.Header>
        <Modal.Body>{infoModal.msg}</Modal.Body>
        <Modal.Footer><Button onClick={() => setInfoModal(i=>({...i,show:false}))}>OK</Button></Modal.Footer>
      </Modal>
      <Modal show={errorModal.show} onHide={() => setErrorModal({show:false,msg:''})} centered backdrop="static">
        <Modal.Header closeButton><Modal.Title>Errore</Modal.Title></Modal.Header>
        <Modal.Body>{errorModal.msg}</Modal.Body>
        <Modal.Footer><Button variant="secondary" onClick={() => setErrorModal({show:false,msg:''})}>Chiudi</Button></Modal.Footer>
      </Modal>
      <Modal show={confirmDeleteId!==null} onHide={()=>setConfirmDeleteId(null)} centered>
        <Modal.Header closeButton><Modal.Title>Conferma eliminazione</Modal.Title></Modal.Header>
        <Modal.Body>Eliminare definitivamente la prestazione?</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={()=>setConfirmDeleteId(null)}>Annulla</Button>
          <Button variant="danger" onClick={confirmDelete}>Elimina</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
