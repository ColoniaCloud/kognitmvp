# IMPLEMENTACION.md — Plan de implementación para el MVP de Kognit

> Basado en `AGENTE.md` (análisis técnico del 2026-07-05) y en las decisiones de alcance tomadas para el MVP:
> - **Monetización**: sí, incluida en el MVP (plan Free + Kognit Pro pago).
> - **Notificaciones**: push reales (service worker + Web Push + trigger backend).
> - **PWA**: instalable completa (manifest + service worker + iconos).

## Cómo usar este documento

Cada sprint tiene una checklist. A medida que se completan tareas, marcar `- [x]`. Cuando se termina un sprint completo:

1. Marcar todos sus checkboxes.
2. Cambiar el estado del sprint en la tabla de abajo a `✅ Completado` y agregar la fecha real de cierre.
3. Si algo del sprint quedó afuera, moverlo explícitamente al backlog del sprint siguiente (no dejarlo tachado sin hacerlo).

No borrar sprints completados — este documento es el historial de avance del MVP.

## Estado general

| # | Sprint | Foco | Estado | Cierre |
|---|---|---|---|---|
| 0 | [Housekeeping y limpieza](#sprint-0--housekeeping-y-limpieza) | Sacar mock data y placeholders del flujo real | ✅ Completado | 2026-07-05 |
| 1 | [Onboarding y logros reales](#sprint-1--onboarding-y-logros-reales) | Conectar onboarding a Supabase, logros basados en actividad | ✅ Completado | 2026-07-05 |
| 2 | [PWA instalable](#sprint-2--pwa-instalable) | Manifest, service worker, iconos, instalación | 🟡 En curso (falta QA manual en dispositivo real) | — |
| 3 | [Notificaciones push](#sprint-3--notificaciones-push-reales) | Recordatorio diario funcionando de verdad | 🟡 En curso (falta deploy + QA en dispositivo real) | — |
| 4 | [Monetización](#sprint-4--monetización-planes-y-pagos) | Plan Free/Pro, Mercado Pago, paywall | 🟡 En curso (falta `MERCADOPAGO_WEBHOOK_SECRET` completo + probar el flujo de punta a punta en sandbox) | — |
| 5 | [Testing y QA](#sprint-5--testing-y-qa) | Cobertura de la lógica crítica | 🟡 En curso (falta integración de auth contra staging + checklist manual) | — |
| 6 | [Pulido y lanzamiento](#sprint-6--pulido-y-lanzamiento) | Performance, copy, checklist de salida | 🟡 En curso (falta aplicar la migración de fix de RLS en prod + definir fecha de lanzamiento) | — |

Estados posibles: `⬜ Pendiente` · `🟡 En curso` · `✅ Completado` · `⏸️ Pausado`.

---

## Sprint 0 — Housekeeping y limpieza

**Por qué primero**: varios de estos cambios tocan los mismos archivos que van a modificar los sprints siguientes (Perfil, Calendar). Conviene dejar el terreno limpio antes de construir onboarding, logros y paywall encima.

- [x] `Calendar.tsx`: se eliminó `moodByDay` (mock fijo por día) y se reemplazó por `dayMoodMap`, calculado a partir de las notas reales del usuario (`resolveMoodId` sobre `rows`, filtrado por mes/año actual). La grilla del calendario ahora solo pinta días donde el usuario realmente registró un mood.
- [x] `Calendar.tsx`: se sacó `fallbackNotes`/`FALLBACK_NOTE_COLORS` (notas "· ejemplo") y se reemplazó por un estado vacío real (`calendar.empty.title`/`subtitle`, agregado a los 10 idiomas) cuando el día seleccionado no tiene notas.
- [x] **Hallazgo extra durante la limpieza**: `calendar.monthSummary`/`monthDetail` también eran texto fijo ("14 días enfocado · 3 resets · 9 sesiones registradas") para *todos* los usuarios. Se reemplazó por `monthStats` (activeDays/resets/notes) calculado con una query real a `notes` y `reset_sessions` del mes visible, con keys i18n interpoladas (`{{count}}`, `{{resets}}`, `{{notes}}`) en los 10 idiomas.
- [x] `Profile.tsx` / `MobileApp.tsx`: se unificó el default de `focusLevel`/`emotionalControl` en `MobileApp.tsx` a `50` (antes `60`), que es el `DEFAULT` real de la columna en Supabase (migración `20260503002741`). Los defaults `72`/`64` de `Profile.tsx` quedan documentados con un comentario: solo se usan en el showcase de `Index.tsx` (`<ProfileScreen />` sin props), nunca en `/app` real.
- [x] `Profile.tsx:210`: se quitó el botón "Ver todos" de logros (no tenía `onClick`) y la key `profile.achievementsAll` de los 10 idiomas. Se reconecta a una vista real en el Sprint 1 cuando los logros dejen de ser una lista fija.
- [x] `Index.tsx`: se sacaron los enlaces `href="#"` de App Store/Google Play (íconos `Apple`/`Smartphone` y las keys `landing.appStoreLabel/appStoreName/googlePlayLabel/googlePlayName` en los 10 idiomas). Vuelven en el Sprint 2 como CTA de instalación PWA.
- [x] Dependencias sin uso real:
  - [x] **TanStack Query**: se deja instalado, adoptar recién en los sprints de notificaciones/monetización (no se tocaron las pantallas existentes, tal como estaba previsto).
  - [x] **React Hook Form + Zod**: adoptado en `Auth.tsx` — login/signup/forgot ahora usan `useForm` + `zodResolver`, con mensajes de error traducidos (`auth.errors.*`, agregado a los 10 idiomas) en vez de solo `required`/`minLength` del HTML.
  - [x] **Recharts**: se quitó del `package.json` y se borró `src/components/ui/chart.tsx` (wrapper de shadcn), que era el único lugar que lo importaba — el gráfico de foco semanal sigue siendo el de `<div>` manual en `Calendar.tsx`.
- [x] Confirmado: `package-lock.json` restaurado desde `HEAD` (ver sesión anterior) — el proyecto usa `bun.lockb`, no npm.

**Validación real ejecutada** (Bun instalado en la máquina vía `npm install -g bun`, luego `bun install` para regenerar `bun.lockb`):
- `bun run test` → 1 passed (el placeholder existente; no había suite real que correr).
- `bunx tsc --noEmit` → sin errores de tipos.
- `bun run lint` → 26 problemas (15 errores, 11 warnings). Se comparó contra el lint de `HEAD` sin los cambios de este sprint (vía `git stash`/`git stash pop`): en `HEAD` había **28** (17 errores, 11 warnings) — los mismos, más los 2 errores de `no-explicit-any` que tenía `components/ui/chart.tsx` (borrado en este sprint). **Cero errores nuevos introducidos**; los 26 restantes son deuda técnica preexistente fuera del alcance de este sprint (`sound.ts`, `Community.tsx`, `Home.tsx`, `Tilt.tsx`, `tailwind.config.ts`, warnings de `react-refresh` en varios `components/ui/*`).

---

## Sprint 1 — Onboarding y logros reales

- [x] Schema: migración `supabase/migrations/20260705120000_onboarding_and_metrics.sql` agrega `onboarding_emotions text[]`, `onboarding_goals text[]`, `onboarding_completed_at timestamptz` a `profiles`. `types.ts` actualizado a mano (no hay CLI de Supabase conectada en este entorno para `gen types`).
- [x] `Onboarding.tsx` dejó de ser decorativo:
  - [x] `MobileApp.tsx` ahora gatea: mientras `profile.onboarding_completed_at` sea `null`, se renderiza `<OnboardingScreen>` en vez del shell normal (antes de la vista `home`), tanto en mobile como en el frame de desktop.
  - [x] `onSubmit(emotions, goals)` persiste la selección en Supabase al pasar de `"form"` a `"welcome"`; `onFinish()` (nuevo CTA "Empezar a entrenar" en la pantalla de bienvenida, antes un callejón sin salida sin botón) marca `onboarding_completed_at`.
  - [x] `Home.tsx` recibe `primaryGoal` (primer objetivo elegido) y muestra una línea personalizada (`home.goalMessages.<goalId>`) debajo del nombre.
- [x] Logros reales (`src/data/achievements.ts`, reemplaza `profile.achievements` fijo):
  - [x] 5 logros definidos: `first_reset`, `streak_3`, `ten_resets`, `first_public_note`, `first_reaction_received`.
  - [x] `Profile.tsx` calcula el progreso real: `totalResets`/`streakDays` vía props (ya calculados en `MobileApp.tsx`), `hasPublicNote`/`hasReceivedReaction` vía queries a `notes` y `note_reactions` (excluyendo reacciones propias).
  - [x] Render con estado desbloqueado/bloqueado (`opacity-50 grayscale` + ícono de candado) en vez de la lista fija.
- [x] `focus_level`/`emotional_control`: confirmado que no había ningún trigger ni lógica que los actualizara (quedaban pisados en el `DEFAULT 50` de la columna para siempre). Se creó `src/lib/metrics.ts` con `computeProfileMetrics()`: foco/control emocional se calculan sobre los `reset_sessions` de los últimos 30 días (score igual al de `focusWeek` en `Calendar.tsx`); `MobileApp.tsx` recalcula y persiste en cada apertura de la app.
- [x] **Hallazgo extra**: `streak_days` y `xp` tenían el mismo problema (nunca se escribían, siempre en el default `0`) — inconsistente con construir logros reales que dependen de ellos. `computeProfileMetrics()` los calcula también: `xp` acumulado de por vida (10 por reset + 5 por nota, nunca decrece), `streak_days` como racha de días consecutivos con actividad (nota o reset), derivada de todo el historial, no solo la ventana de 30 días usada para foco/control emocional.

**Validación real ejecutada** (`bun install`, `bunx tsc --noEmit`, `bun run lint`, `bun run test` en `kognitapp-mvp`):
- `tsc --noEmit` → sin errores.
- `test` → 1 passed (el mismo placeholder).
- `lint` → 25 problemas (14 errores, 11 warnings), uno menos que el baseline de Sprint 0 (26) — `MobileApp.tsx` dejó de usar `data as any` al tipar el fetch de perfil contra `Database`. Cero errores nuevos.

---

## Sprint 2 — PWA instalable

- [x] `vite-plugin-pwa` instalado y configurado en `vite.config.ts` (estrategia `generateSW`, `registerType: "autoUpdate"`).
- [x] Manifest generado por el propio plugin (no hace falta `public/manifest.json` a mano): nombre "Kognit", `theme_color` `#2E6F9E` y `background_color` `#F8FAFC` (derivados de los tokens `--primary`/`--background` de `index.css`), `display: "standalone"`.
- [x] Set de íconos generado a partir de `kognit-logo.png` (1034×1034) con un script de PowerShell (`System.Drawing`, sin dependencias nuevas): `icon-192.png`, `icon-512.png` (purpose `any`), `maskable-512.png` (purpose `maskable`, contenido al 60% centrado sobre fondo `#2E6F9E`) y `apple-touch-icon.png` (180×180, opaco). Todos en `public/icons/`.
- [x] Service worker (Workbox vía el plugin): precache del shell completo + `navigateFallback: "/index.html"` (rutas de la SPA abren offline) + runtime caching `CacheFirst` para `*.supabase.co/storage/*` y `NetworkFirst` para `*.supabase.co/(rest|auth)/*`.
- [x] CTA de instalación propio: `src/hooks/use-install-prompt.ts` escucha `beforeinstallprompt`/`appinstalled`; botón "Instalar app" en `Index.tsx` (reemplaza el hueco que quedó tras sacar los links muertos de tiendas en Sprint 0), visible solo cuando el navegador realmente puede instalar.
- [x] Offline mínimo: verificado que el precache + `navigateFallback` cubre la apertura de cualquier ruta sin red. No se construyó una pantalla dedicada de "sin conexión" — las pantallas que dependen de Supabase ya degradan a sus estados vacíos/default existentes en vez de crashear (comportamiento ya usado en toda la app, ver `Community.tsx`/`Calendar.tsx`), que es el mínimo pedido por este ítem.
- [x] `CLAUDE.md` actualizado: agregada fila de PWA a la tabla de stack, sección "## PWA" con el detalle de manifest/SW/instalación/regeneración de íconos, y sacada `Recharts` de la tabla (ya no está en el proyecto desde el Sprint 0).
- [ ] **Pendiente manual, no automatizable desde acá**: probar instalación real en un dispositivo Android (Chrome) y en desktop (Chrome/Edge), y confirmar visualmente las limitaciones de iOS Safari (instalación manual vía "Compartir → Agregar a pantalla de inicio", sin `beforeinstallprompt`). Requiere un dispositivo/navegador real, no se puede validar desde este entorno.

**Validación real ejecutada**: `bun add -d vite-plugin-pwa`, `bun run build` (genera `dist/sw.js`, `dist/workbox-*.js`, `dist/manifest.webmanifest`, íconos copiados a `dist/icons/`, `index.html` con el `<link rel="manifest">` y el script de registro del SW auto-inyectados), `bunx tsc --noEmit` limpio, `bun run lint` → mismos 25 problemas que al cierre del Sprint 1 (cero nuevos), `bun run test` → 1 passed.

---

## Sprint 3 — Notificaciones push reales

- [x] Par de claves VAPID generado (`bunx web-push generate-vapid-keys`). La pública queda en `.env.example` (`VITE_VAPID_PUBLIC_KEY`, vacía en el repo — cada entorno pone la suya); la privada **no se commitea en ningún archivo**, va solo como secret de la Edge Function (`supabase secrets set VAPID_PRIVATE_KEY=...`).
- [x] El service worker de `generateSW` (Sprint 2) no permite código custom — se cambió la estrategia a `injectManifest`: `src/sw.ts` (fuente propia) + `tsconfig.sw.json` (lib `WebWorker`, separado de `tsconfig.app.json` que usa `DOM`, para que no choquen los tipos). `sw.ts` reimplementa el precache/runtime-caching que antes generaba `generateSW` (`workbox-precaching`/`routing`/`strategies`/`expiration`/`cacheable-response`) y agrega los listeners `push` (muestra la notificación) y `notificationclick` (foca la ventana existente o abre `/app`).
- [x] Cliente: `src/lib/push.ts` (`enablePushReminders`/`disablePushReminders`) — al activar el toggle en `Profile.tsx` pide permiso (`Notification.requestPermission`), suscribe (`pushManager.subscribe`) y guarda `endpoint`/`p256dh`/`auth` en `push_subscriptions` (upsert por `endpoint`). Si el permiso se rechaza o el navegador no soporta push, el toggle vuelve solo a apagado (no se llega a guardar `reminder_enabled: true`) y se muestra un toast (`profile.reminders.pushDenied`, en los 10 idiomas).
- [x] Nueva tabla `push_subscriptions` (migración `20260706090000_push_subscriptions.sql`) con RLS por `user_id`, y columna `profiles.reminder_timezone` (se guarda el `Intl.DateTimeFormat().resolvedOptions().timeZone` del navegador cada vez que se toca el recordatorio).
- [x] Edge Function `supabase/functions/send-reminder-push/index.ts`: lee perfiles con `reminder_enabled = true`, compara la hora actual en `reminder_timezone` contra `reminder_time`, y manda el push (librería `web-push` vía `npm:` en Deno) a cada `push_subscriptions` del usuario.
- [x] Cron: migración `20260706090100_reminder_push_cron.sql` — `pg_cron` dispara la función cada minuto vía `pg_net`, usando la service role key guardada en Supabase Vault (no en texto plano en la migración).
- [x] Limpieza de subscriptions muertas: si `web-push` devuelve 404/410, la Edge Function borra esa fila de `push_subscriptions`. Al desactivar el recordatorio o borrar la cuenta (`deleteAccount()` en `Profile.tsx`), se desuscribe del navegador y se borra la fila.
- [ ] **Pendiente manual, no ejecutable desde acá**: no hay proyecto Supabase ni dispositivo real conectados a este entorno. Falta, contra el proyecto real (`urebsukvtbdhtkixyyaw`):
  - Aplicar las 2 migraciones nuevas (`supabase db push` o vía dashboard).
  - Habilitar las extensiones `pg_cron`/`pg_net` y crear el secret de Vault `service_role_key` (una vez).
  - `supabase functions deploy send-reminder-push --no-verify-jwt` (la invoca únicamente el cron interno) y `supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=...`.
  - Probar en un dispositivo Android real (Chrome) que el permiso, la suscripción y la recepción del push funcionan de punta a punta — los navegadores de escritorio simulan distinto que mobile.

**Validación real ejecutada**: `bunx tsc --noEmit` limpio (incluye `src/sw.ts` vía `tsconfig.sw.json`), `bun run build` genera `dist/sw.js` con el código custom de push/notificationclick incluido (confirmado leyendo el bundle), `bun run lint`/`bun run test` sin regresiones respecto al cierre del Sprint 2.

---

## Sprint 4 — Monetización (planes y pagos)

**Tabla de gating final confirmada con el usuario (2026-07-06)** — reemplaza la propuesta inicial de más abajo, que quedó desactualizada:

| Feature | Free | Kognit Pro |
|---|---|---|
| Protocolo Tilt (ambos modos) | ✅ Ilimitado | ✅ Ilimitado |
| Notas privadas (diario) | 4 por mes | Ilimitadas |
| Comunidad | ✅ (feed público) | ✅ |
| Mensajería privada (DMs) | ❌ | ✅ |
| Calendario / Diario | Últimos 10 días | Historial completo |
| Estadísticas personales | Básicas | Detalladas |
| Cartas mentales | 1 carta por día (cualquier categoría) | Ilimitadas |

**Precio**: Kognit Pro — USD 8,90/mes o USD 89,00/año.

> Reemplaza el esquema anterior (cartas por categoría 1/5, calendario con tendencia semanal solo Pro) — ver detalle de la propuesta original más abajo, ya no vigente.

> **Nota**: este sprint se implementó una primera vez con Stripe (commits `953a77e`/`4b7716d`) y se revirtió (`e2e1fa4`) para rehacerlo con **Mercado Pago** — más relevante para el mercado de LATAM al que apunta la app. La arquitectura general (columnas de plan en `profiles`, Edge Function de webhook como única fuente de verdad, gating en `Cards.tsx`/`Calendar.tsx`, cancelar suscripción antes de borrar cuenta) se mantiene conceptualmente igual; cambia el proveedor y su modelo de API (Mercado Pago usa "preferencias" de pago y el objeto `preapproval` para suscripciones recurrentes, en vez de Customer/Subscription/Checkout Session de Stripe).

- [x] Confirmar con negocio la tabla de gating final antes de implementar el paywall — confirmado con el usuario, ver tabla arriba (2026-07-06, reemplaza el esquema de categorías/tendencia semanal).
- [x] Modelo de datos: `plan` (`free`|`pro`), `plan_status`, `mercadopago_customer_id`, `mercadopago_preapproval_id`, `plan_current_period_end` en `profiles` — migración `20260706120000_mercadopago_plans.sql`, protegidas por trigger `protect_plan_columns` (solo service role puede escribirlas).
- [x] Billing mensual + anual con descuento: se modelan como **dos `preapproval_plan` distintos** en Mercado Pago (uno por frecuencia), seleccionados por `MERCADOPAGO_PLAN_ID_MONTHLY`/`MERCADOPAGO_PLAN_ID_ANNUAL` en la Edge Function `create-checkout-preference`.
- [x] Edge Function `create-checkout-preference`: crea una suscripción (`preapproval`) referenciando el `preapproval_plan_id` correspondiente y devuelve `init_point`/`sandbox_init_point` para redirigir.
- [x] Edge Function `mercadopago-webhook`: valida la firma `x-signature` (HMAC-SHA256 con `MERCADOPAGO_WEBHOOK_SECRET`), procesa el topic `subscription_preapproval` y sincroniza `profiles` — única fuente de verdad del plan.
- [x] Edge Function `cancel-subscription`: cancela el `preapproval` del usuario autenticado (`status: "cancelled"`). No existe un "Customer Portal" de Mercado Pago equivalente al de Stripe, así que "gestionar suscripción" en `Profile.tsx` cancela directamente desde la propia app en vez de redirigir a un portal externo.
- [x] Frontend: sección "Kognit Pro" en `Profile.tsx` (reemplaza el badge decorativo, ahora condicionado a `plan === "pro"`) con selector mensual/anual y CTA a Checkout.
- [x] **Refactor de gating (2026-07-06)**: el gating implementado originalmente (cartas por categoría 1/5, calendario con tendencia semanal solo Pro) no coincidía con la tabla final de negocio. Reimplementado:
  - [x] **Cartas** (`Cards.tsx`): pasa de "1 categoría / 5 categorías" a "1 carta random por día (cualquier categoría) / ilimitadas". La carta del día es fija: se sortea una sola vez y se persiste en `profiles` (`free_card_drawn_on`, `free_card_category`, `free_card_index`, migración `20260706130000_free_daily_card.sql`, sin protección de trigger — no son sensibles como `plan`) para que sea la misma si el usuario cierra y reabre la app ese día. El botón "Sacar carta" se deshabilita hasta el día siguiente (hora local del dispositivo, sin normalizar a UTC); Pro sigue mezclando sin límite como hasta ahora.
  - [x] **Calendario** (`Calendar.tsx`): pasa de "tendencia semanal solo Pro" a "últimos 10 días / historial completo". Free no puede navegar (`goPrev`) a meses anteriores a la ventana de 10 días ni seleccionar días bloqueados en la grilla (se muestran con candado, tocar dispara `onUpgrade` en vez de navegar/seleccionar) — pero las estadísticas generales de la cuenta (racha, xp, foco semanal) siguen calculándose con todo el historial real, sin recortar. `load()` de notas pasa a depender del mes visible (`year`/`month`) en vez de un límite fijo de 20 notas global, para que Pro vea el historial completo real al navegar a meses viejos.
  - [x] **Notas privadas**: límite de 4 por mes calendario en Free (se resetea el día 1; ilimitadas en Pro) — antes no existía ningún límite. Se cuenta en `NoteComposer.tsx` (compartido entre `Calendar.tsx` y `Community.tsx`) porque ahí es donde el usuario elige visibilidad; solo cuentan las notas con `visibility = "private"`, las públicas de Comunidad siguen sin límite para todos los planes.
  - [x] **Mensajería privada** (DMs en `Messages.tsx`/`ReplyComposer.tsx`): pasa a ser exclusiva de Pro (antes era libre para todos). La Comunidad (feed público, reacciones) se mantiene libre para todos los planes. Se gatea en el punto de entrada (`Community.tsx`: botón de "Mensajes" y botón de "Responder" en cada nota) — no hace falta gating defensivo dentro de `Messages.tsx` porque no hay otra forma de llegar a esa vista en la UI actual.
  - [x] **Estadísticas personales**: "básicas" (Free) = streak/resets/xp + lista de logros con estado bloqueado/desbloqueado, igual que hoy. "Detalladas" (Pro) = además, progreso numérico hacia los logros bloqueados que tienen un umbral numérico (`streak_3`, `ten_resets`; los logros booleanos como `first_public_note` no tienen progreso posible, vía `getAchievementProgress` en `data/achievements.ts`) + el gráfico de tendencia semanal de foco en `Calendar.tsx` (ya estaba implementado del esquema anterior, se mantiene sin cambios).
- [x] Manejar pago pendiente: Mercado Pago reintenta automáticamente los cobros fallidos (hasta 3 veces) antes de cancelar la suscripción por su cuenta — no hace falta un grace period propio como el `past_due` de Stripe; el webhook solo refleja `plan_status` y se muestra un aviso si está `pending`.
- [x] Actualizar `deleteAccount()` en `Profile.tsx` para cancelar la suscripción de Mercado Pago antes de borrar el perfil.
- [x] Documentar en `CLAUDE.md` las nuevas variables de entorno (`MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_WEBHOOK_SECRET`, `MERCADOPAGO_PLAN_ID_MONTHLY`, `MERCADOPAGO_PLAN_ID_ANNUAL`) sin commitear valores reales.
- [x] **Deploy contra el proyecto real (2026-07-06)**: el proyecto original (`urebsukvtbdhtkixyyaw`) no tenía datos reales, así que se migró todo a un proyecto Supabase nuevo (`goqrqtfdsrmjqjimjtwx`, org `KognitMer`, región `sa-east-1`) usando un `SUPABASE_ACCESS_TOKEN` provisto por el usuario:
  - Se linkeó el proyecto y se corrió `supabase db push` con las 13 migraciones del repo (historial completo, desde el schema inicial hasta Sprint 4).
  - Se deployaron las 4 Edge Functions (`create-checkout-preference`, `cancel-subscription` con JWT; `mercadopago-webhook` y `send-reminder-push` con `--no-verify-jwt`).
  - Se habilitó `external_anonymous_users_enabled` (modo invitado) vía Management API — no es parte de las migraciones SQL, es config de proyecto.
  - Se guardó el `service_role_key` real en Supabase Vault (`vault.create_secret`, nombre `service_role_key`) y se confirmó que `pg_cron`/`pg_net` quedaron habilitadas.
  - **Bug encontrado y corregido** (migración `20260706140000_fix_reminder_push_cron_url.sql`): la migración `20260706090100` tenía hardcodeada la URL del proyecto viejo en el `net.http_post` del cron — al cambiar de proyecto el cron quedaba apuntando al lugar equivocado. Si el proyecto vuelve a cambiar de ref, hay que repetir este fix con la URL nueva (Postgres no puede leer su propio project ref en runtime).
  - **Bug preexistente encontrado y corregido** (migración `20260706150000_fix_anonymous_user_display_name.sql`, no relacionado a la migración de proyecto): `handle_new_user()` fallaba con "Database error creating anonymous user" para el modo invitado, porque `NEW.email` es `NULL` para usuarios anónimos y `split_part(NULL, '@', 1)` da `NULL`, violando el `NOT NULL` de `display_name`. Se agregó `'Jugador'` como fallback final del `COALESCE`. Verificado con un signup anónimo real contra el proyecto (usuario de prueba borrado después).
  - Se crearon los dos `preapproval_plan` reales en Mercado Pago (cuenta de Uruguay, no Argentina — `currency_id: "UYU"`, MP no admite cobrar en USD directamente): mensual UYU 347,10 (`147594b9dc9f477ab7c2416d43cff176`) y anual UYU 3.471,00 cobrado una vez cada 12 meses ya que `frequency_type` solo admite `days`/`months`, no `years` (`6ee19006a06b47e18871e4e47a362ad9`). Conversión hecha a 1 USD = 39 UYU (precio de referencia del usuario: USD 8,90/mes y USD 89,00/año) — si el tipo de cambio se mueve hay que reajustar el monto en ARS/UYU manualmente, esto no se automatiza.
  - Se configuró el webhook de Mercado Pago vía `save_webhook` (topic `subscription_preapproval`) apuntando a la función del proyecto nuevo.
  - Se setearon todos los secrets de Edge Functions salvo uno (`supabase secrets set`): `MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_PLAN_ID_MONTHLY`, `MERCADOPAGO_PLAN_ID_ANNUAL`, `APP_URL`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` (generadas nuevas con `web-push generate-vapid-keys`).
  - `.env` actualizado con la URL/project ID/anon key del proyecto nuevo.
- [ ] **Pendiente**: `MERCADOPAGO_WEBHOOK_SECRET` — Mercado Pago enmascara el secret completo en la respuesta de `save_webhook` (solo se ven los primeros caracteres); hay que copiarlo del panel de developers.mercadopago.com → Tus integraciones → la app → Webhooks, y correr `supabase secrets set MERCADOPAGO_WEBHOOK_SECRET=...`. Sin esto, `mercadopago-webhook` no puede validar firmas y el plan no se sincroniza cuando llegan notificaciones reales.
- [ ] Probar el flujo completo en sandbox (usuario de prueba comprador de Mercado Pago) antes de anunciar el lanzamiento: checkout → autorización → webhook → gating actualizado → cancelación.

---

## Sprint 5 — Testing y QA

- [x] Cobertura mínima objetivo agregada a `vitest.config.ts` (`coverage.thresholds`: 80% lines/statements/functions, 70% branches), acotada por `include` a los archivos de lógica pura cubiertos por tests (no arrastra el resto de `src/lib` que tiene side effects — Supabase, Web Audio, Web Push — fuera de alcance de "lógica crítica"). Nuevo script `bun run test:coverage` (`vitest run --coverage`). Se instaló `@vitest/coverage-v8@3.2.4` (pineado a la misma major que `vitest@3.2.4`, ya que `@vitest/coverage-v8` latest es `4.x` e incompatible). `coverage/` (reporte HTML generado) agregado a `.gitignore` y a los `ignores` de `eslint.config.js` — sin esto, el HTML generado por istanbul/v8 aparecía como archivos lint-eables y sumaba warnings falsos.
- [x] Tests unitarios de lógica pura sin mockear Supabase de más — de los 4 casos listados, ninguno era ya una función pura exportable, así que primero se extrajeron:
  - [x] Motor de fases del protocolo Tilt: `PATTERNS` y el avance de fase/ciclo (antes inline en el `useEffect` de `Tilt.tsx`) se extrajeron a `src/lib/tiltEngine.ts` (`advanceBreathPhase(pattern, state, extraCycles)`, pura, sin `setState`). `Tilt.tsx` ahora importa de ahí en vez de duplicar la lógica. Tests en `src/lib/tiltEngine.test.ts` (7 casos: avance de fase dentro de un ciclo, paso a siguiente ciclo, fin de patrón, ciclos extra del botón "extender", ambos modos fast/deep).
  - [x] Cálculo de score de foco semanal: la agregación dentro de `loadFocusWeek` en `Calendar.tsx` (antes mezclada con el fetch a Supabase y los `setState`) se extrajo a `computeFocusWeek(rows, monday, dayLabels)` en `src/lib/focusWeek.ts`. `Calendar.tsx` solo hace el fetch y le pasa los datos. Tests en `src/lib/focusWeek.test.ts` (6 casos: sin filas, filas sin `post_intensity`, score `(10 - post_intensity) * 10`, promedio de varias sesiones el mismo día, separación semana actual/anterior para el trend, trend `null` sin datos previos).
  - [x] `resolveMoodId` (`src/data/moods.ts`) ya era pura — se agregó `src/data/moods.test.ts` (4 casos: valores nulos/vacíos, los 5 ids válidos, los 5 emojis legacy, string desconocido).
  - [x] Agrupación de conversaciones de `Messages.tsx` (antes inline en el callback `load()`) se extrajo a `groupConversations(list, userId, nameById, defaultPeerName)` en `src/lib/conversations.ts`. Tests en `src/lib/conversations.test.ts` (6 casos: sin mensajes, agrupa por peer y no por el usuario propio, usa el mensaje más reciente como preview, cuenta como no leído solo lo recibido y no leído, resuelve nombre vía `nameById` o default, separa conversaciones distintas).
  - **Resultado**: 24 tests nuevos, 100% de statements/branches/functions/lines sobre los 4 archivos de `src/lib`/`src/data` cubiertos (ver `bun run test:coverage`).
- [ ] Tests de integración de los flujos de auth (login, signup, guest, forgot password) contra un proyecto Supabase de test/staging, no producción. **Pendiente**: no hay un proyecto Supabase de staging separado del real (`goqrqtfdsrmjqjimjtwx`) en este entorno — hace falta crear uno o decidir un esquema de test aislado antes de escribir estos tests.
- [ ] Test manual guiado (checklist, no automatizado) de:
  - [ ] Flujo completo de pago Mercado Pago en sandbox (checkout → webhook → gating actualizado → cancelación) — bloqueado por los pendientes de Sprint 4 (`MERCADOPAGO_WEBHOOK_SECRET` + prueba end-to-end).
  - [ ] Instalación de la PWA y recepción de una notificación push de prueba (mismo pendiente manual ya anotado en Sprints 2 y 3 — requiere dispositivo real).
  - [ ] Eliminación de cuenta (verificar que borra notas, reacciones, sesiones, mensajes, imágenes de Storage y cancela la suscripción de Mercado Pago).
- [x] Activar el lint y los tests en CI — hecho en el Sprint 6 (`.github/workflows/ci.yml`), ver ese sprint para el detalle.

**Validación real ejecutada** (`bun add -d @vitest/coverage-v8@3.2.4`, luego contra `kognitapp-mvp`):
- `bun run test` → 5 archivos, 24 tests, todos passed (los 24 nuevos + el placeholder `example.test.ts` de antes).
- `bun run test:coverage` → 100% statements/branches/functions/lines sobre `src/lib/tiltEngine.ts`, `src/lib/focusWeek.ts`, `src/lib/conversations.ts`, `src/data/moods.ts` (el resto de `src/lib` queda fuera del `include` de coverage a propósito, ver ítem de arriba).
- `bunx tsc --noEmit` → sin errores.
- `bun run lint` → 25 problemas (14 errores, 11 warnings), igual al baseline del cierre de Sprint 4. Cero errores/warnings nuevos introducidos por la extracción de las funciones puras.

---

## Sprint 6 — Pulido y lanzamiento

- [x] Revisar los 10 idiomas para confirmar que las keys nuevas de los sprints anteriores (onboarding conectado, logros, paywall, notificaciones) están traducidas al menos en `es.json`, con fallback correcto en el resto. Auditoría con un script ad-hoc (flatten + diff de keys de los 10 JSON contra `es.json`): **354 keys en cada uno de los 10 idiomas, sin faltantes ni sobrantes** — todos los sprints anteriores mantuvieron los 10 archivos sincronizados. Se verificó también el caso puntual que documenta `CLAUDE.md` (`profile.deleteAccount.confirmWord` debe coincidir con la palabra dentro de `<b>` en `confirmPrompt`): coincide en los 10 idiomas (`ELIMINAR`/`DELETE`/`SUPPRIMER`/`LÖSCHEN`/`ELIMINA`/`EXCLUIR`/`削除`/`删除`/`刪除`/`मिटाएँ`). Sin hallazgos.
- [x] Auditoría de performance (Lighthouse: performance, accesibilidad) sobre el build de producción (`bun run build` + `bun run preview` + `bunx lighthouse` en modo desktop headless, ya que Lighthouse deprecó la categoría "PWA" automática en v9+ — la instalabilidad/manifest/SW ya se validó manualmente en Sprints 2-3). Resultado **antes** de este sprint: performance 93, accessibility 86, best-practices 100, seo 100. Hallazgos y fixes:
  - **Accesibilidad (86 → 100 tras los fixes)**:
    - `aria-prohibited-attr`: `Profile.tsx:287` tenía `aria-label` en un `<span>` sin `role`, que es ARIA inválido — se agregó `role="img"` al span del candado de logro bloqueado.
    - `color-contrast`: el `%` de "Control emocional" en `Profile.tsx:270` usaba `text-accent` (`#68b1ca` sobre blanco, contraste 2.4:1, mínimo requerido 4.5:1) — cambiado a `text-accent-foreground` (ya definido en `index.css`, mucho más oscuro, sin tocar el token `--accent` global para no afectar otros usos).
    - `button-name`: 8 botones solo-ícono sin nombre accesible — se agregaron `aria-label`: los botones "volver" (`ChevronLeft`) de `Cards.tsx`, `Community.tsx`, `Messages.tsx` (x2, lista y dentro del hilo) con la nueva key `common.backAria`; el botón de mensajes de `Community.tsx` con `community.messagesAria`; el botón de preferencias (`Settings`) de `Profile.tsx` reutilizando `profile.preferences.label`; y en `Calendar.tsx` los 5 botones de mood + el botón "+" del quick-add (`moods.options.<id>` / `calendar.newNote`). Las 2 keys nuevas (`common.backAria`, `community.messagesAria`) se agregaron a los 10 idiomas.
  - **Performance (93 → 96, sin cambios de código — variación esperada entre corridas)**: el hallazgo real es el bundle principal de 1.22 MB (395 KB gzip) sin code-splitting, ya anotado en el ítem de CI de abajo — queda para un sprint de code-splitting si el chunk sigue creciendo, no se tocó acá para no ampliar el alcance de este sprint.
  - **Resultado final**: performance 96, accessibility 100, best-practices 100, seo 100.
- [x] Revisar políticas RLS de Supabase para las tablas nuevas (`push_subscriptions`, columnas de plan/Mercado Pago en `profiles`) — mismo criterio de seguridad que las tablas existentes.
  - `profiles` (`plan`, `plan_status`, `mercadopago_*`): correcto, protegido por el trigger `protect_plan_columns` (migración `20260706120000`), solo la service role puede escribirlas.
  - `profiles` (`free_card_drawn_on/category/index`): sin trigger de protección, pero es intencional y ya documentado en la migración `20260706130000` — no son columnas sensibles (gatean una limitación de uso propia del usuario, no un beneficio pago), así que como mucho un usuario podría "trampear" su propia carta gratis del día, no afecta a otros usuarios ni al negocio de forma crítica.
  - **Bug encontrado**: `push_subscriptions` (migración `20260706090000`) solo tenía policies de `SELECT`/`INSERT`/`DELETE`, sin `UPDATE`. El cliente (`enablePushReminders` en `src/lib/push.ts:37`) hace `upsert(..., { onConflict: "endpoint" })` — si el usuario reactiva el recordatorio en el mismo dispositivo/navegador (el `endpoint` ya existe en la tabla), el upsert dispara un `UPDATE` bajo RLS que quedaba bloqueado en silencio (el toggle volvía a apagarse sin explicación clara para el usuario). **Corregido** en la migración `20260706160000_fix_push_subscriptions_update_policy.sql` (agrega la policy de `UPDATE` restringida a `auth.uid() = user_id`). **Pendiente**: aplicar esta migración contra el proyecto real (`goqrqtfdsrmjqjimjtwx`) — no hay `SUPABASE_ACCESS_TOKEN` en este entorno, hace falta `supabase db push` con el token del usuario.
- [x] Preparar CI/CD básico (build + lint + test en cada PR): `.github/workflows/ci.yml` nuevo — corre en push/PR a `main`, con Bun (`oven-sh/setup-bun`), y encadena `bun install --frozen-lockfile` → `bun run lint` → `bunx tsc --noEmit` → `bun run test` → `bun run build`. Verificado localmente que `bun run build` no necesita las variables de entorno de Supabase/VAPID en build time (Vite solo empaqueta, no ejecuta `createClient()`), así que el workflow no necesita secrets configurados para pasar. **Hallazgo del build**: el bundle principal (`index-*.js`) pesa 1.22 MB (395 KB gzip) y Vite avisa que supera los 500 KB recomendados — no se tocó en este sprint (no rompe nada), pero es un candidato directo para code-splitting (`React.lazy` de las pantallas de `/app`) en la auditoría de performance de este mismo sprint.
- [x] Checklist de variables de entorno de producción documentado (ver tabla abajo) y separado de test/staging: no existe hoy un proyecto Supabase de test/staging (ver pendiente ya anotado en Sprint 5), así que por ahora la tabla documenta únicamente el set de producción real. `.env.example` corregido: tenía la URL del proyecto viejo (`urebsukvtbdhtkixyyaw`, migrado en Sprint 4) — actualizado a `goqrqtfdsrmjqjimjtwx`.
- [x] Página de estado vacío / error genérico para cuando Supabase no responde (hoy varias pantallas asumen que la data siempre llega). Investigación previa confirmó que 6 pantallas destructuraban `{ data }` de las queries de Supabase sin chequear `error`, así que una falla de red mostraba el mismo estado vacío que "no hay datos todavía" — engañoso para el usuario. Se creó `src/components/kognit/ErrorState.tsx` (ícono `WifiOff` + título + subtítulo + botón "Reintentar", con nuevas keys `common.error.title/subtitle/retry` en los 10 idiomas) y se conectó en las 3 pantallas con listas críticas que ya tenían un patrón de "estado vacío" establecido con el que un error podía confundirse: `Calendar.tsx` (notas del día), `Community.tsx` (feed público) y `Messages.tsx` (lista de conversaciones) — cada una ahora trackea `loadError` desde el `{ error }` de la query y muestra `<ErrorState onRetry={load} />` en vez del estado vacío cuando la carga falló. Se dejaron sin tocar `Home.tsx` (prefill de mood, no rompe la pantalla si falla) y `Cards.tsx` (ya degrada con gracia a una carta random si el fetch de `free_card_*` falla) por no ser críticos ni estar en el alcance mínimo pedido.
- [ ] Definir y comunicar la fecha de lanzamiento del MVP una vez cerrado este sprint.

### Checklist de variables de entorno de producción

> **Nota (2026-07-07)**: el proyecto Supabase de producción volvió a migrar, de `goqrqtfdsrmjqjimjtwx` a **`wpjufgefhcyncseuikel`** — ver la sección "Segunda migración de proyecto Supabase" más abajo. La tabla de esta sección ya refleja el proyecto nuevo.

**Frontend (`.env`, prefijo `VITE_` expuesto al cliente)**

| Variable | Dónde conseguirla | Estado en prod |
|---|---|---|
| `VITE_SUPABASE_URL` | Dashboard Supabase → Project Settings → API | ✅ seteada (`wpjufgefhcyncseuikel`) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Dashboard Supabase → Project Settings → API (anon/publishable key) | ✅ seteada |
| `VITE_VAPID_PUBLIC_KEY` | `bunx web-push generate-vapid-keys` (par generado en Sprint 3) | ❌ **pendiente** — hay que decidir si se reutiliza el par del proyecto anterior o se genera uno nuevo, y setearlo en el `.env` del frontend además de como secret de la función |

**Edge Functions (secrets de Supabase, `supabase secrets set ...`, nunca en `.env` del frontend)**

| Variable | Función que la usa | Estado en prod |
|---|---|---|
| `MERCADOPAGO_ACCESS_TOKEN` | `create-checkout-preference`, `cancel-subscription` | ✅ seteada (reusa la misma cuenta de MP) |
| `MERCADOPAGO_WEBHOOK_SECRET` | `mercadopago-webhook` | ❌ **pendiente** — copiarlo del panel de MP y setearlo en el proyecto nuevo |
| `MERCADOPAGO_PLAN_ID_MONTHLY` | `create-checkout-preference` | ❌ **pendiente** — volver a setear con el mismo valor que ya existía |
| `MERCADOPAGO_PLAN_ID_ANNUAL` | `create-checkout-preference` | ❌ **pendiente** — ídem |
| `APP_URL` | `create-checkout-preference` (back_url del checkout) | ✅ seteada (`https://kognit.in`) |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | `send-reminder-push` | ❌ **pendiente** — mismo ítem que `VITE_VAPID_PUBLIC_KEY` arriba |
| `service_role_key` (Supabase Vault, no `secrets set`) | cron de `send-reminder-push` (`net.http_post`) | ✅ seteada (proyecto nuevo, migración `20260707120000`) |

No hay variables de Stripe: la integración de pagos se rehizo con Mercado Pago (ver nota en Sprint 4); si en algún momento se reintroduce Stripe como método adicional, agregar acá `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET` siguiendo el mismo patrón (secrets de Edge Function, nunca en `.env` del frontend).

### Segunda migración de proyecto Supabase (2026-07-07)

Se migró de `goqrqtfdsrmjqjimjtwx` a un proyecto nuevo, **`wpjufgefhcyncseuikel`** (org `vxhgumbsvhubtqdznhdu`, región `sa-east-1`, ya existía con el schema inicial aplicado desde el 2026-07-01 pero sin el resto de migraciones).

- **Hallazgo antes de migrar**: el proyecto no estaba realmente vacío — tenía 3 usuarios/perfiles de prueba (creados 2026-07-02). Confirmado con el usuario que eran de prueba, se borraron (`delete from auth.users`, cascadea a `profiles` por el `ON DELETE CASCADE`) antes de aplicar el resto del schema.
- Se aplicaron las 13 migraciones que le faltaban (`supabase db push`), incluida `20260706160000_fix_push_subscriptions_update_policy.sql` (el fix de RLS que había quedado pendiente del Sprint 6 contra el proyecto anterior).
- **Bug encontrado y corregido**: `20260706140000_fix_reminder_push_cron_url.sql` (el fix anterior) todavía apuntaba al proyecto viejo (`goqrqtfdsrmjqjimjtwx`) en el `net.http_post` del cron. Se agregó `20260707120000_fix_reminder_push_cron_url_v2.sql` con la URL del proyecto nuevo. **Esto se va a repetir cada vez que el proyecto cambie de ref** — Postgres no puede leer su propio project ref en runtime (ya anotado como advertencia en el fix original).
- Se creó el secret de Vault `service_role_key` con la key real del proyecto nuevo (obtenida vía `supabase projects api-keys`), y se confirmó que `pg_cron`/`pg_net` quedaron habilitadas y el cron job reprogramado correctamente.
- Se deployaron las 4 Edge Functions (`create-checkout-preference`, `cancel-subscription` con JWT; `mercadopago-webhook` y `send-reminder-push` con `--no-verify-jwt`) — el deploy funcionó sin Docker corriendo (bundling remoto de Supabase).
- Se setearon los secrets `MERCADOPAGO_ACCESS_TOKEN` (mismo valor que ya estaba en el `.env` local) y `APP_URL=https://kognit.in`.
- Se habilitó `external_anonymous_users_enabled` (modo invitado) vía Management API.
- **Bug encontrado y corregido**: la config de Auth (`site_url`/`uri_allow_list`) todavía apuntaba a una URL de preview de Vercel (`kognit-web-git-main-colonia-cloud.vercel.app`), no a `kognit.in` — el redirect de "olvidé mi contraseña" habría fallado en producción. Corregido vía Management API (`site_url` → `https://kognit.in`, se agregó `https://kognit.in/**` al `uri_allow_list`, sin sacar las entradas de `localhost` ni la de Vercel por si todavía se usa para previews).
- Se confirmó que el bucket `note-images` se crea solo (vía `INSERT INTO storage.buckets` dentro de la migración `20260702050000`), no hace falta crearlo a mano.
- `.env` y `.env.example` del frontend actualizados con la URL/project ID/anon key del proyecto nuevo.
- Se corrigieron 2 URLs del dominio de preview viejo (`kognitapp.lovable.app`) que habían quedado hardcodeadas: `index.html` (`canonical`/`og`/`twitter`) y el fallback de `APP_URL` en `create-checkout-preference` — ambas ahora apuntan a `https://kognit.in`.

**Actualización (2026-07-07, revisión a fondo post-migración)**:
- `MERCADOPAGO_PLAN_ID_MONTHLY`/`MERCADOPAGO_PLAN_ID_ANNUAL` reseteados en el proyecto nuevo con los mismos valores que ya existían en Mercado Pago (`147594b9dc9f477ab7c2416d43cff176` mensual, `6ee19006a06b47e18871e4e47a362ad9` anual) — confirmado vía API de MP que ambos `preapproval_plan` siguen `status: active`.
- **Bug encontrado y corregido**: el `back_url` de esos dos `preapproval_plan` en Mercado Pago seguía apuntando a `kognitapp.lovable.app` — corregido a `https://kognit.in/app?upgrade=success` vía API. No rompía el flujo (`create-checkout-preference` ya pasa su propio `back_url` en cada creación de preapproval, que pisa el default del plan), pero quedaba inconsistente.
- **Bug encontrado y corregido**: `supabase/config.toml` (`project_id`) nunca se había actualizado desde la migración original — seguía en `urebsukvtbdhtkixyyaw`, ni siquiera en `goqrqtfdsrmjqjimjtwx`. El link real (`supabase/.temp/project-ref`, no versionado) sí apuntaba al proyecto correcto, así que no afectaba los comandos de la CLI, pero era metadata engañosa para cualquiera que clonara el repo. Corregido a `wpjufgefhcyncseuikel`.
- **Bug encontrado y corregido**: `CLAUDE.md` todavía documentaba el proyecto anterior (`goqrqtfdsrmjqjimjtwx`) como el vigente. Actualizado con el historial completo de los 3 project refs.
- **Hallazgo crítico**: el bundle que estaba corriendo en producción (`https://kognit.in`) todavía era el build viejo, compilado antes de actualizar el `.env` — seguía apuntando a `goqrqtfdsrmjqjimjtwx` (confirmado descargando el JS servido en vivo y buscando el project ref adentro). El proyecto viejo no fue borrado (sigue respondiendo 401 en su REST API), así que el sitio no estaba caído, pero cualquier signup/dato nuevo iba a la base equivocada. Se generó un build nuevo localmente (`bun run build`) y se confirmó que ya referencia `wpjufgefhcyncseuikel` — falta el re-deploy a Hostinger (manual, lo hace el usuario) para que quede en vivo. *(Nota 2026-07-10: esto se creía manual en ese momento; después se confirmó que el deploy es automático en cada push a `master` — ver nota en "Dominio de producción" más abajo.)*

**Pendiente para terminar de dejar el proyecto nuevo operativo** (necesita datos que solo tiene el usuario, no se pudo resolver desde este entorno):
- ~~Re-deployar el build nuevo a Hostinger (el bundle en producción todavía es el viejo — ver hallazgo arriba).~~ Resuelto de por sí: el deploy es automático en cada push a `master` (confirmado 2026-07-10), así que los numerosos commits posteriores a este hallazgo ya lo dejaron en vivo.
- Setear `MERCADOPAGO_WEBHOOK_SECRET` como secret del proyecto nuevo (pendiente de que el owner de la cuenta de MP lo comparta).
- Decidir si se reutiliza el par de claves VAPID anterior (falta la clave privada, no estaba guardada en este entorno) o se genera uno nuevo — y setear `VITE_VAPID_PUBLIC_KEY` (frontend) + `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY` (secrets de `send-reminder-push`).
- Corregir en el panel de Mercado Pago la URL del webhook (estaba apuntando a `https://kognit.in`, un dominio de frontend sin endpoint para recibir notificaciones) para que apunte a `https://wpjufgefhcyncseuikel.supabase.co/functions/v1/mercadopago-webhook`. No se tocó desde acá porque el usuario está terminando de cargar esa pantalla manualmente en este momento.

**Validación real ejecutada**: `bunx tsc --noEmit` limpio, `bun run lint` → 25 problemas (14 errores, 11 warnings), igual al baseline de Sprint 5, cero regresiones. `bun run test` → 24 tests passed sin cambios. `bun run build` + `bun run preview` + `bunx lighthouse --preset=desktop` corridos dos veces (antes/después de los fixes de accesibilidad): performance 93→96, accessibility 86→**100**, best-practices 100, seo 100 (sin categoría "PWA" — deprecada por Lighthouse desde v9+, instalabilidad ya validada manualmente en Sprints 2-3). Script ad-hoc de diff de i18n confirma los 10 idiomas sincronizados en 359 keys tras agregar `common.error.*`, `common.backAria` y `community.messagesAria`.

**Pendientes que quedan fuera de este entorno**:
- Aplicar la migración `20260706160000_fix_push_subscriptions_update_policy.sql` contra el proyecto real (`supabase db push`, requiere `SUPABASE_ACCESS_TOKEN` del usuario).
- Definir y comunicar la fecha de lanzamiento del MVP (depende de cerrar los pendientes de Sprint 4 y Sprint 5 primero).

### Dominio de producción

> **Nota (2026-07-10)**: las referencias a "re-deploy manual a Hostinger" de esta sección (hallazgos del 2026-07-07, más abajo) están desactualizadas. El usuario confirmó que el deploy es automático en cada push a `master` — consistente con la URL de preview `kognit-web-git-main-colonia-cloud.vercel.app` que ya aparecía en el `uri_allow_list` de Supabase Auth (línea de la migración de proyecto, más abajo), que sugiere una integración de Vercel con este repo de GitHub. No se verificó el detalle exacto (dashboard de Vercel, si Hostinger sigue interviniendo como DNS/dominio o quedó completamente reemplazado) — solo queda documentado que **`git push` a `master` alcanza para publicar**, no hace falta ningún paso manual de subida de `dist/`.

La app quedó publicada en **https://kognit.in** (hosting Hostinger). Verificado (2026-07-07): responde 200, sirve `manifest.webmanifest`, `sw.js` e íconos correctamente. Se encontraron y corrigieron URLs viejas hardcodeadas del dominio de preview anterior (`kognitapp.lovable.app`) que habían quedado en el repo:
- `index.html`: `canonical`, `og:url`, `og:image`, `twitter:image` — actualizados a `https://kognit.in`.
- `supabase/functions/create-checkout-preference/index.ts`: el fallback de `APP_URL` (cuando el secret no está seteado) apuntaba a `kognitapp.lovable.app` — actualizado a `https://kognit.in`.

**Pendiente**: confirmar (o corregir) que el secret real `APP_URL` en Supabase esté seteado a `https://kognit.in` exacto — no se pudo verificar desde este entorno (no hay `SUPABASE_ACCESS_TOKEN`). Si el secret tiene otro valor (o está vacío y depende del fallback), el `back_url` del checkout de Mercado Pago va a redirigir al lugar equivocado después de pagar.

Con el dominio real en línea, ya se puede avanzar con los pendientes manuales que requerían una URL pública: QA de instalación PWA (Sprint 2), QA de push (Sprint 3) y la prueba end-to-end de Mercado Pago en sandbox (Sprint 4, una vez seteado `MERCADOPAGO_WEBHOOK_SECRET`).

---

## Import cross-repo desde kognitmer/kognitapp (2026-07-10)

`github.com/kognitmer/kognitapp` resultó ser un fork hermano no declarado del mismo proyecto: comparte con este repo las primeras 7 migraciones de Supabase byte a byte y divergió el 2026-07-02, después de `20260702050000_note_images_bucket_public_read.sql`. Desde ahí siguió un camino distinto (mensajería social con voz/solicitudes/bloqueo, perfiles públicos, avatares, contenido de cartas mentales rediseñado) mientras este repo se enfocó en monetización/PWA/testing. Se importaron tres piezas de esa rama, en fases, revisadas una por una con el usuario:

**Fase 1 — Cartas mentales**: contenido completo de las 50 cartas (5 categorías × 10) reemplazado por la versión en formato pregunta-respuesta de kognitapp, en los 10 idiomas — descargado con `curl` directo a `raw.githubusercontent.com` (no vía la herramienta de fetch con resumen por IA, para no arriesgar corrupción de comillas tipográficas en ~1500 strings). Categorías renombradas (`mindfulness`: "Mindfulness y Respiración" → "Conexión Interna"). Se agregó el token de diseño `cyan` (`--cyan`/`--cyan-foreground`/`--gradient-cyan` en `index.css` + `tailwind.config.ts`) porque el `accent` existente ya representaba el tono "oscuro/deep", no el celeste que necesitaba esa categoría.

**Fase 2 — Avatares, perfiles públicos y admiraciones**: nueva columna `profiles.avatar_url`, bucket `avatars`, tabla `profile_admirations`, componentes `Avatar.tsx`/`PublicProfileSheet.tsx`, y una policy RLS que abre lectura de `profiles` a cualquier autenticado — de paso corrigió un bug real preexistente: `Community.tsx` no podía resolver el nombre de otros autores porque la policy anterior solo permitía leer el propio perfil, así que todo caía al nombre por defecto.

**Fase 3 — Mensajería completa**: tablas `message_requests`, `user_blocks`, `conversation_settings`; función `is_blocked_pair()`; bucket privado `voice-messages`; `messages` ganó `audio_path`/`audio_duration_seconds` (contenido ahora nullable, `CHECK` exige texto o audio); función `send_direct_message()` como único punto de entrada para insertar mensajes (crea/reactiva la solicitud y valida bloqueo en una transacción). Grabación de audio con `MediaRecorder` nativo, sin librerías nuevas (`src/lib/audio.ts` + `src/hooks/use-voice-recorder.ts`). `Messages.tsx` se reescribió completo (tabs mensajes/solicitudes, búsqueda, mute/bloqueo/borrado por conversación) — a diferencia de kognitapp (que lo implementa como modal), acá se mantuvo como pantalla completa de `MobileApp.tsx` para no romper el patrón de ruteo existente. Se eliminó `src/lib/conversations.ts` (`groupConversations`) y su test porque la nueva lógica de agrupación (que necesita mezclar estado de solicitud/mute/bloqueo en la misma pasada) la dejó sin uso.

**Decisiones de negocio tomadas explícitamente por el usuario en este import** (no inferidas):
- La mensajería (texto + voz + solicitudes + bloqueo) quedó **abierta a todos los planes**, no exclusiva de Pro como estaba antes — esto reemplaza la fila "Mensajería privada (DMs)" de la tabla de gating de Sprint 4 (ver arriba), que ya no aplica.
- Se separó `Profile.tsx` en `Profile.tsx` (stats + plan Pro) y un nuevo `Settings.tsx` (editar nombre, recordatorio, sonido, preferencias, privacidad, cerrar sesión, borrar cuenta), replicando la arquitectura de kognitapp. Nuevo `View` `"settings"` en `MobileApp.tsx`, alcanzable desde el ícono de engranaje en `Profile.tsx` (no está en `BottomNav`, mismo patrón que `tilt`/`messages`).

**Migraciones aplicadas contra el proyecto real** (`wpjufgefhcyncseuikel`, con un `SUPABASE_ACCESS_TOKEN` que el usuario generó y pegó en `.env` para la sesión — no se guardó en ningún archivo del repo): `20260710120000_public_profiles_rls.sql`, `20260710120100_avatars.sql`, `20260710120200_profile_admirations.sql`, `20260710130000_message_requests_and_moderation.sql`, `20260710130100_voice_messages.sql`. Confirmado con `supabase migration list --linked` que las 19 migraciones locales (16 previas + estas 5) coinciden exactamente con el historial remoto. `types.ts` regenerado con `supabase gen types` después de cada tanda — reemplaza los parches a mano que se habían hecho mientras tanto para poder seguir tipando el código antes de aplicar.

**Hallazgo de drift de schema** (al regenerar `types.ts`): la tabla `profiles` real tiene `goals text[]`, `tilt_triggers text[]` y `onboarding_completed boolean`, que no corresponden a ninguna migración del repo — se agregaron a mano en algún momento. No hay código que las use todavía; quedan documentadas en `CLAUDE.md` como nota de advertencia, sin tocarlas.

**Gaps conocidos, dejados afuera a propósito**:
- No hay UI para subir el avatar propio (ni en este repo ni en kognitapp) — la columna/bucket están listos pero nada los escribe todavía.
- No se importó el picker de sonido de notificaciones de kognitapp (`getNotificationSound`/`NOTIFICATION_SOUNDS`) — depende de un subsistema de push distinto al `src/lib/push.ts` que ya funciona acá; se puede sumar después si hace falta.
- No se importó el bucket `note-audio` (audio en notas públicas de Comunidad) — el pedido fue específicamente "mensajería", no notas de audio en el feed.

**Validación ejecutada**: `tsc --noEmit` limpio (mismos 2 errores preexistentes de `Tilt.tsx`, no relacionados), `eslint` limpio en todos los archivos tocados, `vitest run` → 18/18 tests (bajaron de 24 por los 6 tests de `conversations.test.ts` eliminado junto con el código que testeaba), los 10 JSON de i18n validados y con conteo de cartas verificado (10 por categoría × 5 categorías × 10 idiomas). Verificación en vivo contra el dev server (`curl` a cada archivo compilado por Vite) para los archivos nuevos/tocados de las 3 fases.

---

## Backlog post-MVP (fuera de alcance por ahora)

Cosas identificadas en `AGENTE.md` que quedan explícitamente para después del MVP:
- App nativa real (Capacitor/React Native) más allá de la PWA.
- Plan anual con descuento u otros niveles de precio además de Free/Pro.
- Analítica de producto (funnels, retención) más allá de las stats propias de la app.
- Moderación de contenido en Comunidad (reportes, baneos).
