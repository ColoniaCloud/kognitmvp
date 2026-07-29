import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Servidor de producción. Sirve las dos builds desde un mismo origin:
 *
 *   /       → dist/       (sitio público, apps/web)
 *   /app    → dist/app/   (PWA, apps/app)
 *
 * Un solo origin es deliberado: la sesión de Supabase vive en localStorage, que es
 * por origin, y la identidad de la PWA instalada también. Partir la app a un
 * subdominio desloguearía a todo el mundo y dejaría huérfanas las instalaciones.
 *
 * Este archivo es el "startup file" del proyecto Node de Hostinger (`npm start`).
 * Si en cambio el hosting sirve dist/ como estático con Apache, el mismo ruteo lo
 * hacen los dos .htaccess que quedan dentro del build y este server no se usa.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(__dirname, "dist");
const APP_DIST = path.join(DIST, "app");
const PORT = process.env.PORT || 3000;

const server = express();
server.disable("x-powered-by");

/** Los assets llevan hash en el nombre; el HTML y el service worker, nunca. */
const setHeaders = (res, filePath) => {
  const base = path.basename(filePath);
  const immutable = filePath.includes(`${path.sep}assets${path.sep}`);
  if (immutable) {
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  } else if (base.endsWith(".html") || base === "sw.js" || base === "registerSW.js" || base === "manifest.webmanifest") {
    res.setHeader("Cache-Control", "no-cache, must-revalidate");
  } else {
    res.setHeader("Cache-Control", "public, max-age=3600");
  }
};

// --- App (/app) --------------------------------------------------------------
// Va primero para que /app no lo capture el fallback del sitio.
server.use("/app", express.static(APP_DIST, { setHeaders }));
server.get("/app/*", (_req, res) => {
  res.sendFile(path.join(APP_DIST, "index.html"));
});

// --- Sitio público (/) -------------------------------------------------------
server.use(express.static(DIST, { setHeaders }));
server.get("*", (_req, res) => {
  res.sendFile(path.join(DIST, "index.html"));
});

server.listen(PORT, () => {
  console.log(`[kognit] escuchando en :${PORT} — sitio en / y app en /app`);
});
