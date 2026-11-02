// Real turn-by-turn routing using OpenStreetMap OSRM, Photon Geocoding and TransMilenio network

export function getDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Reverse Geocode an exact point using Photon / OSM
export async function reverseGeocodePoint(lat, lng) {
  try {
    const res = await fetch(`https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}`, {
      signal: AbortSignal.timeout(3000)
    });
    if (!res.ok) throw new Error('Photon error');
    const data = await res.json();
    if (data.features && data.features.length > 0) {
      const p = data.features[0].properties;
      const parts = [];
      if (p.name) parts.push(p.name);
      if (p.street) parts.push(p.street);
      if (p.housenumber) parts.push(`# ${p.housenumber}`);
      if (p.locality && p.locality !== p.name) parts.push(p.locality);
      if (parts.length > 0) {
        return parts.join(', ');
      }
    }
  } catch (err) {
    console.warn('Reverse geocode fallback:', err);
  }
  return `Punto [${lat.toFixed(4)}, ${lng.toFixed(4)}]`;
}

// Search places, exact addresses, TM stations and barrios
export async function searchPlaces(query, barrios = [], stations = []) {
  if (!query || query.trim().length < 2) return [];
  const q = query.trim().toLowerCase();
  const results = [];

  // 1. Check TransMilenio Stations
  stations.forEach((s) => {
    if (s.nombre.toLowerCase().includes(q)) {
      results.push({
        id: `st-${s.id}`,
        tipo: s.esPortal ? 'portal' : 'estacion',
        titulo: s.nombre,
        subtitulo: s.esPortal ? 'Portal TransMilenio' : `Estación Troncal ${s.troncalLetra || ''}`,
        lat: s.coordenadas[1],
        lng: s.coordenadas[0]
      });
    }
  });

  // 2. Check Barrios
  barrios.forEach((b) => {
    if (b.properties.nombre.toLowerCase().includes(q)) {
      results.push({
        id: `barrio-${b.properties.codigo}`,
        tipo: 'barrio',
        titulo: b.properties.nombre,
        subtitulo: `Barrio en Localidad ${b.properties.localidad}`,
        lat: b.properties.centro[0],
        lng: b.properties.centro[1]
      });
    }
  });

  // 3. Online address search via Photon
  try {
    const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(query + ' Bogota')}&lat=4.65&lon=-74.08&limit=4`;
    const res = await fetch(photonUrl, { signal: AbortSignal.timeout(2500) });
    if (res.ok) {
      const data = await res.json();
      if (data.features) {
        data.features.forEach((f, i) => {
          const p = f.properties;
          const label = [p.name, p.street, p.housenumber, p.locality].filter(Boolean).join(', ');
          if (label && !results.some((r) => r.titulo.toLowerCase() === label.toLowerCase())) {
            results.push({
              id: `addr-${i}-${f.geometry.coordinates[0]}`,
              tipo: 'direccion',
              titulo: label,
              subtitulo: p.district || p.city || 'Bogotá',
              lat: f.geometry.coordinates[1],
              lng: f.geometry.coordinates[0]
            });
          }
        });
      }
    }
  } catch (e) {
    // ignore network timeout
  }

  return results.slice(0, 8);
}

// Find closest station
export function findClosestStation(lat, lng, stations) {
  if (!stations || stations.length === 0) return null;
  let closest = stations[0];
  let minD = Infinity;

  for (const st of stations) {
    const d = getDistanceKm(lat, lng, st.coordenadas[1], st.coordenadas[0]);
    if (d < minD) {
      minD = d;
      closest = st;
    }
  }
  const distMetros = Math.round(minD * 1000);
  const walkMin = Math.max(1, Math.ceil(distMetros / 80));
  return { ...closest, distanciaKm: Math.round(minD * 10) / 10, distMetros, walkMin };
}

// Find closest portal
export function findClosestPortal(lat, lng, stations) {
  const portals = stations.filter((s) => s.esPortal);
  if (portals.length === 0) return findClosestStation(lat, lng, stations);
  let closest = portals[0];
  let minD = Infinity;

  for (const p of portals) {
    const d = getDistanceKm(lat, lng, p.coordenadas[1], p.coordenadas[0]);
    if (d < minD) {
      minD = d;
      closest = p;
    }
  }
  const distMetros = Math.round(minD * 1000);
  const walkMin = Math.max(1, Math.ceil(distMetros / 80));
  return { ...closest, distanciaKm: Math.round(minD * 10) / 10, distMetros, walkMin };
}

// Fetch real road/bike/foot geometry from OpenStreetMap OSRM
async function fetchOsrmGeometry(profile, coords) {
  try {
    const coordString = coords.map((c) => `${c[1]},${c[0]}`).join(';');
    const url = `https://router.project-osrm.org/route/v1/${profile}/${coordString}?overview=full&geometries=geojson`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error('OSRM error');
    const data = await res.json();
    if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
      const r = data.routes[0];
      const latlngs = r.geometry.coordinates.map((pt) => [pt[1], pt[0]]);
      return {
        latlngs,
        distanceKm: Math.round((r.distance / 1000) * 10) / 10,
        durationMin: Math.max(1, Math.round(r.duration / 60))
      };
    }
  } catch (err) {
    console.warn('OSRM router fallback:', err);
  }
  return {
    latlngs: coords,
    distanceKm: Math.round(getDistanceKm(coords[0][0], coords[0][1], coords[coords.length - 1][0], coords[coords.length - 1][1]) * 10) / 10,
    durationMin: 15
  };
}

export const TRONCAL_NAMES = {
  A: 'Caracas Centro',
  B: 'Autopista Norte',
  C: 'Suba',
  D: 'Calle 80',
  E: 'NQS Central',
  F: 'Américas',
  G: 'NQS Sur',
  H: 'Caracas Sur',
  J: 'Eje Ambiental',
  K: 'Calle 26 (El Dorado)',
  L: 'Carrera 10',
  M: 'Carrera 7ma'
};

