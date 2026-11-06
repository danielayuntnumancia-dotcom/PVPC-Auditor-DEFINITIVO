# Auditoría de seguridad — PVPC Auditor

Fecha: 6 de noviembre de 2026. Aplicación: https://gen-lang-client-0735328299.web.app/

**Registro histórico de la auditoría inicial.** Los hallazgos y decisiones siguientes reflejan el estado de aquella revisión. Posteriormente se aplicó la limpieza autorizada y se desplegaron las correcciones de seguridad. El usuario ha validado la versión 1.1.1. Consultar el [estado del despliegue](DEPLOYMENT_RESULT_2026-11-06.md), la [limpieza realizada](CLEANUP_RESULT_2026-11-06.md) y la [versión Android](ANDROID_RELEASE.md).

## Alcance y límites

Se ha revisado el repositorio, el HTML y JavaScript publicados, las respuestas HTTP de Hosting y peticiones mínimas a la API sin sesión. No se han modificado datos de producción ni ejecutado pruebas de carga. Una petición vacía al chat obtuvo una respuesta de respaldo; no se enviaron facturas ni datos personales a Gemini.

La navegación interactiva quedó bloqueada: el navegador integrado no estaba disponible y la herramienta de Windows detuvo el acceso porque no podía verificar la URL de Chrome. Por tanto, **no se ha comprobado en pantalla el inicio de sesión, la navegación ni las operaciones reales del usuario**. La presencia de código y controles conectados permite identificar funciones alcanzables, pero no demuestra su uso histórico por personas u otros clientes.

El modelo de acceso existente es una aplicación privada con una cuenta de correo permitida. Se conserva esa política y la propiedad de los documentos por UID.

Las observaciones HTTP, los logs de pruebas y la comparación con el código original se conservan localmente en el directorio de evidencias de la auditoría. Los logs y backups privados no se publican en GitHub.

## Hallazgos y correcciones

| Prioridad | Evidencia | Riesgo y situación |
|---|---|---|
| Alta — confirmado en producción | `POST /api/gemini/chat` con `{}` y sin autenticación responde `200`. Otras rutas alcanzan su validación y devuelven `400`. No había verificación de ID token en ninguno de los servidores. | Terceros pueden acceder a servicios de IA y consumir cuota sin iniciar sesión. Preparada verificación de token Firebase, revocación, correo permitido y correo verificado en ambos servidores. El cliente adjunta su ID token. No se ha demostrado acceso a documentos ajenos. |
| Alta — confirmado en producción | `GET /server.cjs`: `200`, 61.657 caracteres de código. `GET /server.cjs.map`: `200`, 94.819 caracteres, con `sourcesContent` del servidor. | Hosting publica el directorio donde también se compilaba el backend. Separada la web en `dist/client`, actualizado Hosting, servidor local y Capacitor. Hosting excluye además `.cjs`, `.map` y `.ts`. |
| Alta/crítica según avisos npm; explotación no comprobada | Antes: raíz 13 avisos, incluidos 5 altos; Functions 13, incluidos 3 altos y 1 crítico. | Actualizados lockfiles con correcciones compatibles. Override acotado de `@grpc/grpc-js` bajo `@firebase/firestore` a una versión corregida de la misma versión mayor. El emulador funciona con ella. Ahora no quedan avisos altos ni críticos; persisten moderados, detallados abajo. |
| Media — código | `isEmailVerified()` comprobaba el correo permitido, pero no `email_verified`. La especificación de seguridad afirmaba lo contrario. | Corregida la condición. Se exige que el ID del documento coincida con el del contenido y que no se cambien las fechas de creación de historial, fuentes y chat. Se limita el conjunto de campos de factura, historial, fuentes y chat. Pruebas en emulador real. |
| Media — código | Limitador por IP con `Map` sin limpieza, cuerpos grandes antes de autenticar, chat sin límites específicos. | Autenticación antes de parsear JSON; límite de 10 MB sin descompresión; archivos de hasta 6 MB; validación de MIME y estructura Base64; límites de consulta, historial y contexto. Limitador por UID verificado: 60 peticiones/15 minutos/proceso, con memoria acotada. Máximo de 2 instancias de Functions. |
| Media — HTTP/código | Hosting carecía de `X-Frame-Options`, `nosniff`, CSP y Permissions Policy. Las cabeceras del servidor Express no protegían el HTML de Hosting. | Preparadas cabeceras de Hosting contra incrustación, detección MIME y permisos innecesarios. CSP en **Report-Only**, para comprobar Firebase, reCAPTCHA y fuentes antes de bloquear recursos. No equivale a una CSP exigida. HSTS ya estaba presente. |
| Media — código | Los errores podían devolver mensajes internos; el cliente Gemini aceptaba una variable `VITE_` para una clave del servidor y no fijaba timeout. | Mensajes genéricos para errores internos y JSON inválido, respuestas API sin caché, retirada de `X-Powered-By`. Gemini usa exclusivamente `GEMINI_API_KEY` y timeout de 30 segundos por llamada. |

