import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Lock, Send } from "lucide-react";
import { Avatar } from "@/components/kognit/Avatar";
import { timeAgo } from "@kognit/ui/lib/utils";

export interface PublicReplyRow {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  authorName: string;
  authorAvatarUrl: string | null;
}

interface Props {
  replies: PublicReplyRow[];
  canReply: boolean;
  onSubmit: (content: string) => Promise<void>;
}

export const PublicReplyThread = ({ replies, canReply, onSubmit }: Props) => {
  const { t } = useTranslation();
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const send = async () => {
    const content = draft.trim();
    if (!content || sending) return;
    setSending(true);
    await onSubmit(content);
    setSending(false);
    setDraft("");
  };

  return (
    <div className="mt-3 pt-3 border-t border-border space-y-3">
      {replies.map(r => (
        <div key={r.id} className="flex items-start gap-2">
          <Avatar src={r.authorAvatarUrl} name={r.authorName} size={24} shape="circle" className="text-[10px] shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] leading-tight">
              <span className="font-bold">{r.authorName}</span>{" "}
              <span className="text-muted-foreground">{timeAgo(r.created_at)}</span>
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground whitespace-pre-wrap">{r.content}</p>
          </div>
        </div>
      ))}

      {canReply ? (
        <div className="flex items-center gap-2">
          <input
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") send(); }}
            placeholder={t("community.publicReplies.placeholder")}
            disabled={sending}
            className="flex-1 min-w-0 px-3 py-2 rounded-full bg-secondary text-xs outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
          />
          <button
            onClick={send}
            disabled={sending || !draft.trim()}
            aria-label={t("community.publicReplies.placeholder")}
            className="shrink-0 w-8 h-8 rounded-full bg-gradient-primary text-primary-foreground flex items-center justify-center disabled:opacity-40">
            <Send size={14} />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Lock size={12} />
          {t("community.publicReplies.locked")}
        </div>
      )}
    </div>
  );
};
