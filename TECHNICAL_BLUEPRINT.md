# DOCUMENTO DE ESPECIFICACIÓN TÉCNICA Y FUNCIONAL (TECHNICAL BLUEPRINT)
## Sistema de Auditoría y Optimización de Facturas Eléctricas PVPC 2.0TD en España

Este documento constituye una especificación técnica de nivel de arquitectura ("Clone Blueprint") diseñada para guiar la reconstrucción exacta y completa del sistema desde cero. El sistema permite auditar, calcular, simular, escanear y comparar facturas de electricidad españolas de la tarifa regulada **PVPC 2.0TD** frente a ofertas del mercado libre usando inteligencia artificial multi-modal y motores de búsqueda en tiempo real.

---

## 1. STACK TECNOLÓGICO Y DEPENDENCIAS

El sistema está construido bajo una arquitectura full-stack unificada en TypeScript utilizando Node.js en el backend y React en el frontend.

### 1.1. Core Runtime y Compilación
*   **Runtime de Ejecución:** Node.js v18+ o v20+.
*   **Framework de Empaquetado y Dev:** Vite v5+ con configuración SPA para el cliente.
*   **Compilador de Producción Backend:** `esbuild` para compilar el archivo TypeScript del servidor (`server.ts`) a un único archivo bundled CommonJS (`dist/server.cjs`) para un arranque en frío ultrarrápido en contenedores Cloud Run.
*   **Lenguaje de Programación:** TypeScript v5+ en modo estricto.

### 1.2. Servidor Backend
*   **Framework Web:** Express v4+.
*   **Motor de Compilación TypeScript en Dev:** `tsx` (TypeScript Execute) para ejecutar el servidor directamente en desarrollo sin fase de compilación explícita.
*   **SDK de Inteligencia Artificial:** `@google/genai` (SDK oficial unificado de Google GenAI, prefiriendo modelos Gemini 3.5).
*   **Capa de Variables de Entorno:** `dotenv` para la carga segura de secretos.

### 1.3. Cliente Frontend (SPA)
*   **Biblioteca Core UI:** React v18+.
*   **Diseño y Estilos:** Tailwind CSS v3+ o v4 (utilizando `@import "tailwindcss";` global, adaptando variables y selectores en tiempo de compilación).
*   **Librería de Iconos:** `lucide-react` para mantener una iconografía coherente sin SVG embebidos manualmente.
*   **Animaciones y Transiciones:** `motion` (importado de `motion/react`) para gestionar layouts fluidos y animaciones de modal.
*   **Visualización de Datos y Gráficos:** `recharts` o `d3` (utilizados para pintar diagramas de desglose de costes y simulaciones históricas).
*   **Servicio de Autenticación y Base de Datos en la Nube:** Firebase SDK v10 (con soporte para Firebase Auth mediante Google Login y Firestore Database para la persistencia).

---

## 2. ARQUITECTURA DEL SISTEMA Y ESTRUCTURA DE DIRECTORIOS

El sistema se organiza bajo un enfoque modular desacoplado. El frontend se encarga estrictamente de la presentación, validación básica del formulario e interactividad en tiempo real. El backend expone endpoints de servicio que actúan como pasarelas hacia APIs de terceros y el motor de Gemini.

### 2.1. Estructura de Archivos del Proyecto
```text
├── package.json                   # Dependencias y scripts de construcción y arranque
├── tsconfig.json                  # Configuración estricta de TypeScript
├── vite.config.ts                 # Configuración del servidor de desarrollo Vite y proxy de APIs
├── server.ts                      # Entrypoint de Express con endpoints de cálculo, OCR y chatbot
├── .env.example                   # Declaración de variables de entorno requeridas
├── index.html                     # Entrypoint del DOM para la SPA
└── src/
    ├── main.tsx                   # Punto de hidratación de React
    ├── index.css                  # Hoja de estilos global e importación de Tailwind CSS
    ├── App.tsx                    # Componente raíz con el Dashboard principal, layouts y lógica de modals
    ├── types.ts                   # Modelos de datos compartidos, interfaces y contratos de API
    ├── utils.ts                   # Constantes de PVPC oficiales, perfiles demo y motor de cálculo determinista
    └── components/
        ├── Scanner.tsx            # Dropzone drag-and-drop para PDF/Imágenes con loading secuencial de OCR
        ├── ChatBot.tsx            # Chat de IA conversacional (Modos: Equilibrado, Rápido, Reflexión, Web)
        ├── MessageRenderer.tsx    # Intérprete seguro de Markdown con bloqueo estricto de HTML y ecuaciones LaTeX
        ├── BillChart.tsx          # Gráfico de tarta/donas (Doughnut) de Recharts para el desglose de costes
        ├── ComparisonChart.tsx    # Gráfico de barras apiladas o líneas para comparar PVPC frente a mercado
        ├── BillOptimizer.tsx      # Panel interactivo de auditoría y recomendaciones de potencia y consumo
        └── CustomDatePicker.tsx   # Selector de fechas adaptativo
```

