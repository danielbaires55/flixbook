import React, { useState } from 'react';
import './css/NavBar.css'; // Assicurati che il percorso del CSS sia corretto
import logo from '../assets/logo-notext.png';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/useAuth'; // 1. Importa il nostro hook
import { Button } from '@mui/material';

// 2. Definiamo le props per le funzioni di scorrimento che arrivano da HomePage
interface NavBarProps {
  onSpecialitaClick: () => void;
  onMediciClick: () => void;
  onContattiClick: () => void;
}

const NavBar: React.FC<NavBarProps> = ({ onSpecialitaClick, onMediciClick, onContattiClick }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, logout } = useAuth(); // 3. Ottieni utente e funzione di logout dal contesto
  const navigate = useNavigate();

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // 4. Semplifichiamo la funzione di logout
  const handleLogoutClick = () => {
    logout(); // La funzione del contesto pulisce lo stato e localStorage
    navigate('/'); // Reindirizza alla home
    setIsMobileMenuOpen(false);
  };

  // 5. La funzione per la dashboard ora usa l'utente dal contesto
  const handleDashboardClick = () => {
    if (user?.role === 'ROLE_PAZIENTE') {
        navigate('/paziente-dashboard');
    } else if (user?.role === 'ROLE_MEDICO' || user?.role === 'ROLE_COLLABORATORE') {
        navigate('/medico-dashboard');
    }
    setIsMobileMenuOpen(false);
  };
  
  // 6. I link ora sono pulsanti che attivano lo scorrimento
  const navLinks = (
      <>
          <button onClick={() => { onMediciClick(); setIsMobileMenuOpen(false); }} className="nav-link-button">
              <span>Medici</span>
          </button>
          <button onClick={() => { onSpecialitaClick(); setIsMobileMenuOpen(false); }} className="nav-link-button">
              <span>Specialità</span>
          </button>
          <button onClick={() => { onContattiClick(); setIsMobileMenuOpen(false); }} className="nav-link-button">
              <span>Contatti</span>
          </button>
      </>
  );

  const authSection = user ? (
      <div className="navbar-auth">
          <Button variant="outlined" color="primary" onClick={handleDashboardClick} sx={{ mr: 1 }}>
              Dashboard
          </Button>
          <Button variant="contained" color="primary" onClick={handleLogoutClick}>
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

  return (
    <nav className="navbar">
      <div className="navbar-logo">
        <Link to="/">
          <img src={logo} alt="Logo" className="logo-image" />
        </Link>
      </div>

      <div className="navbar-links-desktop">
        {navLinks}
      </div>
      
      <div className="navbar-auth-desktop">
        {authSection}
      </div>

      <button className="hamburger-menu" onClick={toggleMobileMenu} aria-label="Apri menu">
        <div className="hamburger-line"></div>
        <div className="hamburger-line"></div>
        <div className="hamburger-line"></div>
      </button>

      <div className={`mobile-menu ${isMobileMenuOpen ? 'active' : ''}`}>
          {navLinks}
          <div className="mobile-auth-divider" />
          {user ? (
              <>
                  <button className="nav-link-button" onClick={handleDashboardClick}>Dashboard</button>
                  <button className="nav-link-button" onClick={handleLogoutClick}>Logout</button>
              </>
          ) : (
              <Link to="/login" className="nav-link-button" onClick={() => setIsMobileMenuOpen(false)}>
                  Accedi / Registrati
              </Link>
          )}
      </div>
    </nav>
  );
};

export default NavBar;