# Solución: Activación del Inicio de Sesión en Móvil

He configurado las credenciales de Firebase y ajustado el método de autenticación para que sea compatible con dispositivos móviles (Capacitor/WebView).

## Cambios realizados

### 1. Configuración de Firebase
Se han añadido las credenciales del proyecto al archivo [firebase-applet-config.json](file:///D:/Documentos/GitHub/PVPC-Auditor-DEFINITIVO/src/firebase-applet-config.json). Esto permitirá que la app detecte que Firebase está activo y muestre el botón de inicio de sesión.

### 2. Autenticación compatible con móviles
En el archivo [firebase.ts](file:///D:/Documentos/GitHub/PVPC-Auditor-DEFINITIVO/src/firebase.ts), se ha cambiado el método `signInWithPopup` por `signInWithRedirect`.
- **Razón:** Los navegadores dentro de aplicaciones móviles (WebViews) suelen bloquear las ventanas emergentes (popups), lo que impedía que el inicio de sesión funcionara. La redirección es el método estándar y más robusto para estas plataformas.

## Siguientes Pasos (CRÍTICO)

Para ver estos cambios en tu móvil, debes sincronizar el código web con el proyecto de Android:

1.  **Compilar el frontend:**
    ```bash
    npm run build
    ```
2.  **Sincronizar con Capacitor:**
    ```bash
    npx cap copy
    ```
3.  **Desplegar desde Android Studio:**
    Haz clic en el botón **Run** (Play verde) en Android Studio para reinstalar la app en tu móvil con los nuevos cambios.

> [!NOTE]
> Una vez realizados estos pasos, el botón "Entrar" debería aparecer en la parte superior y en el menú lateral de la aplicación.
