# Kognit — CLAUDE.md

App de entrenamiento mental para público general. PWA instalable mobile-first (manifest + service worker), todo el UI está en español rioplatense.

## Monorepo: sitio y app son dos builds separadas

El repo es un monorepo de workspaces de npm con **dos aplicaciones independientes que se sirven desde el mismo origin**:

```
apps/web     → sitio público (landing, precios, contacto)   → dist/       → kognit.in/
apps/app     → PWA autenticada (Tilt, cartas, comunidad…)   → dist/app/   → kognit.in/app/
packages/ui       → shadcn/ui + tokens de diseño + preset de Tailwind + chrome del sitio
packages/i18n     → locales partidos por scope + init de i18next
packages/supabase → cliente y tipos generados
server.js         → express: sirve dist/ en / y dist/app/ en /app  (startup file de Hostinger)
```

**Mismo origin, no subdominio.** Es deliberado: la sesión de Supabase vive en `localStorage`, que es por origin, y la identidad de la PWA instalada también. Mover la app a `app.kognit.in` desloguearía a todos y dejaría huérfanas las instalaciones existentes.

Reglas al trabajar acá:

- **El sitio nunca importa de la app ni al revés.** Lo que necesiten los dos va a `packages/`. El único chrome compartido es `SiteHeader`/`SiteFooter`/`LanguageSwitcher` (en `packages/ui/src/site/`), que aceptan un prop `external` para cuando los rendea la app.
- **Los links entre las dos apps son `<a href>`, no `<Link>`.** Son SPAs distintas: un `<Link to="/precio">` desde la app resolvería a `/app/precio` por el `basename`.
- **Los locales están partidos en `common` / `site` / `app`** (ver sección de i18n). Un string del landing no se empaqueta en la app y viceversa.
- **Hay un kill-switch de service worker en `apps/web/public/sw.js`.** No borrarlo sin leer `APP-WEB.md`.

Ver [`APP-WEB.md`](APP-WEB.md) para el detalle del deploy y los pasos manuales.

## Stack

| Capa | Tecnología |
|---|---|
| Framework | React 18 + TypeScript |
| Build | Vite 5 + SWC (`@vitejs/plugin-react-swc`) |
| Estilos | Tailwind CSS 3 + `tailwindcss-animate` |
| Componentes | shadcn/ui (Radix UI primitives) |
| Backend / Auth / DB | Supabase (`@supabase/supabase-js`) |
| Server state | TanStack Query v5 |
| Routing | React Router DOM v7 |
| Formularios | React Hook Form + Zod |
| Animación | Framer Motion |
| PWA | `vite-plugin-pwa` (manifest + service worker generado con Workbox) |
| Iconos | Lucide React |
| Fuentes | Poppins (display) · Hind (body) · EB Garamond (cartas) via `@fontsource` |
| Sonido | Web Audio API — `apps/app/src/lib/sound.ts` |
| Servidor de producción | Express (`server.js`) |
| Tests | Vitest + Testing Library |
| Linter | ESLint v9 |
| Package manager | **npm** con workspaces (`package-lock.json`) — es lo que corre el build en Hostinger. Hay un `bun.lockb` viejo que quedó sin uso |

## Comandos

Todos desde la raíz del repo:

```bash
npm run dev          # dev server del sitio (:8080); proxya /app al de la app
npm run dev:app      # dev server de la app sola (:8081)
npm run dev:all      # las dos a la vez
npm run build        # buildea sitio → dist/ y app → dist/app/  (en ese orden)
npm start            # server.js sobre el build ya hecho
npm run preview      # build + server.js
npm run typecheck    # tsc por app (cada una tiene su propio "@/")
npm test             # vitest run
npm run lint         # eslint
```

El orden del build importa: `apps/web` limpia `dist/` entero, así que tiene que ir **antes** que `apps/app`, que escribe en `dist/app/`.

## Rutas

### Sitio público — `apps/web` (router sin `basename`)

| Path | Componente | Descripción |
|---|---|---|
| `/` | `pages/Index.tsx` | Landing + carrusel de capturas (`AppScreensCarousel`). Si la PWA corre en modo standalone (instalada), redirige a `/app` en vez de mostrar la landing (`LandingOrApp` en `App.tsx`, hook `useStandaloneMode`) |
| `/funciones` | `pages/Features.tsx` | Detalle de las funciones de la app |
| `/casos-de-uso` | `pages/UseCases.tsx` | Casos de uso por tipo de situación (alta exigencia, presión, sin segunda oportunidad, mal momento) |
| `/precio` | `pages/Pricing.tsx` | Planes (`SitePricing`) + FAQ |
| `/contacto` | `pages/Contact.tsx` | Formulario de contacto (tabla `contact_messages`) |
| `/auth`, `/reset-password`, `/tilt` | `RedirectToApp` | Redirects a `/app/...`. Existen solo para no romper links viejos (mails de Supabase, bookmarks, callback de Google). Preservan `search` **y `hash`** — el link de reset trae los tokens en el fragmento, que un redirect del servidor perdería |
| `*` | `pages/NotFound.tsx` | 404 |

### App — `apps/app` (router con `basename="/app"`)

Dentro del código las rutas se escriben sin el prefijo; el `basename` lo agrega.

| Path real | Path en el código | Componente | Descripción |
|---|---|---|---|
| `/app` | `/` | `pages/MobileApp.tsx` | Shell de la app autenticada |
| `/app/auth` | `/auth` | `pages/Auth.tsx` | Login / signup / forgot / guest |
| `/app/reset-password` | `/reset-password` | `pages/ResetPassword.tsx` | Callback de reset de contraseña |
| `/app/tilt` | `/tilt` | `pages/TiltStandalone.tsx` | Protocolo de reset suelto |
| `/app/__capture/:screen` | idem | `pages/CaptureScreen.tsx` | Solo en dev: para `scripts/capture-screens.mjs` |
| `/app/*` | `*` | `pages/NotFound.tsx` | 404 |

`/app` requiere usuario autenticado; redirige a `/app/auth` si no hay sesión.

## Arquitectura de `/app`

`MobileApp.tsx` maneja todo el estado de navegación con un `useState<View>`. No usa React Router para las sub-pantallas — el cambio de vista es imperativo via callbacks.

```
View = "home" | "cards" | "calendar" | "community" | "profile" | "tilt" | "messages" | "settings"
Tab  = "home" | "cards" | "calendar" | "community" | "profile"  ← visible en BottomNav
```

