import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, Lock, MessageCircle, ImagePlus } from "lucide-react";
import { supabase } from "@kognit/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { NoteComposer } from "@/components/kognit/NoteComposer";
import { ReplyComposer } from "@/components/kognit/ReplyComposer";
import { ErrorState } from "@/components/kognit/ErrorState";
import { PublicProfileSheet } from "@/components/kognit/PublicProfileSheet";
import { NoteCard, type NoteRow, type FeedItem } from "@/components/kognit/NoteCard";
import type { PublicReplyRow } from "@/components/kognit/PublicReplyThread";
import { resolveAvatarUrl } from "@/lib/avatar";
import { toast } from "@kognit/ui/components/sonner";

interface Props {
  onBack?: () => void;
  onMessages?: () => void;
  plan?: "free" | "pro";
  onUpgrade?: () => void;
}

interface RawNote {
  id: string;
  user_id: string;
  title: string | null;
  content: string;
  mood: string | null;
  image_url: string | null;
  created_at: string;
}

interface ReactionRow {
  note_id: string;
  reaction: string;
  user_id: string;
}

interface PublicReplyRawRow {
  id: string;
  note_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

interface RepostRow {
  id: string;
  user_id: string;
  note_id: string;
  created_at: string;
}

interface AuthorProfileRow {
  id: string;
  display_name: string;
  avatar_url: string | null;
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
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [replyTarget, setReplyTarget] = useState<NoteRow | null>(null);
  const [viewProfileId, setViewProfileId] = useState<string | null>(null);
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);

    const { data: ns, error } = await supabase
      .from("notes")
      .select("id, user_id, title, content, mood, image_url, created_at")
      .eq("visibility", "public")
      .order("created_at", { ascending: false })
      .limit(50);
    setLoadError(!!error);
    const directNotes: RawNote[] = ns ?? [];