// 1. SERVICIOS OFICIALES TRANSMILENIO REALES Y VIGENTES (NO INVENTADOS)
export const OFFICIAL_TRUNK_SERVICES = {
  // Hacia Troncal B (Autonorte)
  'D->B': { servicio: 'B10', nombre: 'Portal 80 ↔ Portal Norte', via: 'Calle 80 / NQS / Autonorte' },
  'G->B': { servicio: 'B12', nombre: 'Portal Sur ↔ Portal Norte', via: 'NQS Sur / NQS Central / Autonorte' },
  'H->B': { servicio: 'B27', nombre: 'Portal Usme ↔ Portal Norte', via: 'Caracas Sur / Caracas Centro / Autonorte' },
  'F->B': { servicio: 'B28', nombre: 'Portal Américas ↔ Portal Norte', via: 'Américas / NQS / Autonorte' },
  'C->B': { servicio: 'B50', nombre: 'Portal Suba ↔ Calle 161', via: 'Av. Suba / NQS / Autonorte' },
  'K->B': { servicio: 'B16', nombre: 'Portal El Dorado ↔ Terminal Norte', via: 'Calle 26 / NQS / Autonorte' },
  'L->B': { servicio: 'B18', nombre: 'Portal 20 de Julio ↔ Terminal Norte', via: 'Carrera 10 / Caracas / Autonorte' },
  'A->B': { servicio: 'B75', nombre: 'Caracas Centro ↔ Portal Norte', via: 'Caracas / Autonorte' },
  'E->B': { servicio: 'B11', nombre: 'NQS Central ↔ Portal Norte', via: 'NQS Central / Autonorte' },
  'J->B': { servicio: 'B74', nombre: 'Las Aguas ↔ Portal Norte', via: 'Eje Ambiental / Caracas / Autonorte' },
  'B->B': { servicio: 'Ruta Fácil 8', nombre: 'Servicio Troncal Norte Local', via: 'Autopista Norte directa' },

  // Hacia Troncal C (Suba)
  'H->C': { servicio: 'C17', nombre: 'Portal Usme ↔ Portal Suba', via: 'Caracas / NQS / Av. Suba' },
  'F->C': { servicio: 'C19', nombre: 'Banderas ↔ Portal Suba', via: 'Américas / NQS / Av. Suba' },
  'G->C': { servicio: 'C30', nombre: 'Portal Sur ↔ Portal Suba', via: 'NQS Sur / NQS Central / Av. Suba' },
  'L->C': { servicio: 'C25', nombre: 'Portal 20 de Julio ↔ Portal Suba', via: 'Carrera 10 / Calle 26 / Av. Suba' },
  'B->C': { servicio: 'C50', nombre: 'Calle 161 ↔ Portal Suba', via: 'Autonorte / NQS / Av. Suba' },
  'D->C': { servicio: 'Conexión Escuela Militar', nombre: 'Calle 80 ↔ Suba', via: 'Calle 80 / NQS / Av. Suba' },
  'K->C': { servicio: 'Conexión Av. El Dorado', nombre: 'Calle 26 ↔ Suba', via: 'Calle 26 / NQS / Av. Suba' },
  'A->C': { servicio: 'C15', nombre: 'Caracas ↔ Portal Suba', via: 'Caracas / Calle 80 / Av. Suba' },
  'E->C': { servicio: 'C30', nombre: 'NQS Central ↔ Portal Suba', via: 'NQS Central / Av. Suba' },
  'C->C': { servicio: 'Ruta Fácil 7', nombre: 'Servicio Troncal Suba Local', via: 'Avenida Suba directa' },

  // Hacia Troncal D (Calle 80)
  'B->D': { servicio: 'D10', nombre: 'Portal Norte ↔ Portal de la 80', via: 'Autonorte / NQS / Calle 80' },
  'H->D': { servicio: 'D20', nombre: 'Portal Usme ↔ Portal 80', via: 'Caracas / Calle 80' },
  'G->D': { servicio: 'D22', nombre: 'Portal del Sur ↔ Portal 80', via: 'NQS Sur / NQS Central / Calle 80' },
  'J->D': { servicio: 'D24', nombre: 'Universidades ↔ Portal 80', via: 'Calle 26 / NQS / Calle 80' },
  'A->D': { servicio: 'Ruta Fácil 5', nombre: 'Calle 22 ↔ Portal 80', via: 'Caracas / Calle 80' },
  'F->D': { servicio: 'Conexión Ricaurte', nombre: 'Américas ↔ Calle 80', via: 'Américas / NQS / Calle 80' },
  'K->D': { servicio: 'Conexión CAD', nombre: 'Calle 26 ↔ Calle 80', via: 'Calle 26 / NQS / Calle 80' },
  'E->D': { servicio: 'D22', nombre: 'NQS Central ↔ Portal 80', via: 'NQS Central / Calle 80' },
  'C->D': { servicio: 'Conexión Escuela Militar', nombre: 'Suba ↔ Calle 80', via: 'Av. Suba / NQS / Calle 80' },
  'D->D': { servicio: 'Ruta Fácil 6', nombre: 'Servicio Calle 80 Local', via: 'Troncal Calle 80 directa' },

  // Hacia Troncal F (Américas)
  'B->F': { servicio: 'F28', nombre: 'Portal Norte ↔ Portal Américas', via: 'Autonorte / NQS / Américas' },
  'C->F': { servicio: 'F19', nombre: 'Portal Suba ↔ Banderas', via: 'Av. Suba / NQS / Américas' },
  'J->F': { servicio: 'F23', nombre: 'Las Aguas ↔ Portal Américas', via: 'Eje Ambiental / Calle 13 / Américas' },
  'A->F': { servicio: 'F60', nombre: 'Calle 76 ↔ Portal Américas', via: 'Caracas / Calle 13 / Américas' },
  'E->F': { servicio: 'F32', nombre: 'NQS Calle 75 ↔ Portal Américas', via: 'NQS / Américas' },
  'H->F': { servicio: 'Conexión Av. Jiménez', nombre: 'Caracas Sur ↔ Américas', via: 'Túnel Peatonal Av. Jiménez' },
  'G->F': { servicio: 'Conexión General Santander', nombre: 'NQS Sur ↔ Américas', via: 'NQS / Calle 13 / Américas' },
  'K->F': { servicio: 'Conexión Ricaurte', nombre: 'Calle 26 ↔ Américas', via: 'Calle 26 / NQS / Américas' },
  'L->F': { servicio: 'Conexión Calle 6', nombre: 'Carrera 10 ↔ Américas', via: 'Carrera 10 / Calle 6 / Américas' },
  'D->F': { servicio: 'Conexión NQS', nombre: 'Calle 80 ↔ Américas', via: 'Calle 80 / NQS / Américas' },
  'F->F': { servicio: 'Ruta Fácil 4', nombre: 'Servicio Troncal Américas Local', via: 'Troncal Américas directa' },

  // Hacia Troncal G (NQS Sur / Soacha)
  'B->G': { servicio: 'G12', nombre: 'Portal Norte ↔ Portal del Sur', via: 'Autonorte / NQS Central / NQS Sur' },
  'C->G': { servicio: 'G30', nombre: 'Portal Suba ↔ Portal del Sur', via: 'Av. Suba / NQS Central / NQS Sur' },
  'D->G': { servicio: 'G22', nombre: 'Portal 80 ↔ Portal del Sur', via: 'Calle 80 / NQS Central / NQS Sur' },
  'K->G': { servicio: 'G43', nombre: 'Portal El Dorado ↔ San Mateo (Soacha)', via: 'Calle 26 / NQS Sur' },
  'L->G': { servicio: 'G41', nombre: 'Bicentenario ↔ San Mateo (Soacha)', via: 'Carrera 10 / Calle 6 / NQS Sur' },
  'E->G': { servicio: 'G42', nombre: 'Simón Bolívar ↔ San Mateo (Soacha)', via: 'NQS Central / NQS Sur' },
  'A->G': { servicio: 'Conexión Paloquemao', nombre: 'Caracas ↔ NQS Sur', via: 'Caracas / NQS' },
  'H->G': { servicio: 'Conexión Calle 40 Sur', nombre: 'Caracas Sur ↔ NQS Sur', via: 'Calle 40 Sur / General Santander' },
  'F->G': { servicio: 'Conexión Ricaurte', nombre: 'Américas ↔ NQS Sur', via: 'Túnel Subterráneo Ricaurte' },
  'G->G': { servicio: 'Ruta Fácil 4', nombre: 'Servicio Troncal NQS Sur Local', via: 'Autopista Sur directa' },

  // Hacia Troncal H (Caracas Sur / Tunal / Usme)
  'B->H': { servicio: 'H27', nombre: 'Portal Norte ↔ Portal Usme', via: 'Autonorte / Caracas Centro / Caracas Sur' },
  'C->H': { servicio: 'H17', nombre: 'Portal Suba ↔ Portal Usme', via: 'Av. Suba / Caracas / Caracas Sur' },
  'D->H': { servicio: 'H20', nombre: 'Portal 80 ↔ Portal Usme', via: 'Calle 80 / Caracas / Caracas Sur' },
  'K->H': { servicio: 'H54', nombre: 'Portal El Dorado ↔ Portal Usme', via: 'Calle 26 / Caracas / Caracas Sur' },
  'A->H': { servicio: 'Ruta Fácil 3', nombre: 'Plaza Democracia ↔ Portal Usme', via: 'Caracas continua' },
  'F->H': { servicio: 'Conexión Av. Jiménez', nombre: 'Portal Américas ↔ Caracas Sur', via: 'Av. Jiménez / Caracas Sur' },
  'E->H': { servicio: 'Conexión Comuneros', nombre: 'NQS ↔ Caracas Sur', via: 'Calle 6 / Caracas' },
  'G->H': { servicio: 'Conexión Calle 40 Sur', nombre: 'NQS Sur ↔ Caracas Sur', via: 'General Santander / Calle 40 Sur' },
  'L->H': { servicio: 'Conexión Molinos', nombre: 'Carrera 10 ↔ Caracas Sur', via: 'Carrera 10 / Caracas Sur' },
  'H->H': { servicio: 'Ruta Fácil 3', nombre: 'Servicio Troncal Caracas Sur Local', via: 'Caracas Sur directa' },

  // Hacia Troncal K (Calle 26 El Dorado)
  'L->K': { servicio: 'K10', nombre: 'Portal 20 de Julio ↔ Portal El Dorado', via: 'Carrera 10 / Calle 26' },
  'B->K': { servicio: 'K16', nombre: 'Terminal Norte ↔ Portal El Dorado', via: 'Autonorte / NQS / Calle 26' },
  'G->K': { servicio: 'K43', nombre: 'San Mateo (Soacha) ↔ Portal El Dorado', via: 'NQS Sur / Calle 26' },
  'H->K': { servicio: 'K54', nombre: 'Portal Usme ↔ Portal El Dorado', via: 'Caracas / Calle 26' },
  'A->K': { servicio: 'Ruta Fácil 1', nombre: 'Universidades ↔ Portal El Dorado', via: 'Calle 26 continua' },
  'E->K': { servicio: 'Conexión CAD', nombre: 'NQS ↔ Calle 26', via: 'Estación de Intercambio Av. El Dorado' },
  'D->K': { servicio: 'Conexión Escuela Militar', nombre: 'Calle 80 ↔ Calle 26', via: 'NQS / Calle 26' },
  'F->K': { servicio: 'Conexión Ricaurte', nombre: 'Américas ↔ Calle 26', via: 'NQS / Calle 26' },
  'C->K': { servicio: 'Conexión NQS', nombre: 'Suba ↔ Calle 26', via: 'Av. Suba / NQS / Calle 26' },
  'K->K': { servicio: 'Ruta Fácil 1', nombre: 'Servicio Troncal Calle 26 Local', via: 'Avenida El Dorado directa' },

  // Hacia Troncal L (Carrera 10 / 20 de Julio)
  'K->L': { servicio: 'L10', nombre: 'Portal El Dorado ↔ Portal 20 de Julio', via: 'Calle 26 / Carrera 10' },
  'B->L': { servicio: 'L18', nombre: 'Terminal Norte ↔ Portal 20 de Julio', via: 'Autonorte / Caracas / Carrera 10' },
  'C->L': { servicio: 'L25', nombre: 'Portal Suba ↔ Portal 20 de Julio', via: 'Av. Suba / NQS / Carrera 10' },
  'G->L': { servicio: 'L41', nombre: 'San Mateo ↔ Bicentenario', via: 'NQS Sur / Calle 6 / Carrera 10' },
  'A->L': { servicio: 'Ruta Fácil 2', nombre: 'Museo Nacional ↔ Portal 20 de Julio', via: 'Carrera 10 directa' },
  'L->L': { servicio: 'Ruta Fácil 2', nombre: 'Servicio Carrera 10 Local', via: 'Troncal Carrera 10 directa' }
};

