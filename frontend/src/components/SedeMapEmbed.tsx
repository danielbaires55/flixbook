import React from 'react';

interface SedeMapEmbedProps {
  lat: number;
  lng: number;
  indirizzo?: string | null;
  height?: string;
  zoom?: number;
  className?: string;
}

// Semplice iframe embed (senza API key); per esigenze avanzate usare libreria Google Maps JS.
const SedeMapEmbed: React.FC<SedeMapEmbedProps> = ({ lat, lng, indirizzo, height = '300px', zoom = 15, className }) => {
  const q = indirizzo ? encodeURIComponent(indirizzo) : `${lat},${lng}`;
  const src = `https://www.google.com/maps?q=${lat},${lng}&hl=it&z=${zoom}&output=embed`;
  const linkUrl = `https://www.google.com/maps/search/?api=1&query=${q}`;
  return (
    <div className={className} style={{ width: '100%' }}>
      <div className="ratio ratio-16x9" style={{ maxWidth: '100%', height }}>
        <iframe
          title="Mappa sede"
          src={src}
          style={{ border: 0, width: '100%', height: '100%' }}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      </div>
      <div className="mt-2 small">
        <span className="text-muted">{indirizzo}</span>{' '}
        <a href={linkUrl} target="_blank" rel="noreferrer" className="ms-1">
          Apri su Google Maps
        </a>
      </div>
    </div>
  );
};

export default SedeMapEmbed;
