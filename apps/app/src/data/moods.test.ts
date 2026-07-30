import { describe, it, expect } from "vitest";
import { resolveMoodId, MOOD_OPTIONS } from "./moods";

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
