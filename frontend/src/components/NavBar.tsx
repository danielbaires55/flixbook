import { useState, type FC } from 'react';
import './css/NavBar.css'; // Assicurati che il percorso del CSS sia corretto
import logo from '../assets/logo-notext.png';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { Button } from '@mui/material';

// Le props per lo scorrimento sono opzionali, perché vengono passate solo dalla HomePage
interface NavBarProps {
  onSpecialitaClick?: () => void;
  onMediciClick?: () => void;
  onContattiClick?: () => void;
}

const NavBar: FC<NavBarProps> = ({ onSpecialitaClick, onMediciClick, onContattiClick }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Controlliamo se siamo sulla homepage per decidere quali link mostrare
  const isHomePage = location.pathname === '/';

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
    setIsMobileMenuOpen(false);
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    setIsMobileMenuOpen(false);
  }

  const isActive = (path: string) => (location.pathname === path ? ' active' : '');

  // --- Definiamo i set di link per ogni scenario ---

  // 1. Link per la Homepage (utente non loggato)
  const publicLinks = (
    <>
  <button onClick={onMediciClick} className="nav-link-button">Medici</button>
  <button onClick={onSpecialitaClick} className="nav-link-button">Specialità</button>
  <button onClick={onContattiClick} className="nav-link-button">Contatti</button>
    </>
  );

  // 2. Link per la Dashboard del Medico/Collaboratore
  const medicoLinks = (
    <>
      <Link to="/medico-dashboard" className={`nav-link-button${isActive('/medico-dashboard')}`} onClick={() => setIsMobileMenuOpen(false)}>Dashboard</Link>
      <Link to="/medico/create-blocco-orario" className={`nav-link-button${isActive('/medico/create-blocco-orario')}`} onClick={() => setIsMobileMenuOpen(false)}>Gestisci Orari</Link>
      <Link to="/medico/profilo" className={`nav-link-button${isActive('/medico/profilo')}`} onClick={() => setIsMobileMenuOpen(false)}>Profilo</Link>
    </>
  );

  // 3. Link per la Dashboard del Paziente (AGGIORNATO)
  const pazienteLinks = (
    <>
  <Link to="/" className={`nav-link-button${isActive('/')}`} onClick={() => setIsMobileMenuOpen(false)}>Homepage</Link>
  <Link to="/paziente-dashboard" className={`nav-link-button${isActive('/paziente-dashboard')}`} onClick={() => setIsMobileMenuOpen(false)}>I Miei Appuntamenti</Link>
  <Link to="/book" className={`nav-link-button${isActive('/book')}`} onClick={() => setIsMobileMenuOpen(false)}>Prenota</Link>
  <Link to="/paziente/profilo" className={`nav-link-button${isActive('/paziente/profilo')}`} onClick={() => setIsMobileMenuOpen(false)}>Profilo</Link>
    </>
  );
  
  // --- Sezione Autenticazione (Pulsanti a destra) ---
  const authSection = user ? (
    <div className="navbar-auth">
      {isHomePage && (
        <Button
          variant="outlined"
          color="primary"
          onClick={() => handleNavigation(user.role === 'ROLE_PAZIENTE' ? '/paziente-dashboard' : '/medico-dashboard')}
          sx={{ mr: 1, display: { xs: 'none', md: 'inline-flex' } }}
        >
          Bentornato!
        </Button>
      )}
      <Button variant="contained" color="primary" onClick={handleLogout}>
        Logout
      </Button>
    </div>
  ) : (
    <div className="navbar-auth">
    <Button component={Link} to="/login" variant="contained" color="primary">
      Accedi / Registrati
      </Button>
    </div>
  );

  // --- Scelta del set di link da mostrare ---
  let navLinksToShow;
  if (!user && isHomePage) {
    navLinksToShow = publicLinks;
  } else if (user?.role === 'ROLE_MEDICO' || user?.role === 'ROLE_COLLABORATORE') {
    navLinksToShow = medicoLinks;
  } else if (user?.role === 'ROLE_PAZIENTE') {
    navLinksToShow = pazienteLinks;
  } else {
    // Fallback per utenti non loggati ma non sulla homepage
    navLinksToShow = (
      <Link to="/" className="nav-link-button">Home</Link>
    );
  }

  return (
    <nav className="navbar">
      <div className="navbar-logo">
        <Link to="/">
          <img src={logo} alt="Logo" className="logo-image" />
        </Link>
      </div>

      <div className="navbar-links-desktop">
        {navLinksToShow}
      </div>
      
      <div className="navbar-auth-desktop">
        {authSection}
      </div>

      <button className={`hamburger-menu ${isMobileMenuOpen ? 'active' : ''}`} onClick={toggleMobileMenu} aria-label="Apri menu">
        <div className="hamburger-line"></div>
        <div className="hamburger-line"></div>
        <div className="hamburger-line"></div>
      </button>

      <div className={`mobile-menu ${isMobileMenuOpen ? 'active' : ''}`}>
      {navLinksToShow}
          <div className="mobile-auth-divider" />
          {user ? (
              <>
          <button className={`nav-link-button${isActive(user.role === 'ROLE_PAZIENTE' ? '/paziente-dashboard' : '/medico-dashboard')}`} onClick={() => handleNavigation(user.role === 'ROLE_PAZIENTE' ? '/paziente-dashboard' : '/medico-dashboard')}>Dashboard</button>
                  <button className="nav-link-button" onClick={handleLogout}>Logout</button>
              </>
          ) : (
        <Link to="/login" className={`nav-link-button${isActive('/login')}`} onClick={() => setIsMobileMenuOpen(false)}>
                  Accedi / Registrati
              </Link>
          )}
      </div>
    </nav>
  );
};

export default NavBar;