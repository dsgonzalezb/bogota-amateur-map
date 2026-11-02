import React, { useState } from 'react';
import {
  List,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  DollarSign,
  HeartPulse,
  Palette,
  Bus,
  Train,
  Bike,
  Construction,
  ShoppingBag,
  HelpCircle
} from 'lucide-react';

const LOCALIDADES_LIST = [
  { nombre: 'Usaquén', color: '#3b82f6' },
  { nombre: 'Chapinero', color: '#06b6d4' },
  { nombre: 'Santa Fe', color: '#ef4444' },
  { nombre: 'San Cristóbal', color: '#f97316' },
  { nombre: 'Usme', color: '#84cc16' },
  { nombre: 'Tunjuelito', color: '#eab308' },
  { nombre: 'Bosa', color: '#ec4899' },
  { nombre: 'Kennedy', color: '#a855f7' },
  { nombre: 'Fontibón', color: '#14b8a6' },
  { nombre: 'Engativá', color: '#6366f1' },
  { nombre: 'Suba', color: '#10b981' },
  { nombre: 'Barrios Unidos', color: '#f59e0b' },
  { nombre: 'Teusaquillo', color: '#8b5cf6' },
  { nombre: 'Los Mártires', color: '#dc2626' },
  { nombre: 'Antonio Nariño', color: '#d97706' },
  { nombre: 'Puente Aranda', color: '#64748b' },
  { nombre: 'La Candelaria', color: '#ea580c' },
  { nombre: 'Rafael Uribe', color: '#fb7185' },
  { nombre: 'Ciudad Bolívar', color: '#e11d48' },
  { nombre: 'Sumapaz', color: '#059669' }
];

