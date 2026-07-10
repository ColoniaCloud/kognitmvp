import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, Send, Mic, Square, X, Check, Ban } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/components/ui/sonner";
import { useVoiceRecorder } from "@/hooks/use-voice-recorder";
import { audioFileExtension, formatDuration } from "@/lib/audio";

interface Props {
  peerId: string;
  peerName: string;
  status: "pending" | "accepted" | "declined";
  isInitiator: boolean;
  blocked: boolean;
  onBack: () => void;
  onOpenProfile: (userId: string) => void;
  onRespond: (accept: boolean) => void;
}

interface MessageRow {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string | null;
  audio_path: string | null;
  audio_duration_seconds: number | null;
  created_at: string;
}

const AUDIO_URL_TTL = 60 * 60 * 24;

export const MessageThread = ({ peerId, peerName, status, isInitiator, blocked, onBack, onOpenProfile, onRespond }: Props) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [audioUrlByPath, setAudioUrlByPath] = useState<Map<string, string>>(new Map());
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const recorder = useVoiceRecorder();

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("messages")
      .select("id, sender_id, recipient_id, content, audio_path, audio_duration_seconds, created_at")
      .or(`and(sender_id.eq.${user.id},recipient_id.eq.${peerId}),and(sender_id.eq.${peerId},recipient_id.eq.${user.id})`)
      .order("created_at", { ascending: true });
    const list = (data ?? []) as MessageRow[];
    setMessages(list);

    const paths = list.map(m => m.audio_path).filter((p): p is string => !!p);
    if (paths.length) {
      const { data: signed } = await supabase.storage.from("voice-messages").createSignedUrls(paths, AUDIO_URL_TTL);
      const map = new Map<string, string>();
      (signed ?? []).forEach(s => { if (s.signedUrl && s.path) map.set(s.path, s.signedUrl); });
      setAudioUrlByPath(map);
    }
  }, [user, peerId]);

  useEffect(() => { load(); }, [load]);

  const sendText = async () => {
    if (!user || !draft.trim()) return;
    setSending(true);
    const { error } = await supabase.rpc("send_direct_message", {
      p_recipient_id: peerId,
      p_content: draft.trim(),
    });
    setSending(false);
    if (error) {
      toast.error(t("messages.thread.sendError"));
      return;
    }
    setDraft("");
    load();
  };

  const startRecording = async () => {
    try {
      await recorder.start();
    } catch {
      toast.error(t("messages.recording.permissionDenied"));
    }
  };

  const sendRecording = async () => {
    if (!user) return;
    await recorder.stop();
  };

  useEffect(() => {
    if (recorder.status !== "recorded" || !recorder.recording || !user) return;
    (async () => {
      setSending(true);
      const ext = audioFileExtension(recorder.recording!.mimeType);
      const sortedIds = [user.id, peerId].sort().join("_");
      const path = `${sortedIds}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("voice-messages")
        .upload(path, recorder.recording!.blob, { cacheControl: "3600", upsert: false });
      if (uploadError) {
        setSending(false);
        toast.error(t("messages.recording.uploadError"));
        recorder.reset();
        return;
      }
      const { error } = await supabase.rpc("send_direct_message", {
        p_recipient_id: peerId,
        p_audio_path: path,
        p_audio_duration_seconds: Math.round(recorder.recording!.durationSeconds),
      });
      setSending(false);
      recorder.reset();
      if (error) {
        toast.error(t("messages.thread.sendError"));
        return;
      }
      load();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo dispara cuando termina de grabar
  }, [recorder.status]);

  const showRequestBar = status === "pending" && !isInitiator;

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-5 flex items-center gap-3 shrink-0">
        <button onClick={onBack} className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center shrink-0">
          <ChevronLeft size={16} />
        </button>
        <button onClick={() => onOpenProfile(peerId)} className="flex-1 min-w-0 text-left">
          <p className="text-xs font-bold truncate">{peerName}</p>
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-6 mt-4 space-y-2">
        {messages.map(m => {
          const mine = m.sender_id === user?.id;
          const audioUrl = m.audio_path ? audioUrlByPath.get(m.audio_path) : null;
          return (
            <div key={m.id} className={`max-w-[75%] p-3 rounded-2xl text-xs ${
              mine ? "ml-auto bg-gradient-primary text-primary-foreground" : "bg-secondary/60"
            }`}>
              {m.content}
              {m.audio_path && (
                audioUrl
                  ? <audio controls src={audioUrl} className="w-full max-w-[220px]" />
                  : <p className="text-[10px] opacity-70">{formatDuration(m.audio_duration_seconds ?? 0)}</p>
              )}
            </div>
          );
        })}
      </div>

      {blocked ? (
        <div className="px-6 py-4 border-t border-border shrink-0">
          <p className="text-xs text-center text-muted-foreground">{t("messages.settings.blockedNotice")}</p>
        </div>
      ) : showRequestBar ? (
        <div className="px-6 py-4 border-t border-border shrink-0 flex items-center gap-2">
          <button onClick={() => onRespond(true)}
            className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl bg-gradient-primary text-primary-foreground font-bold text-xs">
            <Check size={14} /> {t("messages.requests.accept")}
          </button>
          <button onClick={() => onRespond(false)}
            className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl bg-secondary font-bold text-xs">
            <Ban size={14} /> {t("messages.requests.decline")}
          </button>
        </div>
      ) : (
        <div className="px-6 py-3 flex items-center gap-2 bg-card/90 backdrop-blur-xl border-t border-border shrink-0">
          {recorder.status === "recording" ? (
            <div className="flex-1 flex items-center gap-2 bg-secondary/40 rounded-full px-4 py-2.5">
              <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
              <span className="text-xs font-bold flex-1">{t("messages.recording.recording")} {formatDuration(recorder.elapsed)}</span>
              <button onClick={recorder.cancel} aria-label={t("messages.recording.cancelAria")}><X size={16} /></button>
              <button onClick={sendRecording} aria-label={t("messages.recording.stopAria")}><Square size={16} /></button>
            </div>
          ) : (
            <>
              <input
                value={draft}
                onChange={e => setDraft(e.target.value)}
                placeholder={t("messages.inputPlaceholder")}
                className="flex-1 bg-secondary/40 rounded-full px-4 py-2.5 text-xs focus:outline-none"
              />
              {recorder.supported && !draft.trim() && (
                <button onClick={startRecording} disabled={sending} aria-label={t("messages.recording.startAria")}
                  className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0 disabled:opacity-40">
                  <Mic size={15} />
                </button>
              )}
              {draft.trim() && (
                <button
                  onClick={sendText}
                  disabled={sending}
                  className="w-10 h-10 rounded-full bg-foreground text-background flex items-center justify-center disabled:opacity-40 shrink-0">
                  <Send size={15} />
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};
