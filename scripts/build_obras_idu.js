// Script to generate high-precision, street-snapped GeoJSON for Major IDU Infrastructure Works
// Eliminates coarse straight-line segments by tracing exact arterial road corridors with OSRM.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OBRAS_CONFIG = [
  {
    nombre: 'Troncal Alimentadora Avenida 68 (Línea Metro 1)',
    entidad: 'Instituto de Desarrollo Urbano (IDU)',
    impacto: '17 km de carriles exclusivos BRT, 21 estaciones, ciclorruta bidireccional y 542.000 m² de espacio público.',
    avance: 'Fase de pavimentación de calzadas troncales y puentes curvos (Av. 68 con Calle 26 y Calle 80).',
    tipo: 'Troncal TransMilenio en Construcción',
    color: '#f97316',
    waypoints: [
      [-74.1415, 4.5955], // Autopista Sur / Venecia
      [-74.1350, 4.6060], // Av. Primero de Mayo / Carvajal
      [-74.1200, 4.6210], // Av. Américas / Pradera
      [-74.1080, 4.6500], // Av. Esperanza / Salitre
      [-74.0950, 4.6650], // Av. Calle 26 / Simón Bolívar
      [-74.0840, 4.6850], // Calle 80 / Metrópolis
      [-74.0680, 4.6930], // Puente Largo / Av. Suba
      [-74.0577, 4.6840], // Autopista Norte / Calle 100
      [-74.0430, 4.6900], // Carrera 15 / Calle 100
      [-74.0320, 4.6960]  // Carrera 7ma / Calle 100 (Pedregal)
    ]
  },
  {
    nombre: 'Ampliación Nueva Avenida Calle 13 (Acceso Occidente)',
    entidad: 'IDU / Región Metropolitana Bogotá-Cundinamarca',
    impacto: '11.4 km de autopista multicarril, carriles exclusivos de transporte público, 14 estaciones y ciclorruta segregada.',
    avance: 'Tramos 1 y 2 en excavación, reubicación de redes de servicios y construcción de puentes de intersección.',
    tipo: 'Vía Arteria y BRT Regional',
    color: '#ea580c',
    waypoints: [
      [-74.0950, 4.6150], // Carrera 50 / Calle 13
      [-74.1100, 4.6300], // Carrera 68
      [-74.1280, 4.6460], // Avenida Boyacá
      [-74.1450, 4.6580], // Av. Ciudad de Cali / Tintal
      [-74.1680, 4.6720], // Fontibón / Zona Franca
      [-74.1950, 4.6860]  // Límite Río Bogotá / Puente de Mosquera
    ]
  },
  {
    nombre: 'Extensión Troncal Caracas Sur (Molinos a Portal Usme)',
    entidad: 'IDU / TransMilenio S.A.',
    impacto: '4.2 km de ampliación troncal con carril exclusivo de TransMilenio, nueva Estación Chigüaza y bicicarril.',
    avance: 'Pavimentación de calzadas BRT y remate del puente vehicular sobre la Quebrada Chigüaza.',
    tipo: 'Troncal TransMilenio en Entrega',
    color: '#e11d48',
    waypoints: [
      [-74.1217, 4.5568], // Estación Molinos
      [-74.1235, 4.5615], // Danubio / Chigüaza
      [-74.1205, 4.5420], // Danubio Sur
      [-74.1195, 4.5315]  // Portal de Usme
    ]
  },
  {
    nombre: 'Viaducto Metro Línea 1 (Tramo Sur y Caracas)',
    entidad: 'Empresa Metro de Bogotá / Consorcio Metro Línea 1',
    impacto: '23.9 km de viaducto elevado continuo, 16 estaciones masivas y Patio Taller de 32 hectáreas.',
    avance: 'Hincado de pilotes de cimentación, columnas dobles y montaje de vigas en U con vigas lanzadoras.',
    tipo: 'Transporte Férreo Pesado',
    color: '#0284c7',
    waypoints: [
      [-74.1980, 4.6120], // Patio Taller Bosa / El Corzo
      [-74.1800, 4.6200], // Av. Villavicencio con Guayacanes
      [-74.1650, 4.6230], // Portal de las Américas
      [-74.1500, 4.6150], // Av. Primero de Mayo con Av. Boyacá
      [-74.1240, 4.5880], // Av. Primero de Mayo con NQS
      [-74.0950, 4.5770], // Av. Primero de Mayo con Carrera 10
      [-74.0850, 4.5950], // Calle 1ra con Caracas (Hospital)
      [-74.0720, 4.6160], // Calle 26 con Caracas
      [-74.0620, 4.6600]  // Calle 72 con Caracas
    ]
  },
  {
    nombre: 'Avenida Guayacanes (Alsacia - Tintal)',
    entidad: 'Instituto de Desarrollo Urbano (IDU)',
    impacto: '13 km de vía arterial con 6 carriles, 32 km de ciclorruta y 378.000 m² de espacio público conectando Kennedy y Bosa.',
    avance: 'Tramo principal habilitado para tráfico y buses SITP; obras complementarias de paisajismo y puentes peatonales.',
    tipo: 'Malla Vial Arterial',
    color: '#d97706',
    waypoints: [
      [-74.1350, 4.6370], // Av. Boyacá con Calle 12
      [-74.1480, 4.6420], // Castilla Norte / El Vergel
      [-74.1620, 4.6460], // Tintal Norte / Calle 6D
      [-74.1780, 4.6360], // Patio Bonito
      [-74.1950, 4.6220]  // Bosa San Bernardino
    ]
  },
  {
    nombre: 'Troncal Avenida Ciudad de Cali Sur (Alimentadora Metro)',
    entidad: 'IDU / TransMilenio',
    impacto: '7.4 km de nuevo corredor BRT desde Bosa / Soacha hasta Portal de las Américas, con 8 estaciones elevadas y a nivel.',
    avance: 'Construcción de calzadas troncales de concreto rígido y puente vehicular sobre el Río Tunjuelo.',
    tipo: 'Troncal TransMilenio en Construcción',
    color: '#ea580c',
    waypoints: [
      [-74.2050, 4.6050], // Av. Circunvalar del Sur (Límite Bosa / Soacha)
      [-74.1920, 4.6150], // Bosa San José
      [-74.1800, 4.6220], // El Porvenir / Metrovivienda
      [-74.1729, 4.6290]  // Portal de las Américas / Av. Villavicencio
    ]
  }
];

