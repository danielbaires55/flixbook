// src/App.tsx
import React from 'react';
import './App.css';
// import { Container } from 'react-bootstrap'; // Non più necessario se CalendarPage ha già il Container
import AppNavbar from './components/AppNavbar';
import HomePage from './pages/HomePage'; // Commenta o rimuovi
//import CalendarPage from './pages/CalendarPage'; // Importa la pagina del Calendario

function App() {
  return (
    <>
    <AppNavbar />
      <HomePage />
    </>
  );
}

export default App;