`BottomNav` se oculta en las vistas `tilt`, `messages` y `settings` (pantallas de flujo completo).

## PWA

Configurada con `vite-plugin-pwa` **solo en `apps/app`** (`apps/app/vite.config.ts`, estrategia `injectManifest`, `registerType: "autoUpdate"`). El sitio público no tiene service worker.

- **Manifest**: es un **archivo estático** en `apps/web/public/manifest.webmanifest`, servido en la raíz y linkeado desde los dos `index.html`. **No lo genera el plugin** (`manifest: false` en `apps/app/vite.config.ts`), porque con `base: "/app/"` saldría bajo `/app/` y ahí no sirve.

  El punto clave: **el scope del manifest y el del service worker son independientes, y acá tienen que ser distintos.**

  | | Valor | Por qué |
  |---|---|---|
  | Manifest `scope` | `"/"` | Una página fuera del scope del manifest **no es instalable**. Con el manifest acotado a `/app/`, la landing dejaba de ofrecer la instalación y el CTA "Instalar app" no aparecía nunca |
  | Manifest `start_url` | `"/app/"` | Instalada, la PWA arranca en la app, no en la landing |
  | Manifest `id` | `"/"` | Se resuelve contra el origin → `https://kognit.in/`, el mismo id que ya tienen las instalaciones existentes. Si se saca (o se deja derivar del `start_url`), Chrome trata esto como una app nueva y las instalaciones actuales quedan huérfanas |
  | SW `scope` | `"/app/"` | El SW **sí** queda confinado a la app: es lo que evita que vuelva a servir HTML cacheado en todo el sitio |
- **Iconos**: siguen en la raíz servida (`apps/web/public/icons/`) y el manifest los referencia con rutas absolutas `/icons/...`. Generados a partir de `apps/app/src/assets/kognit-logo.png`. Regenerarlos: partir de un logo cuadrado grande (1034×1034) y re-exportar a los tamaños de `icons/`; el maskable necesita el contenido centrado dentro de la "safe zone" (~60% del lienzo) sobre fondo opaco (`#2E6F9E`, mismo tono que `theme_color`).
- **Kill-switch del SW viejo** (`apps/web/public/sw.js`): hasta la separación había un service worker registrado en `/sw.js` con scope `"/"` y `navigateFallback` a `/index.html`. Ese registro sigue vivo en el browser de todo el que visitó el sitio y, si no se lo saca, sigue sirviendo el HTML viejo para **todas** las rutas para siempre. El archivo nuevo en esa misma URL borra las caches, se desregistra y recarga las pestañas. `apps/web/src/main.tsx` hace lo mismo desde el lado del cliente (`unregisterLegacyServiceWorker`). **No borrar** hasta que no queden instalaciones viejas — ver `APP-WEB.md`.
- **Redirect standalone→app**: como algunas instalaciones previas tardan en tomar el manifest nuevo, y iOS abre en la URL que estaba activa al hacer "Agregar a pantalla de inicio", `apps/web/src/App.tsx` lo cubre en runtime: `LandingOrApp` usa `useStandaloneMode()` (media query `display-mode: standalone` + `navigator.standalone` en iOS) para mandar a `/app` si la PWA ya corre instalada.
- **Service worker de la app**: precachea el shell (JS/CSS/HTML/assets) y agrega runtime caching para Supabase — `CacheFirst` para Storage (imágenes de notas), `NetworkFirst` para REST/Auth.
- **Instalación**: `packages/ui/src/hooks/use-install-prompt.ts` escucha `beforeinstallprompt` (Chrome/Edge/Android) y expone `canInstall`/`promptInstall()`; el CTA "Instalar app" del `SiteHeader` solo aparece cuando el navegador considera la PWA instalable. iOS Safari no dispara este evento — ahí la instalación es manual vía "Compartir → Agregar a pantalla de inicio" (por eso los meta tags `apple-mobile-web-app-*` en `apps/app/index.html`).

### Pantallas (`apps/app/src/pages/kognit/`)

| Archivo | Vista | Descripción |
|---|---|---|
| `Home.tsx` | `home` | Dashboard: slot contextual según el estado mental elegido + selector de estado + tiles fijos de Ancla y Reset (ver "Home contextual") |
| `Tilt.tsx` | `tilt` | Protocolo de reset: respiración 4·7·8 o 4·4·4 → grounding → estado emocional → check |
| `Cards.tsx` | `cards` | Cartas de coaching mental por categoría |
| `Calendar.tsx` | `calendar` | Diario mental: calendario, notas rápidas y gráfico de foco semanal |
| `Profile.tsx` | `profile` | Perfil: stats del usuario (foco, control emocional, racha, xp), logros y plan Kognit Pro |
| `Settings.tsx` | `settings` | Configuración: editar nombre, recordatorio diario, sonido, preferencias (dark mode/vibración/idioma), privacidad, cerrar sesión y borrar cuenta — se llega desde el ícono de engranaje en `Profile.tsx` |
| `Community.tsx` | `community` | Feed de notas públicas y reposts, reacciones emoji, imágenes opcionales, respuesta privada (DM) o pública (gateada por conexión mutua) y reposteo ("renotear") |
| `Messages.tsx` | `messages` | Bandeja de mensajes directos: tabs de mensajes/solicitudes, búsqueda, mute/bloqueo/borrado por conversación, hilo con texto y notas de voz — abierta a todos los usuarios (no requiere Kognit Pro) |
| `Onboarding.tsx` | — | Solo usado en la landing `/` |

## Base de datos (Supabase)

Proyecto: `wpjufgefhcyncseuikel` (región `sa-east-1`). Historial de migraciones (siempre sin datos reales que preservar): `urebsukvtbdhtkixyyaw` (original) → `goqrqtfdsrmjqjimjtwx` (2026-07-06) → `wpjufgefhcyncseuikel` (2026-07-07, org `vxhgumbsvhubtqdznhdu`).

### Tablas

**`profiles`** — stats del usuario (1:1 con `auth.users`)
```
id, display_name, avatar_url, focus_level, emotional_control,
total_resets, streak_days, xp,
reminder_enabled, reminder_time,
plan ("free"|"pro"), plan_status, plan_current_period_end,
mercadopago_customer_id, mercadopago_preapproval_id,
created_at, updated_at
```
`plan`/`plan_status`/`mercadopago_*`/`plan_current_period_end` solo los puede escribir la service role (trigger `protect_plan_columns`, migración `20260706120000_mercadopago_plans.sql`) — es la Edge Function `mercadopago-webhook` la única fuente de verdad, nunca el cliente.

