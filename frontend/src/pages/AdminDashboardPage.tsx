import { useAuth } from '../context/useAuth';
import { Navigate, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { document.title = 'Admin Dashboard'; }, []);

  if (!user) return null;
  if (user.role !== 'ROLE_ADMIN') return <Navigate to="/" replace />;

  const cards: Array<{ title: string; path: string; desc: string; color?: string }> = [
    { title: 'Medici', path: '/admin/medici', desc: 'Crea e gestisci i medici, specialità e sedi associate', color: 'primary' },
    { title: 'Sedi', path: '/admin/sedi', desc: 'Gestisci le sedi e le loro coordinate (geocoding)', color: 'success' },
    { title: 'Ops / Associazioni', path: '/admin/ops', desc: 'Associa sedi e collaboratori ai medici', color: 'warning' },
  ];

  return (
    <div className="d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '60vh' }}>
      <h1 className="mb-4 fw-bold text-center">Pannello Amministratore</h1>
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
        Questi moduli consentono di amministrare risorse core del sistema. Usa le sezioni per creare medici, gestire le specialità, configurare le sedi con latitudine/longitudine e assegnare sedi o collaboratori ai medici.
      </div>
    </div>
  );
}