### 2.2. Responsabilidad de Módulos Críticos
*   **`server.ts`:**
    *   Habilita la subida de imágenes pesadas de facturas aumentando el límite del parser JSON a `50mb`.
    *   Configura las cabeceras de proxy y expone rutas API unificadas: `/api/audit/pvpc` (REE/Esiós API), `/api/audit/compare-market` (Google Search Grounding de tarifas), `/api/audit/scan-bill` (OCR multi-modal), `/api/gemini/chat` (Chatbot Asesor).
*   **`src/App.tsx`:**
    *   Gestiona el estado unificado de la factura cargada (inputs de usuario), estado de autenticación de Firebase, sincronización con Firestore para historiales y chats, y la navegación adaptativa responsive.
*   **`src/utils.ts`:**
    *   Centraliza el motor de cálculo matemático determinista de la factura PVPC 2.0TD.
*   **`src/components/MessageRenderer.tsx`:**
    *   Asegura que el Markdown renderizado por el chatbot no rompa la interfaz de la aplicación, desactivando específicamente la interpretación de etiquetas HTML (prevención de XSS y rotura de layout) y anulando fórmulas LaTeX que generen símbolos de dólar sin renderizar.

---

## 3. MODELOS DE DATOS Y ESTADO (DATA MODELS & STATE)

### 3.1. Modelos de Datos en TypeScript (`src/types.ts`)

#### 3.1.1. `BillData` (Estructura de entrada de la Calculadora)
Representa los parámetros completos de facturación que requiere el simulador.
```typescript
export interface BillData {
  fechaInicio: string;         // Fecha en formato YYYY-MM-DD
  fechaFin: string;            // Fecha en formato YYYY-MM-DD
  presupuesto: number;         // Límite de gasto mensual definido por el usuario (euros)
  
  // Potencia contratada por periodos
  kwPunta: number;             // Potencia contratada en periodo punta (ej: 4.4 kW)
  kwValle: number;             // Potencia contratada en periodo valle (ej: 4.4 kW)
  
  // Precios regulados de potencia (fijados por el gobierno, €/kW/año)
  precioMargen: number;        // Margen de comercialización (ej: 3.113 €/kW/año)
  precioKwPunta: number;       // Peaje potencia punta (ej: 27.704413 €/kW/año)
  precioKwValle: number;       // Peaje potencia valle (ej: 0.725423 €/kW/año)
  
  // Consumo de energía por periodos de discriminación horaria (kWh)
  kwhPunta: number;            // Consumo activo medido en periodo punta
  kwhLlano: number;            // Consumo activo medido en periodo llano
  kwhValle: number;            // Consumo activo medido en periodo valle
  
  // Peajes de acceso y cargos regulados del consumo (€/kWh)
  precioKwhPunta: number;      // Peaje consumo punta
  precioKwhLlano: number;      // Peaje consumo llano
  precioKwhValle: number;      // Peaje consumo valle
  
  // Coste de adquisición de energía variable en el mercado mayorista (Pool, €/kWh)
  costeEnergiaVariable: number; // Coste variable genérico aplicable si no hay desglose
  costeEnergiaPunta: number;    // Coste real energía punta
  costeEnergiaLlano: number;    // Coste real energía llano
  costeEnergiaValle: number;    // Coste real energía valle
  
  // Conceptos regulados y fijos
  alqContador: number;         // Alquiler del contador por día (€/día, ej: 0.026630)
  bonoSocial: number;          // Cargo fijo por financiación del bono social (€/periodo, ej: 0.60)
  
  // Impuestos (%)
  iee: number;                 // Impuesto Especial sobre la Electricidad (ej: 5.11269632%)
  iva: number;                 // IVA aplicado (generalmente 21% o reducido 10%)
}
```

