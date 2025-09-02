import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/useAuth';

type Referto = {
  id: number;
  originalName: string;
  mimeType?: string;
  fileSize?: number;
  uploadedAt?: string;
  appuntamentoId: number;
  medicoNome?: string;
  medicoCognome?: string;
  prestazioneNome?: string;
  dataEOraInizio?: string;
  downloadUrl: string;
};

const API_BASE_URL = 'http://localhost:8080/api';
const SERVER_BASE_URL = 'http://localhost:8080';

export default function RefertiPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Referto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [period, setPeriod] = useState<'week' | 'month' | 'year' | ''>('');
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (!user) return;
    const fetchReferti = async () => {
      setLoading(true); setError(null);
      try {
  const params: Record<string, string | number | boolean> = { paged: true, page, size };
        if (q) params.q = q;
        if (period) params.period = period;
        const { data } = await axios.get(`${API_BASE_URL}/pazienti/referti`, {
          params,
          headers: { Authorization: `Bearer ${user.token}` }
        });
        setItems(data.items || []);
        setTotal(data.total || 0);
  } catch {
        setError('Impossibile caricare i referti.');
      } finally { setLoading(false); }
    };
    fetchReferti();
  }, [user, q, period, page, size]);

  const pageCount = useMemo(() => Math.max(1, Math.ceil(total / size)), [total, size]);

  return (
    <div className="container">
      <h1 className="mb-3">Referti</h1>
      <div className="d-flex flex-wrap gap-2 mb-3 align-items-center">
        <div className="input-group" style={{ maxWidth: 360 }}>
          <span className="input-group-text">Cerca</span>
          <input className="form-control" value={q} onChange={e => { setPage(1); setQ(e.target.value); }} placeholder="Nome referto, medico o prestazione" />
        </div>
  <select className="form-select" style={{ maxWidth: 220 }} value={period} onChange={e => { setPage(1); setPeriod(e.target.value as 'week'|'month'|'year'|''); }}>
          <option value="">Tutto</option>
          <option value="week">Ultima settimana</option>
          <option value="month">Ultimo mese</option>
          <option value="year">Ultimo anno</option>
        </select>
        <div className="ms-auto d-flex align-items-center gap-2">
          <label className="form-label mb-0">Per pagina</label>
          <select className="form-select" style={{ width: 100 }} value={size} onChange={e => { setPage(1); setSize(Number(e.target.value)); }}>
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
          </select>
        </div>
      </div>

      {loading ? <div>Caricamento…</div> : error ? <div className="alert alert-danger">{error}</div> : (
        items.length === 0 ? (
          <div className="text-muted">Nessun referto trovato.</div>
        ) : (
          <ul className="list-group">
            {items.map(r => (
              <li key={r.id} className="list-group-item d-flex justify-content-between align-items-center">
                <div className="me-2">
                  <div className="fw-semibold">{r.originalName}</div>
                  <div className="small text-muted">
                    {r.prestazioneNome ? `${r.prestazioneNome} · ` : ''}
                    {r.medicoCognome || r.medicoNome ? `Dr. ${r.medicoNome || ''} ${r.medicoCognome || ''}` : ''}
                    {r.dataEOraInizio ? ` · ${new Date(r.dataEOraInizio).toLocaleDateString('it-IT')}` : ''}
                  </div>
                </div>
                <a className="btn btn-sm btn-outline-primary" href={`${SERVER_BASE_URL}${r.downloadUrl}`} target="_blank" rel="noopener noreferrer" title="Scarica referto">Scarica</a>
              </li>
            ))}
          </ul>
        )
      )}

      <div className="d-flex justify-content-between align-items-center mt-3">
        <small className="text-muted">Totale: {total}</small>
        <div className="btn-group" role="group">
          <button className="btn btn-outline-secondary" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>«</button>
          <button className="btn btn-outline-secondary disabled">Pagina {page} / {pageCount}</button>
          <button className="btn btn-outline-secondary" disabled={page >= pageCount} onClick={() => setPage(p => Math.min(pageCount, p + 1))}>»</button>
        </div>
      </div>
    </div>
  );
}
