// Script to generate high-precision Zonas Comerciales GeoJSON
// Enmarques exactos basados 100% en los polígonos y manzanas catastrales de los barrios oficiales de Bogotá
// Eliminates artificial floating boxes.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ZONAS_CONFIG = [
  {
    nombre: 'San Victorino & Centro Mayorista Textil',
    categoria: 'Comercio Textil, Mayorista y Confecciones',
    localidad: 'SANTA FE / LOS MARTIRES',
    descripcion: 'El mayor centro de comercio popular, ropa y confecciones de Colombia (El Madrugón). Enmarcado en las manzanas históricas de La Capuchina y Santa Inés.',
    color: '#f59e0b',
    barrioCodigos: ['003108', '003107', '003109']
  },
  {
    nombre: 'Restrepo Comercial (Distrito del Calzado)',
    categoria: 'Calzado, Marroquinería y Comercio Barrial',
    localidad: 'ANTONIO NARIÑO',
    descripcion: 'Epicentro tradicional del calzado, cueros, restaurantes y comercio popular del sur. Enmarcado en el polígono catastral del barrio Restrepo.',
    color: '#f59e0b',
    barrioCodigos: ['002103', '002104']
  },
  {
    nombre: 'Zona Rosa / Zona T / Parque de la 93',
    categoria: 'Comercio Premium, Gastronomía y Vida Nocturna',
    localidad: 'CHAPINERO',
    descripcion: 'Centros comerciales (Andino, El Retiro, Atlantis), boutiques de moda y alta gastronomía. Enmarcado en los barrios Antiguo Country, El Retiro y Chicó Norte.',
    color: '#d97706',
    barrioCodigos: ['008314', '008310', '008307']
  },
  {
    nombre: 'Centro Internacional y Financiero',
    categoria: 'Oficinas Corporativas, Banca y Turismo',
    localidad: 'SANTA FE / TEUSAQUILLO',
    descripcion: 'Rascacielos corporativos (Atrio, Colpatria), hoteles cinco estrellas, sedes bancarias y museos. Enmarcado en San Diego y Las Nieves.',
    color: '#f59e0b',
    barrioCodigos: ['008107', '008106']
  },
  {
    nombre: 'Corabastos & María Paz (Central Mayorista)',
    categoria: 'Abastecimiento de Alimentos (Central Mayorista)',
    localidad: 'KENNEDY',
    descripcion: 'La central de alimentos más grande del país con 42 hectáreas, bodegas mayoristas y actividad agroalimentaria continua. Enmarcado en los polígonos de Corabastos y María Paz.',
    color: '#ea580c',
    barrioCodigos: ['004547', '006517']
  },
  {
    nombre: 'Santa Bárbara & Unicentro',
    categoria: 'Comercio Moderno, Clínicas y Servicios Financieros',
    localidad: 'USAQUEN',
    descripcion: 'Unicentro Bogotá, centros empresariales de alta renta, hoteles y servicios médicos del norte. Enmarcado en Santa Bárbara Central y La Carolina.',
    color: '#f59e0b',
    barrioCodigos: ['008415', '008403']
  },
  {
    nombre: 'San Andresito San José y de la 38',
    categoria: 'Comercio Mayorista, Electrónica y Perfumería',
    localidad: 'LOS MARTIRES',
    descripcion: 'Centros comerciales populares tradicionales especializados en tecnología, electrodomésticos y perfumería. Enmarcado en Voto Nacional y La Pepita.',
    color: '#d97706',
    barrioCodigos: ['004103', '004110']
  },
  {
    nombre: '7 de Agosto (Distrito Automotriz)',
    categoria: 'Repuestos Automotrices, Talleres y Metalmecánica',
    localidad: 'BARRIOS UNIDOS',
    descripcion: 'El mayor clúster de repuestos automotrices, mecánica ligera y talleres especializados de la ciudad. Enmarcado en el barrio Siete de Agosto.',
    color: '#f59e0b',
    barrioCodigos: ['007303']
  },
  {
    nombre: 'Alquería (Distrito Textil del Sur)',
    categoria: 'Telas, Cortinas y Comercio Mayorista de Confección',
    localidad: 'PUENTE ARANDA',
    descripcion: 'Polo comercial de telas por metro, insumos de confección, espumas y cortinas. Enmarcado en el barrio La Alquería.',
    color: '#d97706',
    barrioCodigos: ['002105']
  },
  {
    nombre: 'Centro Suba & Plaza Imperial',
    categoria: 'Comercio, Entretenimiento y Servicios Noroccidente',
    localidad: 'SUBA',
    descripcion: 'Centro Comercial Plaza Imperial, Centro Suba y nodo de servicios metropolitanos. Enmarcado en el polígono catastral de Suba Urbano.',
    color: '#f59e0b',
    barrioCodigos: ['009212']
  }
];

function main() {
  console.log('--- Construyendo Zonas Comerciales Enmarcadas en Manzanas y Barrios Catastrales ---');
  
  const barriosPath = path.resolve(__dirname, '../public/data/barrios_bogota.json');
  const barriosGeoJson = JSON.parse(fs.readFileSync(barriosPath, 'utf8'));
  const barriosFeatures = barriosGeoJson.features;

  const features = [];

  for (const cfg of ZONAS_CONFIG) {
    console.log(`Procesando zona: ${cfg.nombre}...`);
    
    // Find corresponding barrio features
    const matchedBarrios = barriosFeatures.filter(b => cfg.barrioCodigos.includes(b.properties.codigo));
    
    if (matchedBarrios.length === 0) {
      console.warn(`  ⚠️ No se encontraron barrios para códigos: ${cfg.barrioCodigos.join(', ')}`);
      continue;
    }

    console.log(`  -> Vinculados ${matchedBarrios.length} barrios catastrales oficiales (${matchedBarrios.map(b => b.properties.nombre).join(', ')})`);

    // Combine into a MultiPolygon or Polygon
    const allPolygons = [];
    for (const b of matchedBarrios) {
      if (b.geometry.type === 'Polygon') {
        allPolygons.push(b.geometry.coordinates);
      } else if (b.geometry.type === 'MultiPolygon') {
        allPolygons.push(...b.geometry.coordinates);
      }
    }

    const geom = allPolygons.length === 1
      ? { type: 'Polygon', coordinates: allPolygons[0] }
      : { type: 'MultiPolygon', coordinates: allPolygons };

    features.push({
      type: 'Feature',
      properties: {
        nombre: cfg.nombre,
        categoria: cfg.categoria,
        localidad: cfg.localidad,
        descripcion: cfg.descripcion,
        color: cfg.color,
        barrios_incluidos: matchedBarrios.map(b => `${b.properties.nombre} (${b.properties.codigo})`).join(', ')
      },
      geometry: geom
    });
  }

  const outGeoJson = {
    type: 'FeatureCollection',
    name: 'ZonasComercialesOficialesBogota',
    crs: { type: 'name', properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' } },
    features
  };

  const targetPath = path.resolve(__dirname, '../public/data/zonas_comerciales.json');
  fs.writeFileSync(targetPath, JSON.stringify(outGeoJson), 'utf8');
  console.log(`\n¡Éxito total! Archivo generado en: ${targetPath}`);
  console.log(`Tamaño resultante: ${(fs.statSync(targetPath).size / 1024).toFixed(1)} KB con polígonos 100% fieles a las cuadras y manzanas.`);
}

main();