#### 3.1.2. `BillResults` (Estructura de salida del motor de cálculo)
```typescript
export interface BillResults {
  dias: number;                // Número de días del periodo calculado
  totalFijo: number;           // Término de potencia total acumulado (€)
  totalVariable: number;       // Término de energía total (peajes + coste mercado) (€)
  totalPeajes: number;         // Subtotal correspondiente a peajes y cargos de consumo (€)
  totalEnergia: number;        // Subtotal correspondiente a la adquisición de energía (€)
  totalIee: number;            // Importe exacto del Impuesto de Electricidad (IEE) (€)
  totalRegulados: number;      // Sumatorio de alquiler de contador y financiación de bono social (€)
  totalIva: number;            // Importe total correspondiente al IVA (€)
  totalFactura: number;        // Importe total final de la factura (€)
  alertaPresupuesto: boolean;  // True si el totalFactura supera el presupuesto asignado
}
```

#### 3.1.3. `HistoryEntry` (Historial persistente)
Distingue entre simulaciones de prueba y facturas reales guardadas.
```typescript
export interface HistoryEntry {
  id: string;                  // UUID o identificador aleatorio
  dateStr: string;             // Fecha de creación o de registro en formato DD/MM/YYYY
  timestamp: number;           // Fecha UNIX milisegundos
  billData: BillData;          // Estado de entrada
  results: BillResults;        // Estado de salida calculado
  tipo: 'simulacion' | 'oficial';
  mesFacturacion?: string;     // Obligatorio para tipo 'oficial' (ej: "Julio 2026")
}
```

#### 3.1.4. `ChatMessage` (Historial de conversación)
```typescript
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;             // Contenido del mensaje en Markdown
  citations?: Array<{ title: string; url: string }>; // Fuentes de Google Search Grounding
  timestamp: string;           // Formato de hora HH:MM
  sourceFileId?: string;       // ID de la factura escaneada asociada a este mensaje (opcional)
  imageUrl?: string;           // Imagen en miniatura si el usuario subió una oferta
}
```

### 3.2. Gestión del Estado e Integración de Firebase (Firestore)
La aplicación maneja un sistema de estado híbrido:
1.  **Estado Local (React):** Estado activo en memoria para el formulario, los modals, visualización de pestañas y carga de UI.
2.  **Sincronización en la Nube (Firestore):** Si el usuario se autentica con Google, los estados del historial de simulaciones (`history`), facturas escaneadas (`sources`) e historial de chats (`chats`) se guardan directamente en colecciones anidadas bajo el documento del usuario:
    *   `/users/{userId}`: Datos del perfil del usuario.
    *   `/users/{userId}/history/{entryId}`: Documentos individuales de simulaciones/oficiales.
    *   `/users/{userId}/sources/{sourceId}`: Documentos de facturas escaneadas (nombre, datos extraídos OCR, análisis amigable de IA).
    *   `/users/{userId}/chats/{messageId}`: Historial del chatbot para mantener el contexto de la conversación persistente.
3.  **Persistencia Local Alternativa (Offline/Modo sin Nube):** Si Firebase no está configurado o el usuario decide no entrar con cuenta, el sistema realiza automáticamente un fallback transparente de persistencia escribiendo en el `localStorage` del navegador bajo las claves `pvpc_history`, `pvpc_sources` y `pvpc_chats`.

---

## 4. FUNCIONALIDADES CORE Y LÓGICA DE NEGOCIO (BUSINESS LOGIC)

### 4.1. El Algoritmo de Cálculo de Factura (`src/utils.ts -> calcularFactura`)
La lógica matemática debe reproducir con exactitud el desglose oficial de la tarifa regulada en España PVPC 2.0TD:

