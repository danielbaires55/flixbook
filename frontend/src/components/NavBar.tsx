import { useEffect, useState, type FC } from 'react';
import './css/NavBar.css'; // Assicurati che il percorso del CSS sia corretto
import logo from '../assets/logo-notext.png';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { Button, Avatar, Menu, MenuItem, ListItemIcon, ListItemText, Tooltip, Typography, Divider } from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import axios from 'axios';

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
  const [managedMedici, setManagedMedici] = useState<Array<{ id: number; nome: string; cognome: string; email: string; imgProfUrl?: string; specialita?: string }>>([]);
  const [actingMedicoId, setActingMedicoId] = useState<number | null>(user?.actingMedicoId ?? user?.medicoId ?? null);
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const menuOpen = Boolean(menuAnchorEl);

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

  // Fetch managed medici only for collaborators
  useEffect(() => {
    const fetchManaged = async () => {
      if (!user || user.role !== 'ROLE_COLLABORATORE') {
        setManagedMedici([]);
        return;
      }
      try {
        const { data } = await axios.get('http://localhost:8080/api/auth/managed-medici', {
          headers: { Authorization: `Bearer ${user.token}` }
        });
        setManagedMedici(data.managedMedici || []);
        setActingMedicoId(data.actingMedicoId ?? null);
  } catch {
        // ignore
      }
    };
    fetchManaged();
  }, [user]);

  const handleSwitchActing = async (newId: number) => {
    if (!user) return;
    try {
      const { data } = await axios.post('http://localhost:8080/api/auth/switch-acting-medico', { medicoId: newId }, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      // Update local storage user with new token and acting id
      const updated = { ...user, token: data.token, medicoId: newId, actingMedicoId: newId };
      localStorage.setItem('user', JSON.stringify(updated));
      // Hard refresh of state via login would be nicer, but we don't expose a setter; emulate by dispatching storage event
      setActingMedicoId(newId);
      setMenuAnchorEl(null);
      // Reload current route data if needed
      if (location.pathname.startsWith('/medico')) {
        // naive reload to update data fetched with token context
        navigate(0);
      }
  } catch {
      // ignore
    }
  };

  const activeMedico = managedMedici.find(m => m.id === actingMedicoId) || null;
  const initials = (n?: string, c?: string) => {
    const a = (c || '').charAt(0).toUpperCase();
    const b = (n || '').charAt(0).toUpperCase();
    return `${a}${b}` || 'M';
  };
  const openMenu = (e: React.MouseEvent<HTMLButtonElement>) => setMenuAnchorEl(e.currentTarget);
  const closeMenu = () => setMenuAnchorEl(null);

  // No external banner trigger

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
      {user?.role === 'ROLE_ADMIN' && (
        <>
          <Link to="/admin/medici" className={`nav-link-button${isActive('/admin/medici')}`} onClick={() => setIsMobileMenuOpen(false)}>Admin · Medici</Link>
          <Link to="/admin/sedi" className={`nav-link-button${isActive('/admin/sedi')}`} onClick={() => setIsMobileMenuOpen(false)}>Admin · Sedi</Link>
          <Link to="/admin/ops" className={`nav-link-button${isActive('/admin/ops')}`} onClick={() => setIsMobileMenuOpen(false)}>Admin · Ops</Link>
        </>
      )}
    </>
  );

  // 3. Link per la Dashboard del Paziente (AGGIORNATO)
  const pazienteLinks = (
    <>
  <Link to="/" className={`nav-link-button${isActive('/')}`} onClick={() => setIsMobileMenuOpen(false)}>Homepage</Link>
  <Link to="/paziente-dashboard" className={`nav-link-button${isActive('/paziente-dashboard')}`} onClick={() => setIsMobileMenuOpen(false)}>I Miei Appuntamenti</Link>
  <Link to="/book" className={`nav-link-button${isActive('/book')}`} onClick={() => setIsMobileMenuOpen(false)}>Prenota</Link>
  <Link to="/paziente/referti" className={`nav-link-button${isActive('/paziente/referti')}`} onClick={() => setIsMobileMenuOpen(false)}>Referti</Link>
  <Link to="/paziente/profilo" className={`nav-link-button${isActive('/paziente/profilo')}`} onClick={() => setIsMobileMenuOpen(false)}>Profilo</Link>
    </>
  );
  
  // --- Sezione Autenticazione (Pulsanti a destra) ---
  const authSection = user ? (
    <div className="navbar-auth">
      {user.role === 'ROLE_COLLABORATORE' && managedMedici.length > 0 && (
        <>
          <Tooltip title="Seleziona medico attivo">
            <Button
              variant="outlined"
              color="secondary"
              onClick={openMenu}
              endIcon={<KeyboardArrowDownIcon />}
              sx={{ mr: 1, textTransform: 'none', borderRadius: 3, px: 1.25 }}
            >
              <Avatar sx={{ width: 28, height: 28, mr: 1 }} src={activeMedico?.imgProfUrl ? `http://localhost:8080${activeMedico.imgProfUrl}` : undefined}>
                {initials(activeMedico?.nome, activeMedico?.cognome)}
              </Avatar>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <Typography variant="body2" sx={{ lineHeight: 1.1 }}>
                  {activeMedico ? `${activeMedico.cognome} ${activeMedico.nome}` : 'Seleziona medico'}
                  {activeMedico?.specialita ? ` · ${activeMedico.specialita}` : ''}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.1 }}>
                  Operi come Collaboratore
                </Typography>
              </div>
            </Button>
          </Tooltip>
          <Menu anchorEl={menuAnchorEl} open={menuOpen} onClose={closeMenu} MenuListProps={{ dense: true }}>
            <Typography variant="subtitle2" sx={{ px: 2, py: 1 }}>Seleziona medico</Typography>
            <Divider />
            {managedMedici.map(m => (
              <MenuItem key={m.id} selected={m.id === actingMedicoId} onClick={() => handleSwitchActing(m.id)}>
                <ListItemIcon>
                  <Avatar sx={{ width: 28, height: 28 }} src={m.imgProfUrl ? `http://localhost:8080${m.imgProfUrl}` : undefined}>
                    {initials(m.nome, m.cognome)}
                  </Avatar>
                </ListItemIcon>
                <ListItemText primary={`${m.cognome} ${m.nome}${m.specialita ? ' · ' + m.specialita : ''}`} secondary={m.email} />
              </MenuItem>
            ))}
          </Menu>
        </>
      )}
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
  } else if (user?.role === 'ROLE_ADMIN') {
    navLinksToShow = (
      <>
  <Link to="/admin/medici" className={`nav-link-button${isActive('/admin/medici')}`} onClick={() => setIsMobileMenuOpen(false)}>Admin · Medici</Link>
  <Link to="/admin/sedi" className={`nav-link-button${isActive('/admin/sedi')}`} onClick={() => setIsMobileMenuOpen(false)}>Admin · Sedi</Link>
  <Link to="/admin/ops" className={`nav-link-button${isActive('/admin/ops')}`} onClick={() => setIsMobileMenuOpen(false)}>Admin · Ops</Link>
      </>
    );
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