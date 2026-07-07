import { describe, it, expect } from "vitest";
import { computeFocusWeek } from "./focusWeek";

const days = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
// Lunes de referencia fijo para que los tests no dependan de la fecha real.
const monday = new Date(2026, 5, 22); // 2026-06-22 es lunes

describe("computeFocusWeek", () => {
  it("devuelve 0 en focusWeek y null en avg/trend cuando no hay filas", () => {
    const result = computeFocusWeek([], monday, days);
    expect(result.focusWeek).toEqual(days.map(d => ({ d, v: 0 })));
    expect(result.focusAvg).toBeNull();
    expect(result.focusTrend).toBeNull();
  });

  it("ignora filas sin post_intensity", () => {
    const result = computeFocusWeek(
      [{ post_intensity: null, created_at: monday.toISOString() }],
      monday,
      days
    );
    expect(result.focusAvg).toBeNull();
  });

  it("calcula el score como (10 - post_intensity) * 10 para el día correspondiente", () => {
    // Lunes (idx 0), post_intensity 4 → score 60
    const result = computeFocusWeek(
      [{ post_intensity: 4, created_at: monday.toISOString() }],
      monday,
      days
    );
    expect(result.focusWeek[0]).toEqual({ d: "Lun", v: 60 });
    expect(result.focusAvg).toBe(60);
  });

  it("promedia varias sesiones del mismo día", () => {
    const result = computeFocusWeek(
      [
        { post_intensity: 4, created_at: monday.toISOString() }, // score 60
        { post_intensity: 2, created_at: monday.toISOString() }, // score 80
      ],
      monday,
      days
    );
    expect(result.focusWeek[0]).toEqual({ d: "Lun", v: 70 });
  });

  it("separa filas de la semana anterior para el cálculo de tendencia", () => {
    const lastWeek = new Date(monday);
    lastWeek.setDate(lastWeek.getDate() - 3); // dentro de la semana previa
    const result = computeFocusWeek(
      [
        { post_intensity: 0, created_at: monday.toISOString() }, // score 100, semana actual
        { post_intensity: 5, created_at: lastWeek.toISOString() }, // score 50, semana anterior
      ],
      monday,
      days
    );
    expect(result.focusAvg).toBe(100);
    // (100 - 50) / 50 * 100 = 100%
    expect(result.focusTrend).toBe(100);
  });

  it("devuelve focusTrend null si no hay datos de la semana anterior", () => {
    const result = computeFocusWeek(
      [{ post_intensity: 4, created_at: monday.toISOString() }],
      monday,
      days
    );
    expect(result.focusTrend).toBeNull();
  });
});
