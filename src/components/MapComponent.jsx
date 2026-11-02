import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { getBarrioPopularAlias } from '../utils/barrioAliases';

// Fix standard marker icons in bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Tile servers based 100% on OpenStreetMap and Esri Satellite
const TILE_SERVERS = {
  osm_standard: {
    name: 'OpenStreetMap Estándar',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    subdomains: ['a', 'b', 'c'],
    isDark: false
  },
  osm_dark: {
    name: 'OpenStreetMap Modo Oscuro',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    subdomains: ['a', 'b', 'c'],
    isDark: true
  },
  osm_hot: {
    name: 'OpenStreetMap Humanitario (Detallado)',
    url: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Tiles style by Humanitarian OSM',
    subdomains: ['a', 'b'],
    isDark: false
  },
  osm_cyclosm: {
    name: 'OpenStreetMap Ciclovías / Movilidad',
    url: 'https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, CyclOSM',
    subdomains: ['a', 'b', 'c'],
    isDark: false
  },
  satellite: {
    name: 'Satélite Híbrido (Esri)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri, Maxar, Earthstar Geographics',
    subdomains: ['a', 'b', 'c'],
    isDark: false
  }
};

export default function MapComponent({
  barriosData,
  localidadesData,
  transmilenioData,
  metroData,
  cicloviasData,
  obrasData,
  zonasComercialesData,
  selectedBarrio,
  onSelectBarrio,
  activeBaseMap = 'osm_standard',
  colorMode = 'localidad', // 'localidad' | 'seguridad' | 'ingresos' | 'mortalidad'
  showBarrioLabels = true,
  showLocalidades = true,
  showTransmilenio = true,
  showMetroTrenes = true,
  showCiclovias = false,
  showObras = false,
  showZonasComerciales = false,
  filterLocalidad = 'ALL',
  userLocation = null,
  activePlannedRoute = null,
  origin = null,
  destination = null,
  pickingPoint = null,
  onMapClick = null
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const baseTileLayerRef = useRef(null);

  // Vector Layers
  const barriosLayerRef = useRef(null);
  const localidadesLayerRef = useRef(null);
  const highlightLayerRef = useRef(null);
  const userMarkerRef = useRef(null);
  const userAccuracyCircleRef = useRef(null);

  // Route Planning Layer
  const plannedRouteLayerRef = useRef(null);
  const routeMarkersLayerRef = useRef(null);
  const standalonePinsLayerRef = useRef(null);

  // Infrastructure Layers
  const transmilenioLayerRef = useRef(null);
  const metroLayerRef = useRef(null);
  const cicloviasLayerRef = useRef(null);
  const obrasLayerRef = useRef(null);
  const zonasComercialesLayerRef = useRef(null);

  // Keep fresh references for events
  const onMapClickRef = useRef(onMapClick);
  onMapClickRef.current = onMapClick;

  const pickingPointRef = useRef(pickingPoint);
  pickingPointRef.current = pickingPoint;

  // Toggle picking mode CSS on map container
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (pickingPoint) {
      mapContainerRef.current.classList.add('picking-mode');
    } else {
      mapContainerRef.current.classList.remove('picking-mode');
    }
  }, [pickingPoint]);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [4.6533, -74.0836],
      zoom: 12,
      minZoom: 10,
      maxZoom: 19,
      zoomControl: true,
      preferCanvas: true
    });

    const tileInfo = TILE_SERVERS[activeBaseMap] || TILE_SERVERS.osm_standard;
    baseTileLayerRef.current = L.tileLayer(tileInfo.url, {
      attribution: tileInfo.attribution,
      subdomains: tileInfo.subdomains,
      maxZoom: 19
    }).addTo(map);

    mapInstanceRef.current = map;

    // Listen to custom fly-to events
    const handleFlyToEvent = (e) => {
      if (!mapInstanceRef.current || !e.detail) return;
      const { center, zoom } = e.detail;
      mapInstanceRef.current.flyTo(center, zoom, {
        duration: 1.2,
        easeLinearity: 0.25
      });
    };
    window.addEventListener('fly-to-coords', handleFlyToEvent);

    // Map Click Listener
    map.on('click', (e) => {
      if (pickingPointRef.current && onMapClickRef.current) {
        onMapClickRef.current(e.latlng);
      }
    });

    return () => {
      window.removeEventListener('fly-to-coords', handleFlyToEvent);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Base Tile Layer and Dark Mode CSS class
  useEffect(() => {
    if (!mapInstanceRef.current || !baseTileLayerRef.current || !mapContainerRef.current) return;
    const tileInfo = TILE_SERVERS[activeBaseMap] || TILE_SERVERS.osm_standard;

    if (tileInfo.isDark) {
      mapContainerRef.current.classList.add('osm-dark-tiles');
    } else {
      mapContainerRef.current.classList.remove('osm-dark-tiles');
    }

    mapInstanceRef.current.removeLayer(baseTileLayerRef.current);
    baseTileLayerRef.current = L.tileLayer(tileInfo.url, {
      attribution: tileInfo.attribution,
      subdomains: tileInfo.subdomains,
      maxZoom: 19
    }).addTo(mapInstanceRef.current);
  }, [activeBaseMap]);

  // Color Calculation function based on thematic mode
  const getFeatureColor = (props) => {
    if (colorMode === 'localidad') {
      return props.color_localidad || '#38bdf8';
    } else if (colorMode === 'seguridad') {
      const riesgo = props.nivel_riesgo;
      if (riesgo === 'Bajo') return '#10b981';
      if (riesgo === 'Bajo-Medio' || riesgo === 'Medio') return '#eab308';
      if (riesgo === 'Medio-Alto') return '#f97316';
      if (riesgo === 'Alto') return '#ef4444';
      if (riesgo === 'Crítico') return '#b91c1c';
      return '#38bdf8';
    } else if (colorMode === 'ingresos') {
      const estrato = props.estrato || 3;
      if (estrato <= 1) return '#f43f5e';
      if (estrato === 2) return '#fb923c';
      if (estrato === 3) return '#facc15';
      if (estrato === 4) return '#4ade80';
      if (estrato === 5) return '#38bdf8';
      if (estrato >= 6) return '#818cf8';
      return '#38bdf8';
    } else if (colorMode === 'mortalidad') {
      const tasa = props.tasa_mortalidad || 6.0;
      if (tasa < 5.5) return '#10b981';
      if (tasa < 7.0) return '#38bdf8';
      if (tasa < 8.2) return '#f59e0b';
      return '#ef4444';
    }
    return '#38bdf8';
  };

  // Toggle Picking Cursor and Class
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (pickingPoint) {
      mapContainerRef.current.classList.add('picking-active');
    } else {
      mapContainerRef.current.classList.remove('picking-active');
    }
  }, [pickingPoint]);

  // Render Barrios Layer (all barrios of the same locality share the locality's color + visible name label!)
  useEffect(() => {
    if (!mapInstanceRef.current || !barriosData) return;

    if (barriosLayerRef.current) {
      mapInstanceRef.current.removeLayer(barriosLayerRef.current);
      barriosLayerRef.current = null;
    }

    const filteredFeatures = barriosData.features.filter((feature) => {
      const matchLoc = filterLocalidad === 'ALL' || feature.properties.localidad === filterLocalidad;
      return matchLoc;
    });

    barriosLayerRef.current = L.geoJSON(
      { type: 'FeatureCollection', features: filteredFeatures },
      {
        style: (feature) => {
          const isSelected = selectedBarrio && selectedBarrio.properties.codigo === feature.properties.codigo;
          const color = getFeatureColor(feature.properties);

          return {
            color: isSelected ? '#ffffff' : color,
            weight: isSelected ? 3.5 : 1.2,
            opacity: isSelected ? 1 : 0.85,
            fillColor: color,
            fillOpacity: isSelected ? 0.55 : 0.22
          };
        },
        onEachFeature: (feature, layer) => {
          const p = feature.properties;

          layer.on({
            mouseover: (e) => {
              if (pickingPointRef.current) return; // Do not interfere during point picking!
              const l = e.target;
              l.setStyle({
                weight: 2.8,
                color: '#ffffff',
                fillOpacity: 0.55
              });
              l.bringToFront();
            },
            mouseout: (e) => {
              if (barriosLayerRef.current) {
                barriosLayerRef.current.resetStyle(e.target);
              }
            },
            click: (e) => {
              L.DomEvent.stopPropagation(e);
              if (pickingPointRef.current) {
                // Point picking mode: register exact click point immediately!
                if (onMapClickRef.current) onMapClickRef.current(e.latlng);
                return;
              }
              onSelectBarrio(feature);
            }
          });

          // Dynamic hover tooltip that follows mouse cursor
          const popular = getBarrioPopularAlias(p.codigo, p.nombre);
          layer.bindTooltip(
            `<div class="barrio-hover-content">
              <div style="font-size: 14px; font-weight: 800; color: #ffffff; margin-bottom: 2px;">
                ${p.nombre}
              </div>
              ${popular ? `<div style="font-size: 11px; font-weight: 600; color: #38bdf8; margin-bottom: 3px;">🏷️ ${popular}</div>` : ''}
              <div style="font-size: 12px; font-weight: 700; color: ${p.color_localidad || '#38bdf8'}; margin-bottom: 4px;">
                Localidad ${p.localidad}
              </div>
              <div style="font-size: 11px; color: #cbd5e1; display: flex; gap: 8px;">
                <span>Estrato: <b style="color:#fff;">${p.estrato || 3}</b></span>
                <span>•</span>
                <span>Riesgo: <b style="color: ${p.nivel_riesgo === 'Bajo' ? '#34d399' : (p.nivel_riesgo === 'Crítico' ? '#f87171' : '#fbbf24')};">${p.nivel_riesgo || 'Medio'}</b></span>
              </div>
              <div style="font-size: 10px; color: #94a3b8; margin-top: 3px;">
                Código: <span style="font-family: monospace;">${p.codigo}</span> | Mortalidad: ${p.tasa_mortalidad || 6.0}/1k
              </div>
             </div>`,
            {
              sticky: true,
              direction: 'auto',
              className: 'barrio-hover-tooltip',
              opacity: 1
            }
          );
        }
      }
    ).addTo(mapInstanceRef.current);

    // Keep barrios layer on top of background vector lines
    barriosLayerRef.current.bringToFront();
  }, [barriosData, filterLocalidad, selectedBarrio, colorMode, pickingPoint, onSelectBarrio, onMapClick]);

  // Render Localidades Outline Layer (NON-INTERACTIVE so it never blocks hover on barrios!)
  useEffect(() => {
    if (!mapInstanceRef.current || !localidadesData) return;

    if (localidadesLayerRef.current) {
      mapInstanceRef.current.removeLayer(localidadesLayerRef.current);
      localidadesLayerRef.current = null;
    }

    if (showLocalidades) {
      localidadesLayerRef.current = L.geoJSON(localidadesData, {
        interactive: false, // Essential: Do not intercept mouse events!
        style: {
          color: '#ffffff',
          weight: 2.5,
          dashArray: '6, 6',
          fillColor: 'transparent',
          fillOpacity: 0
        }
      }).addTo(mapInstanceRef.current);
    }
  }, [localidadesData, showLocalidades]);

  // Render Troncales TransMilenio
  useEffect(() => {
    if (!mapInstanceRef.current || !transmilenioData) return;

    if (transmilenioLayerRef.current) {
      mapInstanceRef.current.removeLayer(transmilenioLayerRef.current);
      transmilenioLayerRef.current = null;
    }

    if (showTransmilenio) {
      transmilenioLayerRef.current = L.geoJSON(transmilenioData, {
        style: {
          color: '#ef4444',
          weight: 4.5,
          opacity: 0.95
        },
        onEachFeature: (feature, layer) => {
          layer.on('click', (e) => {
            if (pickingPointRef.current) {
              L.DomEvent.stopPropagation(e);
              if (onMapClickRef.current) onMapClickRef.current(e.latlng);
            }
          });
          layer.bindTooltip(
            `<div>
              <div style="font-weight:700; color:#ef4444;">🔴 ${feature.properties.nombre}</div>
              <div style="font-size:11px; color:#cbd5e1;">Longitud: ${feature.properties.longitud_km} km</div>
             </div>`,
            { sticky: true }
          );
        }
      }).addTo(mapInstanceRef.current);
    }
  }, [transmilenioData, showTransmilenio]);

  // Render Metro y Trenes de Cercanías
  useEffect(() => {
    if (!mapInstanceRef.current || !metroData) return;

    if (metroLayerRef.current) {
      mapInstanceRef.current.removeLayer(metroLayerRef.current);
      metroLayerRef.current = null;
    }

    if (showMetroTrenes) {
      metroLayerRef.current = L.geoJSON(metroData, {
        style: (feature) => ({
          color: feature.properties.color || '#10b981',
          weight: 5.5,
          opacity: 0.95
        }),
        onEachFeature: (feature, layer) => {
          const p = feature.properties;
          layer.bindTooltip(
            `<div style="font-family: inherit; padding: 2px;">
              <div style="font-weight:800; color:${p.color}; font-size:13px;">🚆 ${p.nombre}</div>
              <div style="font-size:11px; color:#f8fafc; margin-top:2px;"><b>Estado:</b> ${p.estado}</div>
              <div style="font-size:11px; color:#cbd5e1;"><b>Capacidad:</b> ${p.capacidad}</div>
              <div style="font-size:10px; color:#94a3b8; margin-top:4px; max-width:240px;">${p.recorrido}</div>
             </div>`,
            { sticky: true }
          );
        }
      }).addTo(mapInstanceRef.current);
    }
  }, [metroData, showMetroTrenes]);

  // Render Red de Ciclovías
  useEffect(() => {
    if (!mapInstanceRef.current || !cicloviasData) return;

    if (cicloviasLayerRef.current) {
      mapInstanceRef.current.removeLayer(cicloviasLayerRef.current);
      cicloviasLayerRef.current = null;
    }

    if (showCiclovias) {
      cicloviasLayerRef.current = L.geoJSON(cicloviasData, {
        style: {
          color: '#22c55e',
          weight: 3.5,
          dashArray: '5, 4',
          opacity: 0.95
        },
        onEachFeature: (feature, layer) => {
          layer.on('click', (e) => {
            if (pickingPointRef.current) {
              L.DomEvent.stopPropagation(e);
              if (onMapClickRef.current) onMapClickRef.current(e.latlng);
            }
          });
          layer.bindTooltip(
            `<div>
              <div style="font-weight:700; color:#22c55e;">🚲 ${feature.properties.nombre}</div>
              <div style="font-size:11px; color:#cbd5e1;">${feature.properties.tipo} (${feature.properties.longitud})</div>
             </div>`,
            { sticky: true }
          );
        }
      }).addTo(mapInstanceRef.current);
    }
  }, [cicloviasData, showCiclovias]);

  // Render Obras Principales IDU
  useEffect(() => {
    if (!mapInstanceRef.current || !obrasData) return;

    if (obrasLayerRef.current) {
      mapInstanceRef.current.removeLayer(obrasLayerRef.current);
      obrasLayerRef.current = null;
    }

    if (showObras) {
      obrasLayerRef.current = L.geoJSON(obrasData, {
        style: {
          color: '#f97316',
          weight: 5,
          dashArray: '8, 6',
          opacity: 0.95
        },
        onEachFeature: (feature, layer) => {
          const p = feature.properties;
          layer.bindTooltip(
            `<div style="font-family: inherit;">
              <div style="font-weight:800; color:#f97316;">🚧 Obra: ${p.nombre}</div>
              <div style="font-size:11px; color:#f8fafc;"><b>Entidad:</b> ${p.entidad}</div>
              <div style="font-size:11px; color:#cbd5e1;"><b>Avance:</b> ${p.avance}</div>
              <div style="font-size:10px; color:#94a3b8; margin-top:2px;">${p.impacto}</div>
             </div>`,
            { sticky: true }
          );
        }
      }).addTo(mapInstanceRef.current);
    }
  }, [obrasData, showObras]);

  // Render Zonas Comerciales
  useEffect(() => {
    if (!mapInstanceRef.current || !zonasComercialesData) return;

    if (zonasComercialesLayerRef.current) {
      mapInstanceRef.current.removeLayer(zonasComercialesLayerRef.current);
      zonasComercialesLayerRef.current = null;
    }

    if (showZonasComerciales) {
      zonasComercialesLayerRef.current = L.geoJSON(zonasComercialesData, {
        style: {
          color: '#f59e0b',
          weight: 2.5,
          fillColor: '#f59e0b',
          fillOpacity: 0.35
        },
        onEachFeature: (feature, layer) => {
          const p = feature.properties;
          layer.bindTooltip(
            `<div style="font-family: inherit;">
              <div style="font-weight:800; color:#f59e0b;">🛍️ ${p.nombre}</div>
              <div style="font-size:11px; color:#f8fafc; font-weight:600;">${p.categoria}</div>
              <div style="font-size:10px; color:#cbd5e1; margin-top:2px; max-width:220px;">${p.descripcion}</div>
             </div>`,
            { sticky: true }
          );
        }
      }).addTo(mapInstanceRef.current);
    }
  }, [zonasComercialesData, showZonasComerciales]);

  // FlyTo selected barrio
  useEffect(() => {
    if (!mapInstanceRef.current || !selectedBarrio) return;

    if (highlightLayerRef.current) {
      mapInstanceRef.current.removeLayer(highlightLayerRef.current);
      highlightLayerRef.current = null;
    }

    highlightLayerRef.current = L.geoJSON(selectedBarrio, {
      style: {
        color: '#ffffff',
        weight: 4,
        fillColor: selectedBarrio.properties.color_localidad || '#3b82f6',
        fillOpacity: 0.5
      }
    }).addTo(mapInstanceRef.current);

    const bounds = highlightLayerRef.current.getBounds();
    mapInstanceRef.current.flyToBounds(bounds, {
      padding: [80, 80],
      maxZoom: 16,
      duration: 1.2
    });
  }, [selectedBarrio]);

  // Render User Location Pulsing Marker & Accuracy Circle
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (userMarkerRef.current) {
      mapInstanceRef.current.removeLayer(userMarkerRef.current);
      userMarkerRef.current = null;
    }
    if (userAccuracyCircleRef.current) {
      mapInstanceRef.current.removeLayer(userAccuracyCircleRef.current);
      userAccuracyCircleRef.current = null;
    }

    if (!userLocation) return;

    const { lat, lng, accuracy, barrioName, localidad } = userLocation;

    const pulseIcon = L.divIcon({
      className: 'user-pin-wrapper',
      html: `
        <div class="user-location-pulse">
          <div class="user-location-pin"></div>
          <div class="user-location-wave"></div>
        </div>
      `,
      iconSize: [22, 22],
      iconAnchor: [11, 11]
    });

    if (accuracy && accuracy > 10) {
      userAccuracyCircleRef.current = L.circle([lat, lng], {
        radius: Math.min(accuracy, 500),
        color: '#3b82f6',
        weight: 1,
        fillColor: '#3b82f6',
        fillOpacity: 0.12
      }).addTo(mapInstanceRef.current);
    }

    userMarkerRef.current = L.marker([lat, lng], { icon: pulseIcon })
      .addTo(mapInstanceRef.current)
      .bindPopup(
        `<div style="font-family: inherit; padding: 2px;">
          <div style="font-size:12px; color:#10b981; font-weight:700; margin-bottom:2px;">📍 ¡Estás aquí!</div>
          <div style="font-size:14px; font-weight:700; color:#fff;">${barrioName || 'Bogotá'}</div>
          ${localidad ? `<div style="font-size:12px; color:#94a3b8; margin-top:2px;">Localidad: <b>${localidad}</b></div>` : ''}
          <div style="font-size:11px; color:#64748b; margin-top:4px;">Precisión GPS: ±${Math.round(accuracy || 20)}m</div>
        </div>`
      );

    userMarkerRef.current.openPopup();

    mapInstanceRef.current.flyTo([lat, lng], 16, {
      duration: 1.5,
      easeLinearity: 0.25
    });
  }, [userLocation]);

  // Render Real Planned Route (Polyline snapped to real streets/ciclovías + Origin/Destination Pins)
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (plannedRouteLayerRef.current) {
      mapInstanceRef.current.removeLayer(plannedRouteLayerRef.current);
      plannedRouteLayerRef.current = null;
    }
    if (routeMarkersLayerRef.current) {
      mapInstanceRef.current.removeLayer(routeMarkersLayerRef.current);
      routeMarkersLayerRef.current = null;
    }

    if (!activePlannedRoute || !activePlannedRoute.puntosGeo) return;

    const points = activePlannedRoute.puntosGeo;
    const color = activePlannedRoute.color || '#3b82f6';

    // Polyline snapped to real road network
    plannedRouteLayerRef.current = L.polyline(points, {
      color: color,
      weight: 6,
      opacity: 0.95,
      lineCap: 'round',
      lineJoin: 'round',
      dashArray: activePlannedRoute.id === 'ciclovia' ? '6, 6' : null
    }).addTo(mapInstanceRef.current);

    // Markers group
    routeMarkersLayerRef.current = L.featureGroup().addTo(mapInstanceRef.current);

    if (activePlannedRoute.pins && activePlannedRoute.pins.length > 0) {
      activePlannedRoute.pins.forEach((pin, idx) => {
        const isA = idx === 0;
        const isB = idx === activePlannedRoute.pins.length - 1;
        const bg = isA ? '#10b981' : isB ? '#ef4444' : '#3b82f6';
        const txt = isA ? 'A' : isB ? 'B' : '🚆';

        const customIcon = L.divIcon({
          className: 'route-map-pin',
          html: `<div style="background:${bg}; color:#fff; width:26px; height:26px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:12px; border:2px solid #fff; box-shadow:0 3px 10px rgba(0,0,0,0.5);">${txt}</div>`,
          iconSize: [26, 26],
          iconAnchor: [13, 13]
        });

        L.marker([pin.lat, pin.lng], { icon: customIcon })
          .addTo(routeMarkersLayerRef.current)
          .bindPopup(`<b>${pin.label}</b>`);
      });
    } else {
      const iconA = L.divIcon({
        className: 'route-map-pin',
        html: '<div style="background:#10b981; color:#fff; width:26px; height:26px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:800; border:2px solid #fff; box-shadow:0 3px 10px rgba(0,0,0,0.5);">A</div>',
        iconSize: [26, 26],
        iconAnchor: [13, 13]
      });

      const iconB = L.divIcon({
        className: 'route-map-pin',
        html: '<div style="background:#ef4444; color:#fff; width:26px; height:26px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:800; border:2px solid #fff; box-shadow:0 3px 10px rgba(0,0,0,0.5);">B</div>',
        iconSize: [26, 26],
        iconAnchor: [13, 13]
      });

      L.marker(points[0], { icon: iconA }).addTo(routeMarkersLayerRef.current).bindPopup('<b>Origen (A)</b>');
      L.marker(points[points.length - 1], { icon: iconB }).addTo(routeMarkersLayerRef.current).bindPopup('<b>Destino (B)</b>');
    }

    // Fit map bounds to show complete route
    const bounds = plannedRouteLayerRef.current.getBounds();
    mapInstanceRef.current.fitBounds(bounds, {
      padding: [80, 80],
      duration: 1.2
    });
  }, [activePlannedRoute]);

  // Render Origin and Destination pins immediately when selected
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    if (standalonePinsLayerRef.current) {
      mapInstanceRef.current.removeLayer(standalonePinsLayerRef.current);
      standalonePinsLayerRef.current = null;
    }

    if (activePlannedRoute) return;
    if (!origin && !destination) return;

    standalonePinsLayerRef.current = L.featureGroup().addTo(mapInstanceRef.current);

    if (origin) {
      const iconA = L.divIcon({
        className: 'route-map-pin',
        html: '<div style="background:#10b981; color:#fff; width:26px; height:26px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:800; border:2px solid #fff; box-shadow:0 3px 10px rgba(0,0,0,0.5);">A</div>',
        iconSize: [26, 26],
        iconAnchor: [13, 13]
      });
      L.marker([origin.lat, origin.lng], { icon: iconA })
        .addTo(standalonePinsLayerRef.current)
        .bindPopup(`<b>Origen (A):</b><br/>${origin.nombre}`);
    }

    if (destination) {
      const iconB = L.divIcon({
        className: 'route-map-pin',
        html: '<div style="background:#ef4444; color:#fff; width:26px; height:26px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:800; border:2px solid #fff; box-shadow:0 3px 10px rgba(0,0,0,0.5);">B</div>',
        iconSize: [26, 26],
        iconAnchor: [13, 13]
      });
      L.marker([destination.lat, destination.lng], { icon: iconB })
        .addTo(standalonePinsLayerRef.current)
        .bindPopup(`<b>Destino (B):</b><br/>${destination.nombre}`);
    }
  }, [origin, destination, activePlannedRoute]);

  return <div ref={mapContainerRef} className="map-container" />;
}
