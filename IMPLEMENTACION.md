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
| 2 | [PWA instalable](#sprint-2--pwa-instalable) | Manifest, service worker, iconos, instalación | ⬜ Pendiente | — |
| 3 | [Notificaciones push](#sprint-3--notificaciones-push-reales) | Recordatorio diario funcionando de verdad | ⬜ Pendiente | — |
| 4 | [Monetización](#sprint-4--monetización-planes-y-pagos) | Plan Free/Pro, Stripe, paywall | ⬜ Pendiente | — |
| 5 | [Testing y QA](#sprint-5--testing-y-qa) | Cobertura de la lógica crítica | ⬜ Pendiente | — |
| 6 | [Pulido y lanzamiento](#sprint-6--pulido-y-lanzamiento) | Performance, copy, checklist de salida | ⬜ Pendiente | — |

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

- [ ] Instalar y configurar `vite-plugin-pwa` en `vite.config.ts`.
- [ ] Crear `manifest.json` (nombre, short_name, colores del tema acorde a los tokens de `index.css`, iconos 192/512, `display: standalone`).
- [ ] Generar set de iconos a partir de `kognit-logo.png` / `kognit-mascot.png` en los tamaños requeridos.
- [ ] Service worker con estrategia de cache apropiada (precache de shell + runtime cache para assets de Supabase Storage, `NetworkFirst` para llamadas a la API).
- [ ] Agregar prompt de instalación (`beforeinstallprompt`) con un CTA propio en vez de depender del banner nativo del navegador — reemplaza los links muertos de tiendas en `Index.tsx`.
- [ ] Verificar comportamiento offline mínimo: la app debe poder abrir (aunque sea a una pantalla de "sin conexión") si no hay red, no crashear en blanco.
- [ ] Actualizar `CLAUDE.md` una vez esté implementado, para que la sección de stack deje de describir el PWA como aspiracional.
- [ ] Probar instalación real en Android (Chrome) y desktop (Chrome/Edge); documentar limitaciones conocidas de iOS Safari.

---

## Sprint 3 — Notificaciones push reales

- [ ] Generar par de claves VAPID para Web Push.
- [ ] Agregar en el service worker (del Sprint 2) el listener de `push` y `notificationclick`.
- [ ] En el cliente: al activar el toggle de recordatorio en `Profile.tsx`, pedir permiso (`Notification.requestPermission`) y suscribir al usuario (`pushManager.subscribe`), guardando la subscription en una tabla nueva `push_subscriptions` (`user_id`, `endpoint`, `keys`, `created_at`).
- [ ] Backend: Supabase Edge Function programada (cron) que corra cada minuto/cada 15 min, busque perfiles con `reminder_enabled = true` cuyo `reminder_time` matchee la hora actual (en su timezone) y dispare el push vía `web-push` con las subscriptions guardadas.
- [ ] Manejar limpieza de subscriptions inválidas/expiradas (si el push falla con 410, borrar la fila de `push_subscriptions`).
- [ ] Si se desactiva el recordatorio o se elimina la cuenta, borrar la subscription correspondiente (agregar a la lista de borrados en `deleteAccount()` de `Profile.tsx`).
- [ ] Probar en al menos un dispositivo Android real (los navegadores de escritorio simulan distinto que mobile).

---

## Sprint 4 — Monetización (planes y pagos)

**Antes de arrancar**: el equipo de producto debe confirmar la propuesta de gating de features. Propuesta inicial (ajustar según decisión de negocio):

| Feature | Free | Kognit Pro |
|---|---|---|
| Protocolo Tilt (ambos modos) | ✅ Ilimitado | ✅ Ilimitado |
| Cartas mentales | 1 categoría gratis | Las 5 categorías |
| Diario / Calendario | ✅ | ✅ + gráfico de tendencia histórica (no solo semanal) |
| Comunidad y mensajes | ✅ | ✅ |
| Logros y stats avanzadas | Básico | Completo |

- [ ] Confirmar con negocio la tabla de gating final antes de implementar el paywall (evitar hardcodear una decisión de producto sin validar).
- [ ] Modelo de datos: agregar `plan` (`free` | `pro`) y `plan_renews_at` a `profiles`, o tabla `subscriptions` separada sincronizada con Stripe (`stripe_customer_id`, `stripe_subscription_id`, `status`, `current_period_end`).
- [ ] Crear producto y precio en Stripe (mensual, y opcionalmente anual con descuento).
- [ ] Edge Function `create-checkout-session`: recibe `user_id`, crea/reusa `stripe_customer_id`, devuelve URL de Stripe Checkout.
- [ ] Edge Function `stripe-webhook`: escucha `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted` y actualiza `profiles`/`subscriptions` en consecuencia.
- [ ] Edge Function o link directo al **Customer Portal** de Stripe para que el usuario pueda cancelar/actualizar su método de pago sin soporte manual.
- [ ] Frontend: pantalla o sección "Kognit Pro" (puede vivir dentro de `Profile.tsx`, reemplazando el badge decorativo actual) con comparación de planes y CTA a Checkout.
- [ ] Frontend: gating real en `Cards.tsx` (bloquear categorías Pro para usuarios free, con CTA a upgrade) y en `Calendar.tsx` (tendencia histórica solo Pro).
- [ ] Manejar el caso trial/gracia: qué pasa si el pago falla o la suscripción vence (`past_due`) — no cortar el acceso de forma abrupta sin aviso.
- [ ] Actualizar `deleteAccount()` en `Profile.tsx` para cancelar la suscripción de Stripe antes de borrar el perfil (evitar seguir cobrando a una cuenta eliminada).
- [ ] Documentar en `CLAUDE.md` las nuevas variables de entorno (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `VITE_STRIPE_PUBLISHABLE_KEY`, etc.) sin commitear valores reales.

---

## Sprint 5 — Testing y QA

- [ ] Configurar cobertura mínima objetivo (ej. lógica crítica, no UI completa) y agregarla a `bun test`.
- [ ] Tests unitarios de lógica pura sin mockear Supabase de más:
  - [ ] Motor de fases del protocolo Tilt (`PATTERNS`, avance de fase/ciclo).
  - [ ] Cálculo de score de foco semanal (`loadFocusWeek` en `Calendar.tsx`) — extraerlo a una función pura testeable si hace falta.
  - [ ] `resolveMoodId` (moods.ts) incluyendo el mapeo legacy de emojis.
  - [ ] Lógica de agrupación de conversaciones en `Messages.tsx`.
- [ ] Tests de integración de los flujos de auth (login, signup, guest, forgot password) contra un proyecto Supabase de test/staging, no producción.
- [ ] Test manual guiado (checklist, no automatizado) de:
  - [ ] Flujo completo de pago Stripe en modo test (checkout → webhook → gating actualizado).
  - [ ] Instalación de la PWA y recepción de una notificación push de prueba.
  - [ ] Eliminación de cuenta (verificar que borra notas, reacciones, sesiones, mensajes, imágenes de Storage y suscripción de Stripe).
- [ ] Activar el lint y los tests en CI (si no existe todavía un pipeline, ver Sprint 6).

---

## Sprint 6 — Pulido y lanzamiento

- [ ] Revisar los 10 idiomas para confirmar que las keys nuevas de los sprints anteriores (onboarding conectado, logros, paywall, notificaciones) están traducidas al menos en `es.json`, con fallback correcto en el resto.
- [ ] Auditoría de performance (Lighthouse: PWA, performance, accesibilidad) sobre el build de producción.
- [ ] Revisar políticas RLS de Supabase para las tablas nuevas (`push_subscriptions`, `subscriptions`) — mismo criterio de seguridad que las tablas existentes.
- [ ] Preparar CI/CD básico (build + lint + test en cada PR) si no existe.
- [ ] Checklist de variables de entorno de producción (Supabase, Stripe, VAPID) documentado y separado de test/staging.
- [ ] Página de estado vacío / error genérico para cuando Supabase no responde (hoy varias pantallas asumen que la data siempre llega).
- [ ] Definir y comunicar la fecha de lanzamiento del MVP una vez cerrado este sprint.

---

## Backlog post-MVP (fuera de alcance por ahora)

Cosas identificadas en `AGENTE.md` que quedan explícitamente para después del MVP:
- App nativa real (Capacitor/React Native) más allá de la PWA.
- Plan anual con descuento u otros niveles de precio además de Free/Pro.
- Analítica de producto (funnels, retención) más allá de las stats propias de la app.
- Moderación de contenido en Comunidad (reportes, baneos).
