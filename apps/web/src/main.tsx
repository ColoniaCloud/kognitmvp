import { createRoot } from "react-dom/client";
import { initI18n } from "@kognit/i18n/site";
import App from "./App.tsx";
import "@kognit/ui/index.css";
import "@fontsource/hind/300.css";
import "@fontsource/hind/400.css";
import "@fontsource/hind/500.css";
import "@fontsource/hind/600.css";
import "@fontsource/hind/700.css";
import "@fontsource/poppins/600.css";
import "@fontsource/poppins/700.css";
import "@fontsource/poppins/800.css";
import "@fontsource/eb-garamond/400.css";
import "@fontsource/eb-garamond/500.css";
import "@fontsource/eb-garamond/600.css";
import "@fontsource/eb-garamond/400-italic.css";

/**
 * Hasta la separación en dos apps, la PWA registraba un service worker en scope "/"
 * que precacheaba el bundle entero y tenía `navigateFallback` a "/index.html". Ese SW
 * sigue instalado en el browser de cualquiera que haya visitado el sitio, y si no se
 * lo saca se queda sirviendo el HTML y los assets viejos para *todas* las rutas, para
 * siempre — el deploy nuevo no se vería nunca.
 *
 * La app tiene ahora su propio SW acotado a /app/, así que acá se desregistra
 * cualquier otro y se vacían sus caches. `public/sw.js` hace lo mismo del lado del
 * worker, para los clientes que ya lo tienen activo y todavía no cargaron este JS.
 */
function unregisterLegacyServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  navigator.serviceWorker.getRegistrations()
    .then((registrations) => {
      for (const registration of registrations) {
        if (new URL(registration.scope).pathname.startsWith("/app")) continue;
        registration.unregister();
      }
    })
    .catch(() => { /* no es crítico: si falla, el sw.js kill-switch igual lo resuelve */ });

  if ("caches" in window) {
    caches.keys()
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .catch(() => { /* idem */ });
  }
}

unregisterLegacyServiceWorker();

// i18n se inicializa antes del primer render porque los idiomas que no son `es`
// se bajan en un chunk aparte: sin el await, un usuario en otro idioma vería la
// interfaz en español hasta que llegue su bundle.
initI18n().then(() => {
  createRoot(document.getElementById("root")!).render(<App />);
});
