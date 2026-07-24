# Kognit — CLAUDE.md

App de entrenamiento mental para jugadores de poker. PWA instalable mobile-first (manifest + service worker), todo el UI está en español rioplatense.

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
| Sonido | Web Audio API — `src/lib/sound.ts` |
| Tests | Vitest + Testing Library |
| Linter | ESLint v9 |
| Package manager | **Bun** (hay `bun.lockb`; usar `bun` en lugar de `npm`/`npx`) |

## Comandos

```bash
bun dev          # servidor de desarrollo
bun build        # build de producción
bun preview      # preview del build
bun test         # vitest run (single pass)
bun test:watch   # vitest en modo watch
bun lint         # eslint
```

## Rutas de la app

| Path | Componente | Descripción |
|---|---|---|
| `/` | `pages/Index.tsx` | Landing + carrusel de capturas de la app (`AppScreensCarousel`) |
| `/funciones` | `pages/Features.tsx` | Landing: detalle de las funciones de la app |
| `/casos-de-uso` | `pages/UseCases.tsx` | Landing: casos de uso por tipo de jugador |
| `/precio` | `pages/Pricing.tsx` | Landing: planes (`SitePricing`) + FAQ |
| `/contacto` | `pages/Contact.tsx` | Landing: formulario de contacto (tabla `contact_messages`) |
| `/auth` | `pages/Auth.tsx` | Login / signup / forgot / guest |
| `/reset-password` | `pages/ResetPassword.tsx` | Callback de reset de contraseña |
| `/app` | `pages/MobileApp.tsx` | Shell de la app autenticada |
| `*` | `pages/NotFound.tsx` | 404 |

`/app` requiere usuario autenticado; redirige a `/auth` si no hay sesión.

## Arquitectura de `/app`

`MobileApp.tsx` maneja todo el estado de navegación con un `useState<View>`. No usa React Router para las sub-pantallas — el cambio de vista es imperativo via callbacks.

```
View = "home" | "cards" | "calendar" | "community" | "profile" | "tilt" | "messages" | "settings"
Tab  = "home" | "cards" | "calendar" | "community" | "profile"  ← visible en BottomNav
```

`BottomNav` se oculta en las vistas `tilt`, `messages` y `settings` (pantallas de flujo completo).

## PWA

Configurada con `vite-plugin-pwa` en `vite.config.ts` (estrategia `generateSW`, `registerType: "autoUpdate"`):

- **Manifest**: generado por el plugin a partir de la config en `vite.config.ts` (no hay `public/manifest.json` manual). Iconos en `public/icons/` (`icon-192.png`, `icon-512.png` con `purpose: "any"`, `maskable-512.png` con `purpose: "maskable"`), generados a partir de `src/assets/kognit-logo.png`.
- **Service worker**: precachea el shell de la app (JS/CSS/HTML/assets) y agrega runtime caching para Supabase — `CacheFirst` para Storage (imágenes de notas), `NetworkFirst` para REST/Auth. `navigateFallback: "/index.html"` permite abrir cualquier ruta de la SPA sin conexión (aunque las pantallas que dependen de datos de Supabase van a mostrar sus estados vacíos/default si no hay red — no hay una pantalla de "sin conexión" dedicada).
- **Instalación**: `src/hooks/use-install-prompt.ts` escucha `beforeinstallprompt` (Chrome/Edge/Android) y expone `canInstall`/`promptInstall()`; el CTA "Instalar app" en `Index.tsx` solo aparece cuando el navegador considera la PWA instalable. iOS Safari no dispara este evento — ahí la instalación es manual vía "Compartir → Agregar a pantalla de inicio" (por eso los meta tags `apple-mobile-web-app-*` y el `apple-touch-icon` en `index.html`).
- Regenerar los íconos: partir de un logo cuadrado grande (`src/assets/kognit-logo.png`, 1034×1034) y re-exportar a los tamaños de `public/icons/`; el maskable necesita el contenido centrado dentro de la "safe zone" (~60% del lienzo) sobre fondo opaco (`#2E6F9E`, mismo tono que `theme_color`).