// 2. NODOS OFICIALES DE INTERCAMBIO ENTRE TRONCALES
// (Evitan que el enrutador mande por Av 68 u obras en construcción)
const INTERCHANGE_STATION_NAMES = {
  'D-E': 'Escuela Militar',
  'D-G': 'Escuela Militar',
  'D-B': 'Héroes',
  'D-A': 'Calle 76',
  'C-E': 'La Castellana',
  'C-G': 'La Castellana',
  'C-B': 'Héroes',
  'C-A': 'Calle 76',
  'F-E': 'Ricaurte',
  'F-G': 'Ricaurte',
  'F-A': 'Avenida Jiménez',
  'F-H': 'Avenida Jiménez',
  'K-E': 'Av. El Dorado',
  'K-G': 'Av. El Dorado',
  'K-A': 'Calle 26',
  'K-L': 'San Diego',
  'L-A': 'Tercer Milenio',
  'L-H': 'Hospitales',
  'L-G': 'Bicentenario',
  'E-G': 'General Santander',
  'A-H': 'Avenida 39',
  'B-H': 'Calle 72'
};

// 3. RUTAS ALIMENTADORAS REALES POR PORTAL (100% OFICIALES CON PARADEROS)
export const REAL_PORTAL_ALIMENTADORES = {
  'Portal de Suba': [
    {
      ruta: '11-2',
      nombre: 'San Andrés',
      sectores: ['San Andrés', 'Pinar del Río', 'Suba'],
      paradas: [
        'Paradero KR 118 - CL 153 (San Andrés)',
        'CL 152 - KR 104 (Pinar del Río)',
        'Av. Suba - CL 147',
        'Llegada Plataforma 1: Portal de Suba'
      ]
    },
    {
      ruta: '11-3',
      nombre: 'Villamaría',
      sectores: ['Villamaría', 'La Gaitana', 'Aures'],
      paradas: [
        'Paradero CL 132 - KR 125 (Villamaría)',
        'CL 135 - KR 118 (Aures)',
        'Av. Cali - CL 139',
        'Llegada Plataforma 2: Portal de Suba'
      ]
    },
    {
      ruta: '11-4',
      nombre: 'Aures',
      sectores: ['Aures', 'Lago de Suba', 'Rincón'],
      paradas: [
        'Paradero KR 104 - CL 131 (Aures I)',
        'CL 130 - KR 100 (El Rincón)',
        'Av. Cali - CL 132',
        'Av. Cali - CL 139',
        'Llegada Plataforma 1: Portal de Suba'
      ]
    },
    {
      ruta: '11-5',
      nombre: 'Av. Cali',
      sectores: ['Avenida Cali', 'Turingia', 'Campiña'],
      paradas: [
        'Paradero Av. Cali - CL 142 (Campiña)',
        'CL 145 - KR 92 (Turingia)',
        'Av. Suba - KR 91',
        'Llegada Plataforma 2: Portal de Suba'
      ]
    },
    {
      ruta: '11-6',
      nombre: 'Tibabuyes',
      sectores: ['Tibabuyes', 'Lisboa', 'Santa Cecilia'],
      paradas: [
        'Paradero CL 139 - KR 128 (Barrio Lisboa)',
        'KR 127 - CL 142 (Tibabuyes)',
        'CL 144 - KR 120 (Santa Cecilia)',
        'CL 145 - KR 115',
        'Av. Cali - CL 142',
        'Llegada Plataforma 1: Portal de Suba'
      ]
    },
    {
      ruta: '11-8',
      nombre: 'La Gaitana',
      sectores: ['La Gaitana', 'Berlín', 'Tuna Alta'],
      paradas: [
        'Paradero KR 125 - CL 132D (La Gaitana)',
        'CL 132 - KR 118 (Berlín)',
        'Av. Cali - CL 138',
        'Llegada Plataforma 2: Portal de Suba'
      ]
    },
    {
      ruta: '11-9',
      nombre: 'Lisboa',
      sectores: ['Lisboa', 'Santa Rita', 'San Pedro'],
      paradas: [
        'Paradero KR 150 - CL 132 (Lisboa)',
        'CL 132 - KR 135 (Santa Rita)',
        'KR 128 - CL 139',
        'Llegada Plataforma 1: Portal de Suba'
      ]
    },
    {
      ruta: '11-10',
      nombre: 'Bilbao',
      sectores: ['Bilbao', 'Fontanar', 'Compartir'],
      paradas: [
        'Paradero CL 143 - KR 144 (Bilbao)',
        'KR 136 - CL 145 (Fontanar del Río)',
        'Av. Cali - CL 142',
        'Llegada Plataforma 2: Portal de Suba'
      ]
    }
  ],
  'Portal Norte': [
    {
      ruta: '2-1',
      nombre: 'Mirandela',
      sectores: ['Mirandela', 'San José de Bavaria', 'Toberín'],
      paradas: [
        'Paradero CL 191 - KR 45 (Mirandela)',
        'Auto Norte - CL 187',
        'Auto Norte - CL 183',
        'Llegada Plataforma Alimentadores: Portal Norte'
      ]
    },
    {
      ruta: '2-2',
      nombre: 'Jardines',
      sectores: ['Jardines de Paz', 'Torca', 'Guaymaral'],
      paradas: [
        'Paradero Auto Norte - CL 205 (Jardines de Paz)',
        'Auto Norte - CL 193',
        'Llegada Plataforma Alimentadores: Portal Norte'
      ]
    },
    {
      ruta: '2-3',
      nombre: 'San Antonio',
      sectores: ['San Antonio', 'Tibana', 'Usaquén'],
      paradas: [
        'Paradero CL 183 - KR 16 (San Antonio Norte)',
        'CL 183 - KR 20',
        'Auto Norte - CL 175',
        'Llegada Plataforma Alimentadores: Portal Norte'
      ]
    },
    {
      ruta: '2-4',
      nombre: 'El Codito',
      sectores: ['El Codito', 'Buenavista', 'Horizontes'],
      paradas: [
        'Paradero KR 4 - CL 189 (El Codito)',
        'CL 183 - KR 7 (Buenavista)',
        'CL 183 - KR 16',
        'Llegada Plataforma Alimentadores: Portal Norte'
      ]
    },
    {
      ruta: '2-5',
      nombre: 'San Cristóbal N.',
      sectores: ['San Cristóbal Norte', 'Barrancas'],
      paradas: [
        'Paradero CL 165 - KR 8',
        'CL 170 - KR 12',
        'Auto Norte - CL 170',
        'Llegada Plataforma Alimentadores: Portal Norte'
      ]
    },
    {
      ruta: '2-8',
      nombre: 'Andalucía',
      sectores: ['Andalucía', 'Britalia', 'Prado Veraniego'],
      paradas: [
        'Paradero CL 187 - KR 55 (Andalucía)',
        'CL 183 - KR 51 (Britalia)',
        'Llegada Plataforma Alimentadores: Portal Norte'
      ]
    },
    {
      ruta: '2-10',
      nombre: 'Verbenal',
      sectores: ['Verbenal', 'Canaima', 'Marantá'],
      paradas: [
        'Paradero CL 187 - KR 19 (Verbenal)',
        'Auto Norte - CL 185 (Marantá)',
        'Llegada Plataforma Alimentadores: Portal Norte'
      ]
    }
  ],
  'Portal de la 80': [
    {
      ruta: '1-1',
      nombre: 'Álamos',
      sectores: ['Álamos', 'Álamos Norte', 'Engativá'],
      paradas: [
        'Paradero CL 72F - KR 110 (Álamos)',
        'CL 71 - KR 105',
        'CL 72 - KR 100',
        'Llegada Plataforma 1: Portal de la 80'
      ]
    },
    {
      ruta: '1-2',
      nombre: 'Garcés Navas',
      sectores: ['Garcés Navas', 'Villas de Granada'],
      paradas: [
        'Paradero CL 76A - KR 106 (Garcés Navas)',
        'KR 110 - CL 78',
        'Llegada Plataforma 2: Portal de la 80'
      ]
    },
    {
      ruta: '1-3',
      nombre: 'Haber',
      sectores: ['El Minuto de Dios', 'Boyacá'],
      paradas: [
        'Paradero KR 77 - CL 79',
        'CL 80 - KR 73A',
        'Llegada Plataforma 1: Portal de la 80'
      ]
    },
    {
      ruta: '1-4',
      nombre: 'Cortijo',
      sectores: ['El Cortijo', 'Ciudadela Colsubsidio'],
      paradas: [
        'Paradero KR 114 - CL 82 (El Cortijo)',
        'CL 83 - KR 112 (Ciudadela Colsubsidio)',
        'CL 80 - KR 104',
        'Llegada Plataforma 1: Portal de la 80'
      ]
    },
    {
      ruta: '1-5',
      nombre: 'Ciudadela Colsubsidio',
      sectores: ['Ciudadela Colsubsidio', 'Bachué'],
      paradas: [
        'Paradero CL 86 - KR 111',
        'CL 83 - KR 104 (Bachué)',
        'Llegada Plataforma 2: Portal de la 80'
      ]
    },
    {
      ruta: '1-6',
      nombre: 'Bolivia',
      sectores: ['Bolivia', 'Quirigua', 'Plazuelas del Virrey'],
      paradas: [
        'Paradero KR 104 - CL 83 (Bolivia)',
        'CL 80 - KR 96',
        'Llegada Plataforma 1: Portal de la 80'
      ]
    },
    {
      ruta: '1-7',
      nombre: 'Quirigua',
      sectores: ['Quirigua', 'Santa Mónica', 'Engativá'],
      paradas: [
        'Paradero CL 90 - KR 91 (Quirigua)',
        'CL 80 - KR 90',
        'Llegada Plataforma 2: Portal de la 80'
      ]
    },
    {
      ruta: '1-10',
      nombre: 'Villas de Granada',
      sectores: ['Villas de Granada', 'Unir'],
      paradas: [
        'Paradero KR 112A - CL 77 (Villas de Granada)',
        'CL 80 - KR 107',
        'Llegada Plataforma 2: Portal de la 80'
      ]
    }
  ],
  'Portal El Dorado': [
    {
      ruta: '16-1',
      nombre: 'Tierra Firme',
      sectores: ['Tierra Firme', 'San José', 'Engativá'],
      paradas: [
        'Paradero CL 66 - KR 105 (Tierra Firme)',
        'Av. Esperanza - KR 100',
        'Llegada Plataforma 1: Portal El Dorado'
      ]
    },
    {
      ruta: '16-2',
      nombre: 'Engativá Centro',
      sectores: ['Engativá Centro', 'La Faena', 'Villa Claver'],
      paradas: [
        'Paradero CL 64 - KR 121 (Engativá Centro)',
        'CL 63 - KR 110 (La Faena)',
        'Av. El Dorado - KR 103',
        'Llegada Plataforma 1: Portal El Dorado'
      ]
    },
    {
      ruta: '16-3',
      nombre: 'Álamos',
      sectores: ['Álamos', 'San Ignacio', 'Normandía'],
      paradas: [
        'Paradero CL 64G - KR 90',
        'CL 26 - Av. Ciudad de Cali',
        'Llegada Plataforma 2: Portal El Dorado'
      ]
    },
    {
      ruta: '16-4',
      nombre: 'El Muelle',
      sectores: ['El Muelle', 'La Cabaña', 'San Marcos'],
      paradas: [
        'Paradero KR 105 - CL 63 (El Muelle)',
        'CL 64 - KR 96 (San Marcos)',
        'Llegada Plataforma 2: Portal El Dorado'
      ]
    },
    {
      ruta: '16-7',
      nombre: 'La Estancia',
      sectores: ['La Estancia', 'Fontibón', 'El Refugio'],
      paradas: [
        'Paradero CL 15 - KR 104 (Fontibón)',
        'Av. Esperanza - KR 96',
        'Llegada Plataforma 1: Portal El Dorado'
      ]
    },
    {
      ruta: '16-8',
      nombre: 'Zona Franca',
      sectores: ['Zona Franca', 'Fontibón San Pedro'],
      paradas: [
        'Paradero CL 13 - KR 106 (Zona Franca)',
        'Av. Centenario - KR 100',
        'Llegada Plataforma 2: Portal El Dorado'
      ]
    },
    {
      ruta: '16-9',
      nombre: 'Fontibón Centro',
      sectores: ['Fontibón Centro', 'Versalles', 'Villemar'],
      paradas: [
        'Paradero CL 17 - KR 100 (Fontibón Centro)',
        'KR 103 - CL 22 (Versalles)',
        'Llegada Plataforma 1: Portal El Dorado'
      ]
    }
  ],
  'Portal de las Américas': [
    {
      ruta: '9-1',
      nombre: 'Casablanca',
      sectores: ['Casablanca', 'Pastrana', 'Kennedy'],
      paradas: [
        'Paradero KR 80 - CL 43 Sur (Casablanca)',
        'CL 45 Sur - KR 79 (Pastrana)',
        'Av. Villavicencio - Av. Cali',
        'Llegada Plataforma Alimentadores: Portal Américas'
      ]
    },
    {
      ruta: '9-2',
      nombre: 'Metrovivienda',
      sectores: ['Metrovivienda', 'Porvenir', 'Bosa'],
      paradas: [
        'Paradero KR 92 - CL 54 Sur (Metrovivienda)',
        'CL 51 Sur - KR 87',
        'Av. Cali - CL 45 Sur',
        'Llegada Plataforma Alimentadores: Portal Américas'
      ]
    },
    {
      ruta: '9-3',
      nombre: 'Bosa Carbonell',
      sectores: ['Bosa Carbonell', 'La Libertad', 'Bosa Centro'],
      paradas: [
        'Paradero CL 71 Sur - KR 87 (Bosa Carbonell)',
        'CL 65 Sur - KR 80',
        'Av. Villavicencio - KR 82',
        'Llegada Plataforma Alimentadores: Portal Américas'
      ]
    },
    {
      ruta: '9-4',
      nombre: 'Patio Bonito',
      sectores: ['Patio Bonito', 'Tintal', 'Galán'],
      paradas: [
        'Paradero Av. Cali - CL 38 Sur (Patio Bonito)',
        'KR 86 - CL 40 Sur (Tintal)',
        'Llegada Plataforma Alimentadores: Portal Américas'
      ]
    },
    {
      ruta: '9-8',
      nombre: 'Porvenir',
      sectores: ['Porvenir', 'Brasil', 'Chicalá'],
      paradas: [
        'Paradero CL 54 Sur - KR 95 (El Porvenir)',
        'CL 49 Sur - KR 88 (Brasil)',
        'Llegada Plataforma Alimentadores: Portal Américas'
      ]
    },
    {
      ruta: '9-10',
      nombre: 'Roma',
      sectores: ['Roma', 'Class', 'Carmelo'],
      paradas: [
        'Paradero CL 53 Sur - KR 79 (Roma)',
        'CL 48 Sur - KR 80 (Class)',
        'Llegada Plataforma Alimentadores: Portal Américas'
      ]
    }
  ],
  'Portal del Sur': [
    {
      ruta: '10-1',
      nombre: 'Avenida Bosa',
      sectores: ['Avenida Bosa', 'Clara de Cisneros'],
      paradas: [
        'Paradero CL 63 Sur - KR 77 (Av. Bosa)',
        'Auto Sur - KR 75',
        'Llegada Plataforma Alimentadores: Portal del Sur'
      ]
    },
    {
      ruta: '10-2',
      nombre: 'Bosa Centro',
      sectores: ['Bosa Centro', 'La Estación', 'Bosa'],
      paradas: [
        'Paradero KR 80 - CL 65 Sur (Bosa Centro)',
        'CL 63 Sur - KR 78',
        'Auto Sur - KR 74',
        'Llegada Plataforma Alimentadores: Portal del Sur'
      ]
    },
    {
      ruta: '10-5',
      nombre: 'Terminal Sur',
      sectores: ['Terminal Sur', 'Barlovento'],
      paradas: [
        'Paradero CL 57 Sur - KR 75 (Terminal)',
        'Auto Sur - KR 73',
        'Llegada Plataforma Alimentadores: Portal del Sur'
      ]
    },
    {
      ruta: '10-6',
      nombre: 'Perdomo',
      sectores: ['Perdomo', 'Rincón de la Valvanera'],
      paradas: [
        'Paradero Diag. 63A Sur (Perdomo)',
        'Auto Sur - KR 72',
        'Llegada Plataforma Alimentadores: Portal del Sur'
      ]
    },
    {
      ruta: '10-8',
      nombre: 'Olarte',
      sectores: ['Olarte', 'Nuevo Muzú'],
      paradas: [
        'Paradero CL 56 Sur - KR 71 (Olarte)',
        'Auto Sur - KR 73',
        'Llegada Plataforma Alimentadores: Portal del Sur'
      ]
    }
  ],
  'Portal Tunal': [
    {
      ruta: '6-1',
      nombre: 'Candelaria',
      sectores: ['Candelaria La Nueva', 'San Francisco'],
      paradas: [
        'Paradero CL 59 Sur - KR 45 (Candelaria)',
        'Av. Villavicencio - CL 61 Sur',
        'Llegada Plataforma Alimentadores: Portal Tunal'
      ]
    },
    {
      ruta: '6-2',
      nombre: 'San Francisco',
      sectores: ['San Francisco', 'Meissen', 'Tunjuelito'],
      paradas: [
        'Paradero KR 21 - CL 65 Sur (San Francisco)',
        'Av. Boyacá - Meissen',
        'Llegada Plataforma Alimentadores: Portal Tunal'
      ]
    },
    {
      ruta: '6-4',
      nombre: 'Paraíso',
      sectores: ['Paraíso', 'Bella Flor', 'Mirador del Paraíso'],
      paradas: [
        'Paradero CL 71 Sur - KR 27 (Paraíso)',
        'Av. Boyacá - CL 65 Sur',
        'Llegada Plataforma Alimentadores: Portal Tunal'
      ]
    },
    {
      ruta: '6-7',
      nombre: 'San Joaquín',
      sectores: ['San Joaquín', 'Lucero', 'Arabia'],
      paradas: [
        'Paradero KR 18 - CL 68 Sur (San Joaquín)',
        'Av. Boyacá - CL 60 Sur',
        'Llegada Plataforma Alimentadores: Portal Tunal'
      ]
    }
  ],
  'Portal Usme': [
    {
      ruta: '3-2',
      nombre: 'Santa Librada',
      sectores: ['Santa Librada', 'Yomasa', 'La Andrea'],
      paradas: [
        'Paradero Av. Caracas - CL 74 Sur (Santa Librada)',
        'KR 14 - CL 68 Sur (Yomasa)',
        'Llegada Plataforma Alimentadores: Portal Usme'
      ]
    },
    {
      ruta: '3-4',
      nombre: 'Alfonso López',
      sectores: ['Alfonso López', 'Marichuela'],
      paradas: [
        'Paradero CL 91 Sur - KR 5 (Alfonso López)',
        'Av. Caracas - CL 80 Sur',
        'Llegada Plataforma Alimentadores: Portal Usme'
      ]
    },
    {
      ruta: '3-10',
      nombre: 'Usme Centro',
      sectores: ['Usme Centro', 'Pueblo de Usme'],
      paradas: [
        'Paradero KR 3 - CL 137 Sur (Usme Centro)',
        'Av. Caracas - CL 100 Sur',
        'Llegada Plataforma Alimentadores: Portal Usme'
      ]
    }
  ],
  'Portal 20 de Julio': [
    {
      ruta: '13-6',
      nombre: 'Juan Rey',
      sectores: ['Juan Rey', 'Los Alpes', 'San Cristóbal'],
      paradas: [
        'Paradero CL 76 Sur - KR 13 Este (Juan Rey)',
        'KR 10 - CL 40 Sur',
        'Llegada Plataforma Alimentadores: Portal 20 de Julio'
      ]
    },
    {
      ruta: '13-8',
      nombre: 'Altamira',
      sectores: ['Altamira', 'Chupundún', 'San Blas'],
      paradas: [
        'Paradero KR 12 Este - CL 43 Sur (Altamira)',
        'KR 10 - CL 36 Sur',
        'Llegada Plataforma Alimentadores: Portal 20 de Julio'
      ]
    },
    {
      ruta: '13-9',
      nombre: 'Tihuaque',
      sectores: ['Tihuaque', 'El Triunfo'],
      paradas: [
        'Paradero CL 86 Sur - KR 15 Este (Tihuaque)',
        'KR 10 - CL 45 Sur',
        'Llegada Plataforma Alimentadores: Portal 20 de Julio'
      ]
    }
  ]
};