También se borra la caché de perfiles de tarifas al cerrar sesión y se conserva el timestamp original al editar historial. No se han borrado datos existentes.

El barrido de patrones en archivos versionados no encontró claves privadas, tokens GitHub ni documentos de cuenta de servicio. Detectó claves de configuración de Firebase en los archivos de configuración web/Android; esto no demuestra una filtración de una clave privada de Gemini. No se ha auditado todo el historial Git ni la configuración de restricciones de claves en Google Cloud.

## Funciones alcanzables y código pendiente de consulta

La entrada es `src/main.tsx` → `src/App.tsx`. En el código renderizado hay acceso, calculadora, precios PVPC, perfiles de tarifa, historial de facturas/simulaciones, importación/exportación y comparación local con gráficos. La revisión interactiva de estas operaciones sigue pendiente.

El JavaScript publicado (`index-Dx5W2I8N.js`) contiene únicamente la ruta `/api/audit/pvpc` de las seis rutas de la aplicación. El análisis de referencias del código explica esta diferencia: los otros manejadores no están conectados a controles renderizados. El comparador local se conserva; el análisis de ofertas mediante IA es un bloque distinto y desconectado.

**No se ha eliminado ninguno de los siguientes candidatos.**

| Grupo | Elementos exactos | Propuesta pendiente de decisión |
|---|---|---|
| Componentes sin importadores en la aplicación actual | `src/components/Scanner.tsx`, `ChatBot.tsx`, `BillOptimizer.tsx` | Retirar, si no se quieren recuperar. Se han actualizado las llamadas API residuales para que tampoco funcionen sin sesión si vuelven a conectarse. |
| Funciones desconectadas dentro de `App.tsx` | `handleAnalyzeMarket`, `handleFetchEsiosPrices`, `handleFetchPublicPVPC`, `handleChatFileAttachment`, `handleFileUpload`, `handleSendMessage`, sus estados y auxiliares exclusivos. El valor `ia` de navegación tampoco tiene sección renderizada. | Decidir entre retirada y recuperación de interfaz. El código de sincronización de fuentes/chat sigue ejecutándose aunque sus controles no estén visibles: revisar también esas lecturas/escrituras al limpiar. |
| API sin llamada desde el paquete web publicado | `/api/audit/esios-energy-costs`, `/api/audit/pvpc-public`, `/api/audit/scan-bill`, `/api/audit/compare-market`, `/api/gemini/chat`, en `server.ts` y `functions/index.ts` | Retirar si no hay una APK antigua u otro cliente que las necesite. Mantener `/api/audit/pvpc`. La autenticación ya preparada cubre las seis rutas. |
| Aplicación anterior independiente | `index_firebase.html`, `app.js`, `firebaseConfig.js`, `firebaseConfig.EXAMPLE.js` | Retirar o archivar junto con las guías que describen esa versión. No son la entrada del despliegue Vite actual. |
| Reparaciones y lanzadores auxiliares | `fix_all.py`, `fix_dupe.py`, `fix_final_test.py`, `fix_jsx.py`, `fix_jsx2.py`, `fix_let.py`, `fix_strings.py`, `fix_test_restore.py`, `patch_replica_final.py`, `patch_sandbox_badge.py`, `restore_ui.py`, `restore_ui.cjs`, `test_check.cjs`, `test_check_35.cjs`, `migrate.js`, `run.js`, `run.cjs` | Revisar y retirar los que ya cumplieron su propósito; no forman parte de los scripts normales de `package.json`. Revisar manualmente también el archivo `y`. |

No se propone borrar Android: no hay evidencia suficiente para decidir que ya no se usa. Tampoco `server.ts`, que soporta `npm run dev` y `npm start`. La duplicación de lógica de negocio con Functions merece una refactorización posterior; la barrera de seguridad nueva ya es compartida.

