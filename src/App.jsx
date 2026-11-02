import React, { useState, useEffect, useMemo } from 'react';
import { Menu, ChevronLeft, AlertCircle, CheckCircle, Navigation } from 'lucide-react';
import MapComponent from './components/MapComponent';
import Sidebar from './components/Sidebar';
import LayerControls from './components/LayerControls';
import BarrioDetailModal from './components/BarrioDetailModal';
import RoutePlannerModal from './components/RoutePlannerModal';
import MapLegend from './components/MapLegend';
import { computeMultimodalRoutes, reverseGeocodePoint } from './utils/routePlanner';
import './App.css';

// Point-in-polygon algorithm (Ray casting)
function pointInPoly(pt, ring) {
  const x = pt[0], y = pt[1];
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];
    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function findBarrioForCoords(lng, lat, features) {
  if (!features) return null;
  const pt = [lng, lat];
  for (const f of features) {
    const geom = f.geometry;
    if (geom.type === 'Polygon') {
      if (pointInPoly(pt, geom.coordinates[0])) return f;
    } else if (geom.type === 'MultiPolygon') {
      for (const poly of geom.coordinates) {
        if (pointInPoly(pt, poly[0])) return f;
      }
    }
  }
  return null;
}

export default function App() {
  const [barriosData, setBarriosData] = useState(null);
  const [localidadesData, setLocalidadesData] = useState(null);
  const [transmilenioData, setTransmilenioData] = useState(null);
  const [metroData, setMetroData] = useState(null);
  const [cicloviasData, setCicloviasData] = useState(null);
  const [obrasData, setObrasData] = useState(null);
  const [zonasComercialesData, setZonasComercialesData] = useState(null);
  const [stationsData, setStationsData] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState(null);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocalidad, setSelectedLocalidad] = useState('ALL');
  const [selectedTipo, setSelectedTipo] = useState('ALL');
  const [selectedBarrio, setSelectedBarrio] = useState(null);

  // Map thematic color mode
  const [colorMode, setColorMode] = useState('localidad'); // 'localidad' | 'seguridad' | 'ingresos' | 'mortalidad'

  // Map & Infrastructure layer toggles
  const [activeBaseMap, setActiveBaseMap] = useState('osm_standard');
  const [showBarrioLabels, setShowBarrioLabels] = useState(true); // Permanent visible names!
  const [showLocalidades, setShowLocalidades] = useState(true);
  const [showTransmilenio, setShowTransmilenio] = useState(true);
  const [showMetroTrenes, setShowMetroTrenes] = useState(true);
  const [showCiclovias, setShowCiclovias] = useState(false);
  const [showObras, setShowObras] = useState(false);
  const [showZonasComerciales, setShowZonasComerciales] = useState(false);

  // User location pin state
  const [userLocation, setUserLocation] = useState(null);
  const [locating, setLocating] = useState(false);

  // Route Planning State
  const [routeModalOpen, setRouteModalOpen] = useState(false);
  const [origin, setOrigin] = useState(null);
  const [destination, setDestination] = useState(null);
  const [computedRoutes, setComputedRoutes] = useState(null);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [pickingPoint, setPickingPoint] = useState(null); // 'origin' | 'dest' | null
  const [calculatingRoute, setCalculatingRoute] = useState(false);

  // Load core GeoJSON datasets on startup and lazy-load secondary infrastructure layers
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        // Core data: Barrios, Localidades y Estaciones para arranque instantáneo
        const [barriosRes, locsRes, stationsRes] = await Promise.all([
          fetch('/data/barrios_bogota.json'),
          fetch('/data/localidades_bogota.json'),
          fetch('/data/estaciones_transmilenio.json')
        ]);

        if (!barriosRes.ok) throw new Error('No se pudo cargar el archivo de barrios');

        const [barriosJson, locsJson, stationsJson] = await Promise.all([
          barriosRes.json(),
          locsRes.ok ? locsRes.json() : null,
          stationsRes.ok ? stationsRes.json() : []
        ]);

        setBarriosData(barriosJson);
        setLocalidadesData(locsJson);
        setStationsData(stationsJson);
        setLoading(false); // Quitar overlay de carga inmediatamente

        // Carga diferida en segundo plano de capas secundarias de movilidad y obras
        Promise.all([
          fetch('/data/transmilenio_troncales.json').then((r) => (r.ok ? r.json() : null)),
          fetch('/data/metro_y_trenes.json').then((r) => (r.ok ? r.json() : null)),
          fetch('/data/ciclovias_bogota.json').then((r) => (r.ok ? r.json() : null)),
          fetch('/data/obras_bogota.json').then((r) => (r.ok ? r.json() : null)),
          fetch('/data/zonas_comerciales.json').then((r) => (r.ok ? r.json() : null))
        ]).then(([tmJson, metroJson, cicloJson, obrasJson, comercioJson]) => {
          if (tmJson) setTransmilenioData(tmJson);
          if (metroJson) setMetroData(metroJson);
          if (cicloJson) setCicloviasData(cicloJson);
          if (obrasJson) setObrasData(obrasJson);
          if (comercioJson) setZonasComercialesData(comercioJson);
        }).catch((err) => console.warn('Carga diferida secundaria:', err));

      } catch (err) {
        console.error('Error cargando capas geográficas:', err);
        setError(err.message);
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // Compute real routes using OSRM whenever origin or destination changes
  useEffect(() => {
    let active = true;
    async function runRouting() {
      if (origin && destination) {
        setCalculatingRoute(true);
        try {
          const res = await computeMultimodalRoutes(origin, destination, stationsData);
          if (active) {
            setComputedRoutes(res);
            setSelectedRouteIndex(0);
          }
        } catch (err) {
          console.error('Error calculando ruta:', err);
        } finally {
          if (active) setCalculatingRoute(false);
        }
      } else {
        setComputedRoutes(null);
      }
    }

    runRouting();
    return () => {
      active = false;
    };
  }, [origin, destination, stationsData]);

  // Unique list of Localidades
  const localidadesList = useMemo(() => {
    if (!barriosData) return [];
    const set = new Set();
    barriosData.features.forEach((f) => {
      if (f.properties.localidad && f.properties.localidad !== 'Sin asignar') {
        set.add(f.properties.localidad);
      }
    });
    return Array.from(set).sort();
  }, [barriosData]);

  // Filtered barrios list for Sidebar and Navigation
  const filteredBarrios = useMemo(() => {
    if (!barriosData) return [];
    const q = searchQuery.trim().toLowerCase();

    return barriosData.features.filter((f) => {
      const p = f.properties;
      const matchSearch =
        !q ||
        p.nombre.toLowerCase().includes(q) ||
        p.codigo.toLowerCase().includes(q) ||
        (p.localidad && p.localidad.toLowerCase().includes(q));

      const matchLoc = selectedLocalidad === 'ALL' || p.localidad === selectedLocalidad;
      const matchTipo = selectedTipo === 'ALL' || p.tipo === selectedTipo;

      return matchSearch && matchLoc && matchTipo;
    });
  }, [barriosData, searchQuery, selectedLocalidad, selectedTipo]);

  // Quick zoom coordinates
  const handleQuickZoom = (zone) => {
    const coords = {
      centro: { center: [4.6097, -74.0817], zoom: 14 },
      norte: { center: [4.715, -74.03], zoom: 13 },
      sur: { center: [4.545, -74.14], zoom: 13 },
      occidente: { center: [4.67, -74.13], zoom: 13 }
    };
    const target = coords[zone];
    if (target) {
      window.dispatchEvent(
        new CustomEvent('fly-to-coords', { detail: target })
      );
    }
  };

  // Re-center whole city
  const handleResetView = () => {
    setSelectedBarrio(null);
    window.dispatchEvent(
      new CustomEvent('fly-to-coords', {
        detail: { center: [4.6533, -74.0836], zoom: 12 }
      })
    );
  };

  // GPS Geolocation & Barrio identification
  const handleLocateMe = () => {
    if (!('geolocation' in navigator)) {
      alert('Tu navegador no soporta geolocalización.');
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const accuracy = pos.coords.accuracy;

        const matchedBarrio = findBarrioForCoords(lng, lat, barriosData?.features);

        const barrioName = matchedBarrio ? matchedBarrio.properties.nombre : 'Ubicación actual';
        const localidad = matchedBarrio ? matchedBarrio.properties.localidad : '';

        setUserLocation({
          lat,
          lng,
          accuracy,
          barrioName,
          localidad
        });

        if (matchedBarrio) {
          setSelectedBarrio(matchedBarrio);
          setNotification(`📍 Estás en el barrio ${barrioName} (${localidad})`);
        } else {
          setNotification(`📍 Ubicación encontrada: [${lat.toFixed(4)}, ${lng.toFixed(4)}]`);
        }

        setTimeout(() => setNotification(null), 5000);
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        alert(`No se pudo obtener la ubicación GPS: ${err.message}. Asegúrate de permitir el acceso en tu navegador.`);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  // Handle map click for picking exact points
  const handleMapClick = async (latlng) => {
    if (!pickingPoint) return;

    const matched = findBarrioForCoords(latlng.lng, latlng.lat, barriosData?.features);
    const streetAddress = await reverseGeocodePoint(latlng.lat, latlng.lng);
    const pointData = {
      nombre: streetAddress || (matched ? matched.properties.nombre : `Punto [${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)}]`),
      localidad: matched ? matched.properties.localidad : 'Bogotá',
      lat: latlng.lat,
      lng: latlng.lng
    };

    if (pickingPoint === 'origin') {
      setOrigin(pointData);
      setPickingPoint(null);
      setNotification(`Punto Origen establecido: ${pointData.nombre}`);
    } else if (pickingPoint === 'dest') {
      setDestination(pointData);
      setPickingPoint(null);
      setNotification(`Punto Destino establecido: ${pointData.nombre}`);
    }
    setTimeout(() => setNotification(null), 4000);
  };

  // Set Origin as current user location
  const handleUseCurrentLocationForOrigin = () => {
    if (userLocation) {
      setOrigin({
        nombre: userLocation.barrioName || 'Mi Ubicación',
        localidad: userLocation.localidad || 'Bogotá',
        lat: userLocation.lat,
        lng: userLocation.lng
      });
      setNotification('Origen establecido en tu ubicación GPS.');
      setTimeout(() => setNotification(null), 3000);
    } else {
      handleLocateMe();
    }
  };

  // Open Route Planner with Barrio as Destination
  const handlePlanRouteToBarrio = (barrio) => {
    setDestination({
      nombre: barrio.properties.nombre,
      localidad: barrio.properties.localidad,
      lat: barrio.properties.centro[0],
      lng: barrio.properties.centro[1]
    });
    if (userLocation && !origin) {
      setOrigin({
        nombre: userLocation.barrioName || 'Mi Ubicación',
        localidad: userLocation.localidad || 'Bogotá',
        lat: userLocation.lat,
        lng: userLocation.lng
      });
    }
    setRouteModalOpen(true);
  };

  // Export filtered GeoJSON
  const handleExportGeoJSON = () => {
    const geojsonData = {
      type: 'FeatureCollection',
      name: 'barrios_bogota_export',
      features: filteredBarrios
    };
    const blob = new Blob([JSON.stringify(geojsonData, null, 2)], {
      type: 'application/geo+json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `barrios_bogota_${selectedLocalidad.toLowerCase().replace(/\s+/g, '_')}.geojson`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const activePlannedRoute = computedRoutes?.rutas?.[selectedRouteIndex] || null;

  return (
    <div className="app-container">
      {/* Loading Overlay */}
      {loading && (
        <div className="loading-overlay">
          <div className="spinner" />
          <h3 style={{ color: '#fff', fontWeight: 600 }}>Cargando datos geográficos de Bogotá...</h3>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
            Descargando 1.230 barrios, Troncales TransMilenio, Metro, Ciclovías y Obras
          </p>
        </div>
      )}

      {/* Floating GPS Notification Toast */}
      {notification && (
        <div
          style={{
            position: 'absolute',
            top: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(16, 185, 129, 0.95)',
            backdropFilter: 'blur(10px)',
            color: 'white',
            padding: '12px 24px',
            borderRadius: '12px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.4)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.88rem',
            fontWeight: 600
          }}
        >
          <CheckCircle size={18} />
          <span>{notification}</span>
        </div>
      )}

      {/* Error notification */}
      {error && (
        <div
          style={{
            position: 'absolute',
            top: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#ef4444',
            color: 'white',
            padding: '12px 20px',
            borderRadius: '8px',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Button to open Route Planner */}
      <button
        className="route-toggle-pill"
        onClick={() => setRouteModalOpen(!routeModalOpen)}
      >
        <Navigation size={16} />
        <span>¿Cómo llegar? (Rutas)</span>
      </button>

      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        barriosList={filteredBarrios}
        totalCount={barriosData ? barriosData.features.length : 0}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedLocalidad={selectedLocalidad}
        setSelectedLocalidad={setSelectedLocalidad}
        localidadesList={localidadesList}
        selectedTipo={selectedTipo}
        setSelectedTipo={setSelectedTipo}
        selectedBarrio={selectedBarrio}
        onSelectBarrio={(barrio) => setSelectedBarrio(barrio)}
        onExportGeoJSON={handleExportGeoJSON}
        onResetView={handleResetView}
      />

      {/* Sidebar Toggle Button */}
      <button
        className="sidebar-toggle-btn"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        title={sidebarOpen ? 'Ocultar panel lateral' : 'Mostrar panel lateral'}
      >
        {sidebarOpen ? <ChevronLeft size={18} /> : <Menu size={18} />}
      </button>

      {/* Leaflet Map with All Layers, Labels and Planned Route */}
      <MapComponent
        barriosData={barriosData}
        localidadesData={localidadesData}
        transmilenioData={transmilenioData}
        metroData={metroData}
        cicloviasData={cicloviasData}
        obrasData={obrasData}
        zonasComercialesData={zonasComercialesData}
        selectedBarrio={selectedBarrio}
        onSelectBarrio={(barrio) => setSelectedBarrio(barrio)}
        activeBaseMap={activeBaseMap}
        colorMode={colorMode}
        showBarrioLabels={showBarrioLabels}
        showLocalidades={showLocalidades}
        showTransmilenio={showTransmilenio}
        showMetroTrenes={showMetroTrenes}
        showCiclovias={showCiclovias}
        showObras={showObras}
        showZonasComerciales={showZonasComerciales}
        filterLocalidad={selectedLocalidad}
        userLocation={userLocation}
        activePlannedRoute={activePlannedRoute}
        origin={origin}
        destination={destination}
        pickingPoint={pickingPoint}
        onMapClick={handleMapClick}
      />

      {/* Floating Picking Point Banner */}
      {pickingPoint && (
        <div className="picking-banner">
          <div className="picking-banner-content">
            <span className="picking-pulse-dot" />
            <span>
              {pickingPoint === 'origin'
                ? '📍 Haz clic en cualquier calle o punto del mapa para fijar el Origen (A)'
                : '🎯 Haz clic en cualquier calle o punto del mapa para fijar el Destino (B)'}
            </span>
            <button className="picking-cancel-btn" onClick={() => setPickingPoint(null)}>
              ✕ Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Floating Map Controls & Indicators */}
      <LayerControls
        activeBaseMap={activeBaseMap}
        setActiveBaseMap={setActiveBaseMap}
        colorMode={colorMode}
        setColorMode={setColorMode}
        showBarrioLabels={showBarrioLabels}
        setShowBarrioLabels={setShowBarrioLabels}
        showLocalidades={showLocalidades}
        setShowLocalidades={setShowLocalidades}
        showTransmilenio={showTransmilenio}
        setShowTransmilenio={setShowTransmilenio}
        showMetroTrenes={showMetroTrenes}
        setShowMetroTrenes={setShowMetroTrenes}
        showCiclovias={showCiclovias}
        setShowCiclovias={setShowCiclovias}
        showObras={showObras}
        setShowObras={setShowObras}
        showZonasComerciales={showZonasComerciales}
        setShowZonasComerciales={setShowZonasComerciales}
        onQuickZoom={handleQuickZoom}
        onLocateMe={handleLocateMe}
        locating={locating}
      />

      {/* Floating Barrio Details Card */}
      <BarrioDetailModal
        barrio={selectedBarrio}
        onClose={() => setSelectedBarrio(null)}
        onPlanRoute={() => selectedBarrio && handlePlanRouteToBarrio(selectedBarrio)}
      />

      {/* Route Planner Modal / Drawer */}
      <RoutePlannerModal
        isOpen={routeModalOpen}
        onClose={() => setRouteModalOpen(false)}
        origin={origin}
        setOrigin={setOrigin}
        destination={destination}
        setDestination={setDestination}
        barriosList={barriosData?.features || []}
        stationsList={stationsData || []}
        computedRoutes={computedRoutes}
        selectedRouteIndex={selectedRouteIndex}
        setSelectedRouteIndex={setSelectedRouteIndex}
        onUseCurrentLocation={handleUseCurrentLocationForOrigin}
        pickingPoint={pickingPoint}
        setPickingPoint={setPickingPoint}
        calculating={calculatingRoute}
      />

      {/* Floating Map Legend / Convenciones */}
      <MapLegend
        colorMode={colorMode}
        showLocalidades={showLocalidades}
        showTransmilenio={showTransmilenio}
        showMetroTrenes={showMetroTrenes}
        showCiclovias={showCiclovias}
        showObras={showObras}
        showZonasComerciales={showZonasComerciales}
        activePlannedRoute={activePlannedRoute}
      />
    </div>
  );
}
