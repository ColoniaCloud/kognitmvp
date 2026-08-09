import { describe, it, expect } from "vitest";
import { resolveMoodId, needsReset, MOOD_OPTIONS, RESET_MOODS } from "./moods";

describe("resolveMoodId", () => {
  it("devuelve null para valores nulos o vacíos", () => {
    expect(resolveMoodId(null)).toBeNull();
    expect(resolveMoodId(undefined)).toBeNull();
    expect(resolveMoodId("")).toBeNull();
  });

  it("resuelve un id de mood válido tal cual", () => {
    for (const { id } of MOOD_OPTIONS) {
      expect(resolveMoodId(id)).toBe(id);
    }
  });

  it("mapea los emojis legacy a su id correspondiente", () => {
    expect(resolveMoodId("🧘")).toBe("calm");
    expect(resolveMoodId("🎯")).toBe("focus");
    expect(resolveMoodId("😐")).toBe("neutral");
    expect(resolveMoodId("😤")).toBe("frustrated");
    expect(resolveMoodId("🔥")).toBe("tilt");
  });

  it("devuelve null para strings desconocidos (ni id válido ni emoji legacy)", () => {
    expect(resolveMoodId("no-existe")).toBeNull();
    expect(resolveMoodId("😀")).toBeNull();
  });
});

describe("needsReset", () => {
  it("sin estado elegido no ofrece el reset", () => {
    // El Home muestra la variante callada (proponer el ancla), no un CTA de
    // crisis a alguien que todavía no dijo cómo está.
    expect(needsReset(null)).toBe(false);
  });

  it("los tres estados de la fila de abajo piden reset, incluido neutral", () => {
    expect(needsReset("neutral")).toBe(true);
    expect(needsReset("frustrated")).toBe(true);
    expect(needsReset("tilt")).toBe(true);
  });

  it("los estados deseados no piden reset", () => {
    expect(needsReset("calm")).toBe(false);
    expect(needsReset("focus")).toBe(false);
    expect(needsReset("motivated")).toBe(false);
  });

  it("cada mood cae de un lado o del otro, sin huérfanos", () => {
    // Si se suma un mood a la grilla hay que decidir explícitamente de qué lado
    // va: el Home tiene copy propio por estado en home.contextual.reset.lines.
    for (const { id } of MOOD_OPTIONS) {
      expect(needsReset(id)).toBe(RESET_MOODS.includes(id));
    }
  });
});
