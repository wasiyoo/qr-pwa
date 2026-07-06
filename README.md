# Herramienta QR PWA

App estatica para generar y leer codigos QR desde computadora o celular. Incluye manifiesto PWA, service worker, iconos, generador local y lector por camara o imagen.

## Probar localmente

Abre una terminal dentro de esta carpeta y ejecuta:

```bash
python -m http.server 8080
```

Luego abre:

```text
http://localhost:8080
```

La camara y la instalacion PWA funcionan en `localhost` o con `https`.

## Subir a GitHub

```bash
git init
git add .
git commit -m "Crear PWA de QR"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git
git push -u origin main
```

Despues, en GitHub:

1. Entra a `Settings`.
2. Abre `Pages`.
3. En `Build and deployment`, elige `Deploy from a branch`.
4. Selecciona `main` y la carpeta `/root`.
5. Guarda y espera el enlace de GitHub Pages.

## Archivos principales

- `index.html`: interfaz de la app.
- `styles.css`: diseno responsive.
- `app.js`: generador, lector, instalacion y acciones.
- `manifest.webmanifest`: configuracion PWA.
- `sw.js`: cache offline.
- `vendor/`: librerias locales para QR.

## Librerias incluidas

- `qrcodejs` para generar QR.
- `jsQR` para leer QR desde camara o imagen.
