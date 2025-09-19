import { useAuth } from '../context/useAuth';
import { Navigate, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { document.title = 'Area Amministratore'; }, []);

  if (!user) return null;
  if (user.role !== 'ROLE_ADMIN') return <Navigate to="/" replace />;

  const cards: Array<{ title: string; path: string; desc: string; color?: string }> = [
    { title: 'Medici', path: '/admin/medici', desc: 'Crea e gestisci i medici, le specialità e le sedi', color: 'primary' },
    { title: 'Sedi', path: '/admin/sedi', desc: 'Aggiungi e modifica le sedi della clinica', color: 'success' },
    { title: 'Collaboratori', path: '/admin/ops', desc: 'Crea e gestisci i collaboratori. L\'assegnazione ai medici avviene nella scheda del medico.', color: 'warning' },
    { title: 'Prestazioni', path: '/admin/prestazioni', desc: 'Gestisci l\'elenco delle prestazioni e i prezzi per sede', color: 'info' },
  ];

  return (
    <div className="d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '60vh' }}>
  <h1 className="mb-4 fw-bold text-center">Area Amministratore</h1>
      <div className="row g-4 justify-content-center" style={{ maxWidth: 1100 }}>
        {cards.map(c => {
          const borderClass = `border-${c.color || 'primary'}`;
          const textClass = `text-${c.color || 'primary'}`;
          const btnClass = `btn btn-${c.color || 'primary'} btn-lg mt-auto`;
          return (
            <div key={c.path} className="col-12 col-sm-6 col-lg-4 d-flex">
              <div className={`card shadow-sm flex-fill border-0 border-top border-3 ${borderClass} h-100`}>
                <div className="card-body d-flex flex-column">
                  <h3 className={`card-title fw-semibold mb-2 ${textClass}`}>{c.title}</h3>
                  <p className="text-muted small flex-grow-1 mb-3">{c.desc}</p>
                  <button className={btnClass} onClick={() => navigate(c.path)}>Vai a {c.title}</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-5 text-muted small text-center" style={{ maxWidth: 760 }}>
        Da qui puoi gestire medici, sedi, collaboratori e prestazioni. L\'assegnazione dei collaboratori ai medici si effettua dalla scheda del singolo medico.
      </div>
    </div>
  );
}