> **Nota de drift de schema** (detectado 2026-07-10 al regenerar `types.ts`): la tabla real en Supabase tiene además `goals text[]`, `tilt_triggers text[]` y `onboarding_completed boolean` — columnas que no corresponden a ninguna migración en `supabase/migrations/`. Probablemente se agregaron a mano desde el dashboard de Supabase en algún momento. No se tocaron ni se documentan en detalle acá porque no hay código en el repo que las use todavía; si vas a depender de ellas, confirmá primero contra el schema real (`supabase gen types`) en vez de este archivo.

**`message_requests`** — estado de "solicitud" de mensajería por par de usuarios (no por mensaje)
```
id, user_min, user_max (par ordenado: user_min < user_max),
initiator_id, status ("pending"|"accepted"|"declined"),
created_at, updated_at
```
Se crea/actualiza automáticamente desde la función `send_direct_message()` (ver abajo). Un rechazo es "blando": el iniciador puede reescribir y la solicitud vuelve a `pending`.

**`user_blocks`** — bloqueo de usuario a usuario
```
id, blocker_id, blocked_id, created_at
```
El helper `is_blocked_pair(a, b)` (`SECURITY DEFINER`) chequea bloqueo en cualquier dirección sin depender de RLS del otro lado; se usa en la policy de INSERT de `messages` y dentro de `send_direct_message()`.

**`conversation_settings`** — mute / borrado de conversación, por usuario (no afecta al otro lado)
```
id, owner_id, peer_id, muted, deleted_at, created_at, updated_at
```

**`user_connections`** — "Conectar": arista dirigida entre dos usuarios
```
id, follower_id, following_id, created_at
```
Constraint `UNIQUE (follower_id, following_id)` + `CHECK (follower_id <> following_id)`. La UI **nunca dice "seguir"**: siempre "Conectar" / "Conectado" (un solo lado conectó) / "Conectados" (mutuo). El helper `is_mutually_connected(a, b)` (`SECURITY DEFINER`, mismo patrón que `is_blocked_pair`) chequea que la arista exista en ambas direcciones; se usa en la policy de INSERT de `note_public_replies`. El estado "mutuo" y el conteo de conectados (`PublicProfileSheet.tsx`) se calculan en el cliente con dos SELECT (a quién sigue el perfil, quién sigue al perfil) intersectados en JS, no hay columna denormalizada. El INSERT exige `NOT is_blocked_pair(follower_id, following_id)`.

**`reset_sessions`** — cada ejecución del protocolo Tilt
```
id, user_id, mode ("deep"|"fast"), state, states[],
pre_intensity, post_intensity, note, created_at
```

**`calm_anchors`** — el "ancla de calma": la frase que el usuario fija en un buen momento para volver a ella cuando está en tilt (migración `20260809120000_calm_anchors.sql`)
```
user_id (PK, →auth.users), phrase, created_at, updated_at
```
`user_id` como primary key: el ancla es **única y mutable**, y así lo garantiza el schema en vez de la UI. `created_at` **no** se toca al editar la frase (es la misma ancla, refinada) — es lo que alimenta el "la venís usando hace N días" del Home; solo se reinicia si se borra la fila, que es lo que hace guardar vacío.

Tabla aparte y no una columna de `profiles` **a propósito**: desde `20260710120000_public_profiles_rls.sql` la tabla `profiles` es legible por cualquier autenticado (`USING (true)`, para resolver nombres de autores en Comunidad), y RLS no filtra por columna. El ancla es el texto más íntimo de la app, así que necesita su propia tabla con RLS de dueño en las cuatro operaciones.

Antes vivía en `localStorage` (`kognit:calm-anchor-phrase`); `hooks/use-calm-anchor.ts` sube lo que haya quedado ahí la primera vez que corre, para no comerse el ancla de quien ya tenía una.

**`ritual_entries`** — legacy, la feature de Ritual diario fue eliminada; tabla sin escritura desde la app
```
id, user_id, energy, body_tension, emotional_state,
reflection, gratitude, intention, created_at
```

**`notes`** — notas de la comunidad
```
id, user_id, title, content, mood, tag, image_url,
visibility ("public"|"private"), created_at, updated_at
```

**`note_reactions`** — reacciones emoji en notas
```
id, note_id (→notes), user_id, reaction, created_at
```

**`note_public_replies`** — respuesta pública a una nota, visible en el feed (distinta de la respuesta privada por DM, ver `messages` abajo)
```
id, note_id (→notes), user_id, content, created_at
```
Lectura sin gate (misma regla que `note_reactions`: visible si la nota es visible). Escritura sí gateada: el propio autor de la nota siempre puede responderse a sí mismo; cualquier otro usuario necesita `is_mutually_connected(auth.uid(), n.user_id)` y no estar bloqueado. Se muestra en `Community.tsx` como un panel expandible por nota (`NoteCard.tsx` → `PublicReplyThread.tsx`); el botón para escribir se ve bloqueado con un tooltip cuando no hay conexión mutua, pero el panel de lectura siempre está disponible.

**`note_reposts`** — "renotear" la nota de otro usuario al feed, estilo retweet
```
id, user_id (reposteador), note_id (→notes), created_at
```
Nunca copia contenido ni oculta al autor original — el feed de `Community.tsx` arma un `FeedItem` por cada repost que sigue apuntando a la nota y al autor originales. `UNIQUE (user_id, note_id)`. Sin protección contra repostear tu propia nota a nivel de constraint (un `CHECK` no puede mirar otra tabla); se resuelve ocultando el botón en la UI. No hay reposteo de reposts (el botón solo aparece sobre notas orgánicas). Una misma nota puede aparecer dos veces en el feed (orgánica + repost), es esperado.

**`messages`** — mensajes directos entre usuarios (bandeja de "Mensajes"), texto y/o audio
```
id, sender_id, recipient_id, note_id (→notes, nullable),
content (nullable), audio_path (nullable), audio_duration_seconds (nullable),
read, created_at
```
`CHECK (content IS NOT NULL OR audio_path IS NOT NULL)` — un mensaje tiene que tener texto o audio (o ambos). El cliente **no inserta directo**: siempre pasa por la función `send_direct_message(p_recipient_id, p_content?, p_note_id?, p_audio_path?, p_audio_duration_seconds?)`, que en una sola transacción crea/reactiva la fila de `message_requests` correspondiente, chequea `is_blocked_pair()` y recién ahí inserta el mensaje. La policy de INSERT de `messages` también exige `NOT is_blocked_pair(sender_id, recipient_id)` como defensa en profundidad.

