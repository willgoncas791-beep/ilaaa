# Scotiabank Telebanking — Aplicación Node.js

Esta es la aplicación web de **Scotiabank Telebanking**, estructurada con Node.js y Express para ser desplegada en **DigitalOcean App Platform** desde un repositorio de GitHub.

## Requisitos Locales

- Node.js (v16+)
- npm (incluido con Node.js)

## Ejecutar en Local

1. Instalar las dependencias:
   ```bash
   npm install
   ```
2. Iniciar el servidor:
   ```bash
   npm start
   ```
3. Abre tu navegador en `http://localhost:3000`.

---

## Cómo subir a GitHub y conectar con DigitalOcean

### Paso 1: Subir a GitHub

Abre tu terminal en la carpeta del proyecto e introduce los siguientes comandos:

```bash
git init
git add .
git commit -m "Initial commit - Scotiabank Telebanking Node.js App"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git
git push -u origin main
```

### Paso 2: Desplegar en DigitalOcean App Platform

1. Inicia sesión en tu cuenta de [DigitalOcean](https://cloud.digitalocean.com/).
2. Haz clic en **Apps** en el menú lateral y presiona **Create App**.
3. Selecciona **GitHub** como proveedor de código y autoriza el acceso a tu cuenta de GitHub.
4. Selecciona tu repositorio y la rama `main`.
5. DigitalOcean detectará automáticamente que es un proyecto **Node.js** y usará el comando de inicio `npm start`.
6. Haz clic en **Next** -> **Create Resources** y ¡listo! Tu aplicación estará desplegada online con HTTPS automáticamente.