#### 1. Cálculo de Días del Periodo
Establece el número de días transcurridos entre la fecha de inicio y la fecha de fin:
$$\text{Días} = \max\left(1, \left\lceil \frac{\text{fechaFin} - \text{fechaInicio}}{24 \times 3600 \times 1000} \right\rceil\right)$$

#### 2. Término Fijo (Término de Potencia)
Es un cargo prorrateado diario que remunera la potencia contratada por el usuario en ambos periodos (Punta y Valle) más el margen comercial de la distribuidora (que se asocia a la potencia contratada en punta):
$$\text{Coste Punta Fijo} = \frac{\text{kwPunta} \times \text{precioKwPunta} \times \text{Días}}{365}$$
$$\text{Coste Valle Fijo} = \frac{\text{kwValle} \times \text{precioKwValle} \times \text{Días}}{365}$$
$$\text{Margen Comercializador} = \frac{\text{kwPunta} \times \text{precioMargen} \times \text{Días}}{365}$$
$$\text{Total Fijo} = \text{Coste Punta Fijo} + \text{Coste Valle Fijo} + \text{Margen Comercializador}$$

#### 3. Término Variable (Término de Energía)
Se divide matemáticamente en dos subconceptos independientes:
*   **Peajes de Acceso y Cargos de Distribución:** Se calculan multiplicando el consumo de cada franja horaria por su peaje regulado correspondiente:
    $$\text{Total Peajes} = (\text{kwhPunta} \times \text{precioKwhPunta}) + (\text{kwhLlano} \times \text{precioKwhLlano}) + (\text{kwhValle} \times \text{precioKwhValle})$$
*   **Coste del Mercado de la Energía (Pool mayorista):** Multiplica el consumo consumido en cada franja por el precio de coste real de adquisición horaria de ese periodo (con fallback al precio variable ponderado medio):
    $$\text{Total Energía} = (\text{kwhPunta} \times \text{costeEnergiaPunta}) + (\text{kwhLlano} \times \text{costeEnergiaLlano}) + (\text{kwhValle} \times \text{costeEnergiaValle})$$
*   El sumatorio determina el coste de la energía total:
    $$\text{Total Variable} = \text{Total Peajes} + \text{Total Energía}$$

#### 4. Conceptos Regulados
$$\text{Total Regulados} = \text{bonoSocial} + (\text{alqContador} \times \text{Días})$$

#### 5. Impuesto Especial sobre la Electricidad (IEE)
Se aplica sobre la suma del Término Fijo y el Término Variable:
$$\text{Total Iee} = (\text{Total Fijo} + \text{Total Variable}) \times \frac{\text{iee}}{100}$$

#### 6. Impuesto sobre el Valor Añadido (IVA)
Se aplica sobre la Base Imponible total (suma de energía, potencia, IEE y conceptos regulados):
$$\text{Base Imponible} = \text{Total Fijo} + \text{Total Variable} + \text{Total Iee} + \text{Total Regulados}$$
$$\text{Total Iva} = \text{Base Imponible} \times \frac{\text{iva}}{100}$$

#### 7. Importe Total de la Factura
$$\text{Total Factura} = \text{Base Imponible} + \text{Total Iva}$$

*Todas las operaciones intermedias se redondean para evitar problemas de precisión flotante utilizando `.toFixed(4)`, y el total de la factura se devuelve a dos decimales (`.toFixed(2)`).*

---

### 4.2. Estrategia de Triple Capa de Respaldo para Precios Reales PVPC (`server.ts -> /api/audit/pvpc`)
Para garantizar que el usuario pueda auditar su factura con los precios horarios del mercado mayorista (pool) reales de los días seleccionados, el servidor backend implementa un mecanismo resiliente de tres capas jerárquicas:

```text
┌─────────────────────────────────────────────────────────┐
│        CAPA 1: Llamada Directa a API ESIOS (REE)        │
└────────────────────────────┬────────────────────────────┘
                             │
                      [¿Fallo de Red?]
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│       CAPA 2: Gemini Search Grounding en la Web         │
└────────────────────────────┬────────────────────────────┘
                             │
                     [¿Límite de Cuota?]
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│       CAPA 3: Modelo Algorítmico Estacional PVPC        │
└─────────────────────────────────────────────────────────┘
```