**`contact_messages`** — mensajes del formulario público de `/contacto` (migración `20260721120000_contact_messages.sql`)
```
id, name, email, message, created_at
```
Solo INSERT para `anon`/`authenticated` (`WITH CHECK (true)`), sin policy de SELECT — nadie lee mensajes ajenos con la anon key, el equipo los revisa desde el dashboard de Supabase (service role bypasea RLS).

**`feedback_submissions`** — feedback del programa de testers (migración `20260723120000_feedback_submissions.sql`)
```
id, user_id, name, email, category ("bug"|"idea"|"confusing"|"other"), message, created_at
```
Lo escribe `components/kognit/FeedbackTab.tsx` (pestaña fija en el borde derecho de `/app`): el usuario solo elige categoría y escribe el comentario — `name`/`email` van como campos ocultos tomados de la sesión, desnormalizados para poder leer la tabla sin joins. Solo INSERT y solo en nombre propio (`WITH CHECK (user_id = auth.uid())`), sin policy de SELECT, mismo criterio que `contact_messages`.

**`prelaunch_signups`** — lista de espera del prelanzamiento (migración `20260722120000_prelaunch_signups.sql`)
```
id, name, email (unique), created_at
```
Lo escribe `components/site/PrelaunchSignup.tsx` (sección "Anotate al prelanzamiento" de `Index.tsx`, entre Prototipo interactivo y Precios): nombre + email a cambio de 6 meses de Kognit Pro para el primer grupo de testers. `email` tiene constraint `UNIQUE`; un duplicado (`error.code === "23505"`) se muestra como aviso de "ya estás anotado", no como error. Solo INSERT para `anon`/`authenticated` (`WITH CHECK (true)`), sin policy de SELECT, mismo criterio que `contact_messages`.

### Storage

- **`note-images`** (público) — imágenes opcionales adjuntas a notas de comunidad. Path `{user_id}/{uuid}.{ext}`; RLS: lectura pública, escritura/borrado restringidos a la carpeta del propio usuario (`storage.foldername(name)[1] = auth.uid()`).
- **`avatars`** (público) — foto de perfil (`profiles.avatar_url`). Mismo esquema de path/RLS que `note-images`. Sin UI de subida todavía — la columna e infraestructura están listas pero ningún flujo del cliente escribe `avatar_url` por ahora.
- **`voice-messages`** (privado) — notas de voz de mensajería directa. Path `{userA}_{userB}/{uuid}.{ext}` con el par de ids **ordenado** (`[a, b].sort().join("_")`, mismo criterio que `message_requests`); RLS compara contra ambas mitades del nombre de carpeta separado por `_`, así que solo los dos participantes de esa conversación pueden leer/escribir/borrar. Se reproducen vía URLs firmadas (`createSignedUrls`, TTL 24hs), no son públicas.

### Cliente Supabase

```ts
import { supabase } from "@/integrations/supabase/client";
```

Tipos generados en `src/integrations/supabase/types.ts`. Si se modifica el schema en Supabase, regenerar con `supabase gen types`.

### Variables de entorno

```
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```

Definidas en `.env` (no commitear). El `.env` está en `.gitignore`.

### Variables de entorno de las Edge Functions (Mercado Pago)

Se configuran como secrets de Supabase (`supabase secrets set ...`), nunca en `.env` del frontend:

```
MERCADOPAGO_ACCESS_TOKEN       # access token del vendedor (TEST-... en sandbox, APP_USR-... en producción)
MERCADOPAGO_WEBHOOK_SECRET     # secret key para validar la firma x-signature de las notificaciones
MERCADOPAGO_PLAN_ID_MONTHLY    # preapproval_plan_id del plan mensual (creado una vez vía POST /preapproval_plan)
MERCADOPAGO_PLAN_ID_ANNUAL     # preapproval_plan_id del plan anual con descuento
APP_URL                        # URL pública de la app, usada como back_url del checkout de MP
```

## Auth

`src/contexts/AuthContext.tsx` expone `useAuth()`:
```ts
{ user: User | null, session: Session | null, loading: boolean, signOut: () => Promise<void> }
```

Modos de auth:
- Email + password (login / signup)
- Forgot password → email con redirect a `/reset-password`
- **Guest mode**: `supabase.auth.signInAnonymously()` — requiere "Allow anonymous sign-ins" habilitado en el dashboard de Supabase

## Estructura de archivos

