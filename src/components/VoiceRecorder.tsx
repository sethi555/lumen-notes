import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Live transcription via webkitSpeechRecognition + audio capture via MediaRecorder.
export function VoiceRecorder({ onTranscript, onAudioSaved }: {
  onTranscript: (text: string) => void;
  onAudioSaved?: (url: string) => void;
}) {
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const recognitionRef = useRef<any>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  useEffect(() => () => stop(), []);

  const start = async () => {
    const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (SR) {
      const rec = new SR();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = "en-US";
      let finalText = "";
      rec.onresult = (e: any) => {
        let interim = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const t = e.results[i][0].transcript;
          if (e.results[i].isFinal) finalText += t + " ";
          else interim += t;
        }
        if (finalText) { onTranscript(finalText.trim() + " "); finalText = ""; }
      };
      rec.onerror = () => {};
      rec.start();
      recognitionRef.current = rec;
    } else {
      toast.message("Live transcription unavailable in this browser — recording audio only.");
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunks.current = [];
      mr.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      mr.onstop = () => upload(stream);
      mr.start();
      mediaRef.current = mr;
      setRecording(true);
    } catch {
      toast.error("Microphone permission denied.");
    }
  };

  const upload = async (stream: MediaStream) => {
    stream.getTracks().forEach((t) => t.stop());
    const blob = new Blob(chunks.current, { type: "audio/webm" });
    if (!blob.size) return;
    setUploading(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid) throw new Error("no user");
      const path = `${uid}/audio/${Date.now()}.webm`;
      const { error } = await supabase.storage.from("media").upload(path, blob, { contentType: "audio/webm" });
      if (error) throw error;
      const { data } = await supabase.storage.from("media").createSignedUrl(path, 60 * 60 * 24 * 7);
      if (data?.signedUrl) { onAudioSaved?.(data.signedUrl); toast.success("Audio saved"); }
    } catch {
      toast.error("Audio upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const stop = () => {
    recognitionRef.current?.stop?.();
    recognitionRef.current = null;
    if (mediaRef.current && mediaRef.current.state !== "inactive") mediaRef.current.stop();
    mediaRef.current = null;
    setRecording(false);
  };

  return (
    <Button
      type="button"
      variant={recording ? "destructive" : "ghost"}
      size="sm"
      onClick={() => (recording ? stop() : start())}
      disabled={uploading}
    >
      {uploading ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : recording ? <Square className="mr-1 h-4 w-4" /> : <Mic className="mr-1 h-4 w-4" />}
      {recording ? "Stop" : "Dictate"}
    </Button>
  );
}
