export interface ResetSessionMetric {
  pre_intensity: number | null;
  post_intensity: number | null;
  created_at: string;
}

export interface NoteMetric {
  created_at: string;
}

export interface ProfileMetrics {
  focusLevel: number;
  emotionalControl: number;
  streakDays: number;
  xp: number;
}

const XP_PER_RESET = 10;
const XP_PER_NOTE = 5;
// Foco/control emocional reflejan la actividad reciente; racha y xp son acumulados de por vida
// (no tendría sentido que la racha o el xp "bajen" a medida que una sesión vieja sale de la ventana).
const RECENT_WINDOW_DAYS = 30;

function dateKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

// Racha de días consecutivos (incluyendo hoy o ayer) con al menos un reset o una nota.
function computeStreakDays(activeDayKeys: Set<string>): number {
  let streak = 0;
  const cursor = new Date();
  // Si hoy todavía no hay actividad, la racha se cuenta desde ayer (no se corta a la medianoche).
  if (!activeDayKeys.has(dateKey(cursor.toISOString()))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (activeDayKeys.has(dateKey(cursor.toISOString()))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function computeProfileMetrics(
  sessions: ResetSessionMetric[],
  notes: NoteMetric[],
): ProfileMetrics {
  const recentCutoff = Date.now() - RECENT_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const recentSessions = sessions.filter(s => new Date(s.created_at).getTime() >= recentCutoff);

  const focusScores = recentSessions
    .filter(s => s.post_intensity != null)
    .map(s => (10 - (s.post_intensity as number)) * 10);

  const controlScores = recentSessions
    .filter(s => s.pre_intensity != null && s.post_intensity != null && s.pre_intensity > 0)
    .map(s => {
      const delta = (s.pre_intensity as number) - (s.post_intensity as number);
      return Math.max(0, Math.min(100, (delta / (s.pre_intensity as number)) * 100));
    });

  const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;

  const activeDayKeys = new Set<string>();
  sessions.forEach(s => activeDayKeys.add(dateKey(s.created_at)));
  notes.forEach(n => activeDayKeys.add(dateKey(n.created_at)));

  return {
    focusLevel: focusScores.length ? Math.round(avg(focusScores)) : 50,
    emotionalControl: controlScores.length ? Math.round(avg(controlScores)) : 50,
    streakDays: computeStreakDays(activeDayKeys),
    xp: sessions.length * XP_PER_RESET + notes.length * XP_PER_NOTE,
  };
}
