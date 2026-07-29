# Capturas de la app para la landing

El carrusel del home (`/`) no monta la app real: muestra imágenes de
`apps/web/public/screens/` (`apps/web/src/components/site/AppScreensCarousel.tsx`). Estas son capturas de las pantallas de
`/app` en un viewport de iPhone (390×844), exportadas a WebP a 780 px de ancho (×2).

| Archivo | Pantalla |
|---|---|
| `home.webp` | `apps/app/src/pages/kognit/Home.tsx` |
| `tilt.webp` | `apps/app/src/pages/kognit/Tilt.tsx` (protocolo de reset, pantalla inicial) |
| `cards.webp` | `apps/app/src/pages/kognit/Cards.tsx` |
| `calendar.webp` | `apps/app/src/pages/kognit/Calendar.tsx` |
| `community.webp` | `apps/app/src/pages/kognit/Community.tsx` |
| `profile.webp` | `apps/app/src/pages/kognit/Profile.tsx` |

## Regenerarlas

Cuando cambie el diseño de alguna pantalla hay que volver a sacarlas:

```bash
npm i -D playwright sharp     # solo la primera vez
npx playwright install chromium

npm run dev:app                  # en una terminal (la app, :8081)
node scripts/capture-screens.mjs # en otra
```

El script pisa los `.webp` de `apps/web/public/screens/`. Revisá el resultado antes de
commitear — las pantallas tienen animaciones de entrada y alguna puede quedar a mitad
de camino (el script espera 2,5 s por pantalla; si hace falta, subí ese `waitForTimeout`).

`playwright` y `sharp` **no** están en `package.json` a propósito: pesan bastante y
solo hacen falta para esta tarea puntual, no para desarrollar ni para el build.

## Cómo funciona

- `scripts/capture-screens.mjs` abre `/app/__capture/:screen`, una ruta que solo existe en
  desarrollo (`import.meta.env.DEV` en `apps/app/src/App.tsx` → `pages/CaptureScreen.tsx`) y que
  renderiza una sola pantalla de la app dentro del `AppShell`, sin login.
- No usa la base real. El script deja una sesión de Supabase falsa en `localStorage` e
  intercepta **todas** las llamadas al host de Supabase, respondiéndolas con los datos
  de demo definidos arriba de todo en el propio script (notas de la comunidad, notas
  propias del mes, sesiones de reset, perfil). Si querés cambiar lo que se ve en las
  capturas — nombres, textos, racha, XP —, se edita ahí.
- Capturar sin sesión también funciona, pero Comunidad y Diario mental salen con sus
  estados vacíos, que en la landing quedan pobres.
