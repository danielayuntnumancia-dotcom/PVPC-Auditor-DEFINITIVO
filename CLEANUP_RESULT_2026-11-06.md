# Limpieza y recuperación — 6 de noviembre de 2026

Se retiraron los 24 archivos autorizados y se actualizaron las referencias de documentación. Se eliminó una prueba que solo exigía que existieran tres componentes sin uso; las pruebas de comportamiento se conservaron.

La limpieza se validó con compilación, servidor local y comparación del código ejecutable y los estilos usados por las fuentes restantes. El usuario confirmó después el funcionamiento. Las mejoras posteriores de Android se documentan en [ANDROID_RELEASE.md](ANDROID_RELEASE.md).

## Backup y recuperación

Antes de borrar se creó una copia de 171 archivos del código y configuración, incluidos los cambios de seguridad pendientes. Se verificaron la integridad del ZIP y los hashes SHA-256 de todos sus archivos. El backup y su script de restauración se conservan en el equipo del propietario, fuera del repositorio.

SHA-256 del backup de limpieza: `57cab6efd6e0d6a067f2988114a4643912ca529e981e699947ec6e52f1497824`.

La restauración se ejercitó durante las comprobaciones y recupera los archivos afectados por la limpieza. No restaura indiscriminadamente el repositorio ni revierte por sí sola un despliegue de Firebase. Las claves de firma Android se conservan por separado.

Los archivos instalados de dependencias, objetos Git y directorios ignorados de compilación/caché no forman parte de ese backup de fuentes. La limpieza no borró datos de Firestore.

## Validación de la limpieza

- Compilación TypeScript, Functions y web/servidor correctas.
- Servidor local: HTML y recursos disponibles; API sin sesión rechazada.
- JavaScript ejecutable sin cambios, salvo referencias a nombres de recursos con hash.
- Servidor compilado con SHA-256 idéntico antes y después.
- 572 reglas CSS comparadas de las fuentes restantes, con declaraciones iguales.
- CSS total de aquella versión: de 67.457 a 54.542 bytes al retirar utilidades de los archivos antiguos.
- Batería de entonces: 84 pruebas antes y 83 después, con los mismos ocho fallos previos. Se retiró una comprobación obsoleta de presencia de archivos.
- No se encontraron regresiones nuevas; los archivos ajenos al alcance autorizado se conservaron.

Las evidencias completas y los logs se guardan localmente y no se publican en GitHub.

## Archivos retirados

- `src/components/Scanner.tsx`
- `src/components/ChatBot.tsx`
- `src/components/BillOptimizer.tsx`
- `index_firebase.html`
- `app.js`
- `firebaseConfig.js`
- `firebaseConfig.EXAMPLE.js`
- `fix_all.py`
- `fix_dupe.py`
- `fix_final_test.py`
- `fix_jsx.py`
- `fix_jsx2.py`
- `fix_let.py`
- `fix_strings.py`
- `fix_test_restore.py`
- `patch_replica_final.py`
- `patch_sandbox_badge.py`
- `restore_ui.py`
- `restore_ui.cjs`
- `test_check.cjs`
- `test_check_35.cjs`
- `migrate.js`
- `run.js`
- `run.cjs`

Se conservaron Android, los servidores y los bloques de IA desconectados de la interfaz. Estos últimos siguen pendientes de una decisión específica.
