import React, { useState, useEffect } from 'react';
import './NavBar.css';
import logo from '../assets/logo-notext.png';
import { useNavigate, Link } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

interface UserProfile {
    nome: string;
    ruolo: string;
}

const getStoredUser = (): UserProfile | null => {
    const token = localStorage.getItem('jwtToken');
    if (!token) return null;
    try {
        const decodedToken = jwtDecode(token);
        const userRole = decodedToken.role;
        const userName = decodedToken.sub.split('@')[0];
        return { nome: userName, ruolo: userRole };
    } catch (error) {
        return null;
    }
};

const NavBar: React.FC = () => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [user, setUser] = useState<UserProfile | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        setUser(getStoredUser());
    }, []);

    const toggleMobileMenu = () => {
        setIsMobileMenuOpen(!isMobileMenuOpen);
    };

    const handleLoginClick = () => {
        navigate('/login');
        setIsMobileMenuOpen(false); // Chiudi il menu mobile
    };

    const handleLogoutClick = () => {
        localStorage.removeItem('jwtToken');
        setUser(null);
        navigate('/login');
        setIsMobileMenuOpen(false); // Chiudi il menu mobile
    };
    
    // Funzione per reindirizzare alla dashboard corretta
    const handleDashboardClick = () => {
        if (user?.ruolo === 'MEDICO') {
            navigate('/medico-dashboard');
        } else if (user?.ruolo === 'PAZIENTE') {
            navigate('/paziente-dashboard');
        }
    };

    const navLinks = (
        <>
            <Link to="/contatti" className="nav-link">
                <span>Contatti</span>
            </Link>
            <Link to="/medici" className="nav-link">
                <span>Medici</span>
            </Link>
            <Link to="/specialita" className="nav-link">
                <span>Specialità</span>
            </Link>
        </>
    );

    const authButton = user ? (
        <div className="navbar-button">
            <button onClick={handleDashboardClick}>
                Dashboard
            </button>
            <button onClick={handleLogoutClick}>
                Logout
            </button>
        </div>
    ) : (
        <div className="navbar-button">
            <button onClick={handleLoginClick}>
                Accedi
            </button>
        </div>
    );

    return (
        <nav className="navbar">
            <div className="navbar-logo">
                <img src={logo} alt="Logo" className="logo-image" />
            </div>

            <div className="navbar-menu">
                <div className="navbar-links">
                    {navLinks}
                </div>
                {authButton}
            </div>

            <div className="hamburger-menu" onClick={toggleMobileMenu}>
                <div className="hamburger-line"></div>
                <div className="hamburger-line"></div>
                <div className="hamburger-line"></div>
            </div>

            <div className={`mobile-menu ${isMobileMenuOpen ? 'active' : ''}`}>
                <div className="mobile-menu-content">
                    {navLinks}
                    {user ? (
                        <>
                            <div className="mobile-nav-link">
                                <span onClick={handleDashboardClick}>Dashboard</span>
                            </div>
                            <div className="mobile-nav-link">
                                <span onClick={handleLogoutClick}>Logout</span>
                            </div>
                        </>
                    ) : (
                        <div className="mobile-nav-link">
                            <span onClick={handleLoginClick}>Accedi</span>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default NavBar;