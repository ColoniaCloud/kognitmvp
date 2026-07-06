import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, Lock, MessageCircle, Send, ImagePlus } from "lucide-react";
import { BottomNav } from "@/components/kognit/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { NoteComposer } from "@/components/kognit/NoteComposer";
import { ReplyComposer } from "@/components/kognit/ReplyComposer";
import { MoodIcon, ReactionIcon } from "@/components/kognit/MoodIcon";
import { REACTIONS } from "@/data/moods";
import { timeAgo } from "@/lib/utils";

interface Props {
  onBack?: () => void;
  onMessages?: () => void;
  plan?: "free" | "pro";
  onUpgrade?: () => void;
}

interface NoteRow {
  id: string;
  user_id: string;
  title: string | null;
  content: string;
  mood: string | null;
  image_url: string | null;
  created_at: string;
  author?: string;
  reactions: Record<string, number>;
  myReaction?: string | null;
  imageSignedUrl?: string | null;
}

// "note-images" es un bucket privado: image_url guarda el path del objeto,
// no una URL pública. Acá se cambian todos los paths de la tanda por URLs
// firmadas temporales en una sola llamada.
const IMAGE_URL_TTL = 60 * 60 * 24; // 24hs

async function signImagePaths(list: NoteRow[]): Promise<Map<string, string>> {
  const paths = list.map(n => n.image_url).filter((p): p is string => !!p);
  if (!paths.length) return new Map();
  const { data } = await supabase.storage.from("note-images").createSignedUrls(paths, IMAGE_URL_TTL);
  const map = new Map<string, string>();
  (data ?? []).forEach(d => { if (d.signedUrl && d.path) map.set(d.path, d.signedUrl); });
  return map;
}

