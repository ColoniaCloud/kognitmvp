const CANDIDATE_MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4;codecs=mp4a.40.2",
  "audio/mp4",
];

export function getSupportedAudioMimeType(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  for (const type of CANDIDATE_MIME_TYPES) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return "";
}

export function isAudioRecordingSupported(): boolean {
  return typeof navigator !== "undefined"
    && !!navigator.mediaDevices?.getUserMedia
    && getSupportedAudioMimeType() !== null;
}

export function audioFileExtension(mimeType: string): string {
  return mimeType.includes("mp4") ? "m4a" : "webm";
}

export function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export interface VoiceRecording {
  blob: Blob;
  durationSeconds: number;
  mimeType: string;
}

export class VoiceRecorder {
  private stream: MediaStream | null = null;
  private recorder: MediaRecorder | null = null;
  private chunks: BlobPart[] = [];
  private startedAt = 0;

  async start(): Promise<void> {
    const mimeType = getSupportedAudioMimeType();
    if (!mimeType && mimeType !== "") throw new Error("unsupported");
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.chunks = [];
    this.recorder = new MediaRecorder(this.stream, mimeType ? { mimeType } : undefined);
    this.recorder.ondataavailable = (e) => { if (e.data.size > 0) this.chunks.push(e.data); };
    this.recorder.start();
    this.startedAt = Date.now();
  }

  stop(): Promise<VoiceRecording> {
    return new Promise((resolve, reject) => {
      const recorder = this.recorder;
      if (!recorder) { reject(new Error("not_recording")); return; }
      recorder.onstop = () => {
        const mimeType = recorder.mimeType || "audio/webm";
        const blob = new Blob(this.chunks, { type: mimeType });
        const durationSeconds = (Date.now() - this.startedAt) / 1000;
        this.releaseStream();
        resolve({ blob, durationSeconds, mimeType });
      };
      recorder.stop();
    });
  }

  cancel(): void {
    try { this.recorder?.stop(); } catch { /* ya estaba detenido */ }
    this.releaseStream();
  }

  private releaseStream(): void {
    this.stream?.getTracks().forEach(t => t.stop());
    this.stream = null;
    this.recorder = null;
  }
}