async function fetchOsrmRoute(waypoints) {
  const coordString = waypoints.map(w => `${w[0]},${w[1]}`).join(';');
  const url = `https://router.project-osrm.org/route/v1/driving/${coordString}?overview=full&geometries=geojson`;
  
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
      return {
        coordinates: data.routes[0].geometry.coordinates,
        distanceKm: Math.round((data.routes[0].distance / 1000) * 10) / 10
      };
    }
  } catch (err) {
    console.warn(`OSRM error: ${err.message}`);
  }
  return null;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  console.log('--- Construyendo Trazado Milimétrico de Grandes Obras IDU (Snapping Vial) ---');
  const features = [];

  for (let i = 0; i < OBRAS_CONFIG.length; i++) {
    const cfg = OBRAS_CONFIG[i];
    console.log(`[${i + 1}/${OBRAS_CONFIG.length}] Procesando ${cfg.nombre}...`);
    
    let allCoordinates = [];
    let totalKm = 0;

    const CHUNK_SIZE = 4;
    for (let c = 0; c < cfg.waypoints.length - 1; c += CHUNK_SIZE - 1) {
      const chunk = cfg.waypoints.slice(c, Math.min(cfg.waypoints.length, c + CHUNK_SIZE));
      if (chunk.length < 2) break;
      
      const result = await fetchOsrmRoute(chunk);
      if (result && result.coordinates) {
        if (allCoordinates.length > 0) {
          allCoordinates.push(...result.coordinates.slice(1));
        } else {
          allCoordinates.push(...result.coordinates);
        }
        totalKm += result.distanceKm;
      } else {
        if (allCoordinates.length === 0) allCoordinates.push(...chunk);
        else allCoordinates.push(...chunk.slice(1));
      }
      await sleep(250);
    }

    console.log(`   -> Generados ${allCoordinates.length} nodos geográficos viales (${Math.round(totalKm * 10)/10} km)`);

    features.push({
      type: 'Feature',
      properties: {
        nombre: cfg.nombre,
        entidad: cfg.entidad,
        impacto: cfg.impacto,
        avance: cfg.avance,
        tipo: cfg.tipo,
        longitud_km: Math.round(totalKm * 10) / 10,
        color: cfg.color
      },
      geometry: {
        type: 'LineString',
        coordinates: allCoordinates
      }
    });
  }

  const outGeoJson = {
    type: 'FeatureCollection',
    name: 'GrandesObrasInfraestructuraBogota',
    crs: { type: 'name', properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' } },
    features
  };

  const targetPath = path.resolve(__dirname, '../public/data/obras_bogota.json');
  fs.writeFileSync(targetPath, JSON.stringify(outGeoJson), 'utf8');
  console.log(`\n¡Éxito! Archivo de Obras generado en: ${targetPath}`);
  console.log(`Tamaño resultante: ${(fs.statSync(targetPath).size / 1024).toFixed(1)} KB`);
}

main().catch(console.error);
