import React, { useState, useEffect } from 'react';
import {
  X,
  Navigation,
  MapPin,
  ArrowRightLeft,
  Bike,
  Bus,
  Train,
  Clock,
  DollarSign,
  Flame,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  Crosshair,
  Loader2,
  Footprints,
  Compass
} from 'lucide-react';
import { searchPlaces } from '../utils/routePlanner';

export default function RoutePlannerModal({
  isOpen,
  onClose,
  origin,
  setOrigin,
  destination,
  setDestination,
  barriosList = [],
  stationsList = [],
  computedRoutes,
  selectedRouteIndex,
  setSelectedRouteIndex,
  onUseCurrentLocation,
  pickingPoint,
  setPickingPoint,
  calculating = false
}) {
  const [searchOrigin, setSearchOrigin] = useState('');
  const [searchDest, setSearchDest] = useState('');
  const [originSuggestions, setOriginSuggestions] = useState([]);
  const [destSuggestions, setDestSuggestions] = useState([]);
  const [searchingOrigin, setSearchingOrigin] = useState(false);
  const [searchingDest, setSearchingDest] = useState(false);
  const [showIntermediate, setShowIntermediate] = useState(false);
  const [expandedLegs, setExpandedLegs] = useState({ 0: true, 1: true });

  const toggleLegStops = (idx) => {
    setExpandedLegs((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  // Synchronize text inputs when origin or destination changes
  useEffect(() => {
    if (origin) setSearchOrigin(origin.nombre);
  }, [origin]);

  useEffect(() => {
    if (destination) setSearchDest(destination.nombre);
  }, [destination]);

  // Handle typing origin with debounced search
  useEffect(() => {
    if (!searchOrigin || origin?.nombre === searchOrigin) {
      setOriginSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchingOrigin(true);
      const res = await searchPlaces(searchOrigin, barriosList, stationsList);
      setOriginSuggestions(res);
      setSearchingOrigin(false);
    }, 280);
    return () => clearTimeout(timer);
  }, [searchOrigin, origin, barriosList, stationsList]);

  // Handle typing destination with debounced search
  useEffect(() => {
    if (!searchDest || destination?.nombre === searchDest) {
      setDestSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchingDest(true);
      const res = await searchPlaces(searchDest, barriosList, stationsList);
      setDestSuggestions(res);
      setSearchingDest(false);
    }, 280);
    return () => clearTimeout(timer);
  }, [searchDest, destination, barriosList, stationsList]);

  if (!isOpen) return null;

  const handleSwap = () => {
    const temp = origin;
    setOrigin(destination);
    setDestination(temp);
  };

  const handleSelectOrigin = (item) => {
    setOrigin({
      nombre: item.titulo,
      subtitulo: item.subtitulo,
      lat: item.lat,
      lng: item.lng
    });
    setSearchOrigin(item.titulo);
    setOriginSuggestions([]);
  };

  const handleSelectDest = (item) => {
    setDestination({
      nombre: item.titulo,
      subtitulo: item.subtitulo,
      lat: item.lat,
      lng: item.lng
    });
    setSearchDest(item.titulo);
    setDestSuggestions([]);
  };

  const activeRoute = computedRoutes?.rutas?.[selectedRouteIndex] || null;

  return (
    <div className="route-planner-drawer">
      {/* Header */}
      <div className="route-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Navigation size={20} color="#38bdf8" />
          <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff' }}>
            ¿Cómo llegar? (Ruta Exacta)
          </h2>
        </div>
        <button className="close-btn" onClick={onClose} title="Cerrar planificador">
          <X size={18} />
        </button>
      </div>

      {/* Origin and Destination inputs */}
      <div className="route-inputs-container">
        {/* Origin */}
        <div style={{ position: 'relative' }}>
          <div className="route-input-row">
            <span className="route-pin-badge origin">A</span>
            <input
              type="text"
              className="route-input-field"
              placeholder="Dirección, estación o barrio exacto de origen"
              value={searchOrigin}
              onChange={(e) => setSearchOrigin(e.target.value)}
            />
            {searchingOrigin && <Loader2 size={13} className="spinner" color="#38bdf8" />}
            <button
              className="route-mini-btn"
              onClick={onUseCurrentLocation}
              title="Usar mi ubicación GPS actual"
            >
              <Crosshair size={14} color="#38bdf8" />
            </button>
          </div>

          {/* Autocomplete suggestions Origin */}
          {originSuggestions.length > 0 && (
            <div className="route-autocomplete-list">
              {originSuggestions.map((item) => (
                <div
                  key={item.id}
                  className="route-autocomplete-item"
                  onClick={() => handleSelectOrigin(item)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {item.tipo === 'estacion' && <Train size={13} color="#ef4444" />}
                    {item.tipo === 'portal' && <Train size={13} color="#10b981" />}
                    {item.tipo === 'barrio' && <Compass size={13} color="#38bdf8" />}
                    {item.tipo === 'direccion' && <MapPin size={13} color="#f59e0b" />}
                    <strong>{item.titulo}</strong>
                  </div>
                  <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginTop: '1px' }}>
                    {item.subtitulo}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Swap Button */}
        <div style={{ textAlign: 'center', margin: '-4px 0' }}>
          <button className="swap-btn" onClick={handleSwap} title="Invertir origen y destino">
            <ArrowRightLeft size={13} />
          </button>
        </div>

        {/* Destination */}
        <div style={{ position: 'relative' }}>
          <div className="route-input-row">
            <span className="route-pin-badge destination">B</span>
            <input
              type="text"
              className="route-input-field"
              placeholder="Dirección, estación o barrio exacto de destino"
              value={searchDest}
              onChange={(e) => setSearchDest(e.target.value)}
            />
            {searchingDest && <Loader2 size={13} className="spinner" color="#38bdf8" />}
          </div>

          {/* Autocomplete suggestions Destination */}
          {destSuggestions.length > 0 && (
            <div className="route-autocomplete-list">
              {destSuggestions.map((item) => (
                <div
                  key={item.id}
                  className="route-autocomplete-item"
                  onClick={() => handleSelectDest(item)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {item.tipo === 'estacion' && <Train size={13} color="#ef4444" />}
                    {item.tipo === 'portal' && <Train size={13} color="#10b981" />}
                    {item.tipo === 'barrio' && <Compass size={13} color="#38bdf8" />}
                    {item.tipo === 'direccion' && <MapPin size={13} color="#f59e0b" />}
                    <strong>{item.titulo}</strong>
                  </div>
                  <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginTop: '1px' }}>
                    {item.subtitulo}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Picking exact point on map buttons */}
      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
        <button
          className={`btn-secondary ${pickingPoint === 'origin' ? 'active' : ''}`}
          style={{ flex: 1, fontSize: '0.72rem', padding: '6px' }}
          onClick={() => setPickingPoint(pickingPoint === 'origin' ? null : 'origin')}
        >
          {pickingPoint === 'origin' ? '👆 Clic en mapa para Origen...' : '📍 Marcar Punto Origen'}
        </button>
        <button
          className={`btn-secondary ${pickingPoint === 'dest' ? 'active' : ''}`}
          style={{ flex: 1, fontSize: '0.72rem', padding: '6px' }}
          onClick={() => setPickingPoint(pickingPoint === 'dest' ? null : 'dest')}
        >
          {pickingPoint === 'dest' ? '👆 Clic en mapa para Destino...' : '🎯 Marcar Punto Destino'}
        </button>
      </div>

      {/* Loading state for OSRM */}
      {calculating && (
        <div style={{ textAlign: 'center', padding: '24px 10px', color: '#38bdf8' }}>
          <Loader2 size={24} className="spinner" style={{ margin: '0 auto 8px' }} />
          <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>
            Calculando paradas, estaciones y trazado real...
          </div>
        </div>
      )}

      {/* Route Mode Tabs */}
      {!calculating && computedRoutes && (
        <div style={{ marginTop: '14px' }}>
          <div className="route-tabs-container">
            {computedRoutes.rutas.map((r, idx) => (
              <button
                key={r.id}
                className={`route-tab-btn ${selectedRouteIndex === idx ? 'active' : ''}`}
                onClick={() => setSelectedRouteIndex(idx)}
                style={{
                  borderBottomColor: selectedRouteIndex === idx ? r.color : 'transparent'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  {r.id === 'transmilenio' && <Train size={13} color="#ef4444" />}
                  {r.id === 'multimodal' && <Bus size={13} color="#3b82f6" />}
                  {r.id === 'ciclovia' && <Bike size={13} color="#22c55e" />}
                  {r.id === 'sitp' && <Bus size={13} color="#0284c7" />}
                  <span style={{ fontWeight: 700 }}>{r.tiempoTotalMin} min</span>
                </div>
                <span style={{ fontSize: '9px', opacity: 0.75 }}>{r.id}</span>
              </button>
            ))}
          </div>

          {/* Active Route Details */}
          {activeRoute && (
            <div className="route-active-card">
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '10px'
                }}
              >
                <div>
                  <h3 style={{ fontSize: '0.94rem', fontWeight: 800, color: '#fff' }}>
                    {activeRoute.titulo}
                  </h3>
                  <p style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '2px' }}>
                    {activeRoute.resumen}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: activeRoute.color }}>
                    {activeRoute.tiempoTotalMin} min
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>
                    {activeRoute.distanciaKm} km
                  </div>
                </div>
              </div>

              {/* Metric stats strip */}
              <div className="route-stats-strip">
                {activeRoute.stats.map((st, i) => (
                  <div key={i} className="route-stat-item">
                    <span style={{ fontSize: '9px', color: '#64748b', textTransform: 'uppercase' }}>
                      {st.label}
                    </span>
                    <strong style={{ fontSize: '11px', color: '#f8fafc' }}>{st.val}</strong>
                  </div>
                ))}
              </div>

              {/* Intermediate Stations Accordion */}
              {activeRoute.paradasIntermedias && activeRoute.paradasIntermedias.length > 0 && (
                <div
                  style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '8px',
                    padding: '8px 10px',
                    marginBottom: '10px'
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer'
                    }}
                    onClick={() => setShowIntermediate(!showIntermediate)}
                  >
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#ef4444' }}>
                      📍 Paradas en Troncal ({activeRoute.paradasIntermedias.length} estaciones)
                    </span>
                    <button style={{ background: 'transparent', border: 'none', color: '#ef4444' }}>
                      {showIntermediate ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>
                  </div>

                  {showIntermediate && (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                        marginTop: '8px',
                        paddingTop: '6px',
                        borderTop: '1px solid rgba(239, 68, 68, 0.2)',
                        maxHeight: '140px',
                        overflowY: 'auto'
                      }}
                    >
                      {activeRoute.paradasIntermedias.map((name, i) => (
                        <div
                          key={i}
                          style={{
                            fontSize: '11px',
                            color: '#e2e8f0',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          <span
                            style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              background: '#ef4444'
                            }}
                          />
                          <span>{name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Step-by-step legs */}
              <div className="route-legs-list">
                <span style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
                  Itinerario Detallado
                </span>
                {activeRoute.tramos.map((tr, idx) => (
                  <div
                    key={idx}
                    className="route-leg-card"
                    style={{ borderLeftColor: tr.color }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: '12px', color: '#fff' }}>{tr.titulo}</strong>
                      <span style={{ fontSize: '11px', color: tr.color, fontWeight: 700 }}>
                        {tr.tiempo}
                      </span>
                    </div>
                    <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '3px' }}>
                      {tr.detalle}
                    </p>

                    {/* Paradas intermedias del tramo (Alimentador, TransMilenio o SITP) */}
                    {tr.paradas && tr.paradas.length > 0 && (
                      <div
                        style={{
                          marginTop: '8px',
                          background: 'rgba(0,0,0,0.25)',
                          borderRadius: '6px',
                          padding: '6px 8px',
                          border: `1px solid ${tr.color}33`
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            cursor: 'pointer'
                          }}
                          onClick={() => toggleLegStops(idx)}
                        >
                          <span style={{ fontSize: '10px', fontWeight: 700, color: tr.color, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span>🚏</span> Paradas intermedias ({tr.paradas.length} paradas/estaciones)
                          </span>
                          <span style={{ color: tr.color }}>
                            {expandedLegs[idx] ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                          </span>
                        </div>

                        {expandedLegs[idx] && (
                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '3px',
                              marginTop: '6px',
                              paddingTop: '4px',
                              borderTop: `1px solid ${tr.color}22`,
                              maxHeight: '120px',
                              overflowY: 'auto'
                            }}
                          >
                            {tr.paradas.map((pName, pIdx) => (
                              <div
                                key={pIdx}
                                style={{
                                  fontSize: '10.5px',
                                  color: '#e2e8f0',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px'
                                }}
                              >
                                <span
                                  style={{
                                    width: '5px',
                                    height: '5px',
                                    borderRadius: '50%',
                                    background: tr.color,
                                    flexShrink: 0
                                  }}
                                />
                                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {pName}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
