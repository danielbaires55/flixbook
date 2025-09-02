import { useEffect, useRef, useState, type FC } from 'react';
import axios from 'axios';
import { useAuth } from '../context/useAuth';
import { useNavigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import './css/CreateBloccoOrarioForm.css';
import { Modal, Button, OverlayTrigger, Tooltip, Form } from 'react-bootstrap';
import InfoModal from './InfoModal';

import { API_BASE_URL } from '../config/api';

const CreateBloccoOrarioForm: FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // 1. Aggiunti i campi per la pausa allo stato
  const [formData, setFormData] = useState({
    data: '',
    oraInizio: '09:00',
    oraFine: '17:00',
    includePausa: true,
    pausaInizio: '13:00',
    pausaFine: '14:00',
  });
  
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [warnModal, setWarnModal] = useState<{ show: boolean; title: string; message: string }>({ show: false, title: '', message: '' });

  // Sedi
  type Sede = { id: number; nome: string };
  const [sedi, setSedi] = useState<Sede[]>([]);
  const [sedeId, setSedeId] = useState<number | null>(null);

  // Prestazioni del medico
  type Prestazione = { id: number; nome: string; tipoPrestazione: 'fisico' | 'virtuale' };
  const [prestazioni, setPrestazioni] = useState<Prestazione[]>([]);
  const [prestazioneIds, setPrestazioneIds] = useState<number[]>([]); // default: tutte

  // Flag: tutte le prestazioni selezionate sono virtuali (e almeno una selezionata)
  const allVirtual = (
    prestazioni.length > 0 &&
    prestazioneIds.length > 0 &&
    prestazioneIds.every(id => prestazioni.find(p => p.id === id)?.tipoPrestazione === 'virtuale')
  );

  // UI: calendario popover
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarValue, setCalendarValue] = useState<Date | null>(null);
  const [multiSelect, setMultiSelect] = useState(false);
  const [selectedYMDs, setSelectedYMDs] = useState<string[]>([]);
  const calendarWrapRef = useRef<HTMLDivElement | null>(null);

  // Helpers
  const toYMD = (d: Date) => {
    const y = d.getFullYear();
    const m = `${d.getMonth() + 1}`.padStart(2, '0');
    const day = `${d.getDate()}`.padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const startOfToday = () => {
    const t = new Date();
    t.setHours(0,0,0,0);
    return t;
  };

  const toggleYMD = (ymd: string) => {
    setSelectedYMDs(prev => {
      const set = new Set(prev);
      if (set.has(ymd)) set.delete(ymd); else set.add(ymd);
      return Array.from(set).sort();
    });
  };

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!showCalendar) return;
      const target = e.target as Node;
      if (calendarWrapRef.current && !calendarWrapRef.current.contains(target)) {
        setShowCalendar(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showCalendar]);

  // Load sedi
  useEffect(() => {
    const loadSedi = async () => {
      try {
        if (!user) { setSedi([]); setSedeId(null); return; }
        const { data } = await axios.get(`${API_BASE_URL}/medici/sedi`, { headers: { Authorization: `Bearer ${user.token}` } });
        const list = (data as Sede[]).filter(s => s && typeof s.id === 'number');
        setSedi(list);
        // set default to first assigned, if any
        setSedeId(list[0]?.id ?? null);
      } catch {
        // silent: keep null, backend will enforce association
        setSedi([]);
        setSedeId(null);
      }
    };
    loadSedi();
  }, [user]);

  // Load prestazioni del medico loggato
  useEffect(() => {
    const loadPrestazioni = async () => {
      if (!user) return;
      try {
        const { data } = await axios.get<Prestazione[]>(`${API_BASE_URL}/prestazioni/by-medico-loggato`, {
          headers: { Authorization: `Bearer ${user.token}` }
        });
        const list: Prestazione[] = (data || []).map((p) => {
          const raw = (p as unknown as { id: number | string; nome: string; tipoPrestazione?: string });
          const tipo = raw?.tipoPrestazione === 'virtuale' ? 'virtuale' : 'fisico';
          return { id: Number(raw.id), nome: String(raw.nome), tipoPrestazione: tipo };
        });
        setPrestazioni(list);
        setPrestazioneIds(list.map(p => p.id)); // default: tutte selezionate
      } catch {
        // silently ignore; keep empty -> backend tratterà come tutte
        setPrestazioni([]);
        setPrestazioneIds([]);
      }
    };
    loadPrestazioni();
  }, [user]);

  // 2. Aggiornato handleChange per gestire anche le checkbox
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError('Devi essere autenticato per creare un blocco orario.');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    setMessage(null);

    const { oraInizio, oraFine, includePausa, pausaInizio, pausaFine } = formData;

    if (oraFine <= oraInizio || (includePausa && (pausaFine <= pausaInizio || pausaInizio < oraInizio || pausaFine > oraFine))) {
      setError("Gli orari inseriti non sono validi. Controlla che l'ora di fine sia successiva a quella di inizio e che la pausa sia contenuta nell'orario di lavoro.");
      setIsSubmitting(false);
      return;
    }

    const datesToCreate: string[] = multiSelect ? selectedYMDs : (formData.data ? [formData.data] : []);
    if (datesToCreate.length === 0) {
      setError('Seleziona almeno una data.');
      setIsSubmitting(false);
      return;
    }

    // Se il medico ha prestazioni caricate e l'utente ha deselezionato tutto, blocca
    if (prestazioni.length > 0 && prestazioneIds.length === 0) {
      setError('Seleziona almeno una prestazione per questo blocco, oppure lascia tutte selezionate.');
      setIsSubmitting(false);
      return;
    }

    // Verifica: nessuna data nel passato
    const today = startOfToday();
    const hasPast = datesToCreate.some(d => new Date(d + 'T00:00:00') < today);
    if (hasPast) {
      setError('Hai selezionato date nel passato. Rimuovile per continuare.');
      setIsSubmitting(false);
      return;
    }

  try {
      const headers = { Authorization: `Bearer ${user.token}` };
      // Esegui in sequenza per poter interrompere e mostrare il warning al primo conflitto
      for (const giorno of datesToCreate) {
        if (includePausa) {
          const basePayload: { sedeId?: number; prestazioneIds?: number[] } = {};
          if (sedeId && !allVirtual) basePayload.sedeId = sedeId;
          if (prestazioneIds.length) basePayload.prestazioneIds = prestazioneIds;
          const mattina: Record<string, string | number | number[]> = { data: giorno, oraInizio, oraFine: pausaInizio, ...basePayload };
          const pomeriggio: Record<string, string | number | number[]> = { data: giorno, oraInizio: pausaFine, oraFine, ...basePayload };
          try {
            await axios.post(`${API_BASE_URL}/blocchi-orario/create`, mattina, { headers });
            await axios.post(`${API_BASE_URL}/blocchi-orario/create`, pomeriggio, { headers });
          } catch (e: unknown) {
            const err = e as { response?: { data?: unknown; status?: number } };
            const backendMsg = typeof err?.response?.data === 'string' ? err.response.data as string : undefined;
            const msg = backendMsg || 'Esiste già un blocco che copre parte di questo intervallo. Modifica gli orari o scegli un altro giorno.';
            setWarnModal({ show: true, title: 'Attenzione', message: msg });
            setIsSubmitting(false);
            return;
          }
        } else {
          const unico: Record<string, string | number | number[]> = {
            data: giorno,
            oraInizio,
            oraFine,
            ...(sedeId && !allVirtual ? { sedeId } : {}),
            ...(prestazioneIds.length ? { prestazioneIds } : {})
          };
          try {
            await axios.post(`${API_BASE_URL}/blocchi-orario/create`, unico, { headers });
          } catch (e: unknown) {
            const err = e as { response?: { data?: unknown; status?: number } };
            const backendMsg = typeof err?.response?.data === 'string' ? err.response.data as string : undefined;
            const msg = backendMsg || 'Esiste già un blocco che copre parte di questo intervallo. Modifica gli orari o scegli un altro giorno.';
            setWarnModal({ show: true, title: 'Attenzione', message: msg });
            setIsSubmitting(false);
            return;
          }
        }
      }

      if (multiSelect) {
        setSelectedYMDs([]);
        setMessage(`Creati blocchi per ${datesToCreate.length} giorno${datesToCreate.length>1?'i':''}.`);
      } else {
        setFormData({ ...formData, data: '' });
        setMessage('Blocco orario creato con successo.');
      }

    } catch (err) {
      console.error('Errore nella creazione del blocco orario:', err);
      setError('Si è verificato un errore. Assicurati che l\'intervallo orario sia valido.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-md-8 col-lg-7">
          <div className="card shadow-sm">
            <div className="card-body p-4 p-md-5">
              <div className="d-flex justify-content-center align-items-center mb-3 gap-2">
                <h2 className="card-title mb-0">Crea Blocco di Lavoro</h2>
                <OverlayTrigger
                  placement="top"
                  overlay={
                    <Tooltip id="help-tooltip">
                      Guida rapida: seleziona una o più date, imposta orari/pausa e salva per generare i blocchi.
                    </Tooltip>
                  }
                >
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    aria-label="Apri guida alla creazione dei blocchi di lavoro"
                    onClick={() => setShowHelp(true)}
                  >
                    {/* question-circle icon */}
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" aria-hidden>
                      <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/>
                      <path d="M5.255 5.786a.237.237 0 0 0 .241.247h.825c.138 0 .248-.113.266-.25.09-.656.54-1.134 1.342-1.134.686 0 1.314.343 1.314 1.168 0 .635-.374.927-.965 1.371-.673.489-1.206 1.06-1.168 1.987l.003.217a.25.25 0 0 0 .25.246h.811a.25.25 0 0 0 .25-.25v-.105c0-.718.273-.927 1.01-1.486.609-.463 1.244-.977 1.244-2.056 0-1.511-1.276-2.241-2.673-2.241-1.267 0-2.655.59-2.75 2.286m1.557 5.763c0 .533.425.927 1.01.927.609 0 1.028-.394 1.028-.927 0-.552-.42-.94-1.029-.94-.584 0-1.009.388-1.009.94"/>
                    </svg>
                  </button>
                </OverlayTrigger>
              </div>
              <p className="text-center text-muted mb-4">
                Definisci i tuoi orari di disponibilità, con la possibilità di inserire una pausa.
              </p>
              <form onSubmit={handleSubmit}>
                {error && <div className="alert alert-danger">{error}</div>}
                {message && <div className="alert alert-success">{message}</div>}

                <div className="mb-3">
                  <Form.Label className="fw-bold">Sede</Form.Label>
                  <Form.Select
                    aria-label="Seleziona sede"
                    value={sedeId ?? ''}
                    onChange={(e) => setSedeId(e.target.value ? Number(e.target.value) : null)}
                    disabled={allVirtual}
                  >
                    {sedi.length === 0 && <option value="">(default) Sede Principale</option>}
                    {sedi.map(s => (
                      <option key={s.id} value={s.id}>{s.nome}</option>
                    ))}
                  </Form.Select>
                  {allVirtual && (
                    <div className="form-text">Per blocchi solo virtuali la sede non è necessaria e verrà ignorata.</div>
                  )}
                </div>

                <div className="row g-3 justify-content-center mb-3 border-bottom pb-3">
                  <div className="col-md-4">
                    <label htmlFor="data" className="form-label fw-bold">Data</label>
                    <div className="position-relative" ref={calendarWrapRef}>
                      <div className="input-group date-input-group">
                        <input
                          id="data"
                          name="data"
                          type="text"
                          className="form-control"
                          placeholder={multiSelect ? 'Seleziona più date' : 'Seleziona data'}
                          value={multiSelect ? (selectedYMDs.length ? `${selectedYMDs.length} date selezionate` : '') : formData.data}
                          readOnly
                          required
                          aria-haspopup="dialog"
                          aria-expanded={showCalendar}
                          onClick={() => setShowCalendar(true)}
                        />
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          aria-label="Apri calendario"
                          onClick={() => setShowCalendar(v => !v)}
                        >
                          {/* calendar icon */}
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
                            <path d="M3.5 0a.5.5 0 0 1 .5.5V2h8V.5a.5.5 0 0 1 1 0V2h1a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM1 6v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V6H1z"/>
                          </svg>
                        </button>
                      </div>
                      {showCalendar && (
                        <div className="calendar-popover shadow-lg">
                          <div className="calendar-header d-flex justify-content-between align-items-center px-3 pt-2 gap-2 flex-wrap">
                            <div className="d-flex align-items-center gap-2">
                              <strong>{multiSelect ? 'Seleziona più date' : 'Seleziona una data'}</strong>
                              <div className="form-check form-switch">
                                <input className="form-check-input" type="checkbox" id="multiSelectSwitch" checked={multiSelect}
                                  onChange={(e) => { setMultiSelect(e.target.checked); }}
                                />
                                <label className="form-check-label small" htmlFor="multiSelectSwitch">Multipla</label>
                              </div>
                            </div>
                            <div className="d-flex align-items-center gap-2">
                              {multiSelect && (
                                <>
                                  <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setSelectedYMDs([])}>Pulisci</button>
                                  <button type="button" className="btn btn-sm btn-primary" onClick={() => setShowCalendar(false)}>
                                    Applica{selectedYMDs.length ? ` (${selectedYMDs.length})` : ''}
                                  </button>
                                </>
                              )}
                              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setShowCalendar(false)}>Chiudi</button>
                            </div>
                          </div>
                          <div className="p-2 pt-1">
                            <Calendar
                              onChange={(value) => {
                                if (multiSelect) return; // handled by onClickDay
                                const d = Array.isArray(value) ? value[0] : value;
                                if (d) {
                                  setCalendarValue(d);
                                  const ymd = toYMD(d);
                                  setFormData(prev => ({ ...prev, data: ymd }));
                                  setShowCalendar(false);
                                }
                              }}
                              onClickDay={(d) => {
                                if (!multiSelect) return;
                                const ymd = toYMD(d);
                                if (d < startOfToday()) return; // ignore past
                                toggleYMD(ymd);
                              }}
                              value={calendarValue || (formData.data && !multiSelect ? new Date(formData.data + 'T00:00:00') : undefined)}
                              minDate={new Date()}
                              next2Label={null}
                              prev2Label={null}
                              locale="it-IT"
                              tileClassName={({ date }) => {
                                const ymd = toYMD(date);
                                if (multiSelect && selectedYMDs.includes(ymd)) return 'rc-multi-selected';
                                if (!multiSelect && formData.data && ymd === formData.data) return 'rc-multi-selected';
                                return undefined;
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="col-md-4">
                    <label htmlFor="oraInizio" className="form-label fw-bold">Dalle ore</label>
                    <input type="time" className="form-control" id="oraInizio" name="oraInizio" value={formData.oraInizio} onChange={handleChange} required step="1800" />
                  </div>
                  <div className="col-md-4">
                    <label htmlFor="oraFine" className="form-label fw-bold">Alle ore</label>
                    <input type="time" className="form-control" id="oraFine" name="oraFine" value={formData.oraFine} onChange={handleChange} required step="1800" />
                  </div>
                </div>

                {/* Prestazioni consentite per il blocco */}
                <div className="mb-3">
                  <Form.Label className="fw-bold d-flex align-items-center gap-2">
                    Prestazioni del blocco
                    <OverlayTrigger placement="top" overlay={<Tooltip id="tt-prest">Per default sono selezionate tutte le prestazioni del medico; puoi deselezionare quelle non disponibili per questo blocco (es. solo videoconsulto).</Tooltip>}>
                      <span style={{cursor:'help'}} aria-label="Aiuto">ⓘ</span>
                    </OverlayTrigger>
                  </Form.Label>
                  <div className="form-text mb-2">
                    Le prestazioni selezionate saranno prenotabili in questo blocco. Usa i filtri rapidi o la selezione manuale.
                  </div>
                  {prestazioni.length === 0 ? (
                    <div className="form-text">Tutte le prestazioni del medico saranno disponibili.</div>
                  ) : (
                    <div>
                      {/* Filtri rapidi */}
                      <div className="d-flex flex-wrap gap-2 mb-2">
                        <Button variant="outline-secondary" size="sm" onClick={() => setPrestazioneIds(prestazioni.map(p => p.id))}>Seleziona tutte</Button>
                        <Button variant="outline-secondary" size="sm" onClick={() => setPrestazioneIds([])}>Deseleziona tutte</Button>
                        <Button variant="outline-primary" size="sm" onClick={() => setPrestazioneIds(prestazioni.filter(p => p.tipoPrestazione === 'virtuale').map(p => p.id))}>Tieni solo virtuali</Button>
                        <Button variant="outline-primary" size="sm" onClick={() => setPrestazioneIds(prestazioni.filter(p => p.tipoPrestazione === 'fisico').map(p => p.id))}>Tieni solo fisiche</Button>
                        <Button variant="outline-dark" size="sm" onClick={() => setPrestazioneIds(prev => prev.filter(id => prestazioni.find(p => p.id === id)?.tipoPrestazione !== 'virtuale'))}>Rimuovi virtuali</Button>
                        <Button variant="outline-dark" size="sm" onClick={() => setPrestazioneIds(prev => prev.filter(id => prestazioni.find(p => p.id === id)?.tipoPrestazione !== 'fisico'))}>Rimuovi fisiche</Button>
                      </div>
                      <div className="small text-muted mb-2">Selezionate: {prestazioneIds.length} / {prestazioni.length}</div>
                      <div className="d-flex flex-wrap gap-2" aria-label="Seleziona prestazioni consentite">
        {prestazioni.map(p => {
                          const selected = prestazioneIds.includes(p.id);
                          return (
                            <span
                              key={p.id}
                              className={`badge rounded-pill ${selected ? 'bg-primary' : 'bg-light text-dark border'}`}
                              role="button"
                              tabIndex={0}
                              onClick={() => setPrestazioneIds(prev => prev.includes(p.id) ? prev.filter(id => id !== p.id) : [...prev, p.id])}
                              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setPrestazioneIds(prev => prev.includes(p.id) ? prev.filter(id => id !== p.id) : [...prev, p.id]);
                              }}}
                              title={`${selected ? 'Selezionata' : 'Deselezionata'} - ${p.nome}`}
                            >
          {p.nome}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {multiSelect && selectedYMDs.length > 0 && (
                  <div className="mt-2">
                    <small className="text-muted">Date selezionate:</small>
                    <div className="d-flex flex-wrap gap-2 mt-1">
                      {selectedYMDs.map(d => (
                        <span key={d} className="badge bg-light text-dark border">
                          {new Date(d + 'T00:00:00').toLocaleDateString('it-IT', { weekday: 'short', day: '2-digit', month: 'short' })}
                          <button type="button" className="btn btn-link btn-sm p-0 ms-2" onClick={() => toggleYMD(d)} title="Rimuovi">
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="row g-3 justify-content-center align-items-end pt-3">
                  <div className="col-12 text-center mb-2">
                      <div className="form-check form-switch d-inline-block">
                          <input className="form-check-input" type="checkbox" role="switch" id="includePausa" name="includePausa" checked={formData.includePausa} onChange={handleChange} />
                          <label className="form-check-label fw-bold" htmlFor="includePausa">
                              Includi Pausa
                          </label>
                      </div>
                  </div>
                  <div className="col-md-4">
                    <label htmlFor="pausaInizio" className="form-label">Inizio Pausa</label>
                    <input type="time" className="form-control" id="pausaInizio" name="pausaInizio" value={formData.pausaInizio} onChange={handleChange} disabled={!formData.includePausa} />
                  </div>
                  <div className="col-md-4">
                    <label htmlFor="pausaFine" className="form-label">Fine Pausa</label>
                    <input type="time" className="form-control" id="pausaFine" name="pausaFine" value={formData.pausaFine} onChange={handleChange} disabled={!formData.includePausa} />
                  </div>
                </div>

                <div className="d-grid mt-4">
                  <button type="submit" className="btn btn-primary btn-lg" disabled={isSubmitting}>
                    {isSubmitting ? 'Salvataggio in corso...' : 'Salva Blocco Orario'}
                  </button>
                </div>
                <div className="text-center mt-3">
                    <button type="button" className="btn btn-link" onClick={() => navigate('/medico-dashboard')}>
                        Torna alla Dashboard
                    </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
  </div>

  {/* Guida alla creazione dei blocchi di lavoro */}
    <Modal show={showHelp} onHide={() => setShowHelp(false)} centered>
      <Modal.Header closeButton>
        <Modal.Title>Come creare i blocchi di lavoro</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <ol className="mb-3">
          <li>
            Seleziona la data:
            <ul>
              <li>Click sul campo Data o sull'icona calendario per aprire il selettore.</li>
              <li>Per più giorni, attiva "Multipla" e seleziona i giorni desiderati (es. Lun–Ven).</li>
            </ul>
          </li>
          <li>
            Imposta orari:
            <ul>
              <li>Scegli l'orario di inizio e fine del turno (passi di 30 minuti).</li>
              <li>Opzionale: abilita "Includi Pausa" e specifica inizio/fine pausa (compresa nell'orario).</li>
            </ul>
          </li>
          <li>
            Salva:
            <ul>
              <li>Per ogni data selezionata verranno creati i blocchi. Con la pausa attiva, mattina e pomeriggio vengono generati separatamente.</li>
            </ul>
          </li>
        </ol>
        <div className="small text-muted">
          Note:
          <ul className="mb-0">
            <li>Non puoi selezionare date nel passato.</li>
            <li>Evita sovrapposizioni: i blocchi non devono sovrapporsi agli appuntamenti esistenti.</li>
            <li>Le date multiple selezionate compaiono come etichette rimovibili sotto il calendario.</li>
          </ul>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={() => setShowHelp(false)}>Chiudi</Button>
        <Button variant="primary" onClick={() => setShowHelp(false)}>Ho capito</Button>
      </Modal.Footer>
    </Modal>
    <InfoModal
      show={warnModal.show}
      title={warnModal.title}
      message={warnModal.message}
      variant="warning"
      onClose={() => setWarnModal({ show: false, title: '', message: '' })}
    />
    </>
  );
};

export default CreateBloccoOrarioForm;