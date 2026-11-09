# Icono de PVPC Auditor

`app-icon.svg` es el original vectorial: rayo blanco sobre verde `#009966`, con la geometría Zap de Lucide y su licencia ISC en `LICENSE-lucide.txt`.

Para regenerar los recursos web y Android desde ese original:

```powershell
npm.cmd run icons:generate
```

El script genera favicon SVG, PNG e ICO, iconos PWA normales y maskable, Apple Touch y los recursos Android por densidad. Android 8 y posteriores usan un fondo verde y un rayo vectorial dentro del área segura del icono adaptativo; también se incluye la capa monocromática para iconos temáticos.

Después de cambiar el icono, incrementar la versión y actualizar las referencias de caché en `index.html` y `public/manifest.json`. Compilar la web, sincronizar Capacitor y generar la APK firmada según `ANDROID_RELEASE.md`.
