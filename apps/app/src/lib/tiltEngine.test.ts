import { describe, it, expect } from "vitest";
import { PATTERNS, advanceBreathPhase } from "./tiltEngine";

describe("PATTERNS", () => {
  it("define fast como 4·4·4 y deep como 4·7·8, ambos con 3 ciclos", () => {
    expect(PATTERNS.fast).toEqual({ phases: ["in", "hold", "out"], secs: [4, 4, 4], cycles: 3 });
    expect(PATTERNS.deep).toEqual({ phases: ["in", "hold", "out"], secs: [4, 7, 8], cycles: 3 });
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

  it("al completar 'out' pasa al siguiente ciclo en fase 'in'", () => {
    const result = advanceBreathPhase(PATTERNS.fast, { cycle: 0, phaseIdx: 2 }, 0);
    expect(result).toEqual({ done: false, cycle: 1, phaseIdx: 0 });
  });

  it("termina (done: true) al completar el último ciclo del patrón", () => {
    const result = advanceBreathPhase(PATTERNS.fast, { cycle: 2, phaseIdx: 2 }, 0);
    expect(result).toEqual({ done: true });
  });

  it("respeta ciclos extra agregados por el usuario (botón 'extender')", () => {
    // cycle 2 es el último de los 3 base; con 1 ciclo extra, todavía hay que hacer el ciclo 3 (idx 3)
    const result = advanceBreathPhase(PATTERNS.fast, { cycle: 2, phaseIdx: 2 }, 1);
    expect(result).toEqual({ done: false, cycle: 3, phaseIdx: 0 });
    const finalResult = advanceBreathPhase(PATTERNS.fast, { cycle: 3, phaseIdx: 2 }, 1);
    expect(finalResult).toEqual({ done: true });
  });

  it("funciona igual con el patrón deep (mismas fases, distintos segundos)", () => {
    const result = advanceBreathPhase(PATTERNS.deep, { cycle: 1, phaseIdx: 2 }, 0);
    expect(result).toEqual({ done: false, cycle: 2, phaseIdx: 0 });
  });
});
