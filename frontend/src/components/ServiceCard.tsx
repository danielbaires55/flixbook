// src/components/ServiceCard.tsx
import React from 'react';
import { Card, Button } from 'react-bootstrap';

interface ServiceCardProps {
  title: string;
  description: string;
  iconUrl?: string; // URL dell'icona del servizio (opzionale)
}

function ServiceCard({ title, description, iconUrl }: ServiceCardProps) {
  return (
    <Card className="text-center shadow-sm h-100"> {/* h-100 per altezza uniforme in una riga */}
      <Card.Body>
        <Card.Img variant="top" src={iconUrl || "https://via.placeholder.com/100"} alt={`Icona di ${title}`} style={{ width: '100px', height: '100px', margin: '0 auto 15px' }} />
        <Card.Title>{title}</Card.Title>
        <Card.Text>
          {description}
        </Card.Text>
        <Button variant="link">Scopri di più</Button> {/* O un link per prenotare */}
      </Card.Body>
    </Card>
  );
}

export default ServiceCard;