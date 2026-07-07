export type Phase = "in" | "hold" | "out";
export type Mode = "deep" | "fast";

export interface BreathPattern {
  phases: Phase[];
  secs: number[];
  cycles: number;
}

export const PATTERNS: Record<Mode, BreathPattern> = {
  deep: { phases: ["in", "hold", "out"], secs: [4, 7, 8], cycles: 3 },
  fast: { phases: ["in", "hold", "out"], secs: [4, 4, 4], cycles: 3 },
};

export interface BreathPhaseState {
  cycle: number;
  phaseIdx: number;
}

export type BreathAdvanceResult =
  | { done: true }
  | { done: false; cycle: number; phaseIdx: number };

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
