import React from 'react';

export default function MapView({ latitude, longitude, zoom = 14 }) {
  const safeLat = Number.isFinite(latitude) ? latitude : -0.2206;
  const safeLng = Number.isFinite(longitude) ? longitude : -78.5148;
  const bbox = `${safeLng - 0.01},${safeLat - 0.01},${safeLng + 0.01},${safeLat + 0.01}`;
  const embedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${safeLat},${safeLng}&zoom=${zoom}`;

  return (
    <div className="w-full h-full relative" style={{ width: '100%', height: '100%' }}>
      <iframe
        title="Mapa de ubicación"
        src={embedUrl}
        className="absolute inset-0 w-full h-full border-0"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
}
