// src/components/ConsultantCard.tsx
import React from 'react';
import { Card, Button } from 'react-bootstrap';

// Definiamo le props (proprietà) che questo componente accetterà
interface ConsultantCardProps {
  name: string;
  specialization: string;
  description: string;
  imageUrl?: string; // URL dell'immagine (opzionale)
}

function ConsultantCard({ name, specialization, description, imageUrl }: ConsultantCardProps) {
  return (
    <Card className="text-center shadow-sm">
      <Card.Img variant="top" src={imageUrl || "https://via.placeholder.com/150"} alt={`Immagine di ${name}`} />
      <Card.Body>
        <Card.Title>{name}</Card.Title>
        <Card.Subtitle className="mb-2 text-muted">{specialization}</Card.Subtitle>
        <Card.Text>
          {description}
        </Card.Text>
        <Button variant="outline-primary" size="sm">Vedi Profilo</Button> {/* O un link per prenotare direttamente */}
      </Card.Body>
    </Card>
  );
}

export default ConsultantCard;