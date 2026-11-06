# PVPC Auditor 1.1.1

Aplicación React y TypeScript para calcular facturas, gestionar perfiles de tarifa y consultar el historial y la comparación local. Incluye una aplicación Android firmada.

- [Abrir aplicación web](https://gen-lang-client-0735328299.web.app/)
- [Descargar APK 1.1.1](https://github.com/danielayuntnumancia-dotcom/PVPC-Auditor-DEFINITIVO/releases/download/v1.1.1/PVPC-Auditor-1.1.1.apk)
- [Versiones y archivos de instalación](https://github.com/danielayuntnumancia-dotcom/PVPC-Auditor-DEFINITIVO/releases)

## Desarrollo local

Se requiere Node.js 22 o posterior.

```powershell
npm.cmd ci
npm.cmd --prefix functions ci
npm.cmd run dev
```

Abrir http://localhost:3000. La API exige sesión Firebase de la cuenta autorizada; la verificación con revocación requiere credenciales válidas de Firebase Admin/ADC.

La configuración pública del cliente está en `src/firebase-applet-config.json` y admite las variables `VITE_FIREBASE_*` previstas en `src/firebase.ts`. `GEMINI_API_KEY` y `ESIOS_API_TOKEN` son variables exclusivas del servidor. Consultar los archivos `.env.example`.

## Compilación y pruebas

```powershell
npm.cmd run lint
npm.cmd run build
npm.cmd --prefix functions run build
npm.cmd run test:security
npm.cmd run test:rules
```

Las pruebas de reglas requieren Firebase CLI y Java 21 y utilizan el proyecto ficticio `demo-pvpc-security`. La batería `npm test` espera un servidor local en el puerto 3000. Su última ejecución completa dio 98 pruebas: 90 correctas y ocho fallos anteriores relacionados con expectativas antiguas de interfaz/datos, capturas/documentación ausentes y el timeout de REE. Las 15 pruebas específicas de navegación, perfiles y autenticación pasan.

Para arrancar el servidor compilado, establecer `NODE_ENV=production` y ejecutar `npm.cmd start`.

## Arquitectura y despliegue

- Entrada web: `index.html` → `src/main.tsx` → `src/App.tsx`.
- API local: `server.ts`. API Firebase: `functions/index.ts`.
- Seguridad compartida: `functions/security.ts`. Acceso del cliente a la API: `src/api.ts`.
- Hosting y Capacitor consumen `dist/client`. El ejecutable del servidor queda fuera de la carpeta pública, en `dist/server.cjs`.

```powershell
firebase deploy --project gen-lang-client-0735328299 --only "functions:api,hosting,firestore:rules"
```

Los hooks de Firebase compilan la web y Functions antes de publicar.

## Android

La versión 1.1.1 incorpora el diseño móvil ajustado y navegación atrás: pantalla anterior o Calculadora, cierre de diálogos y doble atrás en dos segundos para salir desde Calculadora. La actualización conserva el paquete y la firma anteriores.

Consultar [compilación y firma de Android](ANDROID_RELEASE.md). Los APK se distribuyen como archivos de GitHub Releases. La clave privada, las credenciales de firma, los backups y los logs locales quedan fuera del código publicado.

## Documentación

[Auditoría de seguridad](SECURITY_AUDIT_2026-11-06.md), [limpieza y recuperación](CLEANUP_RESULT_2026-11-06.md) y [despliegue](DEPLOYMENT_RESULT_2026-11-06.md).

Los documentos marcados como históricos describen versiones anteriores. Las funciones de IA desconectadas que permanecen en `App.tsx` y sus endpoints requieren una decisión aparte antes de retirarlos.
