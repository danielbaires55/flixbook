// src/components/AppNavbar.tsx
import React from 'react';
import { Navbar, Container, Nav } from 'react-bootstrap';

function AppNavbar() {
  return (
    <Navbar bg="dark" variant="dark" expand="lg" fixed="top">
      <Container>
        <Navbar.Brand href="#home">FlixBook</Navbar.Brand> {/* Nome app: FlixBook */}
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            <Nav.Link href="#home">Home</Nav.Link>
            <Nav.Link href="#prenota">Prenota</Nav.Link>
            <Nav.Link href="#miei-appuntamenti">I miei appuntamenti</Nav.Link>
            {/* Aggiungi altri link se necessario */}
          </Nav>
          <Nav>
            <Nav.Link href="#accedi">Accedi</Nav.Link>
            {/* <Nav.Link href="#registrati">Registrati</Nav.Link> */} {/* Se la registrazione è separata dal login */}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

export default AppNavbar;