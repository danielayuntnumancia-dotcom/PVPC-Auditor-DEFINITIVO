# PVPC Auditor para Android — versión 1.1.1

**[Descargar APK 1.1.1](https://github.com/danielayuntnumancia-dotcom/PVPC-Auditor-DEFINITIVO/releases/download/v1.1.1/PVPC-Auditor-1.1.1.apk)** · [SHA-256](https://github.com/danielayuntnumancia-dotcom/PVPC-Auditor-DEFINITIVO/releases/download/v1.1.1/PVPC-Auditor-1.1.1.apk.sha256)

El usuario ha confirmado el funcionamiento correcto de esta versión.

Instalar encima de la versión 1.1.0, sin desinstalarla. El paquete y la firma son los mismos y el código de versión ha aumentado a 3. La actualización permite conservar los datos y la sesión que Android mantiene para la aplicación.

## Cambios

- El selector de tarifa se adapta al ancho de la tarjeta en el móvil.
- Punta, Llano y Valle aparecen en una columna en pantallas estrechas y en tres columnas a partir de 640 px; etiquetas y porcentajes tienen espacio separado.
- El gesto o botón atrás recorre las pantallas y facturas anteriores de la aplicación. Si no existe una pantalla anterior, vuelve a Calculadora.
- Atrás cierra primero los cuadros de edición y confirmación de la aplicación, sin guardar ni ejecutar acciones.
- En Calculadora, el primer atrás muestra «Pulsa atrás de nuevo para salir». Solo un segundo atrás en menos de dos segundos cierra la aplicación. Cambiar de pantalla o pasar la app a segundo plano cancela esa confirmación.
- La cabecera muestra la versión 1.1.1 en lugar del texto antiguo «v4.1 Debug».

Se conservan las correcciones de autenticación y de sincronización PVPC de la versión anterior. La aplicación utiliza la API HTTPS de producción y el inicio de sesión nativo de Google. Los cambios de diseño compartidos se incorporan también al despliegue web de esta versión; no se migran ni eliminan datos de usuario.

## Verificación

- TypeScript, compilación web, sincronización Capacitor y compilación Android de release correctas, incluido Android Lint vital.
- 15 pruebas de regresión correctas: ocho de navegación Android, cuatro de perfiles/PVPC y tres de autenticación web/nativa.
- Batería general: 98 pruebas, 90 correctas y los mismos ocho fallos anteriores, sin fallos nuevos.
- Firma y alineación del APK verificadas. La firma coincide con la versión 1.1.0 y sigue registrada en Firebase.
- Paquete `com.pvpcauditor.app`, versión `1.1.1`, `versionCode` 3, Android mínimo API 24 (Android 7.0), SDK objetivo 36.
- APK sin depuración, sin backup automático de datos y sin tráfico HTTP sin cifrar.
- Los archivos de la aplicación dentro del APK coinciden con la compilación actual y están registrados los plugins nativos Firebase Authentication y App.
- No hay claves privadas, ejecutable ni mapas del servidor, ni archivos `.env` dentro del APK.

Las pruebas automatizadas ejercitan los eventos del plugin nativo de forma simulada. La comprobación del funcionamiento en el teléfono ha sido confirmada por el usuario; el agente no ha controlado físicamente el dispositivo.

## Firma y futuras compilaciones

La clave y sus credenciales se conservan en `%USERPROFILE%/.android/pvpc-auditor-signing/`, fuera del repositorio, con una copia privada en el backup de la primera compilación. No compartir esos archivos junto con el APK. Gradle carga el archivo local `signing.properties`; puede indicarse otra ubicación con `PVPC_SIGNING_PROPERTIES`.

```powershell
npm.cmd run build
node node_modules/@capacitor/cli/bin/capacitor sync android
.\android\gradlew.bat -p android assembleRelease --no-daemon
```

El resultado firmado se encuentra en `android/app/build/outputs/apk/release/app-release.apk`. Incrementar `versionCode` para cada actualización distribuida. La APK 1.1.0 anterior permanece en `releases/` como respaldo.

La autenticación y Firestore siguen sujetos a las restricciones de cuenta y propiedad ya configuradas. App Check nativo requeriría una configuración propia antes de exigirlo en Firebase; esta actualización no cambia el modo de exigencia actual de esos servicios.

Referencias técnicas: [eventos atrás y salida del plugin App](https://capacitorjs.com/docs/apis/app), [gesto atrás predictivo de Android](https://developer.android.com/guide/navigation/custom-back/predictive-back-gesture) y [construcción y firma de APK](https://developer.android.com/build/building-cmdline).

Tamaño: 7283645 bytes. SHA-256: `ae791f770e0e217b5992fa7386491744ab6470b1c032a414e63cdadc2b02348f`.

El backup previo al ajuste y el informe detallado de verificación del APK se conservan localmente, fuera del repositorio. Las claves privadas y los logs no se adjuntan a GitHub Releases.
