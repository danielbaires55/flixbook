import React from 'react';
import './App.css';
import { Container } from 'react-bootstrap';

function App() {
  return (
    // Utilizziamo un Container di Bootstrap per centrare il contenuto
    // e un padding in alto (pt-5)
    <Container className="pt-5">
      {/* Qui inseriremo i nostri componenti, come la Navbar e il Router */}
      <h1>Benvenuto nel sistema di prenotazione StudioAgenda</h1>
      <p>Questa è la nostra pagina principale. Iniziamo a costruire i componenti!</p>
    </Container>
  );
}

export default App;