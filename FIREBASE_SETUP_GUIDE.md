# 🔧 Configuración de Firebase - Guía de Implementación

## ✅ Lo que se ha implementado

Se han creado **tres archivos principales** para implementar el flujo de autenticación con Google y gestión de consumo de luz en Firebase:

### 1. **firebaseConfig.js**
   - Inicializa Firebase con las credenciales del proyecto
   - Exporta `auth`, `db` (Firestore), y `provider` (GoogleAuthProvider)
   - Usa módulos CDN de Firebase (sin necesidad de build)

### 2. **app.js**
   - **`initAuthStateListener()`**: Detecta cambios en la sesión del usuario
   - **`signInWithGoogle()`**: Inicia sesión con Google mediante popup
   - **`signOutUser()`**: Cierra la sesión
   - **`saveConsumoRecord()`**: Guarda registros en `usuarios/{uid}/consumos`
   - **`updateConsumosList()`**: Actualiza la lista de consumos en tiempo real
   - **`updateConsumosChart()`**: Calcula estadísticas en tiempo real
   - Listener real-time con `onSnapshot` que actualiza la UI automáticamente

### 3. **index.html**
   - Interfaz moderna y responsiva
   - **Sección de login**: Botón de Google Sign-In
   - **Panel de control** (mostrado solo si está autenticado):
     - Formulario para registrar consumos (fecha, kWh, costo)
     - Sección de estadísticas (Total kWh, Costo Total, Promedios)
     - Lista de consumos con actualizaciones en tiempo real
   - Sistema de notificaciones
   - Estilos animados y gradientes profesionales

---

## 🔑 Paso 1: Obtener tu API Key de Firebase

### Desde Google Cloud Console:

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto: **gen-lang-client-0735328299**
3. En Configuración del proyecto → Aplicaciones web
4. Copia tu **API Key** (se ve algo como: `AIza...`)

**O alternativamente:**

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Selecciona el proyecto: **gen-lang-client-0735328299**
3. Servicios → APIs y servicios → Credenciales
4. Copia la clave de API web

---

## ✏️ Paso 2: Actualizar firebaseConfig.js

Abre `firebaseConfig.js` y reemplaza:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY", // ← REEMPLAZA AQUÍ con tu API Key
  authDomain: "gen-lang-client-0735328299.firebaseapp.com",
  projectId: "gen-lang-client-0735328299",
  storageBucket: "gen-lang-client-0735328299.appspot.com",
  messagingSenderId: "302419656848",
  appId: "1:302419656848:web:YOUR_APP_ID" // ← Si tienes App ID, también reemplaza
};
```

---

## 🔐 Paso 3: Configurar Firestore Database

### En Firebase Console:

1. Ve a **Cloud Firestore**
2. Si no existe, crea una base de datos:
   - Modo: **Producción** (recomendado)
   - Ubicación: Elige la más cercana
3. Haz clic en **Crear**

---

## 🛡️ Paso 4: Configurar Reglas de Seguridad en Firestore

En Firebase Console → Cloud Firestore → Reglas, reemplaza con:

```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Permitir que cada usuario acceda solo a sus propios documentos
    match /usuarios/{userId} {
      allow read, write: if request.auth.uid == userId;
      
      // Subcolección de consumos
      match /consumos/{consumoId} {
        allow read, write: if request.auth.uid == userId;
      }
    }
  }
}
```

Luego haz clic en **Publicar**.

---

## 🔑 Paso 5: Habilitar Google Authentication

En Firebase Console:

1. Ve a **Autenticación**
2. Pestaña **Proveedores de inicio de sesión**
3. Habilita **Google**
4. Configura el nombre del proyecto (algo como "PVP Auditor")
5. Haz clic en **Guardar**

---

## 🚀 Paso 6: Probar la Aplicación

### Opción A: Usando Vite (desarrollo)
```bash
npm run dev
```
Luego abre `http://localhost:5173` en tu navegador.

### Opción B: Servir archivos estáticos
```bash
# Con Python
python -m http.server 8000

# O con Node.js
npx http-server
```
Abre `http://localhost:8000` en tu navegador.

---

## 📋 Flujo de usuario

1. **Usuario accede a la página**
   - Ve la sección de login con botón "Iniciar sesión con Google"

2. **Hace clic en el botón**
   - Se abre popup de Google
   - Usuario se autentica

3. **Tras autenticar exitosamente**
   - Se captura su `uid`
   - Se muestra el panel de control
   - Se inicializa el listener de tiempo real para consumos

4. **Usuario registra un consumo**
   - Rellena fecha, kWh y costo
   - Hace clic en "Guardar Consumo"
   - Datos se guardan en `usuarios/{uid}/consumos`

5. **Tiempo real**
   - El listener detecta el nuevo registro
   - La lista se actualiza automáticamente
   - Las estadísticas se recalculan

6. **Cierra sesión**
   - Hace clic en "Cerrar sesión"
   - Vuelve a ver la pantalla de login

---

## 🐛 Troubleshooting

### Problema: "Cannot find module 'firebase'"
- Solución: Los scripts usan CDN de Firebase, asegúrate que tu navegador tenga conexión a internet.

### Problema: "CORS error"
- Solución: Esto es normal con CDN. Si usas un bundler local, considera migrar a un build con `npm run build`.

### Problema: "onAuthStateChanged no funciona"
- Solución: Asegúrate que Firebase esté inicializado correctamente en `firebaseConfig.js`.

### Problema: No puedo guardar consumos
- Solución: Verifica que:
  1. Has habilitado Google Authentication en Firebase
  2. Has configurado las Reglas de Firestore correctamente
  3. Has creado una base de datos de Firestore

### Problema: El formulario no envía datos
- Solución: Abre la consola de desarrollador (F12) y busca mensajes de error.

---

## 📚 Estructura de datos en Firestore

```
usuarios/
  └── {uid}/
      ├── consumos/
      │   ├── {consumoId1}/
      │   │   ├── fecha: "2024-07-23"
      │   │   ├── kwh: 250.50
      │   │   ├── costo: 45.99
      │   │   ├── createdAt: timestamp
      │   │   └── updatedAt: timestamp
      │   ├── {consumoId2}/
      │   │   └── ...
      │   └── ...
```

---

## 🎨 Personalización

### Cambiar colores
En `index.html`, busca:
```css
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
```
Y reemplaza con tus colores preferidos.

### Agregar más campos de consumo
En `app.js`, modifica la función `saveConsumoRecord()`:
```javascript
const consumosRef = collection(db, 'usuarios', currentUser.uid, 'consumos');
await addDoc(consumosRef, {
  fecha: consumoData.fecha,
  kwh: kwh,
  costo: costo,
  // Agrega aquí nuevos campos
  proveedor: consumoData.proveedor,
  tarifa: consumoData.tarifa,
  // etc.
  createdAt: serverTimestamp(),
});
```

---

## ✨ Próximos pasos opcionales

1. **Agregar gráficos**: Integra Chart.js o Recharts en `updateConsumosChart()`
2. **Exportar datos**: Crea función para descargar consumos como CSV o PDF
3. **Notificaciones**: Agrega alertas para consumo anómalo
4. **PWA**: Convierte la app en una Progressive Web App
5. **Ciencias de datos**: Integra análisis predictivos con IA

---

## 📞 Soporte

Si tienes problemas:
1. Revisa la consola del navegador (F12 → Console)
2. Verifica la configuración de Firebase
3. Asegúrate que las reglas de Firestore sean correctas
4. Comprueba que Google Authentication esté habilitado

¡Éxito con tu implementación! 🚀
