/// <reference lib="webworker" />
import { precacheAndRoute } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { CacheFirst, NetworkFirst } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";
import { CacheableResponsePlugin } from "workbox-cacheable-response";

declare let self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

// Precache del shell — el manifest lo inyecta vite-plugin-pwa en build (self.__WB_MANIFEST).
precacheAndRoute(self.__WB_MANIFEST);

// Cualquier ruta de la SPA (navegación) cae al shell precacheado si no hay red.
registerRoute(
  ({ request }) => request.mode === "navigate",
  new NetworkFirst({ cacheName: "app-shell", networkTimeoutSeconds: 3 }),
);

// Imágenes de notas en Supabase Storage: sirven bien desde cache, cambian poco.
registerRoute(
  ({ url }) => /^[a-z0-9-]+\.supabase\.co$/i.test(url.hostname) && url.pathname.startsWith("/storage/"),
  new CacheFirst({
    cacheName: "supabase-storage",
    plugins: [
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 7 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  }),
);

// Llamadas a la API/Auth: preferir red fresca, caer a cache si no hay conexión.
registerRoute(
  ({ url }) => /^[a-z0-9-]+\.supabase\.co$/i.test(url.hostname) && /\/(rest|auth)\//.test(url.pathname),
  new NetworkFirst({
    cacheName: "supabase-api",
    networkTimeoutSeconds: 5,
    plugins: [new CacheableResponsePlugin({ statuses: [0, 200] })],
  }),
);

self.skipWaiting();
self.addEventListener("activate", () => self.clients.claim());

// --- Notificaciones push (recordatorio diario) ---

interface ReminderPushPayload {
  title: string;
  body: string;
  url?: string;
}

self.addEventListener("push", (event: PushEvent) => {
  let payload: ReminderPushPayload = { title: "Kognit", body: "Es hora de tu check-in mental." };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch {
    // payload no era JSON — nos quedamos con el default.
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: payload.url ?? "/app" },
    }),
  );
});

self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();
  const targetUrl = (event.notification.data?.url as string) ?? "/app";

  event.waitUntil(
    (async () => {
      const clientsList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const existing = clientsList.find(c => c.url.includes(targetUrl));
      if (existing) {
        await existing.focus();
        return;
      }
      await self.clients.openWindow(targetUrl);
    })(),
  );
});