```
├── server.js                          # Express: dist/ en / y dist/app/ en /app — startup file de Hostinger
├── tsconfig.base.json                 # Compiler options + paths de @kognit/*
├── vitest.config.ts                   # Un solo runner para todo el monorepo
├── test/setup.ts
│
├── apps/web/                          # ── SITIO PÚBLICO → dist/ → kognit.in/
│   ├── index.html                     # Meta tags de SEO/OG del sitio
│   ├── vite.config.ts                 # Sin PWA; proxya /app al dev server de la app
│   ├── public/                        # Se sirve en la raíz: favicon, logo.png, icons/, screens/, mascota/, og, robots
│   │   ├── .htaccess                  # Fallback SPA del sitio (si Hostinger sirviera estático)
│   │   └── sw.js                      # Kill-switch del service worker viejo — ver PWA
│   └── src/
│       ├── App.tsx                    # Rutas del sitio + redirects legacy a /app
│       ├── main.tsx                   # initI18n("site") + desregistro del SW viejo
│       ├── components/
│       │   ├── ProTrialModal.tsx      # Modal del programa de testers — montado en App.tsx, aparece a los 10s
│       │   └── site/
│       │       ├── AppScreensCarousel.tsx # Capturas de public/screens/ (ver docs/capturas.md)
│       │       ├── PrelaunchSignup.tsx     # Lazy: es lo único del home que usa Supabase + zod
│       │       └── SitePricing.tsx
│       └── pages/                     # Index, Features, UseCases, Pricing, Contact, NotFound
│
├── apps/app/                          # ── PWA → dist/app/ → kognit.in/app/
│   ├── index.html                     # noindex + meta tags de iOS
│   ├── vite.config.ts                 # base "/app/" + VitePWA (injectManifest)
│   ├── public/.htaccess               # Fallback SPA de la app
│   └── src/
│       ├── App.tsx                    # BrowserRouter con basename="/app"
│       ├── main.tsx                   # initI18n("app")
│       ├── sw.ts                      # Service worker propio (push + notificationclick)
│       ├── assets/                    # Mascotas por emoción, calm-anchor, kognit-logo
│       ├── contexts/AuthContext.tsx
│       ├── components/
│       │   ├── icons/GoogleIcon.tsx
│       │   └── kognit/
│       │       ├── AppShell.tsx       # Layout: SideNav en desktop, BottomNav en mobile
│       │       ├── SideNav.tsx        # Navegación lateral (desktop, ≥md)
│       │       ├── BottomNav.tsx      # Navegación inferior (mobile)
│       │       ├── FeedbackTab.tsx    # Pestaña del borde derecho + formulario de feedback
│       │       ├── NoteComposer.tsx   # Modal para escribir nota de comunidad
│       │       ├── ReplyComposer.tsx  # Modal de respuesta por DM (usa el RPC send_direct_message)
│       │       ├── NoteCard.tsx       # Tarjeta de nota/repost del feed de Comunidad: header, reacciones, acciones
│       │       ├── PublicReplyThread.tsx # Panel expandible de respuestas públicas de una nota
│       │       ├── Avatar.tsx         # Círculo/cuadrado con foto o iniciales de fallback
│       │       ├── PublicProfileSheet.tsx # Perfil público de otro usuario: stats + Conectar
│       │       └── MessageThread.tsx  # Hilo de un DM: texto + audio, solicitudes, bloqueo
│       ├── data/
│       │   ├── mentalCards.ts         # Estructura (id, accent, cardCount) — el texto vive en los locales
│       │   └── moods.ts               # Ids de MOOD_OPTIONS y REACTIONS — el texto vive en los locales
│       ├── hooks/
│       │   ├── use-voice-recorder.ts   # Sobre VoiceRecorder (lib/audio.ts): idle/recording/recorded
│       │   └── use-calm-anchor.ts      # Ancla de calma contra `calm_anchors` + días desde created_at
│       ├── lib/
│       │   ├── audio.ts               # VoiceRecorder (MediaRecorder nativo) + helpers de mime/duración
│       │   ├── sound.ts               # playBong() — Web Audio API
│       │   └── tiltEngine.ts          # Motor de respiración + isBreathDone()
│       └── pages/
│           ├── Auth.tsx, ResetPassword.tsx, MobileApp.tsx, TiltStandalone.tsx, NotFound.tsx
│           ├── CaptureScreen.tsx      # Solo-dev /__capture/:screen para generar public/screens/
│           └── kognit/                # Pantallas de la app
│
└── packages/                          # ── COMPARTIDO
    ├── ui/src/
    │   ├── index.css                  # Variables CSS (tokens de diseño) — lo importan los dos main.tsx
    │   ├── tailwind.preset.ts         # Preset que extienden ambos tailwind.config.ts
    │   ├── components/                # shadcn/ui (no editar manualmente)
    │   ├── site/                      # Chrome del sitio, usado también por /app/auth
    │   │   ├── SiteHeader.tsx         # Acepta `external` para links absolutos desde la app
    │   │   ├── SiteFooter.tsx         # Idem
    │   │   ├── SiteLink.tsx           # <Link> o <a> según `external`
    │   │   └── LanguageSwitcher.tsx
    │   ├── hooks/                     # use-toast, use-mobile, use-standalone-mode, use-install-prompt
    │   └── lib/
    │       ├── utils.ts               # cn() helper + timeAgo() formatter
    │       └── preferences.ts         # localStorage: dark mode, sonido, vibración, pro-trial
    ├── i18n/src/
    │   ├── core.ts                    # init/load/changeLanguage — sin bundles estáticos
    │   ├── language.ts                # SUPPORTED_LANGUAGES + get/setLanguage
    │   ├── site.ts / app.ts           # Wrapper por scope: bundle `es` estático + loaders del resto
    │   └── locales/<código>/{common,site,app}.json
    └── supabase/src/                  # client.ts (createClient singleton) + types.ts (NO editar a mano)
```

## Capturas de la landing

El carrusel del home muestra imágenes de `public/screens/*.webp`, no la app montada.
Se regeneran con `node scripts/capture-screens.mjs` (requiere el dev server corriendo).
El detalle del flujo está en [`docs/capturas.md`](docs/capturas.md).

## Diseño y estilos

### Tokens CSS personalizados (definidos en `index.css`)

Gradientes:
- `bg-gradient-hero` — fondo principal de la app (oscuro/neutro)
- `bg-gradient-primary` — teal/verde azulado (acción primaria)
- `bg-gradient-emergency` — azul cobalto (protocolo tilt/reset)
- `bg-gradient-deep` — oscuro profundo (pantalla de flujo: Tilt)

Sombras: `shadow-card`, `shadow-soft`, `shadow-glow`, `shadow-emergency`

Animaciones: `animate-float-slow` (mascota), `animate-pulse-ring` (botón tilt)

Color extra: `warning` (amarillo/naranja, disciplina), `cyan` (celeste, categoría "Conexión Interna" de cartas mentales)

### Fuentes

- Display / headings (`h1`-`h4`, `.font-display`): Poppins bold, tracking negativo (`-0.02em`)
- Body / UI: `font-sans` → Hind (weights: 300 · 400 · 500 · 600 · 700), tracking negativo leve (`-0.011em` global en `body`)
- Cartas mentales (`Cards.tsx`): `font-serif` → EB Garamond (weights: 400 · 500 · 600 + italic 400) — transmite sabiduría, se usa en título, mensaje y acción de cada carta

### Convenciones de UI

- Bordes redondeados agresivos: `rounded-2xl`, `rounded-3xl`
- Glassmorphism en flujos oscuros: `bg-white/10 backdrop-blur border border-white/15`
- Texto en mayúsculas con tracking para labels: `text-[10px] uppercase tracking-[0.25em] font-bold`
- Todos los textos de la interfaz en **español rioplatense** (vos, sos, etc.)
- **El fondo lo pinta el contenedor, no la pantalla**: las pantallas de `pages/kognit/` no llevan `bg-gradient-hero`/`bg-gradient-deep` en su root — lo pone `AppShell` (en `/app`) o `PhoneFrame` (en el showcase de la landing), vía su prop `surface`. `--gradient-hero` recalcula sus radiales según el tamaño de **cada** caja, así que si lo pintan el contenedor y la pantalla quedan dos degradés desfasados (se ve en desktop, donde la columna de contenido es más angosta que el viewport). Misma lógica para la navegación: es chrome del contenedor.

## Cartas mentales

`apps/app/src/data/mentalCards.ts` — 5 categorías, 10 cartas cada una:

