import { describe, it, expect } from "vitest";
import { computeResetSignals, FLOOR_WINDOW, type ResetSessionSignal } from "./achievementSignals";

/** Helper: sesión con valores por defecto, sobrescribibles. */
const s = (o: Partial<ResetSessionSignal> = {}, dayOffset = 0): ResetSessionSignal => ({
  mode: "deep",
  pre_intensity: 5,
  post_intensity: 3,
  created_at: new Date(2026, 0, 1 + dayOffset).toISOString(),
  ...o,
});

/** Genera n sesiones con los post_intensity dados, la primera es la más reciente. */
const withPosts = (posts: number[]): ResetSessionSignal[] =>
  posts.map((p, i) => s({ post_intensity: p }, -i));

describe("fastResets", () => {
  it("cuenta solo los resets en modo rápido", () => {
    const r = computeResetSignals([s({ mode: "fast" }), s({ mode: "deep" }), s({ mode: "fast" })]);
    expect(r.fastResets).toBe(2);
  });

  it("no cuenta sesiones sin modo registrado", () => {
    expect(computeResetSignals([s({ mode: null })]).fastResets).toBe(0);
  });
});

describe("hadHardWin", () => {
  it("marca un reset que arranca muy activado y baja fuerte", () => {
    expect(computeResetSignals([s({ pre_intensity: 9, post_intensity: 3 })]).hadHardWin).toBe(true);
  });

  it("no alcanza con arrancar alto si la caída es chica", () => {
    expect(computeResetSignals([s({ pre_intensity: 9, post_intensity: 7 })]).hadHardWin).toBe(false);
  });

  it("no alcanza con una caída grande si no arrancó alto", () => {
    expect(computeResetSignals([s({ pre_intensity: 6, post_intensity: 1 })]).hadHardWin).toBe(false);
  });

  it("ignora sesiones con intensidades sin registrar", () => {
    expect(computeResetSignals([s({ pre_intensity: null, post_intensity: 1 })]).hadHardWin).toBe(false);
  });
});

describe("raisedFloor", () => {
  it("necesita dos ventanas completas de historial", () => {
    const casi = withPosts(Array(FLOOR_WINDOW * 2 - 1).fill(5));
    expect(computeResetSignals(casi).raisedFloor).toBe(false);
  });

  it("se desbloquea cuando el peor resultado reciente mejora al peor anterior", () => {
    // 10 recientes con peor = 4, 10 previos con peor = 7
    const sessions = withPosts([...Array(FLOOR_WINDOW).fill(4), ...Array(FLOOR_WINDOW).fill(7)]);
    expect(computeResetSignals(sessions).raisedFloor).toBe(true);
  });

  it("no se desbloquea si el peor reciente empata con el anterior", () => {
    const sessions = withPosts([...Array(FLOOR_WINDOW).fill(6), ...Array(FLOOR_WINDOW).fill(6)]);
    expect(computeResetSignals(sessions).raisedFloor).toBe(false);
  });

  it("mira el peor caso y no el promedio: un mal día reciente lo bloquea", () => {
    // Promedio reciente mucho mejor, pero un solo pico de 8 iguala al peor anterior.
    const recientes = [8, 1, 1, 1, 1, 1, 1, 1, 1, 1];
    const previos = Array(FLOOR_WINDOW).fill(8);
    expect(computeResetSignals(withPosts([...recientes, ...previos])).raisedFloor).toBe(false);
  });

  it("ordena por fecha, no por el orden en que vengan las filas", () => {
    const sessions = withPosts([...Array(FLOOR_WINDOW).fill(4), ...Array(FLOOR_WINDOW).fill(7)]);
    const desordenadas = [...sessions].reverse();
    expect(computeResetSignals(desordenadas).raisedFloor).toBe(true);
  });

  it("descarta las sesiones sin post_intensity al armar las ventanas", () => {
    const sessions = [
      ...withPosts(Array(FLOOR_WINDOW).fill(4)),
      s({ post_intensity: null }, -50),
      ...withPosts(Array(FLOOR_WINDOW).fill(7)).map((x, i) => ({ ...x, created_at: new Date(2025, 0, 1 - i).toISOString() })),
    ];
    expect(computeResetSignals(sessions).raisedFloor).toBe(true);
  });
});
