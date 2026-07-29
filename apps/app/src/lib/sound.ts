/**
 * `AudioContext` se declara en lib.dom como `var` global, no como propiedad de la
 * interfaz `Window`, así que hay que nombrarlo explícitamente. Safari viejo solo
 * expone la variante prefijada.
 */
type AudioContextWindow = Window & {
  AudioContext?: typeof AudioContext;
  webkitAudioContext?: typeof AudioContext;
};

export function playBong(freq = 660) {
  try {
    const w = window as AudioContextWindow;
    const Ctx = w.AudioContext || w.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const now = ctx.currentTime;

    // Subtle "bong" — sine fundamental + soft harmonic with long decay
    const base = Math.min(freq, 280);
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.08, now + 0.03);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 3.2);
    master.connect(ctx.destination);

    const partials = [
      { f: base, g: 1 },
      { f: base * 2.01, g: 0.35 },
      { f: base * 3.02, g: 0.12 },
    ];

    partials.forEach(({ f, g }) => {
      const o = ctx.createOscillator();
      const pg = ctx.createGain();
      o.type = "sine";
      o.frequency.value = f;
      pg.gain.value = g;
      o.connect(pg);
      pg.connect(master);
      o.start(now);
      o.stop(now + 3.3);
    });
  } catch {
    // Sin Web Audio (o bloqueado por política de autoplay) el bong es opcional:
    // el protocolo de Tilt funciona igual en silencio.
  }
}
