"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export type SpeechState = "idle" | "playing" | "paused";

export interface UseSpeechReturn {
  state: SpeechState;
  /** Index into the paragraphs array currently being spoken (-1 when idle) */
  currentIndex: number;
  supported: boolean;
  voices: SpeechSynthesisVoice[];
  voice: SpeechSynthesisVoice | null;
  rate: number;
  play: (paragraphs: string[]) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  setVoice: (v: SpeechSynthesisVoice) => void;
  setRate: (r: number) => void;
}

function pickBestVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (voices.length === 0) return null;
  // Prefer named high-quality system voices (macOS / iOS / Windows)
  for (const name of ["Samantha", "Alex", "Karen", "Daniel", "Moira", "Serena"]) {
    const match = voices.find((v) => v.name === name);
    if (match) return match;
  }
  const localEnUS = voices.find((v) => v.localService && v.lang === "en-US");
  if (localEnUS) return localEnUS;
  const localEn = voices.find((v) => v.localService && v.lang.startsWith("en"));
  if (localEn) return localEn;
  const anyEn = voices.find((v) => v.lang.startsWith("en"));
  return anyEn ?? voices[0];
}

export function useSpeech(): UseSpeechReturn {
  // Start as false to avoid SSR/hydration mismatch
  const [supported, setSupported] = useState(false);
  const [uiState, setUiState] = useState<SpeechState>("idle");
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voice, setVoiceState] = useState<SpeechSynthesisVoice | null>(null);
  const [rate, setRateState] = useState(0.95);

  // Refs are safe to read inside event handlers / closures without going stale
  const intendedRef = useRef<SpeechState>("idle");
  const paragraphsRef = useRef<string[]>([]);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const rateRef = useRef(0.95);
  const currentIndexRef = useRef(-1);

  useEffect(() => { voiceRef.current = voice; }, [voice]);
  useEffect(() => { rateRef.current = rate; }, [rate]);

  // Detect support after mount
  useEffect(() => {
    setSupported("speechSynthesis" in window);
  }, []);

  // Load voices (async in Chrome — fires onvoiceschanged)
  useEffect(() => {
    if (!supported) return;
    const synth = window.speechSynthesis;

    const load = () => {
      const available = synth.getVoices();
      if (available.length === 0) return;
      setVoices(available);
      if (!voiceRef.current) {
        const best = pickBestVoice(available);
        setVoiceState(best);
        voiceRef.current = best;
      }
    };

    load();
    synth.onvoiceschanged = load;
    return () => { synth.onvoiceschanged = null; };
  }, [supported]);

  // Chrome: silently pauses synthesis when tab is backgrounded — resume on focus
  useEffect(() => {
    if (!supported) return;
    const onVisible = () => {
      if (!document.hidden && intendedRef.current === "playing" && window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [supported]);

  // Heartbeat: recover from Chrome's aggressive background throttling
  useEffect(() => {
    if (!supported) return;
    const id = setInterval(() => {
      if (intendedRef.current === "playing" && window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    }, 3000);
    return () => clearInterval(id);
  }, [supported]);

  const speakAt = useCallback((index: number) => {
    if (!("speechSynthesis" in window)) return;
    const synth = window.speechSynthesis;
    const paragraphs = paragraphsRef.current;

    if (index >= paragraphs.length) {
      intendedRef.current = "idle";
      currentIndexRef.current = -1;
      setUiState("idle");
      setCurrentIndex(-1);
      return;
    }

    // Always update current index (for highlighting, even on empty blocks)
    currentIndexRef.current = index;
    setCurrentIndex(index);

    // Skip empty/whitespace-only blocks silently
    if (!paragraphs[index]?.trim()) {
      if (intendedRef.current === "playing") speakAt(index + 1);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(paragraphs[index]);
    if (voiceRef.current) utterance.voice = voiceRef.current;
    utterance.rate = rateRef.current;
    utterance.lang = "en-US";

    utterance.onend = () => {
      if (intendedRef.current === "playing") speakAt(index + 1);
    };

    utterance.onerror = (e) => {
      // 'interrupted' / 'canceled' are expected when we call cancel()
      if (e.error !== "interrupted" && e.error !== "canceled") {
        console.error("TTS error:", e.error);
      }
    };

    synth.speak(utterance);
  }, []); // no deps — reads everything via refs

  const play = useCallback((paragraphs: string[]) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    paragraphsRef.current = paragraphs;
    intendedRef.current = "playing";
    setUiState("playing");
    speakAt(0);
  }, [speakAt]);

  const pause = useCallback(() => {
    if (!("speechSynthesis" in window)) return;
    intendedRef.current = "paused";
    setUiState("paused");
    window.speechSynthesis.pause();
  }, []);

  const resume = useCallback(() => {
    if (!("speechSynthesis" in window)) return;
    intendedRef.current = "playing";
    setUiState("playing");
    window.speechSynthesis.resume();
  }, []);

  const stop = useCallback(() => {
    if (!("speechSynthesis" in window)) return;
    intendedRef.current = "idle";
    currentIndexRef.current = -1;
    setUiState("idle");
    setCurrentIndex(-1);
    window.speechSynthesis.cancel();
  }, []);

  const setVoice = useCallback((v: SpeechSynthesisVoice) => {
    voiceRef.current = v;
    setVoiceState(v);
  }, []);

  const setRate = useCallback((r: number) => {
    rateRef.current = r;
    setRateState(r);
  }, []);

  return { state: uiState, currentIndex, supported, voices, voice, rate, play, pause, resume, stop, setVoice, setRate };
}
