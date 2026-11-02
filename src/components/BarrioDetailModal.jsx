import React, { useState } from 'react';
import { X, ExternalLink, Copy, Check, MapPin, ShieldAlert, DollarSign, HeartPulse, Bus, Navigation, Tag, Info } from 'lucide-react';
import { getBarrioPopularAlias } from '../utils/barrioAliases';

export default function BarrioDetailModal({ barrio, onClose, onPlanRoute }) {
  const [copied, setCopied] = useState(false);

  if (!barrio) return null;

  const { properties } = barrio;
  const [lat, lng] = properties.centro || [4.6533, -74.0836];
  const locColor = properties.color_localidad || '#38bdf8';
  const popularAlias = getBarrioPopularAlias(properties.codigo, properties.nombre);

  const handleCopy = () => {
    navigator.clipboard.writeText(`${lat}, ${lng}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const osmUrl = `https://www.openstreetmap.org/#map=16/${lat}/${lng}`;
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

  const riesgoColor =
    properties.nivel_riesgo === 'Bajo'
      ? '#10b981'
      : properties.nivel_riesgo === 'Crítico'
      ? '#ef4444'
      : '#f59e0b';

  return (
    <div className="detail-card-floating" style={{ borderTop: `4px solid ${locColor}` }}>
      <div className="detail-header">
        <div>
          <h2 className="detail-title">{properties.nombre}</h2>
          {popularAlias && (
            <div style={{ marginTop: 3, marginBottom: 4, display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(56, 189, 248, 0.12)', border: '1px solid rgba(56, 189, 248, 0.3)', padding: '2px 8px', borderRadius: 6, fontSize: '0.78rem', color: '#38bdf8' }}>
              <Tag size={12} />
              <span>Conocido en Google / calle como: <strong>{popularAlias}</strong></span>
            </div>
          )}
          <div className="detail-subtitle">
            Localidad:{' '}
            <strong style={{ color: locColor }}>
              {properties.localidad}
            </strong>
            <span style={{ margin: '0 6px', color: '#475569' }}>•</span>
            <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Sector Catastral Oficial IDECA</span>
          </div>
        </div>
        <button className="close-btn" onClick={onClose} title="Cerrar ficha">
          <X size={18} />
        </button>
      </div>

      <div className="detail-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="detail-metric">
          <span className="detail-metric-label">Seguridad</span>
          <span className="detail-metric-val" style={{ color: riesgoColor }}>
            {properties.nivel_riesgo || 'Medio'}
          </span>
          <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
            ~{properties.tasa_homicidios} / 100k
          </span>
        </div>

        <div className="detail-metric">
          <span className="detail-metric-label">Ingresos / Estrato</span>
          <span className="detail-metric-val" style={{ color: '#38bdf8' }}>
            Estrato {properties.estrato || 3}
          </span>
          <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
            {properties.nivel_ingresos || 'Medio'}
          </span>
        </div>

        <div className="detail-metric">
          <span className="detail-metric-label">Mortalidad</span>
          <span className="detail-metric-val" style={{ color: '#fb7185' }}>
            {properties.tasa_mortalidad}
          </span>
          <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>por 1.000 hab.</span>
        </div>

        <div className="detail-metric">
          <span className="detail-metric-label">Código Catastral</span>
          <span className="detail-metric-val" style={{ fontSize: '0.8rem' }}>
            {properties.codigo}
          </span>
          <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{properties.tipo}</span>
        </div>
      </div>

      <div className="detail-actions">
        {onPlanRoute && (
          <button
            className="btn-primary"
            onClick={onPlanRoute}
            style={{ background: 'linear-gradient(135deg, #10b981, #06b6d4)' }}
          >
            <Navigation size={14} /> ¿Cómo llegar aquí?
          </button>
        )}

        <button className="btn-secondary" onClick={handleCopy}>
          {copied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
          {copied ? '¡Copiado!' : 'Copiar Coords'}
        </button>

        <a
          href={osmUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary"
          style={{ textDecoration: 'none' }}
        >
          <ExternalLink size={14} /> Ver en OpenStreetMap.org
        </a>

        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary"
          style={{ textDecoration: 'none' }}
        >
          <MapPin size={14} /> Maps
        </a>
      </div>
    </div>
  );
}
