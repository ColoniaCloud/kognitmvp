import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, Search, Check, Ban, VolumeX, Volume2, Trash2, MoreVertical, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { timeAgo } from "@/lib/utils";
import { MessageThread } from "@/components/kognit/MessageThread";
import { Avatar } from "@/components/kognit/Avatar";
import { PublicProfileSheet } from "@/components/kognit/PublicProfileSheet";
import { ErrorState } from "@/components/kognit/ErrorState";

interface Props { onBack: () => void; }

interface MessageRow {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string | null;
  audio_path: string | null;
  read: boolean;
  created_at: string;
}

interface RequestRow {
  user_min: string;
  user_max: string;
  initiator_id: string;
  status: string;
}

interface SettingsRow {
  peer_id: string;
  muted: boolean;
  deleted_at: string | null;
}

interface PeerProfileRow {
  id: string;
  display_name: string;
  avatar_url: string | null;
}

interface Conversation {
  peerId: string;
  peerName: string;
  peerAvatarUrl: string | null;
  lastPreview: string;
  lastAt: string;
  unreadCount: number;
  status: "pending" | "accepted" | "declined";
  isInitiator: boolean;
  muted: boolean;
  blocked: boolean;
}

type ConfirmAction = { type: "block" | "unblock" | "delete"; peerId: string; peerName: string };

