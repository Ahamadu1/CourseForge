"use client";

import { useEffect, useState } from "react";
import type { Slide } from "@/lib/anthropic/types";
import type { UseSpeechReturn } from "@/hooks/useSpeech";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SPEEDS = [0.75, 1, 1.25, 1.5] as const;

function slideGradient(kind: string): string {
  switch (kind) {
    case "intro":   return "linear-gradient(135deg, #4A4393 0%, #8B85E0 100%)";
    case "example": return "linear-gradient(135deg, #312D7A 0%, #6762C8 100%)";
    case "action":  return "linear-gradient(135deg, #2B2868 0%, #6B65CC 100%)";
    case "summary": return "linear-gradient(135deg, #3C3489 0%, #9B95E8 100%)";
    default:        return "linear-gradient(135deg, #3C3489 0%, #7F77DD 100%)";
  }
}

function kindLabel(kind: string): string {
  switch (kind) {
    case "intro":   return "Introduction";
    case "concept": return "Core Concept";
    case "example": return "Example";
    case "action":  return "Take Action";
    case "summary": return "Summary";
    default:        return "Lesson";
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface SlidePlayerProps {
  slides: Slide[];
  slideIdx: number;
  onPrev: () => void;
  onNext: () => void;
  speech: UseSpeechReturn;
  onPlayPause: () => void;
  canPlay: boolean;
  lessonTitle: string;
  durationLabel: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SlidePlayer({
  slides,
  slideIdx,
  onPrev,
  onNext,
  speech,
  onPlayPause,
  canPlay,
  lessonTitle,
  durationLabel,
}: SlidePlayerProps) {
  const slide = slides[slideIdx];
  const isPlaying = speech.state === "playing";
  const englishVoices = speech.voices.filter((v) => v.lang.startsWith("en"));

  // Stagger-reveal bullets when the slide changes
  const [bulletVisible, setBulletVisible] = useState<boolean[]>([]);

  useEffect(() => {
    if (!slide) return;
    setBulletVisible([]);
    slide.bullets.forEach((_, i) => {
      setTimeout(() => {
        setBulletVisible((prev) => {
          const next = [...prev];
          next[i] = true;
          return next;
        });
      }, 180 + i * 130);
    });
  }, [slideIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!slide) return null;

  return (
    <div
      className="rounded-2xl overflow-hidden mb-8 select-none"
      style={{ background: slideGradient(slide.kind) }}
    >
      {/* ── Top bar: lesson info + slide counter ── */}
      <div className="flex items-center justify-between px-6 pt-5 pb-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center text-base">
            🤖
          </div>
          <div>
            <p className="text-white/80 font-semibold text-xs leading-tight truncate max-w-[180px]">
              {lessonTitle}
            </p>
            <p className="text-white/40 text-[10px]">AI Instructor · {durationLabel}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-semibold text-white/40 uppercase tracking-widest">
            {kindLabel(slide.kind)}
          </span>
          <span className="text-white/25 text-[10px]">·</span>
          <span className="text-[10px] text-white/40">
            {slideIdx + 1}/{slides.length}
          </span>
        </div>
      </div>

      {/* ── Slide content (crossfades on slideIdx change) ── */}
      <div
        key={slideIdx}
        className="px-6 pt-5 pb-4"
        style={{ animation: "slide-in 0.3s ease-out" }}
      >
        {/* Heading */}
        <h2 className="text-2xl sm:text-[28px] font-bold text-white leading-tight mb-5 tracking-tight">
          {slide.heading}
        </h2>

        {/* Bullets */}
        <ul className="space-y-3 mb-4">
          {slide.bullets.map((bullet, i) => (
            <li
              key={i}
              className="flex items-start gap-3"
              style={{
                opacity: bulletVisible[i] ? 1 : 0,
                transform: bulletVisible[i] ? "none" : "translateX(-8px)",
                transition: "opacity 0.28s ease, transform 0.28s ease",
              }}
            >
              <span className="w-[5px] h-[5px] rounded-full bg-white/35 mt-[9px] flex-shrink-0" />
              <span className="text-white/85 text-[15px] leading-snug">{bullet}</span>
            </li>
          ))}
        </ul>

        {/* Key point callout */}
        {slide.keyPoint && (
          <div className="bg-white/10 rounded-xl px-4 py-3 mt-1 border border-white/10">
            <p className="text-white font-semibold text-sm leading-relaxed">
              &ldquo;{slide.keyPoint}&rdquo;
            </p>
          </div>
        )}
      </div>

      {/* ── Divider ── */}
      <div className="border-t border-white/10 mx-6" />

      {/* ── Controls ── */}
      <div className="px-6 py-4">
        {/* Row 1: play · dots · prev/next */}
        <div className="flex items-center gap-3">
          {/* Play / pause */}
          <button
            onClick={onPlayPause}
            disabled={!canPlay}
            className="w-9 h-9 rounded-full bg-white flex items-center justify-center hover:bg-white/90 transition-colors flex-shrink-0 disabled:opacity-40"
            aria-label={isPlaying ? "Pause" : speech.state === "paused" ? "Resume" : "Play"}
          >
            {isPlaying ? (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="#7F77DD">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="#7F77DD">
                <polygon points="5,3 19,12 5,21" />
              </svg>
            )}
          </button>

          {/* Progress dots */}
          <div className="flex items-center gap-1.5 flex-1 justify-center">
            {slides.map((_, i) => (
              <div
                key={i}
                className={`rounded-full transition-all duration-200 ${
                  i === slideIdx
                    ? "w-4 h-[5px] bg-white"
                    : "w-[5px] h-[5px] bg-white/25"
                }`}
              />
            ))}
          </div>

          {/* Prev / Next */}
          <div className="flex items-center gap-1">
            <button
              onClick={onPrev}
              disabled={slideIdx === 0}
              className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center disabled:opacity-25"
              aria-label="Previous slide"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <button
              onClick={onNext}
              disabled={slideIdx === slides.length - 1}
              className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center disabled:opacity-25"
              aria-label="Next slide"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        </div>

        {/* Row 2: speed + voice */}
        <div className="flex items-center gap-2.5 mt-3 flex-wrap">
          <span className="text-white/40 text-[10px] mr-0.5">Speed</span>
          {SPEEDS.map((r) => (
            <button
              key={r}
              onClick={() => speech.setRate(r)}
              className={`text-[10px] px-2.5 py-0.5 rounded-full transition-colors ${
                speech.rate === r
                  ? "bg-white/25 text-white font-semibold"
                  : "text-white/45 hover:text-white/75"
              }`}
            >
              {r}x
            </button>
          ))}

          {englishVoices.length > 1 && (
            <select
              value={speech.voice?.name ?? ""}
              onChange={(e) => {
                const v = speech.voices.find((v) => v.name === e.target.value);
                if (v) speech.setVoice(v);
              }}
              className="ml-auto text-[10px] bg-white/10 text-white/60 border-0 rounded-md px-2 py-0.5 outline-none cursor-pointer"
            >
              {englishVoices.map((v) => (
                <option key={v.name} value={v.name} className="text-gray-900 bg-white">
                  {v.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>
    </div>
  );
}
