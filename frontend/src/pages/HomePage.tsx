import React, { useState, useEffect } from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import HeroSection from '../components/HeroSection';
import ConsultantCard from '../components/ConsultantCard';
import ServiceCard from '../components/ServiceCard';
import Footer from '../components/Footer';

// Interfacce per i dati ricevuti direttamente dal backend
interface BackendConsultant {
  id: number;
  nome: string;
  cognome: string;
  email: string;
  passwordHash: string; 
  telefono: string;
  imgProfUrl: string | null;
  specializzazione: string;
  biografia: string | null;
}

interface BackendService {
  id: number;
  nome: string;
  descrizione: string;
  prezzo: number;
  iconUrl: string | null;
}

// Interfacce per i dati che verranno passati ai componenti React
interface ConsultantCardProps {
  name: string;
  specialization: string;
  description: string; 
  imageUrl: string;
}

interface ServiceCardProps {
  title: string;
  description: string;
  iconUrl: string;
}


function HomePage() {
  const [consultants, setConsultants] = useState<ConsultantCardProps[]>([]);
  const [services, setServices] = useState<ServiceCardProps[]>([]);
  const [loadingConsultants, setLoadingConsultants] = useState<boolean>(true);
  const [loadingServices, setLoadingServices] = useState<boolean>(true);
  const [errorConsultants, setErrorConsultants] = useState<string | null>(null);
  const [errorServices, setErrorServices] = useState<string | null>(null);

  // useEffect per caricare i dati dei consulenti
  useEffect(() => {
    const fetchConsultants = async () => {
      try {
        const response = await fetch('http://localhost:8080/api/avvocati');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: BackendConsultant[] = await response.json();

        const formattedConsultants: ConsultantCardProps[] = data.map(c => ({
          name: `${c.nome} ${c.cognome}`,
          specialization: c.specializzazione,
          description: c.biografia || "Esperto legale con anni di esperienza nel settore. Nessuna biografia disponibile.",
          imageUrl: c.imgProfUrl
            ? `http://localhost:8080${c.imgProfUrl}`
            : `https://via.placeholder.com/150/${Math.floor(Math.random()*16777215).toString(16)}/ffffff?text=${c.nome.charAt(0)}${c.cognome.charAt(0)}`
        }));
        setConsultants(formattedConsultants);
      } catch (error) {
        console.error("Errore nel recupero dei consulenti:", error);
        setErrorConsultants("Impossibile caricare i consulenti. Riprova più tardi.");
      } finally {
        setLoadingConsultants(false);
      }
    };
    fetchConsultants();
  }, []);


  useEffect(() => {
    const fetchServices = async () => {
      try {
        const response = await fetch('http://localhost:8080/api/servizi');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: BackendService[] = await response.json();

        const formattedServices: ServiceCardProps[] = data.map(s => ({
          title: s.nome,
          description: s.descrizione,
          iconUrl: s.iconUrl
            ? `http://localhost:8080${s.iconUrl}`
            : `https://via.placeholder.com/100/${Math.floor(Math.random()*16777215).toString(16)}/ffffff?text=Servizio`
        }));
        setServices(formattedServices);
      } catch (error) {
        console.error("Errore nel recupero dei servizi:", error);
        setErrorServices("Impossibile caricare i servizi. Riprova più tardi.");
      } finally {
        setLoadingServices(false);
      }
    };
    fetchServices();
  }, []);

  return (
    <>
      <HeroSection />

      <Container className="my-5">
        <h2 className="text-center mb-4">I nostri Consulenti legali</h2>
        {loadingConsultants && <p className="text-center">Caricamento consulenti...</p>}
        {errorConsultants && <p className="text-center text-danger">{errorConsultants}</p>}
        {!loadingConsultants && !errorConsultants && consultants.length === 0 && (
          <p className="text-center">Nessun consulente trovato nel database.</p>
        )}
        <Row className="justify-content-center">
          {!loadingConsultants && !errorConsultants && consultants.map((consultant, index) => (
            <Col key={index} md={4} className="mb-4">
              <ConsultantCard {...consultant} />
            </Col>
          ))}
        </Row>
      </Container>

      {/* Sezione I nostri Servizi (non modificato per questo compito) */}
      <Container className="my-5">
        <h2 className="text-center mb-4">I nostri Servizi</h2>
        {loadingServices && <p className="text-center">Caricamento servizi...</p>}
        {errorServices && <p className="text-center text-danger">{errorServices}</p>}
        {!loadingServices && !errorServices && services.length === 0 && (
          <p className="text-center">Nessun servizio trovato nel database.</p>
        )}
        <Row className="justify-content-center">
          <Col xs={1} className="d-flex align-items-center justify-content-center">
            <span className="h1 text-muted cursor-pointer" style={{ cursor: 'pointer' }}>&lt;</span>
          </Col>
          <Col xs={10}>
            <Row className="justify-content-center">
              {!loadingServices && !errorServices && services.map((service, index) => (
                <Col key={index} md={4} className="mb-4">
                  <ServiceCard {...service} />
                </Col>
              ))}
            </Row>
          </Col>
          <Col xs={1} className="d-flex align-items-center justify-content-center">
            <span className="h1 text-muted cursor-pointer" style={{ cursor: 'pointer' }}>&gt;</span>
          </Col>
        </Row>
      </Container>

      <Footer />
    </>
  );
}

export default HomePage;