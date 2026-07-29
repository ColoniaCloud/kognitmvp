export type CardCategory = {
  id: string;
  accent: "primary" | "destructive" | "warning" | "accent" | "info" | "violet" | "gold" | "seafoam" | "cyan";
  cardCount: number;
};

export const CATEGORIES: CardCategory[] = [
  { id: "habits", accent: "seafoam", cardCount: 10 },
  { id: "focus", accent: "info", cardCount: 10 },
  { id: "mindfulness", accent: "cyan", cardCount: 10 },
  { id: "stress", accent: "destructive", cardCount: 10 },
  { id: "performance", accent: "primary", cardCount: 10 },
];

export function pickRandom<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}
