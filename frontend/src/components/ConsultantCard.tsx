import React from 'react';
import { Card } from 'react-bootstrap';

interface ConsultantCardProps {
  name: string;
  specialization: string;
  description: string;
  imageUrl: string;
}

const ConsultantCard: React.FC<ConsultantCardProps> = ({ name, specialization, description, imageUrl }) => {
  return (
    <Card className="text-center shadow-sm" style={{ width: '18rem' }}>
      <Card.Img variant="top" src={imageUrl} alt={name} style={{ height: '180px', objectFit: 'cover' }} />
      <Card.Body>
        <Card.Title>{name}</Card.Title>
        <Card.Subtitle className="mb-2 text-muted">{specialization}</Card.Subtitle>
        <Card.Text>
          {description}
        </Card.Text>
      </Card.Body>
    </Card>
  );
};

export default ConsultantCard;