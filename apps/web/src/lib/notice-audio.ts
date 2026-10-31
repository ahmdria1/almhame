import { shouldPlayNotice, type NoticeSoundMode } from "@elawyer/types";

let primed = false;

export function primeNoticeAudio() {
  if (primed || typeof window === "undefined") return;
  primed = true;
  const audio = new Audio("/sounds/normal-2.mp3");
  audio.volume = 0.001;
  void audio.play().then(() => audio.pause()).catch(() => {
    primed = false;
  });
}

export function playNoticeSound(cue: string, mode: NoticeSoundMode, priority: "normal" | "urgent") {
  if (typeof document === "undefined") return;
  if (document.visibilityState !== "visible") return;
  if (!shouldPlayNotice(mode, priority)) return;
  const audio = new Audio();
  const ogg = audio.canPlayType("audio/ogg");
  audio.src = ogg ? `/sounds/${cue}.ogg` : `/sounds/${cue}.mp3`;
  void audio.play().catch(() => undefined);
}