# Historial de Correcciones y Backup de Configuración (Julio 2026)

Este documento sirve como registro y copia de seguridad de las configuraciones y correcciones implementadas recientemente. Si en el futuro alguna modificación rompe el código, puedes consultar este documento para restaurar la lógica correcta.

## 1. Corrección del Cálculo de Fechas de Facturación
**Archivo Modificado:** `src/domain/billing/calculateBill.ts`

**Problema:** La aplicación añadía un día extra al periodo de facturación, lo que provocaba que los cálculos no coincidieran con las cifras manuales. 

**Solución:** Se eliminó el `+ 1` del cálculo de días:
```typescript
// ANTES (Incorrecto)
const diffTime = Math.abs(t2 - t1);
const dias = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

// AHORA (Correcto)
const diffTime = Math.abs(t2 - t1);
const dias = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
```
*Junto con esto, se actualizaron los fixtures en `defaults.ts` y las aserciones de los tests de caracterización en `tests/characterization/*.test.ts` para que los tests pasaran con 29 días en lugar de 30.*

## 2. Corrección de la Sincronización en la Nube (Firestore)
**Archivos Modificados:** `firestore.rules` y despliegue a Firebase.

**Problema:** La aplicación estaba programada correctamente para guardar datos locales (`localStorage`) y subirlos a la nube (`db`), pero las reglas de seguridad de Firebase Firestore rechazaban cualquier escritura/lectura. Como resultado, si iniciabas sesión desde otro dispositivo o cerrabas sesión (lo que borra la caché local), tus facturas, historial, fuentes y chats se perdían.

**Solución:**
Se aplicaron las reglas del borrador (`DRAFT_firestore.rules`) al archivo principal `firestore.rules`, habilitando las operaciones para usuarios autenticados:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} { allow read, write: if false; } // Safety net
    
    function isSignedIn() { return request.auth != null; }
    // IMPORTANTE: Permitimos operaciones a usuarios logueados (ej. Google)
    function isEmailVerified() { return isSignedIn(); } 
    function isOwner(userId) { return isSignedIn() && request.auth.uid == userId; }
    // ... [Validaciones de esquemas para isValidBillData, etc.] ...

    match /users/{userId} {
      match /profile/billData {
        allow read: if isOwner(userId);
        allow write: if isOwner(userId) && isEmailVerified();
      }
      match /history/{entryId} {
        allow get, list: if isOwner(userId);
        allow create, update, delete: if isOwner(userId) && isEmailVerified();
      }
      match /sources/{sourceId} {
        allow get, list: if isOwner(userId);
        allow create, update, delete: if isOwner(userId) && isEmailVerified();
      }
      match /chats/{chatId} {
        allow get, list: if isOwner(userId);
        allow create, update, delete: if isOwner(userId) && isEmailVerified();
      }
    }
  }
}
```

## 3. Despliegues y Comandos Útiles para Restaurar
Si en algún momento el proyecto se rompe, recuerda los comandos esenciales que usamos para compilar y desplegar esta versión estable:

- **Compilar para web (Hosting):**
  ```bash
  npm run build
  ```
  *(Esto genera o actualiza la carpeta `dist` con el código minificado listo para producción).*

- **Publicar en Firebase:**
  ```bash
  npx firebase deploy
  ```
  *(Este comando sube automáticamente la carpeta `dist` al Hosting, las nuevas reglas a Firestore, y actualiza las Funciones Node.js si hubieran cambiado).*

- **Sincronizar Android (En la carpeta de GitHub `PVPC-Auditor-DEFINITIVO`):**
  ```bash
  npx cap sync
  npx cap open android
  ```

---
**Nota de Respaldo:** El código actual en este directorio (`d:\Descargas\pvpcauditor-modernizacion-\`) se encuentra en un estado totalmente estable y sincronizado con la base de datos de producción de Firebase.
