// src/pages/HomePage.tsx
import React from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import HeroSection from '../components/HeroSection';
import ConsultantCard from '../components/ConsultantCard';
import ServiceCard from '../components/ServiceCard';
import Footer from '../components/Footer';

function HomePage() {
  // Dati di esempio per i consulenti legali
  const consultants = [
    {
      name: "Avv. Laura Bianchi",
      specialization: "Diritto di Famiglia",
      description: "Esperta in divorzi, affidamento minori e successioni.",
      imageUrl: "https://via.placeholder.com/150/007bff/ffffff?text=LB" // Placeholder con colore
    },
    {
      name: "Avv. Marco Verdi",
      specialization: "Diritto Penale",
      description: "Specializzato in difesa penale e reati minori.",
      imageUrl: "https://via.placeholder.com/150/28a745/ffffff?text=MV"
    },
    {
        name: "Avv. Sara Neri",
        specialization: "Diritto del Lavoro",
        description: "Competente in controversie lavorative e contrattualistica.",
        imageUrl: "https://via.placeholder.com/150/dc3545/ffffff?text=SN"
    }
  ];

  // Dati di esempio per i servizi
  const services = [
    {
      title: "Consulenza Penale",
      description: "Assistenza e difesa in procedimenti penali.",
      iconUrl: "https://via.placeholder.com/100/17a2b8/ffffff?text=Icona"
    },
    {
      title: "Diritto di Famiglia",
      description: "Consulenze su separazioni, divorzi e minori.",
      iconUrl: "https://via.placeholder.com/100/ffc107/000000?text=Icona"
    },
    {
      title: "Redazione Contratti",
      description: "Stesura e revisione di accordi e contratti.",
      iconUrl: "https://via.placeholder.com/100/6c757d/ffffff?text=Icona"
    },
    {
      title: "Videochiamata Legale",
      description: "Consulenza online tramite piattaforma video.",
      iconUrl: "https://via.placeholder.com/100/007bff/ffffff?text=Icona"
    }
  ];

  return (
    <>
      <HeroSection />

      {/* Sezione I nostri Consulenti Legali */}
      <Container className="my-5">
        <h2 className="text-center mb-4">I nostri Consulenti legali</h2>
        <Row className="justify-content-center">
          {consultants.map((consultant, index) => (
            <Col key={index} md={4} className="mb-4">
              <ConsultantCard {...consultant} />
            </Col>
          ))}
        </Row>
      </Container>

      {/* Sezione I nostri Servizi */}
      <Container className="my-5">
        <h2 className="text-center mb-4">I nostri Servizi</h2>
        <Row className="justify-content-center">
          {/* Implementazione di uno slider/carousel semplificato con frecce */}
          {/* Per un vero slider, useresti una libreria come 'react-slick' */}
          <Col xs={1} className="d-flex align-items-center justify-content-center">
            {/* Placeholder Freccia Sinistra */}
            <span className="h1 text-muted cursor-pointer" style={{ cursor: 'pointer' }}>&lt;</span>
          </Col>
          <Col xs={10}>
            <Row className="justify-content-center">
              {services.map((service, index) => (
                <Col key={index} md={4} className="mb-4">
                  <ServiceCard {...service} />
                </Col>
              ))}
            </Row>
          </Col>
          <Col xs={1} className="d-flex align-items-center justify-content-center">
            {/* Placeholder Freccia Destra */}
            <span className="h1 text-muted cursor-pointer" style={{ cursor: 'pointer' }}>&gt;</span>
          </Col>
        </Row>
      </Container>

      <Footer />
    </>
  );
}

export default HomePage;