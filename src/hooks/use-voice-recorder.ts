import { useEffect, useRef, useState } from "react";
import { VoiceRecorder, isAudioRecordingSupported, type VoiceRecording } from "@/lib/audio";

type Status = "idle" | "recording" | "recorded";

export function useVoiceRecorder() {
  const [status, setStatus] = useState<Status>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [recording, setRecording] = useState<VoiceRecording | null>(null);
  const recorderRef = useRef<VoiceRecorder | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => () => {
    recorderRef.current?.cancel();
    if (timerRef.current) window.clearInterval(timerRef.current);
  }, []);

  const start = async () => {
    const recorder = new VoiceRecorder();
    recorderRef.current = recorder;
    await recorder.start();
    setElapsed(0);
    setStatus("recording");
    timerRef.current = window.setInterval(() => setElapsed(e => e + 1), 1000);
  };

  const stop = async () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    const recorder = recorderRef.current;
    if (!recorder) return;
    const result = await recorder.stop();
    setRecording(result);
    setStatus("recorded");
  };

  const cancel = () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    recorderRef.current?.cancel();
    setStatus("idle");
    setElapsed(0);
    setRecording(null);
  };

  const reset = () => {
    setStatus("idle");
    setElapsed(0);
    setRecording(null);
  };

  return { status, elapsed, recording, start, stop, cancel, reset, supported: isAudioRecordingSupported() };
}
