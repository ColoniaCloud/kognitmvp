import { describe, it, expect } from "vitest";
import { PATTERNS, advanceBreathPhase } from "./tiltEngine";

describe("PATTERNS", () => {
  it("define deep como 4·7·8 con 3 ciclos", () => {
    expect(PATTERNS.deep).toEqual({ phases: ["in", "hold", "out"], secs: [4, 7, 8], cycles: 3 });
  });

  it("define fast como respiración en caja 4·4·4·4 con 4 ciclos", () => {
    expect(PATTERNS.fast).toEqual({ phases: ["in", "hold", "out", "hold2"], secs: [4, 4, 4, 4], cycles: 4 });
  });

  it("deep dura ~90s y fast ~64s", () => {
    const total = (p: typeof PATTERNS.deep) => p.secs.reduce((a, b) => a + b, 0) * p.cycles;
    expect(total(PATTERNS.deep)).toBe(57);
    expect(total(PATTERNS.fast)).toBe(64);
  });
});

describe("advanceBreathPhase", () => {
  it("avanza de 'in' a 'hold' dentro del mismo ciclo", () => {
    const result = advanceBreathPhase(PATTERNS.fast, { cycle: 0, phaseIdx: 0 }, 0);
    expect(result).toEqual({ done: false, cycle: 0, phaseIdx: 1 });
  });

  it("avanza de 'hold' a 'out' dentro del mismo ciclo", () => {
    const result = advanceBreathPhase(PATTERNS.fast, { cycle: 0, phaseIdx: 1 }, 0);
    expect(result).toEqual({ done: false, cycle: 0, phaseIdx: 2 });
  });

  it("en fast, después de 'out' viene la pausa 'hold2' y recién ahí cierra el ciclo", () => {
    const toHold2 = advanceBreathPhase(PATTERNS.fast, { cycle: 0, phaseIdx: 2 }, 0);
    expect(toHold2).toEqual({ done: false, cycle: 0, phaseIdx: 3 });
    const nextCycle = advanceBreathPhase(PATTERNS.fast, { cycle: 0, phaseIdx: 3 }, 0);
    expect(nextCycle).toEqual({ done: false, cycle: 1, phaseIdx: 0 });
  });

  it("en deep, 'out' es la última fase y cierra el ciclo directo", () => {
    const result = advanceBreathPhase(PATTERNS.deep, { cycle: 0, phaseIdx: 2 }, 0);
    expect(result).toEqual({ done: false, cycle: 1, phaseIdx: 0 });
  });

  it("termina (done: true) al completar el último ciclo del patrón", () => {
    expect(advanceBreathPhase(PATTERNS.fast, { cycle: 3, phaseIdx: 3 }, 0)).toEqual({ done: true });
    expect(advanceBreathPhase(PATTERNS.deep, { cycle: 2, phaseIdx: 2 }, 0)).toEqual({ done: true });
  });

  it("respeta ciclos extra agregados por el usuario (botón 'extender')", () => {
    // cycle 3 es el último de los 4 base de fast; con 1 ciclo extra todavía queda el ciclo 4.
    const result = advanceBreathPhase(PATTERNS.fast, { cycle: 3, phaseIdx: 3 }, 1);
    expect(result).toEqual({ done: false, cycle: 4, phaseIdx: 0 });
    const finalResult = advanceBreathPhase(PATTERNS.fast, { cycle: 4, phaseIdx: 3 }, 1);
    expect(finalResult).toEqual({ done: true });
  });

  it("funciona igual con el patrón deep (mismas fases, distintos segundos)", () => {
    const result = advanceBreathPhase(PATTERNS.deep, { cycle: 1, phaseIdx: 2 }, 0);
    expect(result).toEqual({ done: false, cycle: 2, phaseIdx: 0 });
  });
});
