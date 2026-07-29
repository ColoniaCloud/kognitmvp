/**
 * Kill-switch del service worker viejo.
 *
 * Antes de separar el sitio de la app, la PWA registraba un service worker en
 * `/sw.js` con scope "/" que precacheaba todo el bundle y respondía cualquier
 * navegación con el `index.html` cacheado. Ese registro sigue vivo en el browser de
 * todo el que haya visitado kognit.in, y mientras siga ahí va a seguir sirviendo la
 * versión vieja del sitio aunque el deploy nuevo ya esté arriba.
 *
 * El browser revalida periódicamente el script del SW registrado contra esta misma
 * URL. Cuando se baja este archivo, reemplaza al worker anterior, borra todas las
 * caches, se desregistra y recarga las pestañas abiertas para que tomen el sitio real.
 *
 * El service worker de la app sigue existiendo, pero vive en /app/sw.js con scope
 * /app/ y no se ve afectado por esto.
 *
 * No borrar hasta que no queden instalaciones viejas dando vueltas (ver APP-WEB.md).
 */
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
      await self.registration.unregister();

      const clients = await self.clients.matchAll({ type: "window" });
      for (const client of clients) client.navigate(client.url);
    })()
  );
});