export const MessagesScreen = ({ onBack }: Props) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [tab, setTab] = useState<"messages" | "requests">("messages");
  const [search, setSearch] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [selectedPeerId, setSelectedPeerId] = useState<string | null>(null);
  const [actionsFor, setActionsFor] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [viewProfileId, setViewProfileId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: msgRows, error }, { data: reqRows }, { data: settingsRows }, { data: blockRows }] = await Promise.all([
      supabase.from("messages")
        .select("id, sender_id, recipient_id, content, audio_path, read, created_at")
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order("created_at", { ascending: false }),
      supabase.from("message_requests").select("user_min, user_max, initiator_id, status")
        .or(`user_min.eq.${user.id},user_max.eq.${user.id}`),
      supabase.from("conversation_settings").select("peer_id, muted, deleted_at").eq("owner_id", user.id),
      supabase.from("user_blocks").select("blocked_id").eq("blocker_id", user.id),
    ]);
    setLoadError(!!error);

    const messages = (msgRows ?? []) as MessageRow[];
    const requests = (reqRows ?? []) as RequestRow[];
    const settingsByPeer = new Map((settingsRows ?? []).map((s: SettingsRow) => [s.peer_id, s]));
    const blockedIds = new Set((blockRows ?? []).map((b: { blocked_id: string }) => b.blocked_id));

    const peerIds = Array.from(new Set(messages.map(m => (m.sender_id === user.id ? m.recipient_id : m.sender_id))));
    const { data: profs } = peerIds.length
      ? await supabase.from("profiles").select("id, display_name, avatar_url").in("id", peerIds)
      : { data: [] as PeerProfileRow[] };
    const nameById = new Map((profs ?? []).map((p: PeerProfileRow) => [p.id, p.display_name]));
    const avatarById = new Map((profs ?? []).map((p: PeerProfileRow) => [
      p.id,
      p.avatar_url ? supabase.storage.from("avatars").getPublicUrl(p.avatar_url).data.publicUrl : null,
    ]));

    const requestByPeer = new Map<string, RequestRow>();
    requests.forEach(r => {
      const peerId = r.user_min === user.id ? r.user_max : r.user_min;
      requestByPeer.set(peerId, r);
    });

    const grouped = new Map<string, Conversation>();
    for (const m of messages) {
      const peerId = m.sender_id === user.id ? m.recipient_id : m.sender_id;
      const isUnreadForMe = m.recipient_id === user.id && !m.read;
      const req = requestByPeer.get(peerId);
      const settings = settingsByPeer.get(peerId);
      const existing = grouped.get(peerId);
      if (!existing) {
        grouped.set(peerId, {
          peerId,
          peerName: nameById.get(peerId) ?? t("messages.defaultPeerName"),
          peerAvatarUrl: avatarById.get(peerId) ?? null,
          lastPreview: m.content ?? t("messages.thread.audioPreview"),
          lastAt: m.created_at,
          unreadCount: isUnreadForMe ? 1 : 0,
          status: (req?.status as Conversation["status"]) ?? "accepted",
          isInitiator: req ? req.initiator_id === user.id : true,
          muted: !!settings?.muted,
          blocked: blockedIds.has(peerId),
        });
      } else if (isUnreadForMe) {
        existing.unreadCount += 1;
      }
    }

    // Aplica el filtro de eliminado: si deleted_at es posterior al último mensaje, se oculta
    const list = Array.from(grouped.values()).filter(conv => {
      const settings = settingsByPeer.get(conv.peerId);
      if (!settings?.deleted_at) return true;
      return new Date(conv.lastAt).getTime() > new Date(settings.deleted_at).getTime();
    });

    setConversations(list);
    setLoading(false);
  }, [user, t]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return conversations
      .filter(c => (tab === "requests" ? c.status === "pending" && !c.isInitiator : c.status !== "declined" && (c.status === "accepted" || c.isInitiator)))
      .filter(c => !q || c.peerName.toLowerCase().includes(q))
      .sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime());
  }, [conversations, tab, search]);

  const requestCount = useMemo(
    () => conversations.filter(c => c.status === "pending" && !c.isInitiator).length,
    [conversations]
  );

  const openThread = async (peerId: string) => {
    setSelectedPeerId(peerId);
    setActionsFor(null);
    if (!user) return;
    await supabase.from("messages").update({ read: true })
      .eq("recipient_id", user.id).eq("sender_id", peerId).eq("read", false);
    load();
  };

  const respondToRequest = async (peerId: string, accept: boolean) => {
    if (!user) return;
    const userMin = user.id < peerId ? user.id : peerId;
    const userMax = user.id < peerId ? peerId : user.id;
    await supabase.from("message_requests")
      .update({ status: accept ? "accepted" : "declined" })
      .eq("user_min", userMin).eq("user_max", userMax);
    load();
  };

  const toggleMute = async (peerId: string, muted: boolean) => {
    if (!user) return;
    await supabase.from("conversation_settings")
      .upsert({ owner_id: user.id, peer_id: peerId, muted }, { onConflict: "owner_id,peer_id" });
    load();
  };

  const deleteConversation = async (peerId: string) => {
    if (!user) return;
    await supabase.from("conversation_settings")
      .upsert({ owner_id: user.id, peer_id: peerId, deleted_at: new Date().toISOString() }, { onConflict: "owner_id,peer_id" });
    setConfirmAction(null);
    if (selectedPeerId === peerId) setSelectedPeerId(null);
    load();
  };

  const setBlocked = async (peerId: string, blocked: boolean) => {
    if (!user) return;
    if (blocked) {
      await supabase.from("user_blocks").upsert({ blocker_id: user.id, blocked_id: peerId }, { onConflict: "blocker_id,blocked_id" });
    } else {
      await supabase.from("user_blocks").delete().eq("blocker_id", user.id).eq("blocked_id", peerId);
    }
    setConfirmAction(null);
    load();
  };

  if (selectedPeerId) {
    const conv = conversations.find(c => c.peerId === selectedPeerId);
    return (
      <div className="min-h-full bg-gradient-hero relative flex flex-col">
        <MessageThread
          peerId={selectedPeerId}
          peerName={conv?.peerName ?? t("messages.defaultPeerName")}
          status={conv?.status ?? "accepted"}
          isInitiator={conv?.isInitiator ?? true}
          blocked={conv?.blocked ?? false}
          onBack={() => { setSelectedPeerId(null); load(); }}
          onOpenProfile={setViewProfileId}
          onRespond={(accept) => respondToRequest(selectedPeerId, accept)}
        />
        {viewProfileId && (
          <PublicProfileSheet userId={viewProfileId} onClose={() => setViewProfileId(null)} />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gradient-hero pb-10 relative">
      <div className="px-6 pt-3 flex items-center justify-between">
        <button onClick={onBack} aria-label={t("common.backAria")} className="w-10 h-10 rounded-full bg-card shadow-soft flex items-center justify-center">
          <ChevronLeft size={18} />
        </button>
        <p className="text-xs font-bold">{t("messages.title")}</p>
        <div className="w-10" />
      </div>

      <div className="px-6 mt-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t("messages.searchPlaceholder")}
            className="w-full bg-secondary/40 rounded-full pl-9 pr-4 py-2.5 text-xs focus:outline-none"
          />
        </div>
      </div>

      <div className="px-6 mt-3 grid grid-cols-2 gap-2">
        <button onClick={() => setTab("messages")}
          className={`p-2.5 rounded-2xl text-xs font-bold transition-all border ${
            tab === "messages" ? "bg-gradient-info text-info-foreground border-transparent shadow-soft" : "bg-card border-border text-muted-foreground"
          }`}>
          {t("messages.tabMessages")}
        </button>
        <button onClick={() => setTab("requests")}
          className={`p-2.5 rounded-2xl text-xs font-bold transition-all border relative ${
            tab === "requests" ? "bg-gradient-info text-info-foreground border-transparent shadow-soft" : "bg-card border-border text-muted-foreground"
          }`}>
          {t("messages.tabRequests")}
          {requestCount > 0 && (
            <span className="ml-1.5 inline-flex min-w-[16px] h-[16px] px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold items-center justify-center">
              {requestCount}
            </span>
          )}
        </button>
      </div>

      <div className="px-6 mt-3 space-y-2">
        {loading && <p className="text-xs text-muted-foreground text-center py-10">{t("messages.loading")}</p>}
        {!loading && loadError && <ErrorState onRetry={load} />}
        {!loading && !loadError && filtered.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-10">
            {tab === "requests" ? t("messages.emptyRequests") : t("messages.emptyMessages")}
          </p>
        )}
        {filtered.map(c => (
          <div key={c.peerId} className="rounded-2xl bg-card shadow-soft overflow-hidden">
            <div className="w-full p-4 flex items-center gap-3 text-left">
              <button onClick={() => setViewProfileId(c.peerId)} className="shrink-0">
                <Avatar src={c.peerAvatarUrl} name={c.peerName} size={36} shape="circle" className="text-sm" />
              </button>
              <button onClick={() => openThread(c.peerId)} className="flex-1 min-w-0 text-left">
                <p className="text-xs font-bold flex items-center gap-1.5">
                  {c.peerName}
                  {c.muted && <VolumeX size={11} className="text-muted-foreground" />}
                  {c.blocked && <Ban size={11} className="text-destructive" />}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">{c.lastPreview}</p>
              </button>
              {tab === "requests" ? (
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => respondToRequest(c.peerId, true)}
                    className="px-2.5 py-1.5 rounded-full text-[10px] font-bold bg-gradient-primary text-primary-foreground flex items-center gap-1">
                    <Check size={11} /> {t("messages.requests.accept")}
                  </button>
                  <button onClick={() => respondToRequest(c.peerId, false)}
                    className="px-2.5 py-1.5 rounded-full text-[10px] font-bold bg-secondary text-foreground">
                    {t("messages.requests.decline")}
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <button onClick={() => setActionsFor(actionsFor === c.peerId ? null : c.peerId)} className="text-muted-foreground">
                    <MoreVertical size={15} />
                  </button>
                  <p className="text-[10px] text-muted-foreground">{timeAgo(c.lastAt)}</p>
                  {c.unreadCount > 0 && (
                    <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
                      {c.unreadCount}
                    </span>
                  )}
                </div>
              )}
            </div>
            {actionsFor === c.peerId && tab === "messages" && (
              <div className="px-4 pb-3 flex items-center gap-2 border-t border-border pt-3">
                <button onClick={() => toggleMute(c.peerId, !c.muted)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-secondary text-[10px] font-bold">
                  {c.muted ? <Volume2 size={13} /> : <VolumeX size={13} />}
                  {c.muted ? t("messages.settings.unmute") : t("messages.settings.mute")}
                </button>
                <button onClick={() => setConfirmAction({ type: c.blocked ? "unblock" : "block", peerId: c.peerId, peerName: c.peerName })}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-secondary text-[10px] font-bold">
                  <Ban size={13} /> {c.blocked ? t("messages.settings.unblock") : t("messages.settings.block")}
                </button>
                <button onClick={() => setConfirmAction({ type: "delete", peerId: c.peerId, peerName: c.peerName })}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-destructive/10 text-destructive text-[10px] font-bold">
                  <Trash2 size={13} /> {t("messages.settings.delete")}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {confirmAction && (
        <div className="fixed inset-0 z-[70] bg-foreground/40 backdrop-blur-sm flex items-end md:items-center justify-center">
          <div className="w-full bg-card rounded-t-3xl md:rounded-3xl shadow-card p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-destructive">
                {t(`messages.settings.confirm.${confirmAction.type}.title`)}
              </p>
              <button onClick={() => setConfirmAction(null)} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                <X size={14} />
              </button>
            </div>
            <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
              {t(`messages.settings.confirm.${confirmAction.type}.body`, { name: confirmAction.peerName })}
            </p>
            <button
              onClick={() => {
                if (confirmAction.type === "delete") deleteConversation(confirmAction.peerId);
                else setBlocked(confirmAction.peerId, confirmAction.type === "block");
              }}
              className="mt-4 w-full bg-destructive text-destructive-foreground font-bold py-3.5 rounded-2xl text-sm shadow-card">
              {t(`messages.settings.confirm.${confirmAction.type}.cta`)}
            </button>
          </div>
        </div>
      )}

      {viewProfileId && (
        <PublicProfileSheet userId={viewProfileId} onClose={() => setViewProfileId(null)} />
      )}
    </div>
  );
};