1.  **Capa 1: Conexión con ESIOS (API de Red Eléctrica de España):**
    *   Genera una llamada al indicador `1013` (Precios horarios del PVPC para España) en el endpoint público de Red Eléctrica:
        `https://api.ree.es/valdemoro/v1/providers/esios/indicators/1013?start_date={fechaInicio}T00:00&end_date={fechaFin}T23:59`
    *   Mapea cada registro horario de la API según las reglas oficiales de cambio horario peninsular español en tres periodos (Punta, Llano, Valle):
        *   **Sábados, Domingos y festivos nacionales:** Todas las horas son periodo **Valle** (P3).
        *   **Días laborables (Lunes a Viernes):**
            *   **Valle (P3):** De 00:00 a 08:00.
            *   **Punta (P1):** De 10:00 a 14:00 y de 18:00 a 22:00.
            *   **Llano (P2):** Resto de horas (de 08:00 a 10:00, de 14:00 a 18:00 y de 22:00 a 24:00).
    *   Calcula el coste de energía neto para cada periodo restando los peajes fijos de distribución aplicados al PVPC para obtener el coste puro de adquisición del pool.
    *   Dispone de un timeout forzado de 6 segundos para evitar colgar la experiencia de usuario.
2.  **Capa 2: Respaldo Inteligente mediante Gemini Search Grounding:**
    *   Si la API oficial de REE está caída o bloquea la IP, el servidor invoca a Gemini utilizando la herramienta `googleSearch`.
    *   El modelo busca en directo los precios históricos o previstos del PVPC para las fechas solicitadas.
    *   Aplica un esquema JSON estricto (`responseSchema`) para extraer los precios de los tres periodos y la explicación del método junto con las fuentes/URLs consultadas.
3.  **Capa 3: Modelo Algorítmico Estacional Determinista (Respaldo Máximo Offline):**
    *   Si los servidores de Google están saturados o no hay conexión exterior, el sistema ejecuta un algoritmo matemático determinista e inmediato.
    *   Este algoritmo calcula las tarifas mensuales promedio esperadas aplicando factores de estacionalidad históricos en España (ej: precios caros en Enero del 1.15x y Julio del 1.18x por extremos climatológicos; precios baratos en Abril del 0.80x por alta generación solar y viento).
    *   Añade un ruido sinusoidal matemático e inocuo basado en el día y el mes como semilla (`seed`) para crear una simulación de precios realista y evitar la visualización de líneas totalmente planas en los desgloses del gráfico.

---

### 4.3. Motor de Escaneo OCR Multi-modal de Facturas (`server.ts -> /api/audit/scan-bill`)
Permite procesar archivos PNG, JPG o PDF de forma directa enviando la imagen en Base64 al modelo Gemini de Google con un esquema de respuesta estructurado para poblar los campos del simulador de forma inmediata.

#### 4.3.1. Flujo Técnico del Scanner
1.  **Conversión:** El cliente lee el archivo local seleccionado por el usuario y lo convierte a formato Base64 mediante un `FileReader` de JS.
2.  **Petición Backend:** Envía un JSON con `{ image: "base64...", mimeType: "image/png" }` a la ruta `/api/audit/scan-bill`.
3.  **Evaluación de Modelos:**
    *   **Modelo Principal:** Invoca a `gemini-3.5-flash` pasándole las instrucciones de análisis y exigiendo un esquema de salida JSON estructurado.
    *   **Modelo de Fallback:** Si se supera el límite de cuota, reintenta con `gemini-3.1-flash-lite`.
    *   **Plantilla sin Conexión:** Si el servicio de IA se encuentra totalmente inalcanzable, responde con un objeto de factura simulado por defecto, informando al usuario en la explicación que el motor de imagen está saturado, pero facilitando datos promedio listos para su edición manual.
4.  **Esquema de Respuesta Requerido (JSON):**
    *   `fechaInicio` (formato `YYYY-MM-DD`).
    *   `fechaFin` (formato `YYYY-MM-DD`).
    *   `kwPunta` (número).
    *   `kwValle` (número).
    *   `kwhPunta`, `kwhLlano`, `kwhValle` (números de consumos fraccionados).
    *   `costeTotal` (número total cobrado).
    *   `esPVPC` (booleano: `true` si detecta mercado regulado, `false` si es mercado libre).
    *   `explicacion` (texto en español explicativo de lo leído y observaciones iniciales de auditoría).

