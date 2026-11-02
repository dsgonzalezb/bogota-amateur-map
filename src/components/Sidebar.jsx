import React from 'react';
import { Search, X, MapPin, Download, Compass, Navigation, ShieldAlert, DollarSign } from 'lucide-react';

export default function Sidebar({
  isOpen,
  barriosList,
  totalCount,
  searchQuery,
  setSearchQuery,
  selectedLocalidad,
  setSelectedLocalidad,
  localidadesList,
  selectedTipo,
  setSelectedTipo,
  selectedBarrio,
  onSelectBarrio,
  onExportGeoJSON,
  onResetView
}) {
  return (
    <aside className={`sidebar ${!isOpen ? 'collapsed' : ''}`}>
      {/* Brand Header */}
      <div className="sidebar-header">
        <div className="logo-row">
          <div className="logo-icon">
            <Compass size={22} />
          </div>
          <div>
            <h1 className="brand-title">Bogotá Barrios & Redes</h1>
            <div className="brand-subtitle">
              <span>OSM, Catastro & Movilidad</span>
              <span className="live-badge">
                <span className="live-dot"></span> 1.230
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="search-container">
        <div className="search-input-wrapper">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Buscar barrio o código (ej: Cedritos, 008...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              className="clear-search-btn"
              onClick={() => setSearchQuery('')}
              title="Borrar búsqueda"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Localidad & Tipo filters */}
        <div className="filter-row">
          <select
            className="filter-select"
            value={selectedLocalidad}
            onChange={(e) => setSelectedLocalidad(e.target.value)}
          >
            <option value="ALL">Todas las localidades ({localidadesList.length})</option>
            {localidadesList.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>

          <select
            className="filter-select"
            style={{ maxWidth: '110px' }}
            value={selectedTipo}
            onChange={(e) => setSelectedTipo(e.target.value)}
          >
            <option value="ALL">Todos</option>
            <option value="Urbano">Urbano</option>
            <option value="Rural">Rural</option>
            <option value="Mixto">Mixto</option>
          </select>
        </div>
      </div>

      {/* Stats counter & Export */}
      <div className="stats-strip">
        <span>
          Mostrando <strong className="stats-count">{barriosList.length}</strong> de {totalCount} barrios
        </span>
        <button
          onClick={onExportGeoJSON}
          className="quick-zoom-btn"
          title="Descargar GeoJSON de los barrios filtrados"
          style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
        >
          <Download size={12} /> GeoJSON
        </button>
      </div>

      {/* Barrios List */}
      <div className="barrios-list">
        {barriosList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
            <MapPin size={32} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
            <p style={{ fontSize: '0.88rem', fontWeight: 600 }}>No se encontraron barrios</p>
            <p style={{ fontSize: '0.75rem', marginTop: 4 }}>
              Prueba con otro término o limpia los filtros.
            </p>
          </div>
        ) : (
          barriosList.map((feature) => {
            const props = feature.properties;
            const isSelected = selectedBarrio && selectedBarrio.properties.codigo === props.codigo;
            const locColor = props.color_localidad || '#38bdf8';

            const riesgoColor =
              props.nivel_riesgo === 'Bajo'
                ? '#10b981'
                : props.nivel_riesgo === 'Crítico'
                ? '#ef4444'
                : '#f59e0b';

            return (
              <div
                key={props.codigo}
                className={`barrio-item ${isSelected ? 'active' : ''}`}
                style={{
                  borderLeft: `4px solid ${locColor}`
                }}
                onClick={() => onSelectBarrio(feature)}
              >
                <div className="barrio-header">
                  <span className="barrio-name">{props.nombre}</span>
                  <span className="barrio-code-chip">{props.codigo}</span>
                </div>
                <div className="barrio-meta">
                  <span style={{ color: locColor, fontWeight: 700 }}>{props.localidad || 'Bogotá'}</span>
                  <span>•</span>
                  <span>Estrato {props.estrato || 3}</span>
                  <span>•</span>
                  <span style={{ color: riesgoColor, fontSize: '0.7rem', fontWeight: 600 }}>
                    {props.nivel_riesgo}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer reset button */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-subtle)' }}>
        <button
          onClick={onResetView}
          className="btn-secondary"
          style={{ width: '100%', fontSize: '0.78rem' }}
        >
          <Navigation size={14} /> Reencuadrar toda Bogotá
        </button>
      </div>
    </aside>
  );
}
