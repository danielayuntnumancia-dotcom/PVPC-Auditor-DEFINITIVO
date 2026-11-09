# PVPC Auditor para Android — versión 1.1.2

**[Descargar APK 1.1.2](https://github.com/danielayuntnumancia-dotcom/PVPC-Auditor-DEFINITIVO/releases/download/v1.1.2/PVPC-Auditor-1.1.2.apk)** · [SHA-256](https://github.com/danielayuntnumancia-dotcom/PVPC-Auditor-DEFINITIVO/releases/download/v1.1.2/PVPC-Auditor-1.1.2.apk.sha256)

Instalar encima de la versión anterior, sin desinstalarla. El paquete y la firma son los mismos y el código de versión aumenta a 4, para conservar los datos y la sesión que Android mantiene para la aplicación.

## Cambios

- Nuevo icono con rayo blanco sobre fondo verde, compartido con la web.
- Recursos Android clásicos, redondos y adaptativos, incluida la capa monocromática para iconos temáticos.
- Favicon SVG/PNG/ICO e iconos de instalación web con tamaños correctos y referencias de caché actualizadas.
- Cabecera y pie muestran la versión 1.1.2.

Se conservan la autenticación nativa, las correcciones de perfiles/PVPC, el diseño móvil y la navegación atrás de 1.1.1. Atrás recorre las pantallas anteriores o vuelve a Calculadora; cierra primero los diálogos, y desde Calculadora requiere dos pulsaciones en dos segundos para salir. El usuario confirmó el funcionamiento de 1.1.1 antes de esta actualización de iconos.

## Verificación de 1.1.2

- TypeScript, compilación web, sincronización Capacitor y compilación Android de release correctas, incluido Android Lint vital.
- Firma y alineación del APK verificadas. La firma coincide con las versiones anteriores registradas en Firebase.
- Paquete `com.pvpcauditor.app`, versión `1.1.2`, `versionCode` 4, Android mínimo API 24 (Android 7.0), SDK objetivo 36.
- APK sin depuración, sin backup automático y sin tráfico HTTP sin cifrar.
- Los 15 archivos de la compilación web coinciden con los incluidos en el APK. Los diez PNG de launcher empaquetados coinciden píxel a píxel con los generados; ambos iconos adaptativos incluyen fondo, primer plano y capa monocromática.
- Sin claves privadas, ejecutable ni mapas del servidor, ni archivos `.env` dentro del APK.

Esta versión cambia recursos gráficos y etiquetas de versión, sin modificar la lógica de navegación o cálculo. No se ha probado físicamente la nueva APK en el teléfono. Como referencia histórica, la batería de 1.1.1 dio 90 de 98 pruebas correctas, con ocho fallos anteriores; sus 15 pruebas específicas de navegación, perfiles y autenticación pasaron.

Tamaño: 4961004 bytes. SHA-256: `59407e0f979423a36f34dfed5ee6b7cc9bfe59e1336bc63664bd51e28632b930`.

## Firma y futuras compilaciones

La clave y sus credenciales se conservan en `%USERPROFILE%/.android/pvpc-auditor-signing/`, fuera del repositorio, con una copia privada en el backup de la primera compilación. Gradle carga el archivo local `signing.properties`; puede indicarse otra ubicación con `PVPC_SIGNING_PROPERTIES`.

```powershell
npm.cmd run icons:generate
npm.cmd run build
node node_modules/@capacitor/cli/bin/capacitor sync android
.\android\gradlew.bat -p android assembleRelease --no-daemon
```

El resultado firmado está en `android/app/build/outputs/apk/release/app-release.apk`. Incrementar `versionCode` para cada actualización distribuida. Las APK anteriores permanecen en `releases/` como respaldo local y en GitHub Releases.

El original y las instrucciones de iconos están en [assets/branding](assets/branding/README.md). El backup previo y los informes de verificación se conservan fuera del repositorio. Las claves privadas y los logs no se adjuntan a las publicaciones.