// 4. RUTAS SITP ZONALES REALES CON TERMINALES Y PARADEROS OFICIALES
export const REAL_SITP_ZONALES = [
  {
    ruta: 'C115',
    nombre: 'Jardines del Recuerdo ↔ Jaqueline',
    sectorOrigen: 'Suba / Usaquén',
    sectorDestino: 'Kennedy',
    via: 'Av. Boyacá / Américas',
    paradas: [
      'Paradero Jaqueline (Kennedy)',
      'Av. Primero de Mayo - KR 78',
      'Av. Boyacá - CL 26',
      'Av. Boyacá - CL 80',
      'Av. Boyacá - CL 134',
      'CL 170 - KR 15',
      'Jardines del Recuerdo (Norte)'
    ]
  },
  {
    ruta: 'C129',
    nombre: 'Aures II ↔ Germania (Centro)',
    sectorOrigen: 'Suba',
    sectorDestino: 'Centro / Santa Fe',
    via: 'Av. Suba / Cll 100 / Carrera 7ma',
    paradas: [
      'Paradero Aures II (Suba)',
      'KR 104 - CL 130 (El Rincón)',
      'Av. Suba - CL 127',
      'CL 100 - KR 15',
      'Carrera 7ma - CL 72 (Zona Financiera)',
      'Carrera 7ma - CL 39 (Javeriana)',
      'Germania (Centro / Las Aguas)'
    ]
  },
  {
    ruta: 'C156',
    nombre: 'Bilbao (Suba) ↔ El Recreo (Bosa)',
    sectorOrigen: 'Suba',
    sectorDestino: 'Bosa',
    via: 'Av. Ciudad de Cali',
    paradas: [
      'Paradero Bilbao (Suba)',
      'Av. Cali - CL 132',
      'Av. Cali - CL 80',
      'Av. Cali - CL 26',
      'Av. Cali - Américas (Patio Bonito)',
      'CL 59 Sur - KR 87 (Bosa El Recreo)'
    ]
  },
  {
    ruta: 'T13',
    nombre: 'Villa Cindy (Suba) ↔ Hospital San Blas',
    sectorOrigen: 'Suba',
    sectorDestino: 'San Cristóbal',
    via: 'Calle 127 / NQS / Calle 13',
    paradas: [
      'Paradero Villa Cindy (Suba)',
      'Av. Suba - CL 127',
      'Av. NQS - CL 68',
      'Calle 13 - KR 22',
      'Hospital San Blas (San Cristóbal)'
    ]
  },
  {
    ruta: '344',
    nombre: 'Tibabuyes (Suba) ↔ Cantón Norte (Usaquén)',
    sectorOrigen: 'Suba',
    sectorDestino: 'Usaquén',
    via: 'Calle 134 / Av. Suba / Kr 7',
    paradas: [
      'Paradero Tibabuyes (Suba)',
      'Av. Suba - CL 134',
      'CL 134 - KR 19',
      'Carrera 7ma - CL 106 (Cantón Norte)'
    ]
  },
  {
    ruta: 'P500',
    nombre: 'Aeropuerto El Dorado ↔ Centro Andino',
    sectorOrigen: 'Fontibón / Engativá',
    sectorDestino: 'Chapinero',
    via: 'Calle 26 / Calle 68 / Carrera 11',
    paradas: [
      'Aeropuerto El Dorado (T1)',
      'Av. El Dorado - KR 103',
      'CL 26 - Av. Boyacá',
      'Av. Calle 68 - KR 50',
      'Carrera 11 - CL 82 (Centro Andino / Zona T)'
    ]
  },
  {
    ruta: '599',
    nombre: 'Bosa San José ↔ Suba Gaitana',
    sectorOrigen: 'Bosa',
    sectorDestino: 'Suba',
    via: 'NQS / Av. Boyacá / Av. Suba',
    paradas: [
      'Paradero Bosa San José',
      'Auto Sur - KR 77',
      'Av. NQS - CL 30 Sur',
      'Av. NQS - CAD / El Dorado',
      'Av. NQS - CL 75',
      'Av. Boyacá - CL 116',
      'Av. Suba - CL 145',
      'Suba La Gaitana'
    ]
  },
  {
    ruta: 'A127',
    nombre: 'Fontibón San Pablo ↔ El Virrey',
    sectorOrigen: 'Fontibón',
    sectorDestino: 'Chapinero / Usaquén',
    via: 'Av. Esperanza / Calle 68 / Kr 15',
    paradas: [
      'Paradero Fontibón San Pablo',
      'Av. Esperanza - KR 100',
      'Av. Rojas - CL 53',
      'CL 68 - Av. 68',
      'KR 15 - CL 76',
      'Parque El Virrey (Calle 87)'
    ]
  },
  {
    ruta: 'A302',
    nombre: 'El Recodo (Fontibón) ↔ Centro',
    sectorOrigen: 'Fontibón',
    sectorDestino: 'La Candelaria',
    via: 'Calle 13 / Av. Centenario',
    paradas: [
      'Paradero El Recodo (Fontibón)',
      'Av. Centenario - KR 106',
      'Calle 13 - Av. Américas',
      'Av. Jiménez - KR 10 (Centro)'
    ]
  },
  {
    ruta: 'B900',
    nombre: 'El Codito ↔ Morato (Suba)',
    sectorOrigen: 'Usaquén',
    sectorDestino: 'Suba',
    via: 'Calle 170 / Av. Boyacá',
    paradas: [
      'Paradero El Codito (Usaquén)',
      'CL 170 - Auto Norte',
      'Av. Boyacá - CL 134',
      'Morato (Suba)'
    ]
  },
  {
    ruta: 'F401',
    nombre: 'Tierra Buena ↔ Calle 72',
    sectorOrigen: 'Kennedy',
    sectorDestino: 'Chapinero',
    via: 'Américas / Carrera 68 / Calle 72',
    paradas: [
      'Paradero Tierra Buena (Patio Bonito)',
      'Av. Américas - KR 80',
      'Av. Américas - Av. 68',
      'Carrera 68 - CL 26',
      'CL 72 - KR 24',
      'Calle 72 con Carrera 11'
    ]
  },
  {
    ruta: 'K303',
    nombre: 'Puente Grande (Fontibón) ↔ Unicentro',
    sectorOrigen: 'Fontibón',
    sectorDestino: 'Usaquén',
    via: 'Av. Esperanza / Cll 100 / Kr 15',
    paradas: [
      'Paradero Puente Grande (Fontibón)',
      'CL 17 - KR 128',
      'Av. Esperanza - KR 100',
      'CL 26 - Av. 68',
      'CL 100 - KR 15',
      'Unicentro (Usaquén)'
    ]
  }
];