## Riesgos pendientes al cierre de la auditoría inicial

- **Producción sigue pendiente de actualizar.** Validar sesión real de la cuenta permitida y que otra cuenta no acceda; después coordinar despliegue de Functions, Hosting y reglas. Los clientes anteriores que no envíen token perderán acceso a la API protegida. Revisar las APK antes de exigir el cambio en producción.
- **App Check no está verificado por la API.** Existe inicialización en el cliente Firebase, pero falta transmitir y validar sus tokens para este backend. Preparar web y Android antes de exigirlo. La autenticación nueva ya restringe el acceso a la cuenta permitida.
- **El limitador no es una cuota global de gasto.** Puede reiniciarse y cada proceso tiene su contador. Añadir límites persistentes por UID y controles de cuota del proveedor si se mantienen servicios de IA. Dos instancias reducen el escalado, pero no constituyen un tope económico.
- **Integridad de resultados:** el OCR aún devuelve una factura ficticia con respuesta exitosa si fallan los modelos. PVPC y comparación IA tienen respaldos con datos predeterminados/estimados. Si se recuperan estas funciones, separar claramente los datos reales de las simulaciones y no guardar una extracción ficticia como factura oficial. No se ha auditado la exactitud normativa o económica de los precios.
- **Documentos y prompts:** la validación de formatos no comprueba la firma binaria del archivo; algunos campos opcionales de Firestore siguen sin validación profunda. El contexto documental se inserta en instrucciones del modelo, con riesgo de manipulación de sus respuestas. El modelo no tiene aquí herramientas para ejecutar código o consultar otros usuarios.
- **Dependencias moderadas:** raíz: 6 avisos en herramientas de desarrollo; `npm audit --omit=dev` devuelve 0. Functions: 9 avisos moderados asociados a la cadena antigua de `firebase-admin`/`uuid`. Planificar y probar su actualización mayor; no se ha aplicado `audit fix --force` ni degradado Firebase a una versión antigua.
- **Privacidad local:** la aplicación persiste facturas y conversaciones en `localStorage`. Se ha corregido la omisión de tarifas al cerrar sesión, pero no se ha revisado completamente la persistencia ni los cambios rápidos de cuenta.
- CSP sigue en observación. Quedan pendientes pruebas en navegador, sesión real y dispositivo Android; no se afirma un blindaje absoluto.

## Validación realizada

| Comprobación | Resultado |
|---|---|
| `npm run lint` | Correcto |
| `npm --prefix functions run build` | Correcto |
| `npm run build` | Correcto; aviso de tamaño del paquete JS, sin fallo |
| `npm run test:security` | 5 pruebas correctas: identidades rechazadas/permitida, peticiones inválidas, orden de autenticación, errores y cuota resistente a cambios de `X-Forwarded-For` |
| `npm run test:rules` | 3 pruebas correctas en emulador Firestore, proyecto ficticio `demo-pvpc-security`: propietario, aislamiento, correo verificado, IDs, timestamps y mensajes sobredimensionados |
| Batería de caracterización con servidor local | 84 pruebas: 76 correctas y 8 fallos |
| Comparación con HEAD original | Los mismos 8 fallos se reproducen en las comprobaciones originales: expectativas de interfaz/datos, documentos/capturas ausentes y timeout REE esperado de 6 segundos |
| HTTP al servidor local de producción | Chat anónimo: `401`. `/server.cjs` y `/server.cjs.map` devuelven el HTML de la SPA, sin código ni mapa del servidor |
| Contenido de `dist/client` | Solo HTML, CSS, JavaScript del cliente, iconos y manifiesto; sin ejecutable ni mapas del servidor |
| Revisión de diferencias | `git diff --check` correcto. Se conserva el cambio previo del usuario en `.firebase/hosting.ZGlzdA.cache`. |

Las pruebas de identidad permitida usan un verificador simulado para no depender de credenciales personales ni invocar Gemini. Las reglas sí se ejecutan en el emulador real. El desarrollo local con revocación de tokens requiere credenciales de Firebase Admin/ADC válidas; no existe una excepción para saltarse la autenticación en desarrollo.

Referencias técnicas: [verificación de ID tokens Firebase](https://firebase.google.com/docs/auth/admin/verify-id-tokens), [configuración de Firebase Hosting](https://firebase.google.com/docs/hosting/full-config) y [verificación de App Check en backend propio](https://firebase.google.com/docs/app-check/custom-resource-backend).
