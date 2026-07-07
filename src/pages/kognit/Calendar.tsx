import { ChevronLeft, ChevronRight, Plus, Sparkles, Lock, Users, TrendingUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { BottomNav } from "@/components/kognit/BottomNav";
import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { NoteComposer } from "@/components/kognit/NoteComposer";
import { MoodIcon } from "@/components/kognit/MoodIcon";
import { ErrorState } from "@/components/kognit/ErrorState";
import { resolveMoodId, type MoodId } from "@/data/moods";
import { computeFocusWeek } from "@/lib/focusWeek";

// Color de fondo por mood para pintar el día en la grilla del calendario.
const MOOD_DAY_COLOR: Record<MoodId, string> = {
  calm: "bg-accent/40",
  focus: "bg-primary/30",
  neutral: "bg-secondary",
  frustrated: "bg-warning/40",
  tilt: "bg-destructive/30",
};

interface Row {
  id: string;
  content: string;
  title: string | null;
  mood: string | null;
  visibility: string;
  created_at: string;
}

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

interface CalendarProps {
  plan?: "free" | "pro";
  onUpgrade?: () => void;
}

export const CalendarScreen = ({ plan = "free", onUpgrade }: CalendarProps = {}) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const days = useMemo(() => t("calendar.days", { returnObjects: true }) as string[], [t]);
  const MONTH_NAMES = useMemo(() => t("calendar.months", { returnObjects: true }) as string[], [t]);
  const WEEKDAY_NAMES = useMemo(() => t("calendar.weekdays", { returnObjects: true }) as string[], [t]);
  const [composerOpen, setComposerOpen] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [focusWeek, setFocusWeek] = useState(days.map(d => ({ d, v: 0 })));
  const [focusAvg, setFocusAvg] = useState<number | null>(null);
  const [focusTrend, setFocusTrend] = useState<number | null>(null);
  const [monthStats, setMonthStats] = useState({ activeDays: 0, resets: 0, notes: 0 });
  const today = new Date();
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // Lunes = 0 ... Domingo = 6
  const firstDay = (new Date(year, month, 1).getDay() + 6) % 7;
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
  const monthDays = Array.from({ length: totalCells }, (_, i) => i - firstDay + 1);
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
  const todayDate = today.getDate();

  const [selectedDay, setSelectedDay] = useState(todayDate);
  useEffect(() => {
    setSelectedDay(isCurrentMonth ? todayDate : 1);
  }, [year, month, isCurrentMonth, todayDate]);

  const selectedWeekday = WEEKDAY_NAMES[new Date(year, month, selectedDay).getDay()];
  const dayRows = rows.filter(r => {
    const d = new Date(r.created_at);
    return d.getFullYear() === year && d.getMonth() === month && d.getDate() === selectedDay;
  });

  // Mood más reciente por día, derivado de las notas reales del usuario (no un mock fijo).
  const dayMoodMap = useMemo(() => {
    const map: Record<number, MoodId> = {};
    rows.forEach(r => {
      const d = new Date(r.created_at);
      if (d.getFullYear() !== year || d.getMonth() !== month) return;
      const day = d.getDate();
      if (day in map) return; // rows viene ordenado desc: nos quedamos con el más reciente
      const id = resolveMoodId(r.mood);
      if (id) map[day] = id;
    });
    return map;
  }, [rows, year, month]);

  // Free solo puede navegar/ver los últimos 10 días; Pro ve el historial completo.
  const cutoffDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 10);
  const isDayLocked = (n: number) => plan === "free" && new Date(year, month, n) < cutoffDate;

  const goPrev = () => {
    const prevMonthLastDay = new Date(year, month, 0);
    if (plan === "free" && prevMonthLastDay < cutoffDate) { onUpgrade?.(); return; }
    setCursor(new Date(year, month - 1, 1));
  };
  const goNext = () => setCursor(new Date(year, month + 1, 1));

  const load = useCallback(async () => {
    if (!user) return;
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 1);
    const { data, error } = await supabase
      .from("notes")
      .select("id, content, title, mood, visibility, created_at")
      .eq("user_id", user.id)
      .gte("created_at", start.toISOString())
      .lt("created_at", end.toISOString())
      .order("created_at", { ascending: false });
    setLoadError(!!error);
    setRows(data ?? []);
    setLoaded(true);
  }, [user, year, month]);

  useEffect(() => { load(); }, [load]);

  const loadMonthStats = useCallback(async () => {
    if (!user) { setMonthStats({ activeDays: 0, resets: 0, notes: 0 }); return; }
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 1);
    const [{ data: monthNotes }, { data: monthResets }] = await Promise.all([
      supabase.from("notes").select("created_at").eq("user_id", user.id)
        .gte("created_at", start.toISOString()).lt("created_at", end.toISOString()),
      supabase.from("reset_sessions").select("created_at").eq("user_id", user.id)
        .gte("created_at", start.toISOString()).lt("created_at", end.toISOString()),
    ]);
    const activeDaySet = new Set<number>();
    (monthNotes ?? []).forEach(n => activeDaySet.add(new Date(n.created_at).getDate()));
    (monthResets ?? []).forEach(r => activeDaySet.add(new Date(r.created_at).getDate()));
    setMonthStats({
      activeDays: activeDaySet.size,
      resets: (monthResets ?? []).length,
      notes: (monthNotes ?? []).length,
    });
  }, [user, year, month]);

  useEffect(() => { loadMonthStats(); }, [loadMonthStats]);

  const loadFocusWeek = useCallback(async () => {
    if (!user) return;
    const now = new Date();
    const dayIdx = (now.getDay() + 6) % 7; // Lunes = 0
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayIdx);
    const twoWeeksAgo = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() - 7);
    const nextMonday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 7);

    const { data } = await supabase
      .from("reset_sessions")
      .select("post_intensity, created_at")
      .eq("user_id", user.id)
      .gte("created_at", twoWeeksAgo.toISOString())
      .lt("created_at", nextMonday.toISOString());

    const { focusWeek, focusAvg, focusTrend } = computeFocusWeek(data ?? [], monday, days);
    setFocusWeek(focusWeek);
    setFocusAvg(focusAvg);
    setFocusTrend(focusTrend);
  }, [user, days]);

  useEffect(() => { loadFocusWeek(); }, [loadFocusWeek]);

  return (
  <div className="min-h-full bg-gradient-hero pb-28">
    {/* Header */}
    <div className="px-6 pt-3 flex items-center justify-between">
      <button onClick={goPrev} aria-label={t("calendar.prevMonthAria")} className="w-10 h-10 rounded-full bg-card shadow-soft flex items-center justify-center">
        <ChevronLeft size={18} />
      </button>
      <div className="text-center">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">{t("calendar.eyebrow")}</p>
        <p className="text-sm font-bold">{selectedWeekday} {selectedDay} · {MONTH_NAMES[month]} {year}</p>
      </div>
      <button onClick={goNext} aria-label={t("calendar.nextMonthAria")} className="w-10 h-10 rounded-full bg-card shadow-soft flex items-center justify-center">
        <ChevronRight size={18} />
      </button>
    </div>

    {/* Resumen */}
    <div className="mx-6 mt-4 p-4 rounded-3xl bg-gradient-deep text-primary-foreground shadow-card relative overflow-hidden">
      <div className="absolute -right-10 -top-10 w-32 h-32 rounded-full bg-primary-glow/25 blur-2xl" />
      <div className="relative flex items-center justify-between">
        <div>
          <p className="text-xs opacity-70 uppercase tracking-widest font-semibold">{t("calendar.thisMonth")}</p>
          <p className="text-xl font-bold mt-0.5">{t("calendar.monthSummary", { count: monthStats.activeDays })}</p>
          <p className="text-[11px] opacity-80 mt-0.5">{t("calendar.monthDetail", { resets: monthStats.resets, notes: monthStats.notes })}</p>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center">
          <Sparkles size={20} />
        </div>
      </div>
    </div>

    {/* Foco esta semana */}
    <div className="mx-6 mt-4 p-4 rounded-3xl bg-card shadow-card">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">{t("calendar.focusWeek")}</p>
          <p className="text-xl font-bold mt-0.5">
            {focusAvg != null ? focusAvg.toFixed(1).replace(".", ",") : "—"} <span className="text-sm text-muted-foreground font-medium">{t("calendar.focusAvgSuffix")}</span>
          </p>
        </div>
        {plan === "pro" && focusTrend != null && (
          <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold ${
            focusTrend >= 0 ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
          }`}>
            <TrendingUp size={14} className={focusTrend < 0 ? "rotate-180" : ""} /> {focusTrend >= 0 ? "+" : ""}{focusTrend}%
          </div>
        )}
        {plan === "free" && focusTrend != null && (
          <button onClick={onUpgrade} className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold bg-secondary text-muted-foreground">
            <Lock size={12} /> {t("calendar.trendProOnly")}
          </button>
        )}
      </div>
      <div className="mt-3 flex items-end justify-between h-12 gap-2">
        {focusWeek.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
            <div className="w-full rounded-lg bg-gradient-to-t from-primary-glow to-accent" style={{ height: `${Math.max(d.v, 4)}%` }} />
            <span className="text-[10px] text-muted-foreground font-semibold">{d.d}</span>
          </div>
        ))}
      </div>
    </div>

    {/* Calendario */}
    <div className="mx-6 mt-4 p-4 rounded-3xl bg-card shadow-card">
      <div className="grid grid-cols-7 gap-1 text-center">
        {days.map((d, i) => (
          <span key={i} className="text-[10px] font-bold text-muted-foreground py-1">{d}</span>
        ))}
        {monthDays.map((n, i) => {
          if (n < 1 || n > daysInMonth) return <span key={i} />;
          const isToday = isCurrentMonth && n === todayDate;
          const isSelected = n === selectedDay;
          const dayMood = dayMoodMap[n];
          const locked = isDayLocked(n);
          return (
            <button
              key={i}
              onClick={() => locked ? onUpgrade?.() : setSelectedDay(n)}
              aria-pressed={isSelected}
              aria-label={locked ? t("calendar.dayLockedAria") : undefined}
              className={`relative aspect-square rounded-xl flex flex-col items-center justify-center text-xs font-semibold transition-all ${
                locked
                  ? "text-muted-foreground/40"
                  : isSelected
                  ? "bg-gradient-info text-info-foreground shadow-soft"
                  : dayMood
                  ? `${MOOD_DAY_COLOR[dayMood]} text-foreground`
                  : "hover:bg-secondary text-foreground"
              }`}
            >
              {locked ? <Lock size={12} /> : <span>{n}</span>}
              {!locked && dayMood && !isSelected && <MoodIcon mood={dayMood} size={12} className="mt-0.5" />}
              {isToday && <span className={`absolute bottom-1 w-1 h-1 rounded-full ${isSelected ? "bg-white" : "bg-primary"}`} />}
            </button>
          );
        })}
      </div>
    </div>

    {/* Notas del día seleccionado */}
    <div className="px-6 mt-5 flex items-center justify-between">
      <h3 className="text-sm font-bold">{t("calendar.notesTitle", { weekday: selectedWeekday, day: selectedDay })}</h3>
      <button onClick={() => setComposerOpen(true)} className="flex items-center gap-1.5 bg-gradient-primary text-primary-foreground text-xs font-bold px-3.5 py-2 rounded-full shadow-soft">
        <Plus size={14} /> {t("calendar.newNote")}
      </button>
    </div>

    {/* Notas */}
    <div className="px-6 mt-3 space-y-3">
      {loaded && loadError && <ErrorState onRetry={load} />}
      {loaded && !loadError && dayRows.length === 0 && (
        <div className="text-center py-10 px-4">
          <Lock size={20} className="mx-auto text-muted-foreground" />
          <p className="mt-3 text-xs font-bold">{t("calendar.empty.title")}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t("calendar.empty.subtitle")}</p>
        </div>
      )}
      {dayRows.map(n => (
        <div key={n.id} className="p-4 rounded-2xl bg-card shadow-soft">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center"><MoodIcon mood={n.mood} size={20} /></div>
              <div>
                <p className="text-[10px] text-muted-foreground font-semibold">{formatTime(n.created_at)}</p>
                <p className="text-sm font-bold leading-tight">{n.title ?? t("calendar.defaultNoteTitle")}</p>
              </div>
            </div>
            <span className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider ${n.visibility === "public" ? "text-primary" : "text-muted-foreground"}`}>
              {n.visibility === "public" ? <Users size={11} /> : <Lock size={11} />}
              {n.visibility === "public" ? t("calendar.public") : t("calendar.private")}
            </span>
          </div>
          <p className="mt-2.5 text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">{n.content}</p>
        </div>
      ))}
    </div>

    {/* Input rápido */}
    <div className="mx-6 mt-4 p-4 rounded-2xl bg-card shadow-soft border border-dashed border-border">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">{t("calendar.quickAddTitle")}</p>
      <p className="mt-1.5 text-sm text-muted-foreground italic">{t("calendar.quickAddSubtitle")}</p>
      <div className="mt-3 flex items-center gap-2">
        {(["calm", "focus", "neutral", "frustrated", "tilt"] as const).map(id => (
          <button key={id} onClick={() => setComposerOpen(true)} aria-label={t(`moods.options.${id}`)} className="w-8 h-8 rounded-xl bg-secondary flex items-center justify-center hover:scale-110 transition-transform">
            <MoodIcon mood={id} size={18} />
          </button>
        ))}
        <button onClick={() => setComposerOpen(true)} aria-label={t("calendar.newNote")} className="ml-auto w-9 h-9 rounded-xl bg-gradient-primary text-primary-foreground flex items-center justify-center shadow-soft">
          <Plus size={16} />
        </button>
      </div>
    </div>

    <NoteComposer open={composerOpen} onClose={() => setComposerOpen(false)} onSaved={load} plan={plan} onUpgrade={onUpgrade} />
    <BottomNav active="calendar" />
  </div>
  );
};
