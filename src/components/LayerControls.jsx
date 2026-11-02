import React, { useState } from 'react';
import {
  Layers,
  Map,
  Eye,
  Crosshair,
  Moon,
  Globe,
  Bike,
  Compass,
  Train,
  Bus,
  Construction,
  ShoppingBag,
  ShieldAlert,
  DollarSign,
  HeartPulse,
  Palette,
  ChevronDown,
  ChevronUp,
  Tag
} from 'lucide-react';

export default function LayerControls({
  activeBaseMap,
  setActiveBaseMap,
  colorMode,
  setColorMode,
  showBarrioLabels,
  setShowBarrioLabels,
  showLocalidades,
  setShowLocalidades,
  showTransmilenio,
  setShowTransmilenio,
  showMetroTrenes,
  setShowMetroTrenes,
  showCiclovias,
  setShowCiclovias,
  showObras,
  setShowObras,
  showZonasComerciales,
  setShowZonasComerciales,
  onQuickZoom,
  onLocateMe,
  locating = false
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="map-floating-controls">
      {/* Main Panel */}
      <div className="glass-card" style={{ maxHeight: 'calc(100vh - 40px)', overflowY: 'auto' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            paddingBottom: collapsed ? '0' : '8px',
            borderBottom: collapsed ? 'none' : '1px solid var(--border-subtle)',
            marginBottom: collapsed ? '0' : '12px'
          }}
          onClick={() => setCollapsed(!collapsed)}
        >
          <div className="layer-switcher-title" style={{ margin: 0 }}>
            <Layers size={14} color="#38bdf8" />
            <span style={{ fontSize: '0.82rem', color: '#fff' }}>Capas e Indicadores</span>
          </div>
          <button
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer'
            }}
          >
            {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>
        </div>

        {!collapsed && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Color Mode Selector (Localidad vs Indicadores Públicos) */}
            <div>
              <div className="layer-switcher-title">
                <Palette size={13} color="#f59e0b" />
                <span>Colorear Barrios Por</span>
              </div>
              <div className="layer-buttons">
                <button
                  className={`layer-btn ${colorMode === 'localidad' ? 'active' : ''}`}
                  onClick={() => setColorMode('localidad')}
                  title="Cada localidad tiene un color único para diferenciarla visualmente"
                >
                  <Palette size={13} /> Por Localidad (20 Colores)
                </button>
                <button
                  className={`layer-btn ${colorMode === 'seguridad' ? 'active' : ''}`}
                  onClick={() => setColorMode('seguridad')}
                  title="Índice de seguridad oficial (Verde=Bajo riesgo a Rojo=Crítico)"
                >
                  <ShieldAlert size={13} color="#f87171" /> Seguridad / Riesgo
                </button>
                <button
                  className={`layer-btn ${colorMode === 'ingresos' ? 'active' : ''}`}
                  onClick={() => setColorMode('ingresos')}
                  title="Estratos predominantes del 1 al 6 e ingresos"
                >
                  <DollarSign size={13} color="#34d399" /> Ingresos / Estratos
                </button>
                <button
                  className={`layer-btn ${colorMode === 'mortalidad' ? 'active' : ''}`}
                  onClick={() => setColorMode('mortalidad')}
                  title="Tasa de mortalidad general por 1.000 habitantes (SaluData)"
                >
                  <HeartPulse size={13} color="#fb7185" /> Tasa de Mortalidad
                </button>
              </div>
            </div>

            {/* Labels and Vector Toggles */}
            <div>
              <div className="layer-switcher-title">
                <Tag size={13} color="#38bdf8" />
                <span>Etiquetas y Visualización</span>
              </div>

              {/* Nombres de Barrios Siempre Visibles */}
              <div
                className="toggle-row"
                style={{ marginTop: 0, paddingTop: '4px' }}
                onClick={() => setShowBarrioLabels(!showBarrioLabels)}
                title="Mostrar los nombres de todos los barrios directamente sobre el mapa"
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Tag size={13} color="#38bdf8" /> Nombres de Barrios Visibles
                </span>
                <div className={`toggle-switch ${showBarrioLabels ? 'on' : ''}`}>
                  <div className="toggle-dot" />
                </div>
              </div>

              {/* Límites de Localidades */}
              <div
                className="toggle-row"
                onClick={() => setShowLocalidades(!showLocalidades)}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Eye size={13} color="#ffffff" /> Límites de Localidades
                </span>
                <div className={`toggle-switch ${showLocalidades ? 'on' : ''}`}>
                  <div className="toggle-dot" />
                </div>
              </div>
            </div>

            {/* Infrastructure & Public Vector Layers */}
            <div>
              <div className="layer-switcher-title">
                <Bus size={13} color="#ef4444" />
                <span>Infraestructura y Redes</span>
              </div>

              {/* Troncales TransMilenio */}
              <div
                className="toggle-row"
                style={{ marginTop: 0, paddingTop: '6px' }}
                onClick={() => setShowTransmilenio(!showTransmilenio)}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Bus size={13} color="#ef4444" /> Troncales TransMilenio
                </span>
                <div className={`toggle-switch ${showTransmilenio ? 'on' : ''}`}>
                  <div className="toggle-dot" />
                </div>
              </div>

              {/* Metro & Regiotram */}
              <div
                className="toggle-row"
                onClick={() => setShowMetroTrenes(!showMetroTrenes)}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Train size={13} color="#10b981" /> Metro L1, L2 y Regiotram
                </span>
                <div className={`toggle-switch ${showMetroTrenes ? 'on' : ''}`}>
                  <div className="toggle-dot" />
                </div>
              </div>

              {/* Ciclovías */}
              <div
                className="toggle-row"
                onClick={() => setShowCiclovias(!showCiclovias)}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Bike size={13} color="#22c55e" /> Red de Ciclovías
                </span>
                <div className={`toggle-switch ${showCiclovias ? 'on' : ''}`}>
                  <div className="toggle-dot" />
                </div>
              </div>

              {/* Obras IDU */}
              <div
                className="toggle-row"
                onClick={() => setShowObras(!showObras)}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Construction size={13} color="#f97316" /> Grandes Obras IDU
                </span>
                <div className={`toggle-switch ${showObras ? 'on' : ''}`}>
                  <div className="toggle-dot" />
                </div>
              </div>

              {/* Zonas Comerciales */}
              <div
                className="toggle-row"
                onClick={() => setShowZonasComerciales(!showZonasComerciales)}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShoppingBag size={13} color="#f59e0b" /> Zonas Comerciales
                </span>
                <div className={`toggle-switch ${showZonasComerciales ? 'on' : ''}`}>
                  <div className="toggle-dot" />
                </div>
              </div>
            </div>

            {/* Base Tile Layer (100% OSM) */}
            <div>
              <div className="layer-switcher-title">
                <Map size={13} color="#60a5fa" />
                <span>Estilo de Mapa Base</span>
              </div>
              <div className="layer-buttons">
                <button
                  className={`layer-btn ${activeBaseMap === 'osm_standard' ? 'active' : ''}`}
                  onClick={() => setActiveBaseMap('osm_standard')}
                >
                  <Map size={13} /> OSM Estándar
                </button>
                <button
                  className={`layer-btn ${activeBaseMap === 'osm_dark' ? 'active' : ''}`}
                  onClick={() => setActiveBaseMap('osm_dark')}
                >
                  <Moon size={13} /> OSM (Modo Oscuro)
                </button>
                <button
                  className={`layer-btn ${activeBaseMap === 'osm_hot' ? 'active' : ''}`}
                  onClick={() => setActiveBaseMap('osm_hot')}
                >
                  <Compass size={13} /> OSM Humanitario
                </button>
                <button
                  className={`layer-btn ${activeBaseMap === 'osm_cyclosm' ? 'active' : ''}`}
                  onClick={() => setActiveBaseMap('osm_cyclosm')}
                >
                  <Bike size={13} /> OSM Ciclovías
                </button>
                <button
                  className={`layer-btn ${activeBaseMap === 'satellite' ? 'active' : ''}`}
                  onClick={() => setActiveBaseMap('satellite')}
                >
                  <Globe size={13} /> Satélite Híbrido
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Presets */}
      <div className="glass-card">
        <div className="layer-switcher-title">
          <Crosshair size={13} />
          <span>Navegación Rápida</span>
        </div>
        <div className="quick-zoom-group">
          <button className="quick-zoom-btn" onClick={() => onQuickZoom('centro')}>
            Centro
          </button>
          <button className="quick-zoom-btn" onClick={() => onQuickZoom('norte')}>
            Norte
          </button>
          <button className="quick-zoom-btn" onClick={() => onQuickZoom('sur')}>
            Sur
          </button>
          <button className="quick-zoom-btn" onClick={() => onQuickZoom('occidente')}>
            Occidente
          </button>
          <button
            className="quick-zoom-btn"
            style={{ color: locating ? '#f59e0b' : '#38bdf8', fontWeight: 600 }}
            onClick={onLocateMe}
            disabled={locating}
            title="Ubicar mi posición actual mediante GPS"
          >
            {locating ? '⏳ GPS...' : '📍 Mi Ubicación'}
          </button>
        </div>
      </div>
    </div>
  );
}
