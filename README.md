# 🗺️ Bogotá Amateur Map

Plataforma web geográfica, interactiva e intermodal de Bogotá D.C. desarrollada en **React + Vite + Leaflet**, que integra los **1.230 barrios y sectores catastrales oficiales**, las **20 localidades** del Distrito Capital, estratificación socioeconómica real, indicadores de seguridad y salud pública, y un **planificador de viajes intermodal exacto** (TransMilenio, Alimentadores, SITP Zonal y Ciclorrutas) con trazados reales sobre **OpenStreetMap**.

---

## 🌟 Características Principales

### 1. Cartografía Oficial y Barrios Catastrales
* **1.230 barrios y sectores catastrales** oficiales de **IDECA / Catastro Distrital (UAECD)** en formato GeoJSON georreferenciado (WGS84 EPSG:4326).
* **20 Localidades unificadas por color:** Todos los barrios pertenecientes a una misma localidad comparten una paleta cromática cohesiva para distinguir claramente las fronteras de la ciudad.
* **Estratificación socioeconómica real:** Cada barrio cuenta con su estrato auténtico según la Secretaría Distrital de Planeación (desde estratos 1 y 2 en bordes y laderas, hasta estrato 6 en sectores residenciales altos).
* **Hover interactivo inteligente:** Al pasar el cursor sobre cualquier barrio se despliega el nombre, localidad, estrato, nivel de riesgo y tasa de mortalidad, sin estorbar la navegación.
* **Búsqueda instantánea y filtros:** Filtrado en vivo por nombre de barrio, código catastral, localidad y tipo de suelo (urbano/rural).

---

### 2. Modos Temáticos (Coropletas Dinámicas)
Permite alternar la visualización del mapa entre 4 dimensiones socio-espaciales:
1. **Por Localidad:** Colores armónicos que diferencian las 20 localidades del Distrito.
2. **Nivel de Seguridad:** Semáforo de riesgo (*Bajo, Medio, Alto, Crítico*) basado en las estadísticas de la Secretaría Distrital de Seguridad, Convivencia y Justicia.
3. **Estrato Socioeconómico:** Gradiente desde estrato 1 (rojo/coral) hasta estrato 6 (índigo/violeta).
4. **Tasa de Mortalidad:** Indicadores demográficos de defunciones por cada 1.000 habitantes basados en datos de **SaluData**.

---

### 3. Capas de Infraestructura y Movilidad
* 🔴 **Troncales Operativas de TransMilenio:** 16 corredores troncales en funcionamiento (Autonorte, Suba, Calle 80, NQS Central, NQS Sur, Américas, Calle 26, Carrera 10, Caracas, etc.).
* 🚆 **Metro y Trenes de Cercanías:**
  * **Metro Línea 1 (En construcción):** Trazado exacto del viaducto elevado desde el Patio Taller de Bosa hasta la Calle 72.
  * **Metro Línea 2 (Proyectada subterránea):** Corredor hacia Suba y Engativá.
  * **Regiotram de Occidente:** Tren de cercanías regional en construcción conectando Facatativá, Madrid, Mosquera y Funza con el centro de Bogotá.
  * **Regiotram del Norte:** Corredor férreo proyectado por la Carrera 9na hacia Chía y Zipaquirá.
* 🚲 **Red de Ciclorrutas de Alta Precisión:** 14 corredores protegidos principales trazados con snapping milimétrico sobre la malla vial de OpenStreetMap (más de 11.000 nodos viales que siguen fielmente las curvas, andenes y avenidas sin cortar casas: Carrera Séptima, Calle 26 El Dorado, Boyacá, Ciudad de Cali, Américas, Calle 80, NQS, Canal Salitre, Alameda El Porvenir, Primero de Mayo, Carrera 15, Suba, Autonorte y Av. Guayacanes).
* 🏷️ **Búsqueda Dual (Catastro Oficial + Nombres Populares y Comerciales):** Integración de alias comerciales y populares (ej: *Bosconia* para *El Vergel Oriental*, *Unicentro* para *Santa Bárbara Central*, *Colina Campestre* para *El Plan*, *Zona Rosa / Zona T* para *Antiguo Country*), permitiendo buscar y navegar la ciudad tanto por su censo oficial como por su nombre cotidiano.
* 🚏 **Soporte de Estaciones Intermedias con Alimentación:** Reconocimiento de hubs emblemáticos como **Banderas** (con sus 6 rutas alimentadoras oficiales: *8-2 Castilla, 8-1 Kennedy Central, 8-3 Castilla Real, 8-4 Corabastos, 8-5 Tintal y 8-6 Timiza*) y **General Santander** (*12-1 Fátima*).
* 🚧 **Grandes Obras IDU con Trazado Vial Milimétrico:** 6 megaobras de infraestructura trazadas con snapping sobre la red vial real (Troncal Av. 68 de 17 km con 1.284 nodos, Ampliación Nueva Calle 13 con 1.017 nodos, Viaducto Metro Línea 1 con 1.451 nodos, Extensión Caracas Sur, Av. Guayacanes y Cali Sur), eliminando vectores rectos sobre techos.
* 🛍️ **Zonas Comerciales Enmarcadas en Manzanas Catastrales:** 10 grandes distritos comerciales delimitados estrictamente según los límites de los barrios y manzanas oficiales (San Victorino en La Capuchina/Santa Inés, Restrepo en Restrepo Occidental, Zona Rosa/T en Antiguo Country/El Retiro/Chicó Norte, Corabastos y María Paz en sus polígonos mayoristas, Unicentro en Santa Bárbara Central, San Andresito en Voto Nacional/La Pepita, 7 de Agosto en Siete de Agosto, y Alquería en La Alquería), reemplazando cajas sobrepuestas por cartografía barrial exacta.