| id | Nombre | Accent |
|---|---|---|
| `habits` | Rutinas de Éxito | seafoam (verde agua) |
| `focus` | Poder del Enfoque | info (azul) |
| `mindfulness` | Conexión Interna | cyan (celeste) |
| `stress` | Dominio Emocional | destructive (azul cobalto) |
| `performance` | Máximo Rendimiento | primary (teal/verde azulado) |

Cada carta es un flip card (`Cards.tsx`): lado A muestra el título (formulado como pregunta, ej. "¿Te cuesta dar el primer paso?"), lado B (al deslizar) muestra mensaje + acción concreta. El texto (nombre/tagline de categoría, título/mensaje/acción de cada carta) vive en `packages/i18n/src/locales/<código>/app.json` bajo `mentalCards.categories.<id>`; para agregar una carta, sumar la entrada en `CATEGORIES` (`mentalCards.ts`) **y** el texto correspondiente en el JSON. No hay backend para este contenido.

## Internacionalización (i18n)

`i18next` + `react-i18next`. Idioma por defecto: `es` (fallback siempre `es`).

Idiomas soportados (`packages/i18n/src/language.ts` → `SUPPORTED_LANGUAGES`, cada uno con su carpeta en `packages/i18n/src/locales/`):

| Código | Idioma |
|---|---|
| `es` | Español (default) |
| `en` | English |
| `pt` | Português |
| `it` | Italiano |
| `hi` | हिन्दी |
| `fr` | Français |
| `de` | Deutsch |
| `zh-CN` | 简体中文 |
| `zh-TW` | 繁體中文 (Taiwán) |
| `ja` | 日本語 |

### Los locales están partidos por scope

Cada idioma es una **carpeta con tres archivos**, no un JSON único:

```
packages/i18n/src/locales/<código>/
├── common.json   # lo que usan las dos apps: app, common, notFound, chrome (header/footer), plans
├── site.json     # solo el sitio: landing, featuresPage, useCasesPage, pricingPage, contactPage, prelaunchSection
└── app.json      # solo la app: auth, home, tilt, cards, calendar, profile, community, messages, mentalCards, moods…
```

`apps/web` carga `common + site`; `apps/app` carga `common + app`. Los dos se fusionan en el namespace `translation` de i18next, así que **los `t("...")` en el código no cambian**: se sigue escribiendo `t("landing.heroTitleLine1")` o `t("tilt.header")` sin prefijo de archivo.

- **Al agregar un string, elegí el archivo por quién lo usa.** Si lo necesitan los dos lados va a `common.json`; si no, al que corresponda. Poner un string de la app en `site.json` no da error de compilación — simplemente no se resuelve en runtime y cae al fallback.
- `common.chrome.*` es el texto del header/footer compartidos, y `common.plans.*` son los planes (los usan `SitePricing` en el sitio y la tarjeta de plan de `Auth.tsx` en la app).
- Solo el bundle `es` se importa estático; los otros 9 se bajan on-demand por `import()` cuando el usuario cambia de idioma (`packages/i18n/src/{site,app}.ts`). `initI18n()` se espera antes del primer render (ver ambos `main.tsx`) para que un usuario en otro idioma no vea un flash en español.
- **Al importar helpers de idioma desde código compartido, usá `@kognit/i18n/language` y `@kognit/i18n/core`, nunca `/site` ni `/app`** — esos dos traen el bundle español de su scope y meterían el texto del lado equivocado en el bundle.
- El usuario elige idioma en **Perfil → Preferencias → Idioma** (`Profile.tsx`) o en el `LanguageSwitcher` del header. La elección persiste en `localStorage` (`kognit:language`) vía `getLanguage()`/`setLanguage()` y se aplica con `changeLanguage(code)`, que baja el bundle antes de cambiar.
- Los componentes usan `const { t } = useTranslation()` y `t("namespace.key")`. Interpolación con `{{variable}}` (ej. `t("tilt.exit.before", { value: preIntensity })`).
- Arrays/objetos anidados (preguntas de grounding, cartas mentales, notas de ejemplo del calendario) se leen con `t(key, { returnObjects: true })`. Como esto devuelve una referencia nueva en cada llamada, siempre memoizar con `useMemo(() => t(key, { returnObjects: true }), [t])` si el resultado entra en un array de dependencias de otro hook — de lo contrario se re-crean callbacks/efectos en cada render.
- Texto con markup embebido (ej. `<b>ELIMINAR</b>`/`<b>DELETE</b>`/etc. en el diálogo de borrar cuenta) usa el componente `<Trans i18nKey="..." components={{ b: <span /> }} />` en vez de `t()`. La palabra de confirmación (`profile.deleteAccount.confirmWord`) está traducida por idioma y debe coincidir exactamente con la que aparece dentro de `<b>` en `confirmPrompt` para ese mismo idioma, porque el código compara el input del usuario contra `confirmWord`.
- `data/mentalCards.ts` y `data/moods.ts` sólo contienen ids/estructura — nunca texto en ningún idioma; el texto siempre se resuelve vía `t()` en el componente usando el id como parte de la key.
- Al agregar/editar un string: hay que tocar el archivo correspondiente en los 10 idiomas (o al menos el de `es/`; el resto cae al fallback en español hasta traducirse, pero conviene mantenerlos sincronizados).
- **El scope se elige por quién monta el componente, no por dónde parece que va el texto.** `ProTrialModal` vive en `apps/web` pero sus claves habían quedado en `app.json`: como el sitio nunca carga ese archivo, el modal rendeaba las claves crudas (`proTrialModal.title`) en los 10 idiomas, español incluido. El texto de un componente de `apps/web` va a `site.json` aunque el componente hable de la app.
- **Deuda conocida**: de las 147 claves que efectivamente usa el sitio, 64 no están traducidas en ninguno de los 9 idiomas no-español (las páginas internas se agregaron después de la traducción inicial): `featuresPage.*`, `useCasesPage.*`, `pricingPage.faq.*`, `contactPage.*` y `prelaunchSection.*`. En esos idiomas esas páginas se ven en español; `landing.*`, `common.*` y `proTrialModal.*` sí están completas en los 10.
- **Deuda conocida en `app.json`**: a los 9 idiomas no-español les faltan las 17 claves de `community.*` / `publicProfile.*` que trajo Conectar/respuestas públicas/reposts (y siguen teniendo las viejas `community.reply` y `publicProfile.admire`, ya sin uso); `pt`, `de`, `zh-CN` y `zh-TW` además no tienen las 15 de `mentalCards.categories.*`. Todas caen al fallback en español. Medible con un diff de claves contra `es/app.json`.

