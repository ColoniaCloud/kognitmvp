import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { timeAgo } from "@/lib/utils";

interface Props { onBack: () => void; }

interface MessageRow {
  id: string;
  sender_id: string;
  recipient_id: string;
  note_id: string | null;
  content: string;
  read: boolean;
  created_at: string;
}

interface Conversation {
  peerId: string;
  peerName: string;
  lastMessage: string;
  lastAt: string;
  unreadCount: number;
}

export const MessagesScreen = ({ onBack }: Props) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [allMessages, setAllMessages] = useState<MessageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeerId, setSelectedPeerId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data: rows } = await supabase
      .from("messages")
      .select("id, sender_id, recipient_id, note_id, content, read, created_at")
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    const list = (rows ?? []) as MessageRow[];
    const peerIds = Array.from(new Set(
      list.map(m => (m.sender_id === user.id ? m.recipient_id : m.sender_id))
    ));

    const { data: profs } = peerIds.length
      ? await supabase.from("profiles").select("id, display_name").in("id", peerIds)
      : { data: [] as { id: string; display_name: string }[] };
    const nameById = new Map((profs ?? []).map(p => [p.id, p.display_name]));

    const grouped = new Map<string, Conversation>();
    for (const m of list) {
      const peerId = m.sender_id === user.id ? m.recipient_id : m.sender_id;
      const isUnreadForMe = m.recipient_id === user.id && !m.read;
      const existing = grouped.get(peerId);
      if (!existing) {
        grouped.set(peerId, {
          peerId,
          peerName: nameById.get(peerId) ?? t("messages.defaultPeerName"),
          lastMessage: m.content,
          lastAt: m.created_at,
          unreadCount: isUnreadForMe ? 1 : 0,
        });
      } else if (isUnreadForMe) {
        existing.unreadCount += 1;
      }
    }

    setConversations(Array.from(grouped.values()));
    setAllMessages(list);
    setLoading(false);
  }, [user, t]);

  useEffect(() => { load(); }, [load]);

  const openThread = async (peerId: string) => {
    setSelectedPeerId(peerId);
    if (!user) return;
    const hasUnread = allMessages.some(
      m => m.sender_id === peerId && m.recipient_id === user.id && !m.read
    );
    if (!hasUnread) return;
    await supabase
      .from("messages")
      .update({ read: true })
      .eq("recipient_id", user.id)
      .eq("sender_id", peerId)
      .eq("read", false);
    load();
  };

  const sendInThread = async () => {
    if (!user || !selectedPeerId || !draft.trim()) return;
    setSending(true);
    const { error } = await supabase.from("messages").insert({
      sender_id: user.id,
      recipient_id: selectedPeerId,
      content: draft.trim(),
    });
    setSending(false);
    if (error) return;
    setDraft("");
    load();
  };

  if (selectedPeerId) {
    const peer = conversations.find(c => c.peerId === selectedPeerId);
    const threadMessages = allMessages
      .filter(m => m.sender_id === selectedPeerId || m.recipient_id === selectedPeerId)
      .slice()
      .reverse();

    return (
      <div className="min-h-full bg-gradient-hero relative flex flex-col">
        <div className="px-6 pt-3 flex items-center justify-between">
          <button onClick={() => setSelectedPeerId(null)} className="w-10 h-10 rounded-full bg-card shadow-soft flex items-center justify-center">
            <ChevronLeft size={18} />
          </button>
          <p className="text-xs font-bold">{peer?.peerName ?? t("messages.defaultPeerName")}</p>
          <div className="w-10" />
        </div>

        <div className="flex-1 overflow-y-auto px-6 mt-4 space-y-2">
          {threadMessages.map(m => (
            <div key={m.id} className={`max-w-[75%] p-3 rounded-2xl text-xs ${
              m.sender_id === user?.id
                ? "ml-auto bg-gradient-primary text-primary-foreground"
                : "bg-card shadow-soft"
            }`}>
              {m.content}
            </div>
          ))}
        </div>

        <div className="px-6 py-3 flex items-center gap-2 bg-card/90 backdrop-blur-xl border-t border-border">
          <input
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder={t("messages.inputPlaceholder")}
            className="flex-1 bg-secondary/40 rounded-full px-4 py-2.5 text-xs focus:outline-none"
          />
          <button
            onClick={sendInThread}
            disabled={!draft.trim() || sending}
            className="w-10 h-10 rounded-full bg-foreground text-background flex items-center justify-center disabled:opacity-40">
            <Send size={15} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gradient-hero pb-10 relative">
      <div className="px-6 pt-3 flex items-center justify-between">
        <button onClick={onBack} className="w-10 h-10 rounded-full bg-card shadow-soft flex items-center justify-center">
          <ChevronLeft size={18} />
        </button>
        <p className="text-xs font-bold">{t("messages.title")}</p>
        <div className="w-10" />
      </div>

      <div className="px-6 mt-5 space-y-2">
        {loading && <p className="text-xs text-muted-foreground text-center py-10">{t("messages.loading")}</p>}
        {!loading && conversations.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-10">{t("messages.empty")}</p>
        )}
        {conversations.map(c => (
          <button key={c.peerId} onClick={() => openThread(c.peerId)}
            className="w-full p-4 rounded-2xl bg-card shadow-soft flex items-center gap-3 text-left">
            <div className="w-9 h-9 rounded-xl bg-gradient-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
              {c.peerName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold">{c.peerName}</p>
              <p className="text-[10px] text-muted-foreground truncate">{c.lastMessage}</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <p className="text-[10px] text-muted-foreground">{timeAgo(c.lastAt)}</p>
              {c.unreadCount > 0 && (
                <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
                  {c.unreadCount}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
