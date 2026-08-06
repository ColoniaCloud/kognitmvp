import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Send, MessageSquare, Repeat2 } from "lucide-react";
import { Avatar } from "@/components/kognit/Avatar";
import { MoodIcon, ReactionIcon } from "@/components/kognit/MoodIcon";
import { PublicReplyThread, type PublicReplyRow } from "@/components/kognit/PublicReplyThread";
import { Tooltip, TooltipTrigger, TooltipContent } from "@kognit/ui/components/tooltip";
import { REACTIONS } from "@/data/moods";
import { timeAgo } from "@kognit/ui/lib/utils";

export interface NoteRow {
  id: string;
  user_id: string;
  title: string | null;
  content: string;
  mood: string | null;
  image_url: string | null;
  created_at: string;
  author?: string;
  authorAvatarUrl?: string | null;
  reactions: Record<string, number>;
  myReaction?: string | null;
  imageSignedUrl?: string | null;
  publicReplies: PublicReplyRow[];
  reposted: boolean;
  repostCount: number;
  canReplyPublicly: boolean;
}

export type FeedItem =
  | { kind: "note"; feedKey: string; feedTimestamp: string; note: NoteRow }
  | { kind: "repost"; feedKey: string; feedTimestamp: string; note: NoteRow; reposter: { id: string; name: string; avatarUrl: string | null } };

interface Props {
  item: FeedItem;
  currentUserId?: string;
  expanded: boolean;
  onToggleExpand: (noteId: string) => void;
  onOpenProfile: (userId: string) => void;
  onReplyPrivately: (note: NoteRow) => void;
  onReact: (noteId: string, reaction: string, current: string | null | undefined) => void;
  onToggleRepost: (note: NoteRow) => void;
  onSubmitPublicReply: (noteId: string, content: string) => Promise<void>;
}

export const NoteCard = ({
  item, currentUserId, expanded, onToggleExpand, onOpenProfile,
  onReplyPrivately, onReact, onToggleRepost, onSubmitPublicReply,
}: Props) => {
  const { t } = useTranslation();
  const [lockedTooltipOpen, setLockedTooltipOpen] = useState(false);
  const { note } = item;
  const isOwnNote = !!currentUserId && note.user_id === currentUserId;

  return (
    <div className="p-4 rounded-2xl bg-card shadow-soft">
      {item.kind === "repost" && (
        <button onClick={() => onOpenProfile(item.reposter.id)}
          className="flex items-center gap-1.5 mb-2.5 text-[10px] font-bold text-muted-foreground">
          <Repeat2 size={12} />
          {t("community.repostedBy", { name: item.reposter.name })}
        </button>
      )}

      <div className="flex items-center gap-2.5">
        {note.mood && <MoodIcon mood={note.mood} size={36} />}
        <button onClick={() => onOpenProfile(note.user_id)} className="shrink-0">
          <Avatar src={note.authorAvatarUrl} name={note.author ?? "?"} size={36} shape="square" className="text-sm" />
        </button>
        <button onClick={() => onOpenProfile(note.user_id)} className="flex-1 min-w-0 text-left">
          <p className="text-xs font-bold leading-tight">{note.author}</p>
          <p className="text-[10px] text-muted-foreground">{timeAgo(note.created_at)}</p>
        </button>
      </div>

      {note.title && <p className="mt-3 text-xs font-bold">{note.title}</p>}
      <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">{note.content}</p>
      {note.imageSignedUrl && (
        <img
          src={note.imageSignedUrl}
          alt=""
          loading="lazy"
          className="mt-3 w-full max-h-64 object-cover rounded-2xl"
        />
      )}

      <div className="mt-3 pt-3 border-t border-border flex flex-wrap gap-1.5">
        {REACTIONS.map(r => {
          const active = note.myReaction === r.id;
          const count = note.reactions[r.id] ?? 0;
          return (
            <button key={r.id} onClick={() => onReact(note.id, r.id, note.myReaction)}
              title={t(`moods.reactions.${r.id}`)}
              className={`px-2.5 py-1 rounded-full text-xs flex items-center gap-1 transition-all border ${
                active
                  ? "bg-info/10 text-info border-info/30 font-bold"
                  : "bg-secondary text-muted-foreground border-transparent"
              }`}>
              <ReactionIcon reaction={r.id} size={22} />
              {count > 0 && <span className="text-[10px] font-bold">{count}</span>}
            </button>
          );
        })}
      </div>

      {currentUserId && (
        <div className="mt-2 flex items-center gap-2">
          {!isOwnNote && (
            <button onClick={() => onReplyPrivately(note)}
              title={t("community.replyPrivate")} aria-label={t("community.replyPrivate")}
              className="px-2.5 py-1.5 rounded-full bg-secondary text-foreground flex items-center gap-1">
              <Send size={14} />
            </button>
          )}

          {note.canReplyPublicly ? (
            <button onClick={() => onToggleExpand(note.id)}
              title={t("community.replyPublic")} aria-label={t("community.replyPublic")}
              className={`px-2.5 py-1.5 rounded-full flex items-center gap-1 ${
                expanded ? "bg-info/10 text-info" : "bg-secondary text-foreground"
              }`}>
              <MessageSquare size={14} />
            </button>
          ) : (
            // Radix Tooltip abre con hover/focus por defecto, que no dispara con
            // tap en mobile — se controla a mano para que el toque muestre el aviso.
            <Tooltip open={lockedTooltipOpen} onOpenChange={setLockedTooltipOpen}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setLockedTooltipOpen(o => !o)}
                  aria-label={t("community.replyPublicLocked")}
                  className="px-2.5 py-1.5 rounded-full bg-secondary text-muted-foreground/50 flex items-center gap-1">
                  <MessageSquare size={14} />
                </button>
              </TooltipTrigger>
              <TooltipContent>{t("community.replyPublicLocked")}</TooltipContent>
            </Tooltip>
          )}

          {item.kind === "note" && !isOwnNote && (
            <button onClick={() => onToggleRepost(note)}
              title={note.reposted ? t("community.unrepost") : t("community.repost")}
              aria-label={note.reposted ? t("community.unrepost") : t("community.repost")}
              className={`px-2.5 py-1.5 rounded-full flex items-center gap-1 ${
                note.reposted ? "bg-info/10 text-info" : "bg-secondary text-foreground"
              }`}>
              <Repeat2 size={14} />
              {note.repostCount > 0 && <span className="text-[10px] font-bold">{note.repostCount}</span>}
            </button>
          )}
        </div>
      )}

      {note.publicReplies.length > 0 && (
        <button onClick={() => onToggleExpand(note.id)} className="mt-2 text-[11px] font-semibold text-muted-foreground">
          {t("community.publicReplies.count", { count: note.publicReplies.length })}
        </button>
      )}

      {expanded && (
        <PublicReplyThread
          replies={note.publicReplies}
          canReply={note.canReplyPublicly}
          onSubmit={content => onSubmitPublicReply(note.id, content)}
        />
      )}
    </div>
  );
};
