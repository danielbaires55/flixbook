// src/components/HeroSection.tsx
import React from 'react';
import { Container, Row, Col, Button } from 'react-bootstrap';

function HeroSection() {
  return (
    <Container className="text-center py-5" style={{ marginTop: '56px' }}> {/* py-5 per padding verticale, marginTop per evitare sovrapposizione navbar */}
      <Row className="align-items-center">
        <Col md={7}> {/* Colonna per il testo */}
          <h1 className="display-4 mb-3">Benvenuto in FlixBook!</h1>
          <p className="lead mb-4">
            Semplifica la gestione delle tue consulenze legali. Prenota appuntamenti in studio o videochiamate con i nostri avvocati esperti.
          </p>
          <Button variant="primary" size="lg" href="#prenota"> {/* CTA Button */}
            Prenota una consulenza
          </Button>
        </Col>
        <Col md={5}> {/* Colonna per l'immagine placeholder */}
          <div className="bg-light d-flex justify-content-center align-items-center" style={{ height: '250px', border: '1px solid #ddd' }}>
            <span className="text-muted">Immagine placeholder</span>
          </div>
        </Col>
      </Row>
    </Container>
  );
}

export default HeroSection;