    const { data: repostFeedRows } = await supabase
      .from("note_reposts")
      .select("id, user_id, note_id, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    const reposts: RepostRow[] = repostFeedRows ?? [];

    // Une las notas directas con las que solo aparecen reposteadas (una nota
    // vieja reposteada no entra en el limit(50) por fecha propia de arriba).
    const rawNotesById = new Map<string, RawNote>(directNotes.map(n => [n.id, n]));
    const missingNoteIds = Array.from(new Set(reposts.map(r => r.note_id))).filter(id => !rawNotesById.has(id));
    if (missingNoteIds.length) {
      const { data: extra } = await supabase
        .from("notes")
        .select("id, user_id, title, content, mood, image_url, created_at")
        .in("id", missingNoteIds);
      (extra ?? []).forEach(n => rawNotesById.set(n.id, n));
    }
    const allNoteIds = Array.from(rawNotesById.keys());

    const [
      { data: rxs },
      { data: replyRows },
      { data: repostCountRows },
      { data: myRepostRows },
      { data: followingRows },
      { data: followerRows },
    ] = await Promise.all([
      allNoteIds.length
        ? supabase.from("note_reactions").select("note_id, reaction, user_id").in("note_id", allNoteIds)
        : Promise.resolve({ data: [] as ReactionRow[] }),
      allNoteIds.length
        ? supabase.from("note_public_replies").select("id, note_id, user_id, content, created_at").in("note_id", allNoteIds)
        : Promise.resolve({ data: [] as PublicReplyRawRow[] }),
      allNoteIds.length
        ? supabase.from("note_reposts").select("note_id").in("note_id", allNoteIds)
        : Promise.resolve({ data: [] as { note_id: string }[] }),
      user && allNoteIds.length
        ? supabase.from("note_reposts").select("note_id").eq("user_id", user.id).in("note_id", allNoteIds)
        : Promise.resolve({ data: [] as { note_id: string }[] }),
      user
        ? supabase.from("user_connections").select("following_id").eq("follower_id", user.id)
        : Promise.resolve({ data: [] as { following_id: string }[] }),
      user
        ? supabase.from("user_connections").select("follower_id").eq("following_id", user.id)
        : Promise.resolve({ data: [] as { follower_id: string }[] }),
    ]);

    const userIds = new Set<string>();
    rawNotesById.forEach(n => userIds.add(n.user_id));
    reposts.forEach(r => userIds.add(r.user_id));
    (replyRows ?? []).forEach(r => userIds.add(r.user_id));
    const userIdList = Array.from(userIds);
    const { data: profs } = userIdList.length
      ? await supabase.from("profiles").select("id, display_name, avatar_url").in("id", userIdList)
      : { data: [] as AuthorProfileRow[] };

    const nameById = new Map((profs ?? []).map((p: AuthorProfileRow) => [p.id, p.display_name]));
    const avatarById = new Map((profs ?? []).map((p: AuthorProfileRow) => [p.id, resolveAvatarUrl(p.avatar_url)]));

    const reactionCounts: Record<string, Record<string, number>> = {};
    const myReaction: Record<string, string> = {};
    (rxs ?? []).forEach((r: ReactionRow) => {
      reactionCounts[r.note_id] ??= {};
      reactionCounts[r.note_id][r.reaction] = (reactionCounts[r.note_id][r.reaction] ?? 0) + 1;
      if (user && r.user_id === user.id) myReaction[r.note_id] = r.reaction;
    });

    const repliesByNote: Record<string, PublicReplyRow[]> = {};
    (replyRows ?? []).forEach((r: PublicReplyRawRow) => {
      (repliesByNote[r.note_id] ??= []).push({
        id: r.id,
        user_id: r.user_id,
        content: r.content,
        created_at: r.created_at,
        authorName: nameById.get(r.user_id) ?? t("community.defaultAuthor"),
        authorAvatarUrl: avatarById.get(r.user_id) ?? null,
      });
    });
    Object.values(repliesByNote).forEach(list => list.sort((a, b) => a.created_at.localeCompare(b.created_at)));

    // Conteo total de reposts por nota (uncapped) — distinto de `reposts`
    // (arriba), que está limitado a 50 y solo sirve para armar el feed.
    const repostCountByNote: Record<string, number> = {};
    (repostCountRows ?? []).forEach((r: { note_id: string }) => {
      repostCountByNote[r.note_id] = (repostCountByNote[r.note_id] ?? 0) + 1;
    });
    const myRepostedNoteIds = new Set((myRepostRows ?? []).map((r: { note_id: string }) => r.note_id));

    // Conexión mutua conmigo: intersección de "a quién sigo" y "quién me sigue".
    const following = new Set((followingRows ?? []).map((r: { following_id: string }) => r.following_id));
    const followers = new Set((followerRows ?? []).map((r: { follower_id: string }) => r.follower_id));
    const myMutualIds = new Set([...following].filter(id => followers.has(id)));

    const noteRowsById = new Map<string, NoteRow>();
    rawNotesById.forEach((n, id) => {
      noteRowsById.set(id, {
        ...n,
        author: nameById.get(n.user_id) ?? t("community.defaultAuthor"),
        authorAvatarUrl: avatarById.get(n.user_id) ?? null,
        reactions: reactionCounts[id] ?? {},
        myReaction: myReaction[id] ?? null,
        publicReplies: repliesByNote[id] ?? [],
        reposted: myRepostedNoteIds.has(id),
        repostCount: repostCountByNote[id] ?? 0,
        canReplyPublicly: !!user && (n.user_id === user.id || myMutualIds.has(n.user_id)),
      });
    });

    const signedByPath = await signImagePaths(Array.from(noteRowsById.values()));
    noteRowsById.forEach((n, id) => {
      noteRowsById.set(id, { ...n, imageSignedUrl: n.image_url ? signedByPath.get(n.image_url) ?? null : null });
    });

    const items: FeedItem[] = [];
    directNotes.forEach(n => {
      const note = noteRowsById.get(n.id);
      if (note) items.push({ kind: "note", feedKey: `note-${n.id}`, feedTimestamp: n.created_at, note });
    });
    reposts.forEach(r => {
      const note = noteRowsById.get(r.note_id);
      if (note) {
        items.push({
          kind: "repost",
          feedKey: `repost-${r.id}`,
          feedTimestamp: r.created_at,
          note,
          reposter: {
            id: r.user_id,
            name: nameById.get(r.user_id) ?? t("community.defaultAuthor"),
            avatarUrl: avatarById.get(r.user_id) ?? null,
          },
        });
      }
    });
    items.sort((a, b) => b.feedTimestamp.localeCompare(a.feedTimestamp));

    setFeed(items.slice(0, 50));
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

  const toggleRepost = async (note: NoteRow) => {
    if (!user) return;
    if (note.reposted) {
      await supabase.from("note_reposts").delete().eq("user_id", user.id).eq("note_id", note.id);
    } else {
      const { error } = await supabase.from("note_reposts").insert({ user_id: user.id, note_id: note.id });
      if (error) {
        toast.error(t("community.repostError"));
        return;
      }
    }
    load();
  };

  const submitPublicReply = async (noteId: string, content: string) => {
    if (!user) return;
    const { error } = await supabase.from("note_public_replies").insert({ note_id: noteId, user_id: user.id, content });
    if (error) {
      toast.error(t("community.publicReplies.sendError"));
      return;
    }
    await load();
  };

  const toggleExpand = (noteId: string) => {
    setExpandedReplies(prev => {
      const next = new Set(prev);
      if (next.has(noteId)) next.delete(noteId);
      else next.add(noteId);
      return next;
    });
  };

  return (
    <div className="min-h-full pb-28 md:pb-10 relative">
      <div className="px-6 pt-3 flex items-center justify-between">
        <button onClick={onBack} aria-label={t("common.backAria")} className="w-10 h-10 rounded-full bg-card shadow-soft flex items-center justify-center">
          <ChevronLeft size={18} />
        </button>
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">{t("community.eyebrow")}</p>
          <p className="text-xs font-bold">{t("community.title")}</p>
        </div>
        <button onClick={() => onMessages?.()} aria-label={t("community.messagesAria")} className="w-10 h-10 rounded-full bg-card shadow-soft flex items-center justify-center">
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
        {!loading && loadError && <ErrorState onRetry={load} />}
        {!loading && !loadError && feed.length === 0 && (
          <div className="text-center py-10 px-4">
            <Lock size={20} className="mx-auto text-muted-foreground" />
            <p className="mt-3 text-xs font-bold">{t("community.empty.title")}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t("community.empty.subtitle")}</p>
          </div>
        )}
        {feed.map(item => (
          <NoteCard
            key={item.feedKey}
            item={item}
            currentUserId={user?.id}
            expanded={expandedReplies.has(item.note.id)}
            onToggleExpand={toggleExpand}
            onOpenProfile={setViewProfileId}
            onReplyPrivately={setReplyTarget}
            onReact={react}
            onToggleRepost={toggleRepost}
            onSubmitPublicReply={submitPublicReply}
          />
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
      {viewProfileId && (
        <PublicProfileSheet userId={viewProfileId} onClose={() => setViewProfileId(null)} />
      )}
    </div>
  );
};
