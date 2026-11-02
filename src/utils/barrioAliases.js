// Mapeo oficial de Sectores Catastrales a Nombres Populares y Comerciales (Google Maps / Urbanizaciones)
// Permite buscar barrios tanto por su nombre catastral oficial como por el nombre comercial que usa Google o la gente.

export const BARRIO_POPULAR_ALIASES = {
  // KENNEDY
  '006529': { oficial: 'EL VERGEL ORIENTAL', populares: ['Bosconia', 'Urbanización Bosconia', 'Castilla La Nueva', 'Bavaria'] },
  '006514': { oficial: 'VERGEL OCCIDENTAL', populares: ['Tintal Central', 'El Tintal', 'Castilla Occidental'] },
  '006528': { oficial: 'EL VERGEL', populares: ['Castilla', 'Pío XII', 'La Alsacia'] },
  '006507': { oficial: 'NUEVO TECHO', populares: ['Techo', 'Plaza de las Américas', 'Mundo Aventura'] },
  '006511': { oficial: 'CALANDAIMA', populares: ['Tintal Sur', 'Las Flores'] },
  '006509': { oficial: 'PATIO BONITO', populares: ['Tintalito', 'Dindalito', 'Bellavista'] },
  '006501': { oficial: 'MARSELLA', populares: ['Nueva Marsella', 'Las Américas'] },
  '006502': { oficial: 'MANDALAY', populares: ['Américas', 'Baviera'] },
  '006503': { oficial: 'TIMIZA', populares: ['Parque Timiza', 'La Chucua'] },

  // USAQUÉN
  '001201': { oficial: 'SANTA BARBARA CENTRAL', populares: ['Unicentro', 'Santa Bárbara', 'Hacienda Santa Bárbara'] },
  '001203': { oficial: 'LA CAROLINA', populares: ['Country Club', 'Unicentro Norte'] },
  '001207': { oficial: 'CHICO NORTE', populares: ['Chicó', 'Parque de la 93', 'Virrey'] },
  '001208': { oficial: 'CHICO NORTE II SECTOR', populares: ['Chicó', 'Parque El Virrey'] },
  '001209': { oficial: 'CHICO NORTE III SECTOR', populares: ['Chicó Alto', 'Calle 100', 'Cantón Norte'] },
  '001104': { oficial: 'CEDRITOS', populares: ['Los Cedros', 'Cedritos Calle 140'] },
  '001105': { oficial: 'CONTADOR', populares: ['El Contador', 'Calle 134'] },
  '001108': { oficial: 'TOBERIN', populares: ['Zona Comercial Toberín', 'Calle 166'] },
  '001112': { oficial: 'EL CODITO', populares: ['Mirador del Norte', 'San Antonio Alta'] },
  '001101': { oficial: 'SANTA ANA', populares: ['Santa Ana Oriental', 'Bella Suiza'] },

  // CHAPINERO
  '002101': { oficial: 'ANTIGUO COUNTRY', populares: ['Zona Rosa', 'Zona T', 'Calle 85', 'El Retiro'] },
  '002102': { oficial: 'EL RETIRO', populares: ['Zona T', 'Centro Comercial Andino'] },
  '002104': { oficial: 'EL NOGAL', populares: ['Rosales', 'Club El Nogal'] },
  '002105': { oficial: 'ROSALES', populares: ['Rosales', 'Cerros Orientales', 'Quebrada La Vieja'] },
  '002106': { oficial: 'LA CABRERA', populares: ['Zona G', 'Carrera 7ma'] },
  '002108': { oficial: 'QUINTA CAMACHO', populares: ['Zona G Gastronómica', 'Calle 72'] },
  '002202': { oficial: 'CHAPINERO CENTRAL', populares: ['Chapinero', 'Plaza de Lourdes', 'Calle 63'] },
  '002207': { oficial: 'PARDO RUBIO', populares: ['Mariscal Sucre', 'Laderas Chapinero'] },

  // SUBA
  '001110': { oficial: 'SAN JOSE DE BAVARIA', populares: ['Bavaria Suba', 'Guaymaral'] },
  '011106': { oficial: 'EL PLAN', populares: ['Colina Campestre', 'La Colina'] },
  '011107': { oficial: 'MAZUREN', populares: ['Colina Campestre Norte', 'Mazurén 152'] },
  '011102': { oficial: 'PASADENA', populares: ['Pasadena', 'Calle 100'] },
  '011103': { oficial: 'ALHAMBRA', populares: ['La Alhambra', 'Calle 116'] },
  '011104': { oficial: 'BATAN', populares: ['El Batán', 'Calle 127'] },
  '011101': { oficial: 'NIZA SUR', populares: ['Niza', 'Humedal Córdoba'] },
  '011201': { oficial: 'EL RINCON', populares: ['Rincón de Suba', 'Aures'] },
  '011202': { oficial: 'LA GAITANA', populares: ['Gaitana', 'Portal Suba'] },
  '011203': { oficial: 'TIBABUYES', populares: ['Lisboa', 'Bilbao', 'Compartir Suba'] },

  // TEUSAQUILLO & FONTIBÓN
  '007101': { oficial: 'CIUDAD SALITRE ORIENTAL', populares: ['Ciudad Salitre', 'Gran Estación', 'CAN'] },
  '010101': { oficial: 'CIUDAD SALITRE OCCIDENTAL', populares: ['Salitre Plaza', 'Terminal de Transportes'] },
  '010102': { oficial: 'MODELIA', populares: ['Modelia', 'Hayuelos', 'Carlos Lleras'] },
  '010103': { oficial: 'CAPELLANIA', populares: ['Hayuelos', 'Centro Comercial Hayuelos'] },
  '007202': { oficial: 'GALERIAS', populares: ['Galerías', 'Estadio El Campín'] },
  '007203': { oficial: 'LA SOLEDAD', populares: ['Park Way', 'Soledad'] },
  '008101': { oficial: 'POLO CLUB', populares: ['El Polo', 'Calle 80'] },
  '008102': { oficial: 'LA CASTELLANA', populares: ['Castellana', 'Teatro Nacional'] }
};

// Helper: Obtener alias popular dado un código catastral o nombre
export function getBarrioPopularAlias(codigo, nombre = '') {
  if (codigo && BARRIO_POPULAR_ALIASES[codigo]) {
    return BARRIO_POPULAR_ALIASES[codigo].populares.join(' / ');
  }
  // Búsqueda por nombre
  const cleanNombre = (nombre || '').toUpperCase().trim();
  for (const entry of Object.values(BARRIO_POPULAR_ALIASES)) {
    if (entry.oficial === cleanNombre) {
      return entry.populares.join(' / ');
    }
  }
  return null;
}
