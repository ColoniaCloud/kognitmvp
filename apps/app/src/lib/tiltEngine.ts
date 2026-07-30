// `hold2` es la pausa post-exhalación de la respiración en caja (box breathing):
// el modo rápido es 4·4·4·4, no 4·4·4.
export type Phase = "in" | "hold" | "out" | "hold2";
export type Mode = "deep" | "fast";

export interface BreathPattern {
  phases: Phase[];
  secs: number[];
  cycles: number;
}

export const PATTERNS: Record<Mode, BreathPattern> = {
  // 4·7·8 — exhalación larga, baja la activación rápido. ~90 s.
  deep: { phases: ["in", "hold", "out"], secs: [4, 7, 8], cycles: 3 },
  // Respiración en caja 4·4·4·4 — la pausa post-exhalación (`hold2`) es parte de
  // la técnica, no un relleno: es lo que la vuelve sostenible y regular. ~64 s.
  fast: { phases: ["in", "hold", "out", "hold2"], secs: [4, 4, 4, 4], cycles: 4 },
};

export interface BreathPhaseState {
  cycle: number;
  phaseIdx: number;
}

export type BreathAdvanceResult =
  | { done: true }
  | { done: false; cycle: number; phaseIdx: number };

/**
 * Type guard para distinguir las dos variantes del resultado.
 *
 * Hace falta explícitamente porque el proyecto compila con `strictNullChecks: false`,
 * y sin eso TypeScript no estrecha uniones discriminadas por un booleano: un
 * `if (result.done) ... else result.cycle` no compila aunque en runtime sea correcto.
 */
export function isBreathDone(result: BreathAdvanceResult): result is { done: true } {
  return result.done;
}

// Avanza a la siguiente fase de respiración (in → hold → out → siguiente ciclo).
// `done: true` indica que se completaron todos los ciclos (pattern.cycles + extraCycles) y hay que pasar a grounding.
export function advanceBreathPhase(
  pattern: BreathPattern,
  state: BreathPhaseState,
  extraCycles: number
): BreathAdvanceResult {
  const nextPhase = state.phaseIdx + 1;
  if (nextPhase >= pattern.phases.length) {
    const nextCycle = state.cycle + 1;
    if (nextCycle >= pattern.cycles + extraCycles) {
      return { done: true };
    }
    return { done: false, cycle: nextCycle, phaseIdx: 0 };
  }
  return { done: false, cycle: state.cycle, phaseIdx: nextPhase };
}
