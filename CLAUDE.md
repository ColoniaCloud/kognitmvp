# Kognit — CLAUDE.md

App de entrenamiento mental para jugadores de poker. PWA instalable mobile-first (manifest + service worker), todo el UI está en español rioplatense.

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
| `/casos-de-uso` | `pages/UseCases.tsx` | Casos de uso por tipo de jugador |
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

- **Manifest**: generado por el plugin, se emite en `/app/manifest.webmanifest`. `start_url` y `scope` son ambos `"/app/"` — el sitio queda fuera del alcance del SW. `id: "/"` está fijado **explícitamente**: se resuelve contra el origin, así que sigue dando `https://kognit.in/`, el mismo id que ya tienen las instalaciones existentes. Si se saca (o se deja derivar del `start_url`), Chrome trata esto como una app nueva y las instalaciones actuales quedan huérfanas.
- **Iconos**: siguen en la raíz servida (`apps/web/public/icons/`) y el manifest los referencia con rutas absolutas `/icons/...`. Generados a partir de `apps/app/src/assets/kognit-logo.png`. Regenerarlos: partir de un logo cuadrado grande (1034×1034) y re-exportar a los tamaños de `icons/`; el maskable necesita el contenido centrado dentro de la "safe zone" (~60% del lienzo) sobre fondo opaco (`#2E6F9E`, mismo tono que `theme_color`).
- **Kill-switch del SW viejo** (`apps/web/public/sw.js`): hasta la separación había un service worker registrado en `/sw.js` con scope `"/"` y `navigateFallback` a `/index.html`. Ese registro sigue vivo en el browser de todo el que visitó el sitio y, si no se lo saca, sigue sirviendo el HTML viejo para **todas** las rutas para siempre. El archivo nuevo en esa misma URL borra las caches, se desregistra y recarga las pestañas. `apps/web/src/main.tsx` hace lo mismo desde el lado del cliente (`unregisterLegacyServiceWorker`). **No borrar** hasta que no queden instalaciones viejas — ver `APP-WEB.md`.
- **Redirect standalone→app**: como algunas instalaciones previas tardan en tomar el manifest nuevo, y iOS abre en la URL que estaba activa al hacer "Agregar a pantalla de inicio", `apps/web/src/App.tsx` lo cubre en runtime: `LandingOrApp` usa `useStandaloneMode()` (media query `display-mode: standalone` + `navigator.standalone` en iOS) para mandar a `/app` si la PWA ya corre instalada.
- **Service worker de la app**: precachea el shell (JS/CSS/HTML/assets) y agrega runtime caching para Supabase — `CacheFirst` para Storage (imágenes de notas), `NetworkFirst` para REST/Auth.
- **Instalación**: `packages/ui/src/hooks/use-install-prompt.ts` escucha `beforeinstallprompt` (Chrome/Edge/Android) y expone `canInstall`/`promptInstall()`; el CTA "Instalar app" del `SiteHeader` solo aparece cuando el navegador considera la PWA instalable. iOS Safari no dispara este evento — ahí la instalación es manual vía "Compartir → Agregar a pantalla de inicio" (por eso los meta tags `apple-mobile-web-app-*` en `apps/app/index.html`).

### Pantallas (`apps/app/src/pages/kognit/`)

| Archivo | Vista | Descripción |
|---|---|---|
| `Home.tsx` | `home` | Dashboard: selector de estado mental + acciones rápidas |
| `Tilt.tsx` | `tilt` | Protocolo de reset: respiración 4·7·8 o 4·4·4 → grounding → estado emocional → check |
| `Cards.tsx` | `cards` | Cartas de coaching mental por categoría |
| `Calendar.tsx` | `calendar` | Diario mental: calendario, notas rápidas y gráfico de foco semanal |
| `Profile.tsx` | `profile` | Perfil: stats del jugador (foco, control emocional, racha, xp), logros y plan Kognit Pro |
| `Settings.tsx` | `settings` | Configuración: editar nombre, recordatorio diario, sonido, preferencias (dark mode/vibración/idioma), privacidad, cerrar sesión y borrar cuenta — se llega desde el ícono de engranaje en `Profile.tsx` |
| `Community.tsx` | `community` | Feed de notas públicas con reacciones emoji, imágenes opcionales y respuesta privada por mensaje directo |
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

**`profile_admirations`** — "me gusta" a un perfil público
```
id, giver_id, recipient_id, created_at
```
Constraint `UNIQUE (giver_id, recipient_id)` + `CHECK (giver_id <> recipient_id)`; se usa con `upsert(onConflict: "giver_id,recipient_id")`.

**`reset_sessions`** — cada ejecución del protocolo Tilt
```
id, user_id, mode ("deep"|"fast"), state, states[],
pre_intensity, post_intensity, note, created_at
```

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
│       │       ├── Avatar.tsx         # Círculo/cuadrado con foto o iniciales de fallback
│       │       ├── PublicProfileSheet.tsx # Perfil público de otro usuario: stats + admirar
│       │       └── MessageThread.tsx  # Hilo de un DM: texto + audio, solicitudes, bloqueo
│       ├── data/
│       │   ├── mentalCards.ts         # Estructura (id, accent, cardCount) — el texto vive en los locales
│       │   └── moods.ts               # Ids de MOOD_OPTIONS y REACTIONS — el texto vive en los locales
│       ├── hooks/use-voice-recorder.ts # Sobre VoiceRecorder (lib/audio.ts): idle/recording/recorded
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
- **Deuda conocida**: 68 de las 120 claves de `site.json` no están traducidas en ninguno de los 9 idiomas no-español (las páginas de landing se agregaron después de la traducción inicial). `common.json` y `app.json` están al 100%. En esos idiomas, el sitio se ve en español.

## Protocolo Tilt (flujo completo)

```
intro → pulse (pre_intensity) → breathe → grounding → state → check (post_intensity) → exit
```

- Modes: `fast` (4·4·4, ~35s) / `deep` (4·7·8, ~90s)
- Al llegar a `exit`, guarda un `reset_sessions` en Supabase
- `sessionSavedRef` previene doble-guardado
- Sonido via `playBong()` (Web Audio API), activable por el usuario

## Reacciones en comunidad

5 reacciones predefinidas: `breathe` 🫁 · `focus` 🎯 · `inspire` 🌱 · `reflect` 💭 · `identify` 🤝

Constraint de unicidad en Supabase: `(note_id, user_id)` → `upsert` con `onConflict`.

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
