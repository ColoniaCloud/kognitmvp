import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { X, Lock, Users, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/components/ui/sonner";
import { MOOD_OPTIONS, type MoodId } from "@/data/moods";
import { MoodIcon } from "@/components/kognit/MoodIcon";

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export const NoteComposer = ({ open, onClose, onSaved }: Props) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [mood, setMood] = useState<MoodId>("focus");
  const [visibility, setVisibility] = useState<"private" | "public">("private");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => { if (imagePreview) URL.revokeObjectURL(imagePreview); }, [imagePreview]);

  if (!open) return null;

  const onPickImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error(t("noteComposer.toasts.invalidImageType"));
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error(t("noteComposer.toasts.imageTooLarge"));
      return;
    }
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
  };

  const save = async () => {
    if (!user || !content.trim()) return;
    setSaving(true);

    // El bucket "note-images" es privado (workspace bloquea buckets públicos),
    // así que acá guardamos el path del objeto, no una URL. Community.tsx
    // genera una signed URL temporal al mostrar cada nota.
    let image_url: string | null = null;
    if (imageFile) {
      setUploading(true);
      const ext = imageFile.name.split(".").pop() || "jpg";
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("note-images")
        .upload(path, imageFile, { cacheControl: "3600", upsert: false });
      setUploading(false);
      if (uploadError) {
        setSaving(false);
        toast.error(t("noteComposer.toasts.uploadError"));
        return;
      }
      image_url = path;
    }

    const { error } = await supabase.from("notes").insert({
      user_id: user.id,
      title: title.trim() || null,
      content: content.trim(),
      mood,
      visibility,
      image_url,
    });
    setSaving(false);
    if (error) {
      toast.error(t("noteComposer.toasts.saveError"));
      return;
    }
    toast.success(visibility === "public" ? t("noteComposer.toasts.sharedSuccess") : t("noteComposer.toasts.savedSuccess"));
    setTitle(""); setContent(""); setMood("focus"); setVisibility("private"); removeImage();
    onSaved?.();
    onClose();
  };

  return (
    <div className="absolute inset-0 z-50 bg-foreground/40 backdrop-blur-sm flex items-end md:items-center justify-center">
      <div className="w-full bg-card rounded-t-3xl md:rounded-3xl shadow-card p-5 max-h-[85%] overflow-y-auto">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold">{t("noteComposer.title")}</p>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
            <X size={14} />
          </button>
        </div>

        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder={t("noteComposer.titlePlaceholder")}
          className="mt-4 w-full bg-transparent text-base font-bold placeholder:text-muted-foreground/60 focus:outline-none"
        />
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder={t("noteComposer.contentPlaceholder")}
          rows={4}
          className="mt-2 w-full bg-secondary/40 rounded-2xl p-3 text-sm placeholder:text-muted-foreground/70 focus:outline-none resize-none"
        />

        <div className="mt-3 flex items-center gap-2">
          {MOOD_OPTIONS.map(({ id }) => (
            <button key={id} onClick={() => setMood(id)} aria-label={t(`moods.options.${id}`)} aria-pressed={mood === id}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                mood === id ? "bg-gradient-info text-info-foreground shadow-soft scale-110" : "bg-secondary text-foreground"
              }`}>
              <MoodIcon mood={id} size={20} />
            </button>
          ))}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={onPickImage}
          className="hidden"
        />
        {!imagePreview ? (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="mt-3 w-full flex items-center justify-center gap-2 bg-secondary/40 rounded-2xl py-3 text-xs font-bold text-muted-foreground">
            <ImageIcon size={15} />
            {t("noteComposer.addImage")}
          </button>
        ) : (
          <div className="mt-3 relative">
            <img src={imagePreview} alt={t("noteComposer.imagePreviewAlt")} className="w-full max-h-48 object-cover rounded-2xl" />
            <button
              type="button"
              onClick={removeImage}
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-foreground/70 text-background flex items-center justify-center">
              <X size={13} />
            </button>
          </div>
        )}

        <p className="mt-4 text-[10px] uppercase tracking-widest text-muted-foreground font-bold">{t("noteComposer.privacyLabel")}</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button onClick={() => setVisibility("private")}
            className={`p-3 rounded-2xl text-left transition-all border ${
              visibility === "private" ? "bg-gradient-info text-info-foreground border-transparent shadow-soft" : "bg-card border-border text-muted-foreground"
            }`}>
            <Lock size={14} />
            <p className="mt-1.5 text-xs font-bold">{t("noteComposer.private.label")}</p>
            <p className="text-[10px] opacity-80 mt-0.5">{t("noteComposer.private.hint")}</p>
          </button>
          <button onClick={() => setVisibility("public")}
            className={`p-3 rounded-2xl text-left transition-all border ${
              visibility === "public" ? "bg-gradient-deep text-primary-foreground border-transparent shadow-soft" : "bg-card border-border text-muted-foreground"
            }`}>
            <Users size={14} />
            <p className="mt-1.5 text-xs font-bold">{t("noteComposer.public.label")}</p>
            <p className="text-[10px] opacity-80 mt-0.5">{t("noteComposer.public.hint")}</p>
          </button>
        </div>

        <button
          onClick={save}
          disabled={!content.trim() || saving}
          className="mt-5 w-full bg-foreground text-background font-bold py-3.5 rounded-2xl text-sm shadow-card disabled:opacity-40">
          {uploading ? t("noteComposer.uploading") : saving ? t("noteComposer.saving") : t("noteComposer.save")}
        </button>
      </div>
    </div>
  );
};