## Home contextual y ancla de calma

El bloque de arriba del Home no es fijo: **el estado mental elegido decide qué se ofrece ahí**. La división está en `data/moods.ts` (`RESET_MOODS` / `needsReset()`, con tests en `moods.test.ts`) y son las dos filas de la grilla.

| Estado | Slot de arriba |
|---|---|
| `calm` · `focus` · `motivated`, sin ancla | Tarjeta `bg-secondary`: invita a definir el ancla, con el textarea vacío |
| `calm` · `focus` · `motivated`, con ancla | Misma tarjeta, con la frase en el textarea y su antigüedad en el pie del campo |
| `neutral` · `frustrated` · `tilt` | CTA `bg-gradient-emergency` de Reset, con copy por estado (`home.contextual.reset.lines.<mood>`) |
| Sin estado elegido | La variante del ancla, que es la callada — todavía no hay nada que afirmar sobre cómo está el usuario |

`neutral` cae del lado del reset a propósito: no es un mal estado, pero es del que hay que salir ("necesitás inspirarte").

La jerarquía visual sigue al estado emocional: en los estados buenos la app susurra (gris, input opcional), en los que piden reset grita **una** sola acción. Por eso el CTA grande de Reset que estaba siempre visible ya no existe — pero el Reset nunca queda inalcanzable: los **dos tiles fijos del pie** (Ancla y Reset, cada uno con una línea que explica para qué sirve) están en las tres variantes.

El ancla también aparece **dentro del Reset, en la fase `grounding`** (`Tilt.tsx`): es el punto donde la respiración ya bajó la activación y el usuario puede leer algo y que le signifique — en `intro` sería demasiado pronto y en `exit` demasiado tarde. Si nunca definió una, no se muestra nada; no es el momento de pedirle que escriba.

El explicador largo de cuatro pasos (`home.calmAnchor.steps`) se abre desde el `?` de la tarjeta o desde el tile, y se rendea **junto al que lo abrió** (estado `infoOpen: "hero" | "tile" | null`): un panel al pie no se lee como respuesta al `?` de arriba.

### El ancla no tiene botón de guardar

El textarea está siempre vivo — **no hay modo edición explícito, el foco es todo el estado que hay** — y autoguarda con 700 ms de debounce. Tres cosas sostienen eso:

- **Vaciar el campo no borra el ancla.** `save()` ignora el texto vacío (ver el comentario en `use-calm-anchor.ts`). Sin un botón que confirme, borrar para reescribir pasaría por el guardado con el texto vacío y se llevaría puesto el `created_at`, o sea el contador de días, entre dos pulsaciones de tecla. El ancla anterior sobrevive hasta que la reemplace un texto real; no hay forma de borrarla desde la UI, y por ahora no hace falta.
- **`savedPhraseRef` guarda el último texto persistido**, y va en un ref y no en `anchor` para que el efecto de autoguardado no se re-dispare cuando el propio guardado actualiza el hook (bucle).
- **El pie del campo reemplaza al botón como señal**, y va *adentro* del textarea, abajo a la derecha, en una sola línea de dos mitades separadas por `/`: a la izquierda el acuse del guardado (`anchorNote`), a la derecha la antigüedad del ancla (`anchorAge`). Cada mitad puede faltar y el separador solo aparece si están las dos. Por eso el campo es alto (`min-h-[5.5rem]` + `pb-6`): el pie necesita su propia franja para no pisar el texto. Va posicionado absoluto sobre una caja contenedora, no en el flujo, así que crecer o cambiar de estado no mueve nada.
  - `anchorNote`: en reposo "tocá para editar"; escribiendo, guardando/guardado en `text-seafoam` (el único verde de la paleta — no hay `--success`). Con el campo enfocado queda en `null`: ya estás editando, la pista sobra.
  - `anchorAge`: solo si ya existe un ancla.
  - El `min-h` del textarea **le gana al alto inline** que calcula `resizeAnchorTextarea`, así que el campo arranca alto y de ahí solo crece.

El estado se marca así: en reposo el campo **no tiene borde**, lo dibuja solo el fondo a `bg-card/80` (apoyado sobre el celeste de la tarjeta en vez de recortado contra él); al enfocar aparecen 2px de `gradient-info` y el fondo pasa a sólido. El borde transparente **no se saca** en reposo, para que la geometría sea idéntica en los dos estados. El degradé se hace con la técnica de capas del repo (wrapper con padding = grosor, contenido encima); el padding del wrapper es fijo en los dos estados y el grosor lo da el borde del textarea, así que enfocar no mueve el layout. Va `gradient-info` y **no `gradient-emergency`**: el cobalto es del Reset y meterlo en un input de calma manda la señal de crisis.

## Protocolo Tilt (flujo completo)

```
intro → pulse (pre_intensity) → breathe → grounding → state → check (post_intensity) → exit
```

Dos técnicas, definidas en `apps/app/src/lib/tiltEngine.ts` (`PATTERNS`) y cubiertas por tests:

| Modo | Título en la UI | Patrón | Ciclos | Duración |
|---|---|---|---|---|
| `fast` | Foco y Estabilidad | **4·4·4·4** (respiración en caja) | 4 | ~64 s |
| `deep` | Reset de Emergencia | 4·7·8 | 3 | ~57 s |

- **La cuarta fase de `fast` (`hold2`) es parte de la técnica**, no relleno: es la pausa con los pulmones vacíos que define la respiración en caja. Se refleja en tres lugares que hay que mantener sincronizados — el tipo `Phase`, el `scale` de la burbuja en `Tilt.tsx` (contrae a `0.7` en `hold2`, a diferencia de `hold` que retiene grande en `1.25`) y la clave `tilt.phases.hold2` en los 10 idiomas.
- Los nombres de los modos describen **el propósito, no la mecánica** ("Reset de Emergencia", no "Modo Profundo"): a esta pantalla se llega en crisis y el usuario no debería tener que traducir la mecánica a su situación.
- Al llegar a `exit`, guarda un `reset_sessions` en Supabase. `sessionSavedRef` previene doble-guardado. Las stats del perfil (foco, control emocional, racha, xp) **no** se recalculan acá: lo hace `MobileApp.loadProfile()` al abrir la app, a partir de toda la actividad.
- Sonido via `playBong()` (Web Audio API), activable por el usuario. Un tono por fase, elegido por **nombre** y no por índice (`in` 740 Hz · `hold` 520 · `out` 420 · `hold2` 330), para que el ejercicio se pueda seguir con los ojos cerrados. Las dos retenciones comparten la vibración corta.