---

### 4.4. Sistema de Chat Conversacional de Energía (`server.ts -> /api/gemini/chat`)
Este endpoint de chat implementa un flujo inteligente multi-estado. Su objetivo es actuar como un auditor energético personal ("GemProgramador Luz").

#### 4.4.1. Modos de Operación del Chatbot
El usuario puede cambiar el modo de razonamiento en la interfaz antes de enviar su mensaje:
*   `normal` / **Equilibrado:** Modelo estándar rápido de Gemini para consultas cotidianas.
*   `fast` / **Rápido:** Respuestas directas, optimizadas en longitud de caracteres y baja latencia.
*   `thinking` / **Reflexión:** Configura un alto nivel de razonamiento analítico para desglosar cálculos sumamente enrevesados o balances de coste energético de alta complejidad.
*   `grounded` / **Web:** Activa la herramienta `googleSearch` de Gemini para contrastar tarifas vigentes del mercado libre u ofertas competitivas encontradas en directo en las páginas de las principales comercializadoras españolas.

#### 4.4.2. Inyección Dinámica de Contexto
Cada mensaje que viaja del cliente al servidor de chat va acompañado del estado completo del simulador activo y la base de datos local del usuario. En cada turno, el backend añade de forma silenciosa al `systemInstruction` de la sesión:
1.  **Datos en tiempo real de la simulación activa:** consumos de la calculadora, peajes, potencias y el coste final resultante calculado por el frontend.
2.  **Historial de facturas oficiales guardadas:** El bot sabe qué meses guardó el usuario en su base de datos para responder a peticiones comparativas (ej: *"¿Por qué pagué más en Julio 2026 que en Mayo 2026?"*).
3.  **Archivos de factura subidos por OCR:** El bot tiene acceso a los textos explicativos y datos extraídos de todos los documentos escaneados por el usuario para poder cruzarlos con la calculadora activa.

---

## 5. FLUJOS DE USUARIO (USER FLOWS)

### 5.1. Escaneo de Factura y Simulación Automática
```text
[Usuario] Arrastra captura de factura -> [Scanner.tsx] Convierte a Base64 -> Envia a /api/audit/scan-bill
                                                                                    │
[App.tsx] Muestra Banner Flotante con Datos Extraídos <─── [API Backend] Responde JSON con Datos Extraídos
  │
  ├─► [Botón "Cargar en Calculadora"] ──► Rellena formulario lateral de forma automática y recalcula
  └─► [Botón "Descartar"] ─────────────► Cierra banner flotante manteniendo estado previo
```

### 5.2. Comparador de Mercado Libre y Auditoría de Potencia
1.  El usuario introduce sus consumos en el formulario principal (o los importa de su factura escaneada).
2.  Hace clic en la sección **Optimizar y Comparar**.
3.  El sistema llama a `/api/audit/compare-market` enviando los valores promedio de la simulación.
4.  El backend busca los precios en vigor de tarifas reales (Endesa Conecta, Iberdrola Plan Online, Octopus 3, Naturgy Por Uso) mediante Google Search Grounding y calcula matemáticamente la comparativa mensual de costes.
5.  El componente renderiza:
    *   **Gráfico Comparativo de Recharts:** Una barra visual para cada tarifa que incluye el ahorro estimado anual.
    *   **Auditoría de Potencia:** Advierte si la potencia contratada del usuario está sobredimensionada.
    *   **Lista de Pros y Contras:** Desglose detallado de permanencias, ventajas de energía verde o penalizaciones ocultas de cada tarifa.

### 5.3. Persistencia Cruzada en la Nube / Local
1.  **Carga Inicial:** Al abrir la aplicación, se comprueba si Firebase Auth está inicializado. Si el usuario está logueado, descarga desde Firestore las colecciones `history`, `sources` y `chats`. Si no, las carga desde `localStorage`.
2.  **Guardado:** Al simular una factura o modificar el chat, el sistema actualiza primero el estado de React. Posteriormente, realiza un intento de escritura en Firestore (si hay sesión activa) o escribe en `localStorage`.

