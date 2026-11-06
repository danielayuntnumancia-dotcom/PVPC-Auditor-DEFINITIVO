# Publicación 1.1.1 — 6 de noviembre de 2026

Estado de esta publicación: **COMPLETADA**.

Aplicación: https://gen-lang-client-0735328299.web.app/
Repositorio: https://github.com/danielayuntnumancia-dotcom/PVPC-Auditor-DEFINITIVO
Versión Android: [v1.1.1](https://github.com/danielayuntnumancia-dotcom/PVPC-Auditor-DEFINITIVO/releases/tag/v1.1.1).

Esta publicación reúne las correcciones de seguridad, la limpieza autorizada, la sincronización PVPC limitada al perfil regulado, las mejoras de diseño móvil y la navegación Android. El usuario ha confirmado que la aplicación funciona correctamente.

## Firebase

Proyecto `gen-lang-client-0735328299`: Hosting, función `api` y reglas de Firestore. La función utiliza Node.js 22, un máximo de dos instancias y un timeout de 120 segundos. Las variables privadas del servidor se conservan en el servicio.

Hosting publica únicamente `dist/client`; la carpeta del ejecutable del servidor no es pública. La página de inicio requiere revalidar la caché. CSP permanece en modo de observación.

Las 24 comprobaciones posteriores han pasado: se han verificado el HTML y sus recursos, las cabeceras de seguridad, el rechazo de las seis rutas API sin sesión, el rechazo de un token inválido y la ausencia del código y mapas del servidor en Hosting. Los hashes de los recursos públicos se comparan con la compilación local.

## Validación y recuperación

TypeScript, compilación Functions, pruebas de seguridad de API y las 15 pruebas específicas de navegación, perfiles y autenticación se comprueban antes de publicar. La última batería completa dio 98 pruebas, 90 correctas y los mismos ocho fallos previos, sin nuevas regresiones.

Se conservan fuera del repositorio los backups de fuentes, metadatos de despliegues anteriores, verificaciones y logs. Restaurar un backup local no revierte automáticamente una versión publicada.

El APK firmado se distribuye por GitHub Releases. El código y la configuración necesaria para compilarlo se incluyen en el repositorio; la clave privada y sus contraseñas se conservan localmente.

Para cargar la web nueva en un navegador que ya tenía abierta la aplicación, pulsar **Ctrl+F5**.