### Pantallas (`src/pages/kognit/`)

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
src/
├── App.tsx                        # Providers + Routes
├── main.tsx                       # Entry point + fuentes
├── index.css                      # Variables CSS (tokens de diseño)
├── assets/                        # kognit-logo.png, kognit-mascot.png
├── components/
│   ├── kognit/
│   │   ├── AppShell.tsx           # Layout de /app: SideNav en desktop, BottomNav en mobile, columna de contenido
│   │   ├── SideNav.tsx            # Barra de navegación lateral (desktop, ≥md)
│   │   ├── BottomNav.tsx          # Barra de navegación inferior (mobile)
│   │   ├── FeedbackTab.tsx        # Pestaña del borde derecho de /app + formulario de feedback de testing
│   │   ├── NoteComposer.tsx       # Modal para escribir nota de comunidad
│   │   ├── ReplyComposer.tsx      # Modal para responder a un autor por mensaje directo (usa el RPC send_direct_message)
│   │   ├── Avatar.tsx             # Círculo/cuadrado con foto o iniciales de fallback
│   │   ├── PublicProfileSheet.tsx # Modal de perfil público de otro usuario: stats + admirar
│   │   ├── MessageThread.tsx      # Hilo de un DM: texto + audio, aceptar/rechazar solicitud, aviso de bloqueo
│   │   └── PhoneFrame.tsx         # Wrapper visual de "teléfono" para la landing (pinta el fondo y el chrome)
│   ├── site/
│   │   ├── AppScreensCarousel.tsx # Carrusel del home: capturas de public/screens/ (ver docs/capturas.md)
│   │   └── PhoneFrameCarousel.tsx # Showcase con la app real dentro del PhoneFrame — solo lo usa /funciones
│   ├── ui/                        # Componentes shadcn/ui (no editar manualmente)
│   ├── ProTrialModal.tsx          # Modal del programa de testers — montado en App.tsx, aparece a los 10s
│   └── NavLink.tsx
├── contexts/
│   └── AuthContext.tsx
├── data/
│   ├── mentalCards.ts             # Estructura (id, accent, cardCount) de las 5 categorías × 10 cartas — el texto vive en i18n/locales/es.json
│   └── moods.ts                   # Ids de MOOD_OPTIONS y REACTIONS — el texto vive en i18n/locales/es.json
├── hooks/
│   ├── use-mobile.tsx
│   ├── use-toast.ts
│   └── use-voice-recorder.ts      # Hook sobre VoiceRecorder (lib/audio.ts): status idle/recording/recorded, elapsed, start/stop/cancel
├── i18n/
│   ├── index.ts                   # Inicialización de i18next (react-i18next), locale único "es"
│   └── locales/es.json            # Todos los strings de la UI, namespaced por pantalla/componente
├── integrations/supabase/
│   ├── client.ts                  # createClient singleton
│   └── types.ts                   # Tipos generados — NO editar a mano
├── lib/
│   ├── audio.ts                   # VoiceRecorder (MediaRecorder nativo, sin dependencias) + helpers de mime-type/duración
│   ├── sound.ts                   # playBong() — Web Audio API
│   └── utils.ts                   # cn() helper + timeAgo() formatter
└── pages/
    ├── Auth.tsx
    ├── CaptureScreen.tsx          # Ruta solo-dev /__capture/:screen para generar public/screens/
    ├── Index.tsx                  # Landing pública
    ├── MobileApp.tsx              # Shell de la app autenticada
    ├── NotFound.tsx
    ├── ResetPassword.tsx
    └── kognit/                    # Pantallas de la app
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

`src/data/mentalCards.ts` — 5 categorías, 10 cartas cada una:

| id | Nombre | Accent |
|---|---|---|
| `habits` | Rutinas de Éxito | seafoam (verde agua) |
| `focus` | Poder del Enfoque | info (azul) |
| `mindfulness` | Conexión Interna | cyan (celeste) |
| `stress` | Dominio Emocional | destructive (azul cobalto) |
| `performance` | Máximo Rendimiento | primary (teal/verde azulado) |

Cada carta es un flip card (`Cards.tsx`): lado A muestra el título (formulado como pregunta, ej. "¿Te cuesta dar el primer paso?"), lado B (al deslizar) muestra mensaje + acción concreta. El texto (nombre/tagline de categoría, título/mensaje/acción de cada carta) vive en `i18n/locales/es.json` bajo `mentalCards.categories.<id>`; para agregar una carta, sumar la entrada en `CATEGORIES` (`mentalCards.ts`) **y** el texto correspondiente en el JSON. No hay backend para este contenido.

## Internacionalización (i18n)

`i18next` + `react-i18next`. Idioma por defecto: `es` (fallback siempre `es`).

Idiomas soportados (`src/lib/preferences.ts` → `SUPPORTED_LANGUAGES`, cada uno con su JSON en `src/i18n/locales/`):

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

- Todos los strings de UI viven en `src/i18n/locales/<código>.json`, namespaced por pantalla/componente (`auth.*`, `tilt.*`, `profile.*`, `mentalCards.*`, `moods.*`, etc.) — mismas keys en los 10 archivos.
- El usuario elige idioma en **Perfil → Preferencias → Idioma** (`Profile.tsx`). La elección persiste en `localStorage` vía `getLanguage()`/`setLanguage()` (`lib/preferences.ts`) y se aplica con `i18n.changeLanguage(code)`; `src/i18n/index.ts` lee `getLanguage()` como `lng` inicial al bootear la app.
- Los componentes usan `const { t } = useTranslation()` y `t("namespace.key")`. Interpolación con `{{variable}}` (ej. `t("tilt.exit.before", { value: preIntensity })`).
- Arrays/objetos anidados (preguntas de grounding, cartas mentales, notas de ejemplo del calendario) se leen con `t(key, { returnObjects: true })`. Como esto devuelve una referencia nueva en cada llamada, siempre memoizar con `useMemo(() => t(key, { returnObjects: true }), [t])` si el resultado entra en un array de dependencias de otro hook — de lo contrario se re-crean callbacks/efectos en cada render.
- Texto con markup embebido (ej. `<b>ELIMINAR</b>`/`<b>DELETE</b>`/etc. en el diálogo de borrar cuenta) usa el componente `<Trans i18nKey="..." components={{ b: <span /> }} />` en vez de `t()`. La palabra de confirmación (`profile.deleteAccount.confirmWord`) está traducida por idioma y debe coincidir exactamente con la que aparece dentro de `<b>` en `confirmPrompt` para ese mismo idioma, porque el código compara el input del usuario contra `confirmWord`.
- `data/mentalCards.ts` y `data/moods.ts` sólo contienen ids/estructura — nunca texto en ningún idioma; el texto siempre se resuelve vía `t()` en el componente usando el id como parte de la key.
- Al agregar/editar un string: hay que tocar los 10 JSON (o al menos `es.json`; el resto cae al fallback en español hasta traducirse, pero conviene mantenerlos sincronizados).

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

`@/` → `src/` (configurado en `tsconfig.app.json` y `vite.config.ts`)

## Configuración shadcn/ui

`components.json` — componentes en `src/components/ui/`, estilo `default`, Tailwind v3, aliases `@/components` y `@/lib/utils`.
Para agregar un componente: `bunx shadcn@latest add <nombre>`.