export const CommunityScreen = ({ onBack, onMessages, plan = "free", onUpgrade }: Props) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [composerOpen, setComposerOpen] = useState(false);
  const [replyTarget, setReplyTarget] = useState<NoteRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: ns } = await supabase
      .from("notes")
      .select("id, user_id, title, content, mood, image_url, created_at")
      .eq("visibility", "public")
      .order("created_at", { ascending: false })
      .limit(50);

    const list = ns ?? [];
    const ids = list.map(n => n.id);
    const userIds = Array.from(new Set(list.map(n => n.user_id)));

    const [{ data: rxs }, { data: profs }] = await Promise.all([
      ids.length
        ? supabase.from("note_reactions").select("note_id, reaction, user_id").in("note_id", ids)
        : Promise.resolve({ data: [] as any[] }),
      userIds.length
        ? supabase.from("profiles").select("id, display_name").in("id", userIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const nameById = new Map((profs ?? []).map((p: any) => [p.id, p.display_name as string]));
    const counts: Record<string, Record<string, number>> = {};
    const mine: Record<string, string> = {};
    (rxs ?? []).forEach((r: any) => {
      counts[r.note_id] ??= {};
      counts[r.note_id][r.reaction] = (counts[r.note_id][r.reaction] ?? 0) + 1;
      if (user && r.user_id === user.id) mine[r.note_id] = r.reaction;
    });

    const withMeta = list.map(n => ({
      ...n,
      author: nameById.get(n.user_id) ?? t("community.defaultAuthor"),
      reactions: counts[n.id] ?? {},
      myReaction: mine[n.id] ?? null,
    }));
    const signedByPath = await signImagePaths(withMeta);
    setNotes(withMeta.map(n => ({
      ...n,
      imageSignedUrl: n.image_url ? signedByPath.get(n.image_url) ?? null : null,
    })));
    setLoading(false);
  }, [user, t]);

  useEffect(() => { load(); }, [load]);

  const react = async (noteId: string, reaction: string, current: string | null | undefined) => {
    if (!user) return;
    if (current === reaction) {
      await supabase.from("note_reactions").delete().eq("note_id", noteId).eq("user_id", user.id);
    } else {
      await supabase.from("note_reactions").upsert(
        { note_id: noteId, user_id: user.id, reaction },
        { onConflict: "note_id,user_id" }
      );
    }
    load();
  };

  return (
    <div className="min-h-full bg-gradient-hero pb-28 relative">
      <div className="px-6 pt-3 flex items-center justify-between">
        <button onClick={onBack} className="w-10 h-10 rounded-full bg-card shadow-soft flex items-center justify-center">
          <ChevronLeft size={18} />
        </button>
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">{t("community.eyebrow")}</p>
          <p className="text-xs font-bold">{t("community.title")}</p>
        </div>
        <button onClick={() => plan === "pro" ? onMessages?.() : onUpgrade?.()} className="w-10 h-10 rounded-full bg-card shadow-soft flex items-center justify-center">
          <MessageCircle size={18} />
        </button>
      </div>

      <div className="mx-6 mt-4 p-4 rounded-3xl bg-gradient-primary text-primary-foreground shadow-card">
        <button onClick={() => setComposerOpen(true)}
          className="w-full bg-white/15 backdrop-blur rounded-full py-2.5 pl-4 pr-2 flex items-center justify-between gap-2 active:scale-[0.98] transition-transform">
          <span className="text-xs font-semibold opacity-80">{t("community.composerPrompt")}</span>
          <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            <ImagePlus size={14} />
          </span>
        </button>
      </div>

      <div className="px-6 mt-5 space-y-3">
        {loading && <p className="text-xs text-muted-foreground text-center py-10">{t("community.loading")}</p>}
        {!loading && notes.length === 0 && (
          <div className="text-center py-10 px-4">
            <Lock size={20} className="mx-auto text-muted-foreground" />
            <p className="mt-3 text-xs font-bold">{t("community.empty.title")}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t("community.empty.subtitle")}</p>
          </div>
        )}
        {notes.map(n => (
          <div key={n.id} className="p-4 rounded-2xl bg-card shadow-soft">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                {(n.author ?? "?").charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold leading-tight">{n.author}</p>
                <p className="text-[10px] text-muted-foreground">{timeAgo(n.created_at)}</p>
              </div>
              {n.mood && <MoodIcon mood={n.mood} size={22} />}
            </div>
            {n.title && <p className="mt-3 text-xs font-bold">{n.title}</p>}
            <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">{n.content}</p>
            {n.imageSignedUrl && (
              <img
                src={n.imageSignedUrl}
                alt=""
                loading="lazy"
                className="mt-3 w-full max-h-64 object-cover rounded-2xl"
              />
            )}

            <div className="mt-3 pt-3 border-t border-border flex items-center justify-between gap-2">
              <div className="flex flex-wrap gap-1.5">
                {REACTIONS.map(r => {
                  const active = n.myReaction === r.id;
                  const count = n.reactions[r.id] ?? 0;
                  return (
                    <button key={r.id} onClick={() => react(n.id, r.id, n.myReaction)}
                      title={t(`moods.reactions.${r.id}`)}
                      className={`px-2.5 py-1 rounded-full text-xs flex items-center gap-1 transition-all border ${
                        active
                          ? "bg-info/10 text-info border-info/30 font-bold"
                          : "bg-secondary text-muted-foreground border-transparent"
                      }`}>
                      <ReactionIcon reaction={r.id} size={16} />
                      {count > 0 && <span className="text-[10px] font-bold">{count}</span>}
                    </button>
                  );
                })}
              </div>

              {user && n.user_id !== user.id && (
                <button
                  onClick={() => plan === "pro" ? setReplyTarget(n) : onUpgrade?.()}
                  className="shrink-0 px-2.5 py-1.5 rounded-full text-[10px] font-bold bg-secondary text-foreground flex items-center gap-1">
                  {plan === "pro" ? <Send size={11} /> : <Lock size={11} />} {t("community.reply")}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <NoteComposer open={composerOpen} onClose={() => setComposerOpen(false)} onSaved={load} plan={plan} onUpgrade={onUpgrade} />
      {replyTarget && (
        <ReplyComposer
          open={!!replyTarget}
          onClose={() => setReplyTarget(null)}
          recipientId={replyTarget.user_id}
          recipientName={replyTarget.author ?? t("community.defaultAuthor")}
          noteId={replyTarget.id}
          onSent={() => setReplyTarget(null)}
        />
      )}
      <BottomNav active="community" />
    </div>
  );
};
