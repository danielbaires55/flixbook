// src/pages/CalendarPage.tsx
import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Form, Dropdown, FormControl, InputGroup, Button } from 'react-bootstrap';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';

const localizer = momentLocalizer(moment);

interface CalendarEvent {
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  resource?: any;
}

function CalendarPage() {
  const [selectedConsultant, setSelectedConsultant] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');

  const consultants = [
    { id: '1', name: 'Avv. Mario Rossi' },
    { id: '2', name: 'Avv. Laura Bianchi' },
    { id: '3', name: 'Avv. Giulia Neri' },
  ];

  const services = [
    { id: '101', name: 'Consulenza Legale Penale' },
    { id: '102', name: 'Diritto di Famiglia' },
    { id: '103', name: 'Redazione Contratti' },
    { id: '104', name: 'Videochiamata Legale' },
  ];

  const [events, setEvents] = useState<CalendarEvent[]>([
    {
      title: 'Disponibile',
      start: new Date(2025, 6, 2, 9, 0),
      end: new Date(2025, 6, 2, 10, 0),
      allDay: false,
    },
    {
      title: 'Disponibile',
      start: new Date(2025, 6, 2, 11, 0),
      end: new Date(2025, 6, 2, 12, 0),
      allDay: false,
    },
  ]);

  const handleConsultantSelect = (consultantId: string | null) => {
    setSelectedConsultant(consultantId);
    console.log("Consulente selezionato:", consultantId);
  };

  const handleServiceSelect = (serviceId: string | null) => {
    setSelectedService(serviceId);
    console.log("Servizio selezionato:", serviceId);
  };

  const handleSelectSlot = ({ start, end }: { start: Date; end: Date }) => {
    const title = window.prompt(`Prenota appuntamento dal ${moment(start).format('DD/MM HH:mm')} al ${moment(end).format('HH:mm')}?`);
    if (title) {
      setEvents([
        ...events,
        {
          title: `Prenotato: ${title}`,
          start,
          end,
        },
      ]);
      alert(`Hai simulato la prenotazione per: ${title} il ${moment(start).format('DD/MM/YYYY HH:mm')}`);
    }
  };

  const handleSelectEvent = (event: CalendarEvent) => {
    alert(`Dettagli evento: ${event.title}\nInizio: ${moment(event.start).format('DD/MM/YYYY HH:mm')}\nFine: ${moment(event.end).format('HH:mm')}`);
  };

  return (
    // Aggiungi un margin-top significativo per la navbar fissa.
    // pt-5 e mt-5 sono classi Bootstrap per padding-top e margin-top.
    // Qui ho usato pt-5 e mt-5 per assicurare spazio.
    <Container className="pt-5 mt-5">
      <Row className="mb-4 align-items-end"> {/* align-items-end per allineare i campi in basso */}
        {/* Filtro Consulente */}
        <Col md={3}>
          <Form.Group controlId="consultantDropdown"> {/* Usa Form.Group per raggruppare label e controllo */}
            <Form.Label>Consulente</Form.Label>
            <Dropdown onSelect={(eventKey) => handleConsultantSelect(eventKey)}>
              <Dropdown.Toggle variant="outline-secondary" className="w-100"> {/* w-100 per larghezza completa */}
                {selectedConsultant ? consultants.find(c => c.id === selectedConsultant)?.name : "Seleziona Consulente"}
              </Dropdown.Toggle>
              <Dropdown.Menu className="w-100"> {/* Anche il menu dovrebbe occupare la larghezza */}
                <Dropdown.Item eventKey={null}>Tutti i Consulenti</Dropdown.Item>
                {consultants.map(consultant => (
                  <Dropdown.Item key={consultant.id} eventKey={consultant.id}>
                    {consultant.name}
                  </Dropdown.Item>
                ))}
              </Dropdown.Menu>
            </Dropdown>
          </Form.Group>
        </Col>

        {/* Filtro Servizio */}
        <Col md={3}>
          <Form.Group controlId="serviceDropdown">
            <Form.Label>Servizio</Form.Label>
            <Dropdown onSelect={(eventKey) => handleServiceSelect(eventKey)}>
              <Dropdown.Toggle variant="outline-secondary" className="w-100">
                {selectedService ? services.find(s => s.id === selectedService)?.name : "Seleziona Servizio"}
              </Dropdown.Toggle>
              <Dropdown.Menu className="w-100">
                <Dropdown.Item eventKey={null}>Tutti i Servizi</Dropdown.Item>
                {services.map(service => (
                  <Dropdown.Item key={service.id} eventKey={service.id}>
                    {service.name}
                  </Dropdown.Item>
                ))}
              </Dropdown.Menu>
            </Dropdown>
          </Form.Group>
        </Col>

        {/* Barra di Ricerca (Search) */}
        <Col md={4} className="ms-auto">
          <Form.Group controlId="searchBar">
            <Form.Label>Cerca</Form.Label>
            <InputGroup>
              <FormControl
                placeholder="Cerca appuntamenti..."
                aria-label="Cerca appuntamenti"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Button variant="outline-secondary">
                <i className="bi bi-search"></i>
              </Button>
            </InputGroup>
          </Form.Group>
        </Col>
      </Row>

      {/* Calendario */}
      <Row className="mb-5"> {/* Aggiunto mb-5 per spazio sotto il calendario */}
        <Col>
          <div style={{ height: 700 }}>
            <Calendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              defaultView="week"
              selectable
              onSelectSlot={handleSelectSlot}
              onSelectEvent={handleSelectEvent}
              views={['month', 'week', 'day', 'agenda']}
              step={30}
              timeslots={2}
              min={new Date(2025, 0, 1, 8, 0, 0)}
              max={new Date(2025, 0, 1, 19, 0, 0)}
              formats={{
                timeGutterFormat: 'HH:mm',
                eventTimeRangeFormat: ({ start, end }) => `${moment(start).format('HH:mm')} - ${moment(end).format('HH:mm')}`,
                agendaTimeRangeFormat: ({ start, end }) => `${moment(start).format('HH:mm')} - ${moment(end).format('HH:mm')}`,
              }}
              eventPropGetter={(event, start, end, isSelected) => {
                let newStyle = {
                  backgroundColor: 'green',
                  color: 'white',
                  borderRadius: '0px',
                  border: 'none',
                };
                if (event.title.includes('Prenotato')) {
                    newStyle.backgroundColor = 'gray';
                }
                return {
                  className: "",
                  style: newStyle
                };
              }}
            />
          </div>
        </Col>
      </Row>
    </Container>
  );
}

export default CalendarPage;