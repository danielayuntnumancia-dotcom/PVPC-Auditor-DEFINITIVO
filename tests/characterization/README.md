# Pruebas de Caracterización - Fase 1

Este directorio contiene las pruebas de caracterización del proyecto **PVPC Auditor**. El propósito de estas pruebas no es verificar que el código cumple un diseño ideal, sino **fijar el comportamiento actual de la línea base**, incluyendo sus peculiaridades y defectos.

## Estructura de pruebas

Las pruebas están diseñadas para ejecutarse con el runner nativo de Node.js (`node:test`). Se dividen en los siguientes archivos granulares:

1. `calculator.characterization.test.ts`: Pruebas dinámicas que validan el comportamiento del motor de cálculo puro ubicado en `src/utils.ts`.
2. `repository.characterization.test.ts`: Pruebas estáticas que verifican la presencia o ausencia de archivos críticos en el sistema de archivos (ej. `.env.example`, `package-lock.json`, ausencia de `bun.lock`).
3. `server-contracts.characterization.test.ts`: Pruebas dinámicas de los endpoints locales HTTP y comprobaciones estáticas sobre el archivo `server.ts` relativas a los fallbacks y mecanismos de control.
4. `ui-source-invariants.characterization.test.ts`: Pruebas estáticas sobre `src/App.tsx` que garantizan que los componentes de la interfaz, el responsive y el almacenamiento se mantienen referenciados.

## Etiquetas de Clasificación

Cada prueba utiliza una etiqueta prefijada en su nombre para clarificar su naturaleza y alcance:

- `[VALIDO]`: Prueba dinámica de un comportamiento funcional correcto que debe preservarse.
- `[DEFECTO_CONOCIDO]`: Prueba dinámica o estática que certifica que un defecto específico existe actualmente en el sistema y debe mantenerse en esta fase.
- `[ESTATICO]`: Prueba de existencia o inspección de código (grep estático). Garantiza que las constantes, importaciones, archivos o invariantes visuales siguen ahí, pero no garantiza su correcto funcionamiento en tiempo de ejecución.
- *(Nota)*: Existen pruebas No Verificables (resoluciones, accesibilidad, etc.) documentadas en el reporte, que no pueden automatizarse con este enfoque.

## Ejecución

Para ejecutar todas las pruebas, utilizar:
```bash
npm run test:characterization
```