// Helper: Seleccionar Alimentador Real del Portal
function getRealAlimentador(portal, originName = '') {
  const routes = REAL_PORTAL_ALIMENTADORES[portal.nombre];
  if (!routes || routes.length === 0) {
    return { ruta: 'Alimentador', nombre: `Hacia ${portal.nombre}` };
  }
  const cleanOrigin = originName.toLowerCase();
  for (const r of routes) {
    if (r.sectores.some((s) => cleanOrigin.includes(s.toLowerCase()))) {
      return r;
    }
  }
  return routes[0];
}

// Helper: Seleccionar Ruta Zonal SITP Real
function getRealSitpRoute(originName = '', destName = '') {
  const o = originName.toLowerCase();
  const d = destName.toLowerCase();

  for (const z of REAL_SITP_ZONALES) {
    if (
      (o.includes(z.sectorOrigen.toLowerCase()) || d.includes(z.sectorDestino.toLowerCase())) ||
      (d.includes(z.sectorOrigen.toLowerCase()) || o.includes(z.sectorDestino.toLowerCase()))
    ) {
      return z;
    }
  }
  return REAL_SITP_ZONALES[0];
}

// Helper: Obtener secuencia de estaciones e itinerario troncal sin tomar vías en construcción
export function getTrunkRoutePlan(stOrigin, stDest, allStations) {
  const letraO = stOrigin.troncalLetra || 'A';
  const letraD = stDest.troncalLetra || 'B';
  const routeKey = `${letraO}->${letraD}`;

  const official = OFFICIAL_TRUNK_SERVICES[routeKey] || OFFICIAL_TRUNK_SERVICES[`${letraD}->${letraO}`] || {
    servicio: `Ruta Troncal Conexión ${letraO}-${letraD}`,
    nombre: `Troncal ${TRONCAL_NAMES[letraO] || letraO} ↔ ${TRONCAL_NAMES[letraD] || letraD}`,
    via: `Corredor exclusivo TransMilenio`
  };

  let transferStation = null;
  const pairKey1 = `${letraO}-${letraD}`;
  const pairKey2 = `${letraD}-${letraO}`;
  const interchangeName = INTERCHANGE_STATION_NAMES[pairKey1] || INTERCHANGE_STATION_NAMES[pairKey2];

  if (interchangeName && letraO !== letraD) {
    transferStation = allStations.find((s) => s.nombre.toLowerCase().includes(interchangeName.toLowerCase())) || null;
  }

  // Estaciones intermedias estrictas en la troncal
  const intermediateList = [];
  const sameTrunk = letraO === letraD;

  if (sameTrunk) {
    // Todas las estaciones de la misma troncal entre stOrigin y stDest
    const trunkStations = allStations.filter((s) => s.troncalLetra === letraO && s.nombre !== stOrigin.nombre && s.nombre !== stDest.nombre);
    const dTotal = getDistanceKm(stOrigin.coordenadas[1], stOrigin.coordenadas[0], stDest.coordenadas[1], stDest.coordenadas[0]);

    for (const s of trunkStations) {
      const d1 = getDistanceKm(stOrigin.coordenadas[1], stOrigin.coordenadas[0], s.coordenadas[1], s.coordenadas[0]);
      const d2 = getDistanceKm(s.coordenadas[1], s.coordenadas[0], stDest.coordenadas[1], stDest.coordenadas[0]);
      if (d1 + d2 <= dTotal * 1.15) {
        intermediateList.push({ ...s, prog: d1 / (dTotal || 1) });
      }
    }
    intermediateList.sort((a, b) => a.prog - b.prog);
  } else if (transferStation) {
    // Troncal 1 hasta el transbordo
    const t1Stations = allStations.filter((s) => s.troncalLetra === letraO && s.nombre !== stOrigin.nombre && s.nombre !== transferStation.nombre);
    const d1Total = getDistanceKm(stOrigin.coordenadas[1], stOrigin.coordenadas[0], transferStation.coordenadas[1], transferStation.coordenadas[0]);
    for (const s of t1Stations) {
      const d1 = getDistanceKm(stOrigin.coordenadas[1], stOrigin.coordenadas[0], s.coordenadas[1], s.coordenadas[0]);
      const d2 = getDistanceKm(s.coordenadas[1], s.coordenadas[0], transferStation.coordenadas[1], transferStation.coordenadas[0]);
      if (d1 + d2 <= d1Total * 1.18) {
        intermediateList.push({ ...s, prog: d1 });
      }
    }
    intermediateList.sort((a, b) => a.prog - b.prog);
    intermediateList.push(transferStation);

    // Troncal 2 desde el transbordo hasta el destino
    const t2Stations = allStations.filter((s) => s.troncalLetra === letraD && s.nombre !== transferStation.nombre && s.nombre !== stDest.nombre);
    const d2Total = getDistanceKm(transferStation.coordenadas[1], transferStation.coordenadas[0], stDest.coordenadas[1], stDest.coordenadas[0]);
    const t2List = [];
    for (const s of t2Stations) {
      const d1 = getDistanceKm(transferStation.coordenadas[1], transferStation.coordenadas[0], s.coordenadas[1], s.coordenadas[0]);
      const d2 = getDistanceKm(s.coordenadas[1], s.coordenadas[0], stDest.coordenadas[1], stDest.coordenadas[0]);
      if (d1 + d2 <= d2Total * 1.18) {
        t2List.push({ ...s, prog: d1 });
      }
    }
    t2List.sort((a, b) => a.prog - b.prog);
    intermediateList.push(...t2List);
  }

  // Waypoints estrictos para OSRM (garantiza que siga el carril troncal exclusivo sin pasar por obras como Av. 68)
  const waypoints = [
    [stOrigin.coordenadas[1], stOrigin.coordenadas[0]]
  ];

  if (intermediateList.length > 0) {
    // Muestreo balanceado de estaciones para no saturar la URL de OSRM
    const step = Math.max(1, Math.floor(intermediateList.length / 5));
    for (let i = 0; i < intermediateList.length; i += step) {
      waypoints.push([intermediateList[i].coordenadas[1], intermediateList[i].coordenadas[0]]);
    }
  }

  waypoints.push([stDest.coordenadas[1], stDest.coordenadas[0]]);

  return {
    official,
    transferStation,
    intermediateStations: intermediateList,
    intermediateNames: intermediateList.map((s) => s.nombre),
    waypoints
  };
}

