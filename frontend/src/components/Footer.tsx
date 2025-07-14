// src/components/Footer.tsx
import React from 'react';
import { Container, Row, Col, Nav } from 'react-bootstrap';

function Footer() {
  return (
    <footer className="bg-dark text-white py-4 mt-5"> {/* mt-5 per un margine superiore */}
      <Container>
        <Row className="justify-content-center text-center">
          <Col md={4} className="mb-3 mb-md-0">
            <h5>FlixBook</h5>
            <p>&copy; {new Date().getFullYear()} Tutti i diritti riservati.</p>
          </Col>
          <Col md={4} className="mb-3 mb-md-0">
            <h5>Link Utili</h5>
            <Nav className="flex-column">
              <Nav.Link href="#about" className="text-white">Chi siamo</Nav.Link>
              <Nav.Link href="#contact" className="text-white">Contatti</Nav.Link>
              <Nav.Link href="#privacy" className="text-white">Privacy Policy</Nav.Link>
            </Nav>
          </Col>
          <Col md={4}>
            <h5>Seguici</h5>
            {/* Placeholder per icone social */}
            <div className="d-flex justify-content-center gap-3">
              <a href="#" className="text-white"><i className="bi bi-facebook"></i></a> {/* Richiede l'installazione di Bootstrap Icons */}
              <a href="#" className="text-white"><i className="bi bi-linkedin"></i></a>
            </div>
          </Col>
        </Row>
      </Container>
    </footer>
  );
}

export default Footer;