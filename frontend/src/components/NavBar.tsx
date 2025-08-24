import React, { useState, useEffect } from 'react';
import './css/NavBar.css';
import logo from '../assets/logo-notext.png';
import { useNavigate, Link } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import type { JwtPayload } from 'jwt-decode'; // Importa anche JwtPayload
// import Button from './Button';
import { Button } from '@mui/material';


// Interfaccia personalizzata per il payload del token
interface MyJwtPayload extends JwtPayload {
    role: 'MEDICO' | 'PAZIENTE' | 'COLLABORATORE';
    sub: string;
}

interface UserProfile {
    nome: string;
    ruolo: string;
}

const getStoredUser = (): UserProfile | null => {
    const token = localStorage.getItem('jwtToken');
    if (!token) return null;
    try {
        // Usa la nuova interfaccia per la decodifica
        const decodedToken = jwtDecode<MyJwtPayload>(token);
        const userRole = decodedToken.role;
        const userName = decodedToken.sub.split('@')[0];
        return { nome: userName, ruolo: userRole };
    } catch {
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
        setIsMobileMenuOpen(false);
    };

    const handleLogoutClick = () => {
        localStorage.removeItem('jwtToken');
        setUser(null);
        navigate('/login');
        setIsMobileMenuOpen(false);
    };

const handleDashboardClick = () => {
    if (user?.ruolo === 'PAZIENTE') {
        navigate('/paziente-dashboard');
    } else if (user?.ruolo === 'MEDICO' || user?.ruolo === 'COLLABORATORE') {
        navigate('/medico-dashboard');
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
            <Button onClick={handleDashboardClick}>
                Dashboard
            </Button>
            <Button onClick={handleLogoutClick}>
                Logout
            </Button>
        </div>
    ) : (
        <div className="navbar-button">
            <Link to="/login">
                Accedi
            </Link>
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