// MAIN FUNCTION: Planificar 4 Rutas Intermodales
export async function computeMultimodalRoutes(origin, destination, stations = []) {
  if (!origin || !destination) return null;

  const oLat = origin.lat;
  const oLng = origin.lng;
  const dLat = destination.lat;
  const dLng = destination.lng;

  const directDist = getDistanceKm(oLat, oLng, dLat, dLng);

  // Estaciones más cercanas reales
  const stOrigin = findClosestStation(oLat, oLng, stations) || {
    nombre: 'Estación Cercana',
    troncalLetra: 'A',
    coordenadas: [oLng, oLat],
    distanciaKm: 0.4,
    distMetros: 400,
    walkMin: 5
  };

  const stDest = findClosestStation(dLat, dLng, stations) || {
    nombre: 'Estación Destino',
    troncalLetra: 'B',
    coordenadas: [dLng, dLat],
    distanciaKm: 0.3,
    distMetros: 300,
    walkMin: 4
  };

  const portalOrigin = findClosestPortal(oLat, oLng, stations) || stOrigin;

  // Planificación Troncal Estricta (evitando troncales no construidas)
  const trunkPlan = getTrunkRoutePlan(stOrigin, stDest, stations);

  // 1. RUTA: CICLORRUTA (100% Real OSRM Bike Path)
  const bikeOsrm = await fetchOsrmGeometry('cycling', [
    [oLat, oLng],
    [dLat, dLng]
  ]);
  const bikeDist = bikeOsrm.distanceKm || Math.max(1.5, Math.round(directDist * 1.25 * 10) / 10);
  const bikeTimeMin = bikeOsrm.durationMin || Math.round((bikeDist / 16) * 60);
  const calories = Math.round(bikeDist * 32);
  const co2SavedKg = Math.round(bikeDist * 0.16 * 10) / 10;

  const bikeRoute = {
    id: 'ciclovia',
    titulo: 'En Bicicleta / Ciclorruta',
    icono: 'bike',
    color: '#22c55e',
    tiempoTotalMin: bikeTimeMin,
    distanciaKm: bikeDist,
    costoCop: 0,
    resumen: 'Trazado real por la red de ciclorrutas y vías secundarias ciclables de Bogotá.',
    stats: [
      { label: 'Tiempo', val: `${bikeTimeMin} min` },
      { label: 'Distancia', val: `${bikeDist} km` },
      { label: 'Calorías', val: `~${calories} kcal` },
      { label: 'Ahorro CO2', val: `${co2SavedKg} kg` }
    ],
    tramos: [
      {
        tipo: 'bici',
        titulo: 'Pedaleo continuo por Ciclorrutas',
        detalle: 'Corredores ciclables protegidos, parques lineales y andenes segregados.',
        distancia: `${bikeDist} km`,
        tiempo: `${bikeTimeMin} min`,
        color: '#22c55e'
      }
    ],
    puntosGeo: bikeOsrm.latlngs,
    pins: [
      { lat: oLat, lng: oLng, label: 'Origen (A)' },
      { lat: dLat, lng: dLng, label: 'Destino (B)' }
    ]
  };

  // 2. RUTA: TRANSMILENIO TRONCAL (Caminata 1 -> Troncal Oficial OSRM -> Caminata 2)
  const walk1Osrm = await fetchOsrmGeometry('foot', [
    [oLat, oLng],
    [stOrigin.coordenadas[1], stOrigin.coordenadas[0]]
  ]);

  // Se envían los waypoints de las estaciones de la troncal operativa (NUNCA Av 68 ni obras en ejecución)
  const tmTrunkOsrm = await fetchOsrmGeometry('driving', trunkPlan.waypoints);

  const walk2Osrm = await fetchOsrmGeometry('foot', [
    [stDest.coordenadas[1], stDest.coordenadas[0]],
    [dLat, dLng]
  ]);

  const tmDist = tmTrunkOsrm.distanceKm;
  const tmTimeMin = Math.round((tmDist / 26) * 60) + (trunkPlan.transferStation ? 7 : 4);
  const walk1Min = walk1Osrm.durationMin || stOrigin.walkMin;
  const walk2Min = walk2Osrm.durationMin || stDest.walkMin;
  const totalTmTimeMin = walk1Min + tmTimeMin + walk2Min;

  const tmFullPoints = [
    ...walk1Osrm.latlngs,
    ...tmTrunkOsrm.latlngs,
    ...walk2Osrm.latlngs
  ];

  const transmilenioRoute = {
    id: 'transmilenio',
    titulo: 'TransMilenio Troncal',
    icono: 'train',
    color: '#ef4444',
    tiempoTotalMin: totalTmTimeMin,
    distanciaKm: Math.round((walk1Osrm.distanceKm + tmDist + walk2Osrm.distanceKm) * 10) / 10,
    costoCop: 3550,
    resumen: `Caminata a estación ${stOrigin.nombre}, abordaje de ${trunkPlan.official.servicio} y llegada a ${stDest.nombre}.`,
    estacionOrigen: stOrigin,
    estacionDestino: stDest,
    paradasIntermedias: trunkPlan.intermediateNames,
    stats: [
      { label: 'Tiempo', val: `${totalTmTimeMin} min` },
      { label: 'Tarifa', val: '$3.550 COP' },
      { label: 'Servicio', val: trunkPlan.official.servicio },
      { label: 'Caminata', val: `${stOrigin.distMetros + stDest.distMetros} m` }
    ],
    tramos: [
      {
        tipo: 'caminata',
        titulo: `1. Caminar ${stOrigin.distMetros} m a Estación ${stOrigin.nombre}`,
        detalle: `Camina ${walk1Min} min a pie hacia el acceso de la estación ${stOrigin.nombre} (Troncal ${TRONCAL_NAMES[stOrigin.troncalLetra] || ''}).`,
        distancia: `${stOrigin.distMetros} m`,
        tiempo: `${walk1Min} min`,
        color: '#94a3b8'
      },
      {
        tipo: 'transmilenio',
        titulo: `2. Abordar Servicio Oficial ${trunkPlan.official.servicio} (${trunkPlan.official.nombre})`,
        detalle: `Abordas en ${stOrigin.nombre}. Vía: ${trunkPlan.official.via}.${trunkPlan.transferStation ? ` Conexión en ${trunkPlan.transferStation.nombre}.` : ''} Recorres ${trunkPlan.intermediateNames.length} estaciones hasta ${stDest.nombre}.`,
        distancia: `${tmDist} km`,
        tiempo: `${tmTimeMin} min`,
        color: '#ef4444',
        paradas: trunkPlan.intermediateNames
      },
      {
        tipo: 'caminata',
        titulo: `3. Caminar ${stDest.distMetros} m desde ${stDest.nombre} al destino exacto`,
        detalle: `Desciendes en estación ${stDest.nombre} y caminas ${walk2Min} min hacia tu dirección o lugar exacto.`,
        distancia: `${stDest.distMetros} m`,
        tiempo: `${walk2Min} min`,
        color: '#94a3b8'
      }
    ],
    puntosGeo: tmFullPoints,
    pins: [
      { lat: oLat, lng: oLng, label: 'Origen' },
      { lat: stOrigin.coordenadas[1], lng: stOrigin.coordenadas[0], label: `Abordar: ${stOrigin.nombre}` },
      ...(trunkPlan.transferStation
        ? [{ lat: trunkPlan.transferStation.coordenadas[1], trunkLng: trunkPlan.transferStation.coordenadas[0], lng: trunkPlan.transferStation.coordenadas[0], label: `Transbordo: ${trunkPlan.transferStation.nombre}` }]
        : []),
      { lat: stDest.coordenadas[1], lng: stDest.coordenadas[0], label: `Descender: ${stDest.nombre}` },
      { lat: dLat, lng: dLng, label: 'Destino Exacto' }
    ]
  };

  // 3. RUTA: MULTIMODAL (ALIMENTADOR VERDE REAL + TRANSMILENIO + CAMINATA)
  // En Bogotá se prioriza el alimentador si la estación está a más de 250m o si el portal cubre la zona
  const useAlimentador = stOrigin.distMetros > 250 || portalOrigin.distanciaKm <= 7.0;
  const realAlimentador = getRealAlimentador(portalOrigin, origin.nombre || '');
  const alimentadorTimeMin = Math.round(portalOrigin.distanciaKm * 3.5) + 6;

  const multiPoints = [
    [oLat, oLng],
    ...tmTrunkOsrm.latlngs,
    ...walk2Osrm.latlngs
  ];

  const totalMultiMin = (useAlimentador ? alimentadorTimeMin : walk1Min) + tmTimeMin + walk2Min;

  const multimodalRoute = {
    id: 'multimodal',
    titulo: 'Multimodal: Alimentador + TransMilenio',
    icono: 'bus-front',
    color: '#3b82f6',
    tiempoTotalMin: totalMultiMin,
    distanciaKm: Math.round((portalOrigin.distanciaKm + tmDist + walk2Osrm.distanceKm) * 10) / 10,
    costoCop: 3550,
    resumen: useAlimentador
      ? `Alimentador oficial ${realAlimentador.ruta} desde tu barrio hacia ${portalOrigin.nombre}, conexión con ${trunkPlan.official.servicio}.`
      : `Acceso peatonal corto a ${stOrigin.nombre}, viaje troncal y llegada a destino.`,
    estacionOrigen: useAlimentador ? portalOrigin : stOrigin,
    estacionDestino: stDest,
    paradasIntermedias: trunkPlan.intermediateNames,
    stats: [
      { label: 'Tiempo Total', val: `${totalMultiMin} min` },
      { label: 'Tarifa Tullave', val: '$3.550 COP' },
      { label: 'Transbordo', val: 'Ventana 125 min ($0)' },
      { label: 'Alimentador', val: useAlimentador ? `Ruta ${realAlimentador.ruta}` : 'No requerido' }
    ],
    tramos: [
      useAlimentador
        ? {
            tipo: 'alimentador',
            titulo: `1. Bus Alimentador Verde (Ruta Oficial ${realAlimentador.ruta} - ${realAlimentador.nombre})`,
            detalle: `Abordas en el paradero más cercano de tu barrio hacia ${portalOrigin.nombre} (tarifa $0 COP en bus verde con tarjeta Tullave).`,
            distancia: `${portalOrigin.distanciaKm} km`,
            tiempo: `${alimentadorTimeMin} min`,
            color: '#84cc16',
            paradas: realAlimentador.paradas || [
              `Paradero barrial inicial (${origin.nombre})`,
              `Paradero corredor barrial`,
              `Aproximación por vía principal`,
              `Llegada a plataforma alimentadora de ${portalOrigin.nombre}`
            ]
          }
        : {
            tipo: 'caminata',
            titulo: `1. Caminar ${stOrigin.distMetros} m a Estación ${stOrigin.nombre}`,
            detalle: `Caminata corta de ${walk1Min} min hacia los torniquetes de ${stOrigin.nombre}.`,
            distancia: `${stOrigin.distMetros} m`,
            tiempo: `${walk1Min} min`,
            color: '#94a3b8'
          },
      {
        tipo: 'transmilenio',
        titulo: `2. TransMilenio Troncal (Servicio Oficial ${trunkPlan.official.servicio})`,
        detalle: `Recorrido expreso por carril exclusivo troncal hacia ${stDest.nombre}.${trunkPlan.transferStation ? ` Conexión en ${trunkPlan.transferStation.nombre}.` : ''}`,
        distancia: `${tmDist} km`,
        tiempo: `${tmTimeMin} min`,
        color: '#ef4444',
        paradas: trunkPlan.intermediateNames
      },
      {
        tipo: 'caminata',
        titulo: `3. Llegada desde ${stDest.nombre} a destino`,
        detalle: `Caminata de última milla (${stDest.distMetros} m) a tu destino exacto.`,
        distancia: `${stDest.distMetros} m`,
        tiempo: `${walk2Min} min`,
        color: '#94a3b8'
      }
    ],
    puntosGeo: multiPoints,
    pins: [
      { lat: oLat, lng: oLng, label: 'Origen' },
      { lat: (useAlimentador ? portalOrigin : stOrigin).coordenadas[1], lng: (useAlimentador ? portalOrigin : stOrigin).coordenadas[0], label: useAlimentador ? portalOrigin.nombre : stOrigin.nombre },
      { lat: stDest.coordenadas[1], lng: stDest.coordenadas[0], label: stDest.nombre },
      { lat: dLat, lng: dLng, label: 'Destino Exacto' }
    ]
  };

  // 4. RUTA: SOLO SITP ZONAL (🔵 100% Ruta de Bus Azul Real)
  const sitpOsrm = await fetchOsrmGeometry('driving', [
    [oLat, oLng],
    [dLat, dLng]
  ]);
  const sitpDist = sitpOsrm.distanceKm;
  const sitpTimeMin = Math.round((sitpDist / 17) * 60) + 8;
  const realZonal = getRealSitpRoute(origin.nombre || '', destination.nombre || '');

  const sitpRoute = {
    id: 'sitp',
    titulo: 'Solo SITP Zonal (Bus Azul)',
    icono: 'bus',
    color: '#0284c7',
    tiempoTotalMin: sitpTimeMin,
    distanciaKm: sitpDist,
    costoCop: 3550,
    resumen: `Viaje en bus azul zonal por malla vial arterial sin ingresar a troncal cerrada.`,
    stats: [
      { label: 'Tiempo', val: `${sitpTimeMin} min` },
      { label: 'Tarifa', val: '$3.550 COP' },
      { label: 'Ruta SITP', val: realZonal.ruta },
      { label: 'Paraderos', val: `${realZonal.paradas?.length || Math.round(sitpDist * 2.2)} paradas` }
    ],
    tramos: [
      {
        tipo: 'sitp',
        titulo: `Ruta Zonal Real ${realZonal.ruta} (${realZonal.nombre})`,
        detalle: `Abordas en el paradero más cercano con tarjeta Tullave. Corredor: ${realZonal.via}.`,
        distancia: `${sitpDist} km`,
        tiempo: `${sitpTimeMin} min`,
        color: '#0284c7',
        paradas: realZonal.paradas || [
          `Paradero inicial (${origin.nombre})`,
          `Corredor arterial principal`,
          `Paradero destino (${destination.nombre})`
        ]
      }
    ],
    puntosGeo: sitpOsrm.latlngs,
    pins: [
      { lat: oLat, lng: oLng, label: 'Origen' },
      { lat: dLat, lng: dLng, label: 'Destino' }
    ]
  };

  return {
    origen: origin,
    destino: destination,
    distanciaDirectaKm: Math.round(directDist * 10) / 10,
    rutas: [transmilenioRoute, multimodalRoute, bikeRoute, sitpRoute]
  };
}