---

## 6. DIRECTRICES DE REPLICACIÓN (REPLICATION RULES OF GOLD)

Para reconstruir este sistema de forma idéntica sin perder robustez ni romper flujos de negocio, el motor de desarrollo debe seguir obligatoriamente estas diez reglas de diseño y arquitectura:

1.  **Límite de Tamaño de Petición en Express:** Se debe configurar el parser de cuerpo JSON de Express con un límite de al menos `50mb` (`app.use(express.json({ limit: "50mb" }))`). Si no se define esto, el escaneo de facturas pesadas o PDF de alta resolución fallará con errores de `PayloadTooLargeError`.
2.  **No Exponer Secretos en el Cliente:** El token de la API de Gemini (`GEMINI_API_KEY`) y las credenciales de Red Eléctrica de España se deben configurar estrictamente como variables de entorno del lado del servidor. El frontend jamás debe realizar llamadas directas a APIs de IA; todo debe ser canalizado mediante rutas de Express (`/api/*`).
3.  **Proteger la UI de Códigos Invisibles del Chatbot:** El componente `MessageRenderer` debe utilizar la librería `react-markdown` configurada con filtros específicos para neutralizar la ejecución de etiquetas HTML (`rehypeRaw` deshabilitado) y debe eliminar de raíz los bloques delimitados por `$` y `$$` para evitar textos incomprensibles y rotura de componentes.
4.  **Cero Bloqueos ante Caídas de API (Mecanismo Fallback):** Ninguna caída de API externa o cuota de Gemini debe tumbar la usabilidad. Si REE está offline, se debe usar la capa 2 de Google Search Grounding de Gemini. Si Gemini está sin saldo, se debe aplicar el algoritmo estacional matemático integrado en `utils.ts` de forma silenciosa para que la calculadora muestre gráficos de costes realistas de inmediato.
5.  **Preservar la Zona Horaria de España en Cálculos de REE:** Al clasificar los precios horarios obtenidos de la API de Red Eléctrica, la fecha y hora proporcionada en UTC se debe formatear explícitamente a la zona horaria `'Europe/Madrid'`. Si no se gestiona esta conversión horaria, las horas de discriminación se verán desfasadas por la hora de verano/invierno, provocando cálculos erróneos en el término variable.
6.  **Redondeo de Flotantes Coherente:** Todos los componentes matemáticos deben seguir los mismos pasos de redondeo para evitar descuadres de céntimos en el desglose final. El término de potencia, los peajes y la base imponible deben computarse internamente a 4 decimales y sumarse. Solo el resultado de la factura final que se muestra al usuario se debe redondear a 2 decimales.
7.  **Sincronización Dual Offline-First:** Los componentes deben estar preparados para responder de forma idéntica si el usuario inicia sesión a mitad de su experiencia. Al loguearse, el historial local del navegador (`localStorage`) debe proponerse para fusionarse con el historial de Firestore para evitar pérdidas de simulaciones previas.
8.  **Gestión Inteligente del Ancho de Banda Multi-modal:** Al enviar imágenes al endpoint `/api/audit/scan-bill`, el cliente debe optimizar los formatos para no saturar la red. De ser posible, se debe restringir el peso de las imágenes escalando capturas demasiado grandes en un canvas antes de convertirlas a Base64.
9.  **Uso Obligatorio de Iconografía Lucide:** Todos los iconos de la UI deben proceder estrictamente de `lucide-react`. Bajo ningún concepto se deben incrustar paths vectoriales `<svg>` manuales o depender de clases externas de tipografías web para mantener un diseño visual profesional y un código limpio.
10. **Aislamiento del HMR en Servidor:** Al desarrollar el backend y el frontend en conjunto mediante Vite, el servidor de Express debe levantar el frontend en producción mediante `express.static('dist')`, pero en desarrollo (`NODE_ENV !== 'production'`) debe integrar la instancia de servidor de Vite utilizando su middleware interno (`vite.middlewares`), asegurando que las llamadas de API de desarrollo se resuelvan en el mismo puerto único (`3000`).
