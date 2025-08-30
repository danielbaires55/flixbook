import { useEffect, useMemo, useState } from 'react';
import { Modal, Button } from 'react-bootstrap';
import axios, { AxiosError } from 'axios';
import { useAuth } from '../context/useAuth';

const API_BASE_URL = 'http://localhost:8080/api';

type Sede = { id: number; nome: string; indirizzo?: string; citta?: string; provincia?: string; cap?: string; telefono?: string; email?: string; lat?: number; lng?: number; attiva?: boolean };

export default function AdminSediPage() {
  const { user } = useAuth();
  const headers = useMemo(() => (user ? { Authorization: `Bearer ${user.token}` } : undefined), [user]);
  const [sedi, setSedi] = useState<Sede[]>([]);
  const [form, setForm] = useState<Partial<Sede>>({ nome: '' });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoMsg, setGeoMsg] = useState<string | null>(null);
  const [warn, setWarn] = useState<{show: boolean; title: string; message: string}>({show: false, title: '', message: ''});

  useEffect(() => {
    (async () => {
      const { data } = await axios.get<Sede[]>(`${API_BASE_URL}/admin/sedi`, { headers });
      setSedi(data);
    })();
  }, [headers]);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'lat' || name === 'lng') {
      const v = value === '' ? undefined : Number(value);
      setForm({ ...form, [name]: isNaN(v as number) ? undefined : (v as number) });
    } else {
      setForm({ ...form, [name]: value });
    }
  };
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      await axios.put(`${API_BASE_URL}/admin/sedi/${editingId}`, form, { headers });
      setEditingId(null);
    } else {
      await axios.post(`${API_BASE_URL}/admin/sedi`, form, { headers });
    }
    setForm({ nome: '' });
    const { data } = await axios.get<Sede[]>(`${API_BASE_URL}/admin/sedi`, { headers });
    setSedi(data);
  };
  const del = async (id: number) => {
    try {
      await axios.delete(`${API_BASE_URL}/admin/sedi/${id}`, { headers });
      const { data } = await axios.get<Sede[]>(`${API_BASE_URL}/admin/sedi`, { headers });
      setSedi(data);
    } catch (err: unknown) {
      type ConflictPayload = { associations?: number; message?: string };
      const axErr = err as AxiosError<ConflictPayload>;
      const status = axErr?.response?.status;
      if (status === 409) {
        const assoc = axErr.response?.data?.associations ?? 'alcuni';
        setWarn({show: true, title: 'Sede non eliminabile', message: `Ci sono ancora ${assoc} medico/i associati a questa sede. Rimuovi prima le associazioni (Admin → Ops) e riprova.`});
      } else {
        setWarn({show: true, title: 'Errore', message: 'Impossibile eliminare la sede in questo momento.'});
      }
    }
  };
  const edit = (s: Sede) => {
    setEditingId(s.id);
    setForm({
      nome: s.nome,
      indirizzo: s.indirizzo || '',
      citta: s.citta || '',
      provincia: s.provincia || '',
      cap: s.cap || '',
      telefono: s.telefono || '',
      email: s.email || '',
      lat: s.lat,
      lng: s.lng,
    });
  };
  const cancel = () => {
    setEditingId(null);
    setForm({ nome: '' });
  };

  const buildAddress = () => {
    const parts = [form.indirizzo, form.cap, form.citta, form.provincia, 'Italia'].filter(Boolean);
    return parts.join(', ');
  };
  const canGeocode = () => !!(form.indirizzo || form.citta || form.cap);
  const geocode = async () => {
    if (!canGeocode()) { setGeoMsg('Inserisci almeno città o indirizzo.'); return; }
    setGeoMsg(null);
    setGeoLoading(true);
    try {
      const q = buildAddress();
      const url = 'https://nominatim.openstreetmap.org/search';
      const { data } = await axios.get(url, { params: { format: 'json', q, addressdetails: 0, limit: 1 }, headers: { 'Accept-Language': 'it' } });
      if (Array.isArray(data) && data.length > 0) {
        const { lat, lon } = data[0] as { lat: string; lon: string };
        const latNum = Number(lat);
        const lngNum = Number(lon);
        if (isNaN(latNum) || isNaN(lngNum)) throw new Error('Valori non validi');
        setForm({ ...form, lat: latNum, lng: lngNum });
        setGeoMsg('Coordinate aggiornate.');
      } else {
        setGeoMsg('Nessun risultato dalla geocodifica.');
      }
    } catch {
      setGeoMsg('Errore durante la geocodifica.');
    } finally {
      setGeoLoading(false);
    }
  };

  return (
    <div>
      <h2>Gestione Sedi (Admin)</h2>
      <form onSubmit={onSubmit} style={{ maxWidth: 520 }}>
        <div className="mb-2"><input className="form-control" name="nome" placeholder="Nome sede" value={form.nome || ''} onChange={onChange} required /></div>
        <div className="mb-2"><input className="form-control" name="indirizzo" placeholder="Indirizzo" value={form.indirizzo || ''} onChange={onChange} /></div>
        <div className="mb-2"><input className="form-control" name="citta" placeholder="Città" value={form.citta || ''} onChange={onChange} /></div>
        <div className="mb-2"><input className="form-control" name="provincia" placeholder="Provincia" value={form.provincia || ''} onChange={onChange} /></div>
        <div className="mb-2"><input className="form-control" name="cap" placeholder="CAP" value={form.cap || ''} onChange={onChange} /></div>
        <div className="mb-2"><input className="form-control" name="telefono" placeholder="Telefono" value={form.telefono || ''} onChange={onChange} /></div>
        <div className="mb-2"><input className="form-control" name="email" placeholder="Email" value={form.email || ''} onChange={onChange} /></div>
        <div className="row g-2 mb-2 align-items-start">
          <div className="col-6 col-md-4">
            <input className="form-control" type="number" step="any" name="lat" placeholder="Latitudine (es. 45.4642)" value={form.lat ?? ''} onChange={onChange} />
          </div>
          <div className="col-6 col-md-4">
            <input className="form-control" type="number" step="any" name="lng" placeholder="Longitudine (es. 9.1900)" value={form.lng ?? ''} onChange={onChange} />
          </div>
          <div className="col-12 col-md-4 d-flex gap-2">
            <button type="button" className="btn btn-outline-primary" onClick={geocode} disabled={geoLoading || !canGeocode()}>
              {geoLoading ? 'Geocodifica…' : 'Geocodifica da indirizzo'}
            </button>
            {geoMsg && <span className="text-muted small align-self-center">{geoMsg}</span>}
          </div>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-primary" type="submit">{editingId ? 'Salva modifiche' : 'Crea Sede'}</button>
          {editingId && (
            <button className="btn btn-outline-secondary" type="button" onClick={cancel}>Annulla</button>
          )}
        </div>
      </form>

      <h3 className="mt-4">Sedi</h3>
      <div className="table-responsive">
        <table className="table table-sm align-middle">
          <thead>
            <tr>
              <th>Nome</th><th>Città</th><th>Lat</th><th>Lng</th><th></th>
            </tr>
          </thead>
          <tbody>
            {sedi.map(s => (
              <tr key={s.id}>
                <td>{s.nome}</td>
                <td>{s.citta || '—'}</td>
                <td>{s.lat ?? '—'}</td>
                <td>{s.lng ?? '—'}</td>
                <td className="text-end">
                  <button className="btn btn-sm btn-outline-secondary me-2" onClick={() => edit(s)}>Modifica</button>
                  <button className="btn btn-sm btn-outline-danger" onClick={() => del(s.id)}>Elimina</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal show={warn.show} onHide={() => setWarn(m => ({...m, show: false}))} centered>
        <Modal.Header closeButton>
          <Modal.Title>{warn.title}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="mb-0">{warn.message}</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setWarn(m => ({...m, show: false}))}>Chiudi</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