export default function MapLegend({
  colorMode,
  showLocalidades,
  showTransmilenio,
  showMetroTrenes,
  showCiclovias,
  showObras,
  showZonasComerciales,
  activePlannedRoute
}) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="map-legend-container">
      {/* Legend Toggle Bar */}
      <button
        className="legend-header-btn"
        onClick={() => setIsOpen(!isOpen)}
        title="Mostrar / ocultar convenciones del mapa"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <List size={16} color="#38bdf8" />
          <span style={{ fontWeight: 800, fontSize: '0.82rem', color: '#fff' }}>
            Convenciones del Mapa
          </span>
        </div>
        {isOpen ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
      </button>

      {/* Expanded Legend Content */}
      {isOpen && (
        <div className="legend-content-body">
          {/* Section 1: Active Thematic Coloring Mode */}
          <div className="legend-section">
            <div className="legend-section-title">
              {colorMode === 'localidad' && <Palette size={13} color="#f59e0b" />}
              {colorMode === 'seguridad' && <ShieldAlert size={13} color="#f87171" />}
              {colorMode === 'ingresos' && <DollarSign size={13} color="#34d399" />}
              {colorMode === 'mortalidad' && <HeartPulse size={13} color="#fb7185" />}
              <span>
                {colorMode === 'localidad' && 'Color por Localidad (20 Distritos)'}
                {colorMode === 'seguridad' && 'Nivel de Seguridad y Riesgo'}
                {colorMode === 'ingresos' && 'Estrato Socioeconómico Predominante'}
                {colorMode === 'mortalidad' && 'Tasa de Mortalidad (por 1.000 hab.)'}
              </span>
            </div>

            {/* Colors for Localidades */}
            {colorMode === 'localidad' && (
              <div className="legend-grid-localidades">
                {LOCALIDADES_LIST.map((loc) => (
                  <div key={loc.nombre} className="legend-item-compact">
                    <span
                      className="legend-color-dot"
                      style={{ background: loc.color }}
                    />
                    <span className="legend-label">{loc.nombre}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Colors for Seguridad */}
            {colorMode === 'seguridad' && (
              <div className="legend-items-list">
                <div className="legend-item">
                  <span className="legend-color-box" style={{ background: '#10b981' }} />
                  <div>
                    <strong style={{ color: '#10b981' }}>Bajo Riesgo</strong>
                    <span className="legend-sub">(&lt; 7.0 homicidios / 100k - Usaquén, Teusaquillo)</span>
                  </div>
                </div>
                <div className="legend-item">
                  <span className="legend-color-box" style={{ background: '#eab308' }} />
                  <div>
                    <strong style={{ color: '#eab308' }}>Riesgo Medio</strong>
                    <span className="legend-sub">(7.1 a 15.0 / 100k - Suba, Engativá, Chapinero)</span>
                  </div>
                </div>
                <div className="legend-item">
                  <span className="legend-color-box" style={{ background: '#f97316' }} />
                  <div>
                    <strong style={{ color: '#f97316' }}>Riesgo Medio-Alto</strong>
                    <span className="legend-sub">(15.1 a 22.0 / 100k - San Cristóbal, Usme)</span>
                  </div>
                </div>
                <div className="legend-item">
                  <span className="legend-color-box" style={{ background: '#ef4444' }} />
                  <div>
                    <strong style={{ color: '#ef4444' }}>Riesgo Alto a Crítico</strong>
                    <span className="legend-sub">(&gt; 22.0 / 100k - Bosa, Kennedy, Mártires, C. Bolívar)</span>
                  </div>
                </div>
              </div>
            )}

            {/* Colors for Ingresos / Estrato */}
            {colorMode === 'ingresos' && (
              <div className="legend-items-list">
                <div className="legend-item">
                  <span className="legend-color-box" style={{ background: '#f43f5e' }} />
                  <span>Estrato 1 (Bajo-Bajo)</span>
                </div>
                <div className="legend-item">
                  <span className="legend-color-box" style={{ background: '#fb923c' }} />
                  <span>Estrato 2 (Bajo)</span>
                </div>
                <div className="legend-item">
                  <span className="legend-color-box" style={{ background: '#facc15' }} />
                  <span>Estrato 3 (Medio-Bajo)</span>
                </div>
                <div className="legend-item">
                  <span className="legend-color-box" style={{ background: '#4ade80' }} />
                  <span>Estrato 4 (Medio)</span>
                </div>
                <div className="legend-item">
                  <span className="legend-color-box" style={{ background: '#38bdf8' }} />
                  <span>Estrato 5 (Medio-Alto)</span>
                </div>
                <div className="legend-item">
                  <span className="legend-color-box" style={{ background: '#818cf8' }} />
                  <span>Estrato 6 (Alto)</span>
                </div>
              </div>
            )}

            {/* Colors for Mortalidad */}
            {colorMode === 'mortalidad' && (
              <div className="legend-items-list">
                <div className="legend-item">
                  <span className="legend-color-box" style={{ background: '#10b981' }} />
                  <span>Menor a 5.5 por 1.000 hab. (Población más joven)</span>
                </div>
                <div className="legend-item">
                  <span className="legend-color-box" style={{ background: '#38bdf8' }} />
                  <span>5.6 a 7.0 por 1.000 hab. (Promedio distrital)</span>
                </div>
                <div className="legend-item">
                  <span className="legend-color-box" style={{ background: '#f59e0b' }} />
                  <span>7.1 a 8.2 por 1.000 hab.</span>
                </div>
                <div className="legend-item">
                  <span className="legend-color-box" style={{ background: '#ef4444' }} />
                  <span>Mayor a 8.2 por 1.000 hab. (Adulto mayor / alta vulnerabilidad)</span>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Active Infrastructure & Transport Lines */}
          <div className="legend-section" style={{ marginTop: '10px' }}>
            <div className="legend-section-title">
              <Bus size={13} color="#ef4444" />
              <span>Infraestructura y Redes Activas</span>
            </div>

            <div className="legend-items-list">
              {showTransmilenio && (
                <div className="legend-item">
                  <span className="legend-line" style={{ background: '#ef4444', height: '4px' }} />
                  <span>Troncal TransMilenio (Rojo)</span>
                </div>
              )}

              {showMetroTrenes && (
                <>
                  <div className="legend-item">
                    <span className="legend-line" style={{ background: '#10b981', height: '5px' }} />
                    <span>Metro Línea 1 (En Construcción)</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-line" style={{ background: '#06b6d4', height: '4px' }} />
                    <span>Metro Línea 2 (Proyectada)</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-line" style={{ background: '#8b5cf6', height: '4px' }} />
                    <span>Regiotram de Occidente (Tren Eléctrico)</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-line" style={{ background: '#f59e0b', height: '4px' }} />
                    <span>Regiotram del Norte (Tren de Cercanías)</span>
                  </div>
                </>
              )}

              {showCiclovias && (
                <div className="legend-item">
                  <span
                    className="legend-line"
                    style={{
                      borderTop: '3px dashed #22c55e',
                      background: 'transparent',
                      height: '0'
                    }}
                  />
                  <span>Red de Ciclovías / Ciclorrutas</span>
                </div>
              )}

              {showObras && (
                <div className="legend-item">
                  <span
                    className="legend-line"
                    style={{
                      borderTop: '4px dashed #f97316',
                      background: 'transparent',
                      height: '0'
                    }}
                  />
                  <span>Grandes Obras IDU en Ejecución</span>
                </div>
              )}

              {showZonasComerciales && (
                <div className="legend-item">
                  <span
                    className="legend-color-box"
                    style={{ background: 'rgba(245, 158, 11, 0.4)', border: '1px solid #f59e0b' }}
                  />
                  <span>Zonas Comerciales y Centralidades</span>
                </div>
              )}

              {showLocalidades && (
                <div className="legend-item">
                  <span
                    className="legend-line"
                    style={{
                      borderTop: '2px dashed #ffffff',
                      background: 'transparent',
                      height: '0'
                    }}
                  />
                  <span>Límites de las 20 Localidades</span>
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Route Legend (if route is active) */}
          {activePlannedRoute && (
            <div className="legend-section" style={{ marginTop: '10px' }}>
              <div className="legend-section-title">
                <span style={{ color: activePlannedRoute.color }}>📍 Convención de la Ruta Activa</span>
              </div>
              <div className="legend-items-list">
                <div className="legend-item">
                  <span
                    style={{
                      background: '#10b981',
                      color: '#fff',
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '9px',
                      fontWeight: 800
                    }}
                  >
                    A
                  </span>
                  <span>Punto de Origen</span>
                </div>
                <div className="legend-item">
                  <span
                    style={{
                      background: '#ef4444',
                      color: '#fff',
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '9px',
                      fontWeight: 800
                    }}
                  >
                    B
                  </span>
                  <span>Punto de Destino</span>
                </div>
                <div className="legend-item">
                  <span
                    className="legend-line"
                    style={{
                      background: activePlannedRoute.color,
                      height: '4px'
                    }}
                  />
                  <span>Trazado de Ruta: {activePlannedRoute.titulo}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

