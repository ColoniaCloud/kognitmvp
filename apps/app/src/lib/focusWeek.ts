export interface FocusRow {
  post_intensity: number | null;
  created_at: string;
}

export interface FocusWeekResult {
  focusWeek: { d: string; v: number }[];
  focusAvg: number | null;
  focusTrend: number | null;
}

// Agrega sesiones de reset (últimas 2 semanas) en un score de foco 0-100 por día de la semana actual,
// más el promedio de la semana y la variación % contra la semana anterior.
export function computeFocusWeek(rows: FocusRow[], monday: Date, dayLabels: string[]): FocusWeekResult {
  const sums = Array(7).fill(0);
  const counts = Array(7).fill(0);
  let lastWeekSum = 0;
  let lastWeekCount = 0;

  rows.forEach(row => {
    if (row.post_intensity == null) return;
    // Pulso post-reset (1-10, menor = más foco) → score de foco 0-100
    const score = (10 - row.post_intensity) * 10;
    const d = new Date(row.created_at);
    if (d >= monday) {
      const idx = (d.getDay() + 6) % 7;
      sums[idx] += score;
      counts[idx] += 1;
    } else {
      lastWeekSum += score;
      lastWeekCount += 1;
    }
  });

  const focusWeek = dayLabels.map((d, i) => ({ d, v: counts[i] ? Math.round(sums[i] / counts[i]) : 0 }));

  const totalSum = sums.reduce((a, b) => a + b, 0);
  const totalCount = counts.reduce((a, b) => a + b, 0);
  const thisAvg = totalCount ? totalSum / totalCount : null;

  const lastAvg = lastWeekCount ? lastWeekSum / lastWeekCount : null;
  const focusTrend = thisAvg != null && lastAvg ? Math.round(((thisAvg - lastAvg) / lastAvg) * 100) : null;

  return { focusWeek, focusAvg: thisAvg, focusTrend };
}