## Logros

`apps/app/src/data/achievements.ts` — 9 logros, cada uno con su ilustración en `apps/app/src/assets/achievements/`. El texto (`title`, `criterion`, `reference`) vive en `profile.achievementsList.<id>` de los locales.

Los criterios vienen de literatura de hábitos y rendimiento, así que hay que traducirlos a algo que la app efectivamente observe. Las reglas viven en dos lugares: los umbrales simples en `data/achievements.ts`, y las señales derivadas del historial de resets en **`apps/app/src/lib/achievementSignals.ts`** (función pura con tests).

| Logro | Se desbloquea con | Señal |
|---|---|---|
| `calmAnchor` | primer reset | `totalResets >= 1` |
| `fiveDayStreak` | racha de 5 días | `streakDays >= 5` |
| `onePercentBetter` | 10 resets | `totalResets >= 10` |
| `closingRitual` | primera nota pública | `hasPublicNote` |
| `firstAlly` | primera reacción recibida | `hasReceivedReaction` |
| `twoMinuteRule` | 3 resets en modo rápido — el modo corto **es** la versión simplificada del hábito | `fastResets` |
| `unstoppable` | un reset que arranca en intensidad ≥ 8 y baja ≥ 4 puntos | `hadHardWin` |
| `caterpillarEffect` | el peor `post_intensity` de los últimos 10 resets mejora al peor de los 10 previos — "subir el piso" | `raisedFloor` |
| `flowState` | `isUnlocked: null` — **informativo**. Medir "desafío igual a habilidad por 20 minutos" necesita una feature de sesiones de foco que no existe | — |

**Dónde se calculan**: `MobileApp.loadProfile()` ya trae todas las `reset_sessions` para las métricas del perfil, así que `computeResetSignals()` corre sobre esa misma tanda y las señales bajan a `ProfileScreen` por props. No hay consultas extra.

`caterpillarEffect` mira el **máximo** (el peor resultado) y no el promedio a propósito: el criterio de la ficha habla de corregir tu error más frecuente, o sea de que tus peores días dejen de serlo tanto. Necesita 20 resets para tener las dos ventanas.

Si aparece la señal que cierra `flowState`, alcanza con cambiarle el `isUnlocked` de `null` a una función. Los que tienen umbral numérico definen además `progress`, que alimenta la barra de progreso de Kognit Pro.

## Reacciones en comunidad

5 reacciones predefinidas: `breathe` 🫁 · `focus` 🎯 · `inspire` 🌱 · `reflect` 💭 · `identify` 🤝. Se renderizan como mascotas (`ReactionIcon` en `MoodIcon.tsx`), no como el emoji — el emoji de arriba es solo la referencia visual de esta tabla. Tamaño `size={22}` en `NoteCard.tsx` (antes 16). La mascota de mood de cada nota (`MoodIcon`, condicional a que la nota tenga `mood`) también se agrandó, de `size={22}` a `size={36}` — a la misma altura que el `Avatar` (36px) — y se movió al extremo izquierdo del header de la tarjeta, antes del avatar (antes era el elemento más a la derecha).

Constraint de unicidad en Supabase: `(note_id, user_id)` → `upsert` con `onConflict`.

## Conectar, respuestas públicas y reposts

**Conectar** (`user_connections`, ver tabla arriba) reemplazó a la vieja "admiración" de perfiles. Regla dura de copy: **la UI nunca dice "seguir"** — siempre "Conectar" (CTA), "Conectado" (yo conecté, todavía no es mutuo) o "Conectados" (mutuo). El botón vive en `PublicProfileSheet.tsx` y toggle solo borra/inserta mi propia arista (`follower_id = auth.uid()`); el estado ajeno nunca se toca.

**Respuestas públicas** (`note_public_replies`) son la segunda forma de responder a una nota, además del DM privado existente. Asimetría clave: **leerlas no tiene gate** (cualquiera que vea la nota ve el hilo), **escribirlas sí** — necesita `is_mutually_connected()` con el autor de la nota (o ser el autor). En `NoteCard.tsx`, el botón de responder públicamente se ve bloqueado (ícono apagado + `Tooltip` con la explicación) cuando no hay conexión mutua; el panel de lectura/el chip "N respuestas públicas" igual están disponibles. El `Tooltip` de shadcn (`packages/ui/src/components/tooltip.tsx`) se controla a mano (`open`/`onOpenChange` por tap) en vez de dejarlo en su modo hover por default, porque en mobile un tap no dispara hover.

**Reposts** (`note_reposts`, "renotear") agregan la nota de otro usuario al feed sin copiar contenido ni ocultar al autor original — el `FeedItem` de tipo `"repost"` en `Community.tsx` sigue apuntando a la nota y al autor originales, solo agrega un banner "{reposteador} renoteó" arriba de la tarjeta. Sin reposteo de reposts (el botón solo aparece sobre notas orgánicas ajenas) y una misma nota puede aparecer dos veces en el feed (orgánica + repost) — es esperado.

## Alias de path

| Alias | Resuelve a | Dónde |
|---|---|---|
| `@/` | el `src/` **de la app que lo usa** | `apps/web/src/` o `apps/app/src/` según el archivo |
| `@kognit/ui/*` | `packages/ui/src/*` | ambas apps |
| `@kognit/i18n/*` | `packages/i18n/src/*` | ambas apps |
| `@kognit/supabase` | `packages/supabase/src/index.ts` | ambas apps |

Configurados en dos lugares que hay que mantener sincronizados: `resolve.alias` de cada `apps/*/vite.config.ts` y `paths` de `tsconfig.base.json` + `apps/*/tsconfig.json`.

**Dentro de `packages/` no se usan alias**: los imports entre archivos de un mismo package son relativos (`../lib/utils`). Los archivos que carga Node y no Vite — `tailwind.config.ts`, `eslint.config.js`, `vitest.config.ts` — tampoco pueden usar los alias de Vite; ahí van rutas relativas.

## Configuración shadcn/ui

`components.json` — componentes en `packages/ui/src/components/`, estilo `default`, Tailwind v3.
Para agregar un componente: `npx shadcn@latest add <nombre>`.

Ojo: shadcn genera imports con `@/lib/utils` y `@/components/ui/...`. Dentro de `packages/ui` esos alias no existen — hay que pasarlos a relativos (`../lib/utils`, `./button`) después de agregar un componente.