---

### 4. Planificador de Rutas Intermodal ("¿Cómo llegar?")
Enrutamiento punto a punto con trazados ajustados 100% a la malla vial y ciclorrutas de OpenStreetMap vía **OSRM (Open Source Routing Machine)**:
* **Marcación exacta en el mapa:** Botones para fijar punto de origen (A) y destino (B) haciendo clic en cualquier calle, con cursor de precisión en cruz (`crosshair`), opacidad reducida en polígonos para máxima visibilidad vial y geocodificación inversa automática.
* **Cero rutas por obras o troncales no construidas:** El planificador viaja exclusivamente por las troncales operativas activas de TransMilenio conectando en estaciones de transbordo reales (*Escuela Militar, Ricaurte, Av. Jiménez, La Castellana, CAD, Bicentenario*), evitando vías en obra como la Av. 68.
* **Servicios Troncales Reales:** Utiliza rutas oficiales vigentes (*B10, B12, B27, C15, C17, C19, C25, C30, D10, D22, F19, F28, G12, G43, K10, K43, L10, L18, Rutas Fáciles 1 a 8*).
* **Priorización de Alimentadores Barriales:** Si la estación está a más de 250 metros, prioriza el bus alimentador verde hacia el Portal con transbordo a \$0 COP.
* **Paradas y Paraderos Detallados:** Cada tramo (Alimentador, Troncal TransMilenio y SITP Zonal) incluye un menú desplegable interactivo con la lista de paraderos y estaciones intermedias.
* **4 Modos de Transporte Simultáneos:**
  1. *TransMilenio Troncal* (Acceso + Troncal + Caminata final).
  2. *Multimodal* (Alimentador barrial verde + Troncal + Conexión).
  3. *En Bicicleta / Ciclorruta* (Distancia, tiempo, calorías quemadas y kg de CO₂ ahorrados).
  4. *SITP Zonal (Bus Azul)* (Rutas reales como C115, C129, 599, P500, F401, K303 con paraderos de calle).

---

## ⚡ Optimización de Rendimiento y Arquitectura

Para evitar saturar la memoria del navegador con más de medio millón de coordenadas, se implementaron optimizaciones técnicas de alto rendimiento:

1. **Simplificación Geométrica de Vértices (Algoritmo Douglas-Peucker):**
   * Vértices de barrios reducidos de **444.221 a 107.283** (reducción del **76%**).
   * Vértices de localidades reducidos de **57.840 a 12.051** (reducción del **79%**).
   * Peso del GeoJSON de barrios reducido de **8.83 MB a 2.48 MB** (reducción total del **72%** en carga de red).
   * Tolerancia de simplificación calibrada en `0.00002°` (~2 metros), lo que mantiene una fidelidad visual perfecta a escala de calle.
2. **Motor Gráfico en Canvas 2D (`preferCanvas: true`):**
   * En lugar de insertar 1.230 elementos SVG en el DOM, Leaflet renderiza todos los polígonos en un único buffer Canvas acelerado por GPU, manteniendo **60 FPS constantes** en paneo y zoom.
3. **Carga Diferida (Lazy Loading):**
   * Se descargan en el arranque únicamente los barrios, localidades y estaciones.
   * Las capas secundarias (Metro, Ciclovías, Obras, Zonas comerciales) se cargan en segundo plano de manera no bloqueante.

---

## 🛠️ Tecnologías Utilizadas

* **Frontend:** React 18, Vite 5.
* **Cartografía & GIS:** Leaflet 1.9, OpenStreetMap Base Tiles, CyclOSM, Humanitarian OSM, Esri World Imagery.
* **Enrutamiento y Geocodificación:** OSRM Public API (perfiles `cycling`, `driving`, `foot`), Photon Geocoder (Komoot / OSM).
* **Iconografía & Estilos:** Lucide React, CSS Moderno con variables y modo oscuro traslúcido (*glassmorphism*).

---

## 💻 Instalación y Ejecución Local

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/TU_USUARIO/bogota-amateur-map.git
   cd bogota-amateur-map
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Iniciar el servidor de desarrollo:**
   ```bash
   npm run dev
   ```
   Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

4. **Compilar para producción:**
   ```bash
   npm run build
   ```
   Genera el bundle optimizado en la carpeta `dist/`.

---

## 📡 Fuentes de Datos Públicos y Créditos

* **Límites de Barrios y Sectores Catastrales:** [Catastro Distrital / IDECA (UAECD)](https://www.ideca.gov.co/).
* **Mapa Base y Nomenclatura Vial:** [OpenStreetMap Contributors](https://www.openstreetmap.org/).
* **Red de Transporte:** [TransMilenio S.A.](https://www.transmilenio.gov.co/) & Portal de Datos Abiertos de Bogotá.
* **Indicadores Epidemiológicos:** [SaluData - Secretaría Distrital de Salud](https://saludata.saludcapital.gov.co/).
* **Seguridad y Convivencia:** [Secretaría Distrital de Seguridad](https://scj.gov.co/).
* **Obras de Infraestructura:** [Instituto de Desarrollo Urbano (IDU)](https://www.idu.gov.co/).
* **Proyectos Férreos:** Empresa Metro de Bogotá & Empresa Férrea Regional (EFR).

---

## 📄 Licencia

Distribuido bajo la licencia MIT. Consulta el archivo `LICENSE` para más información.
