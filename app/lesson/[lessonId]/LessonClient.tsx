"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { formatDuration } from "@/lib/utils";
import { useSpeech } from "@/hooks/useSpeech";
import { prepareBlocks } from "@/lib/tts/prepareText";
import { SlidePlayer } from "@/components/lesson/SlidePlayer";
import type { Slide } from "@/lib/anthropic/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  lessonId: string;
  lessonTitle: string;
  initialContent: string | null;
  initialSlides: Slide[] | null;
  contentType: string;
  durationMinutes: number | null;
  position: number;
  moduleTitle: string;
  modulePosition: number;
  totalModules: number;
  courseId: string;
  courseTitle: string;
  nextLessonId: string | null;
  nextLessonTitle: string | null;
}

type ViewMode = "slides" | "reading";

// ─── Markdown component map (stable reference) ───────────────────────────────

const markdownComponents = {
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h1 className="text-2xl font-bold text-gray-900 mt-8 mb-4 leading-snug">{children}</h1>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3 leading-snug">{children}</h2>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="text-base font-semibold text-gray-800 mt-6 mb-2">{children}</h3>
  ),
  h4: ({ children }: { children?: React.ReactNode }) => (
    <h4 className="text-sm font-semibold text-[#7F77DD] uppercase tracking-wide mt-5 mb-2">{children}</h4>
  ),
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="text-gray-700 leading-[1.85] mb-4 text-[15px]">{children}</p>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-semibold text-gray-900">{children}</strong>
  ),
  em: ({ children }: { children?: React.ReactNode }) => (
    <em className="italic text-gray-600">{children}</em>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="space-y-2 mb-5 ml-1">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="space-y-2 mb-5 ml-4 list-decimal">{children}</ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="flex gap-2.5 text-gray-700 leading-relaxed text-[15px]">
      <span className="text-[#7F77DD] mt-[3px] flex-shrink-0">•</span>
      <span>{children}</span>
    </li>
  ),
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote className="border-l-4 border-[#7F77DD] bg-[#EEEDFE] pl-5 pr-4 py-3 rounded-r-xl mb-5 text-[#3C3489] leading-relaxed text-[15px]">
      {children}
    </blockquote>
  ),
  code: ({ className, children }: { className?: string; children?: React.ReactNode }) => {
    const isBlock = Boolean(className);
    return isBlock ? (
      <pre className="bg-gray-950 text-emerald-400 rounded-xl p-5 mb-5 overflow-x-auto text-sm font-mono leading-relaxed">
        <code>{children}</code>
      </pre>
    ) : (
      <code className="bg-[#EEEDFE] text-[#3C3489] px-1.5 py-0.5 rounded-md text-[13px] font-mono">
        {children}
      </code>
    );
  },
  hr: () => <hr className="border-gray-100 my-8" />,
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
    <a href={href} className="text-[#7F77DD] hover:text-[#3C3489] underline underline-offset-2 transition-colors">
      {children}
    </a>
  ),
};

// ─── Waveform bars ────────────────────────────────────────────────────────────

const DELAYS = ["0ms", "120ms", "240ms", "100ms", "200ms", "60ms", "180ms"];

function WaveformBars({ playing }: { playing: boolean }) {
  return (
    <div className="flex items-center gap-[3px]" style={{ height: 24 }}>
      {DELAYS.map((delay, i) => (
        <div
          key={i}
          className="w-[3px] rounded-full bg-white/70"
          style={{
            height: 20,
            transformOrigin: "center",
            animation: playing
              ? `wave-bar ${0.8 + (i % 3) * 0.15}s ease-in-out infinite`
              : "none",
            animationDelay: playing ? delay : "0ms",
            transform: playing ? undefined : "scaleY(0.25)",
          }}
        />
      ))}
    </div>
  );
}

// ─── Lesson body with per-block read-along highlighting ───────────────────────

function LessonBody({ blocks, activeBlock }: { blocks: string[]; activeBlock: number }) {
  return (
    <div className="lesson-body">
      {blocks.map((block, i) => (
        <div
          key={i}
          data-tts-block={i}
          className={`rounded-lg transition-colors duration-300 ${
            activeBlock === i ? "bg-[#EEEDFE]/60 -mx-3 px-3 py-0.5" : ""
          }`}
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {block}
          </ReactMarkdown>
        </div>
      ))}
    </div>
  );
}

// ─── Generation skeleton ──────────────────────────────────────────────────────

function GenerationSkeleton() {
  const STEPS = [
    "Writing your lesson content…",
    "Adding examples and exercises…",
    "Generating knowledge check quiz…",
    "Finishing up…",
  ];
  const [stepIdx, setStepIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setStepIdx((i) => Math.min(i + 1, STEPS.length - 1)), 8000);
    return () => clearInterval(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="py-16 text-center">
      <div className="w-12 h-12 rounded-full bg-[#EEEDFE] flex items-center justify-center mx-auto mb-5">
        <div className="w-5 h-5 rounded-full border-2 border-[#7F77DD]/30 border-t-[#7F77DD] animate-spin" />
      </div>
      <p className="text-sm font-medium text-[#3C3489] mb-1">{STEPS[stepIdx]}</p>
      <p className="text-xs text-gray-400">This takes about 20–30 seconds</p>
    </div>
  );
}

// ─── Auto-advance helper ──────────────────────────────────────────────────────

function blockToSlide(blockIdx: number, totalBlocks: number, totalSlides: number): number {
  if (totalSlides === 0 || totalBlocks === 0 || blockIdx < 0) return 0;
  return Math.min(Math.floor((blockIdx / totalBlocks) * totalSlides), totalSlides - 1);
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SPEEDS = [0.75, 1, 1.25, 1.5] as const;

// ─── Main component ───────────────────────────────────────────────────────────

export function LessonClient({
  lessonId,
  lessonTitle,
  initialContent,
  initialSlides,
  durationMinutes: initialDuration,
  moduleTitle,
  modulePosition,
  totalModules,
  courseId,
  nextLessonId,
}: Props) {
  const [content, setContent] = useState<string | null>(initialContent);
  const [duration, setDuration] = useState<number | null>(initialDuration);
  const [generating, setGenerating] = useState(!initialContent);
  const [genError, setGenError] = useState<string | null>(null);
  const [quizVisible, setQuizVisible] = useState(false);

  const [slides, setSlides] = useState<Slide[] | null>(initialSlides);
  const [generatingSlides, setGeneratingSlides] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>(
    initialSlides && initialSlides.length > 0 ? "slides" : "reading"
  );
  const [slideIdx, setSlideIdx] = useState(0);
  const manualOverrideRef = useRef(false);

  const scrolledRef = useRef(false);
  const progressCalledRef = useRef(false);

  const router = useRouter();
  const speech = useSpeech();

  const blocks = useMemo(
    () => (content ? content.split(/\n\n+/).filter((b) => b.trim()) : []),
    [content]
  );
  const ttsParagraphs = useMemo(() => prepareBlocks(blocks), [blocks]);

  // ── Generate lesson content if stub ────────────────────────────────────
  useEffect(() => {
    if (content) return;

    fetch(`/api/generate-lesson/${lessonId}`, { method: "POST" })
      .then((r) => r.json())
      .then((data) => {
        if (data.lesson?.content) {
          setContent(data.lesson.content);
          if (data.lesson.duration_minutes) setDuration(data.lesson.duration_minutes);
          // Use slides from the fresh generation if available
          if (Array.isArray(data.lesson.slides) && data.lesson.slides.length > 0) {
            setSlides(data.lesson.slides as Slide[]);
            setViewMode("slides");
          }
        } else {
          setGenError(data.details ?? data.error ?? "Generation failed");
        }
      })
      .catch(() => setGenError("Network error — please refresh"))
      .finally(() => setGenerating(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Mark lesson as started ──────────────────────────────────────────────
  useEffect(() => {
    if (progressCalledRef.current) return;
    progressCalledRef.current = true;
    fetch(`/api/lesson-progress/${lessonId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: false }),
    }).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Scroll tracking — reveal quiz CTA at 80% (reading mode) ────────────
  useEffect(() => {
    if (!content || viewMode === "slides") return;

    const handleScroll = () => {
      if (scrolledRef.current) return;
      const scrolled = window.scrollY + window.innerHeight;
      const total = document.documentElement.scrollHeight;
      if (total > 0 && scrolled / total > 0.8) {
        scrolledRef.current = true;
        setQuizVisible(true);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [content, viewMode]);

  // ── Stop speech on unmount ──────────────────────────────────────────────
  useEffect(() => {
    return () => { window.speechSynthesis?.cancel(); };
  }, []);

  // ── Auto-scroll to active read-along block (reading mode only) ─────────
  useEffect(() => {
    if (viewMode !== "reading" || speech.currentIndex < 0) return;
    const el = document.querySelector(`[data-tts-block="${speech.currentIndex}"]`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [speech.currentIndex, viewMode]);

  // ── Auto-advance slides while playing ──────────────────────────────────
  useEffect(() => {
    if (!slides || slides.length === 0) return;
    if (viewMode !== "slides") return;
    if (speech.currentIndex < 0) return;
    if (manualOverrideRef.current) return;
    const target = blockToSlide(speech.currentIndex, blocks.length, slides.length);
    setSlideIdx(target);
  }, [speech.currentIndex, viewMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers ───────────────────────────────────────────────────────────
  const handlePlayPause = () => {
    if (!content) return;
    if (speech.state === "idle") {
      manualOverrideRef.current = false;
      setSlideIdx(0);
      speech.play(ttsParagraphs);
    } else if (speech.state === "playing") {
      speech.pause();
    } else {
      manualOverrideRef.current = false;
      speech.resume();
    }
  };

  const handlePrev = () => {
    manualOverrideRef.current = true;
    setSlideIdx((i) => Math.max(0, i - 1));
  };

  const handleNext = () => {
    if (!slides) return;
    manualOverrideRef.current = true;
    setSlideIdx((i) => Math.min(slides.length - 1, i + 1));
  };

  const handleGenerateSlides = async () => {
    setGeneratingSlides(true);
    try {
      const res = await fetch(`/api/generate-slides/${lessonId}`, { method: "POST" });
      const data = await res.json();
      if (data.slides && Array.isArray(data.slides)) {
        setSlides(data.slides as Slide[]);
        setSlideIdx(0);
        setViewMode("slides");
      }
    } catch {
      // Silent fail — user can retry
    } finally {
      setGeneratingSlides(false);
    }
  };

  const durationLabel = duration ? formatDuration(duration) : "~20 min";
  const moduleNum = modulePosition + 1;
  const englishVoices = speech.voices.filter((v) => v.lang.startsWith("en"));
  const hasSlides = slides && slides.length > 0;

  // Quiz CTA always visible in slides mode; scroll-gated in reading mode
  const showQuizCta = !!content && (viewMode === "slides" || quizVisible);

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* ── Nav bar ── */}
      <nav className="sticky top-0 bg-white/90 backdrop-blur border-b border-gray-100 z-50 h-14 flex items-center px-4">
        <div className="max-w-2xl mx-auto w-full flex items-center gap-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Dashboard
          </Link>
          <span className="text-gray-300">/</span>
          <span className="text-xs text-gray-400 truncate">
            Module {moduleNum} of {totalModules} · {moduleTitle}
          </span>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 pt-8 pb-24">
        {/* ── Lesson title ── */}
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 leading-snug">
          {lessonTitle}
        </h1>

        {/* ── View toggle (only when slides exist) ── */}
        {hasSlides && speech.supported && (
          <div className="flex items-center gap-1 bg-white rounded-lg p-1 self-start mb-4 w-fit" style={{ border: "0.5px solid #E5E7EB" }}>
            <button
              onClick={() => setViewMode("slides")}
              className={`text-xs px-3.5 py-1.5 rounded-md font-medium transition-all ${
                viewMode === "slides"
                  ? "bg-[#7F77DD] text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Slides
            </button>
            <button
              onClick={() => setViewMode("reading")}
              className={`text-xs px-3.5 py-1.5 rounded-md font-medium transition-all ${
                viewMode === "reading"
                  ? "bg-[#7F77DD] text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Reading
            </button>
          </div>
        )}

        {/* ── Player area ── */}
        {hasSlides && viewMode === "slides" && speech.supported ? (
          <SlidePlayer
            slides={slides}
            slideIdx={slideIdx}
            onPrev={handlePrev}
            onNext={handleNext}
            speech={speech}
            onPlayPause={handlePlayPause}
            canPlay={!!content}
            lessonTitle={lessonTitle}
            durationLabel={durationLabel}
          />
        ) : (
          /* Classic waveform player */
          <div
            className="rounded-2xl overflow-hidden mb-8 select-none"
            style={{ background: "linear-gradient(135deg, #3C3489 0%, #7F77DD 100%)" }}
          >
            <div className="px-6 py-6">
              {/* Avatar + title */}
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-xl">
                  🤖
                </div>
                <div>
                  <p className="text-white font-semibold text-sm leading-tight">{lessonTitle}</p>
                  <p className="text-white/60 text-xs mt-0.5">AI Instructor · {durationLabel}</p>
                </div>
              </div>

              {speech.supported ? (
                <>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={handlePlayPause}
                      disabled={!content}
                      className="w-11 h-11 rounded-full bg-white flex items-center justify-center hover:bg-white/90 transition-colors flex-shrink-0 disabled:opacity-40"
                      aria-label={
                        speech.state === "playing" ? "Pause"
                          : speech.state === "paused" ? "Resume"
                          : "Play lesson"
                      }
                    >
                      {speech.state === "playing" ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="#7F77DD">
                          <rect x="6" y="4" width="4" height="16" rx="1" />
                          <rect x="14" y="4" width="4" height="16" rx="1" />
                        </svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="#7F77DD">
                          <polygon points="5,3 19,12 5,21" />
                        </svg>
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <WaveformBars playing={speech.state === "playing"} />
                      <p className="text-white/40 text-[10px] mt-1.5 truncate">
                        {speech.state === "playing"
                          ? "Playing — click to pause"
                          : speech.state === "paused"
                          ? "Paused — click to resume"
                          : "Press play to hear this lesson"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mt-4 flex-wrap">
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
                </>
              ) : (
                <p className="text-white/50 text-xs">
                  Audio narration isn&apos;t supported in this browser. Try Chrome or Safari.
                </p>
              )}

              {/* Generate slides button — shown when lesson is ready but has no slides */}
              {content && !hasSlides && !generatingSlides && (
                <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
                  <p className="text-white/40 text-[10px]">No visual slides yet</p>
                  <button
                    onClick={handleGenerateSlides}
                    className="text-[10px] font-semibold text-white/70 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Generate slides ✦
                  </button>
                </div>
              )}
              {generatingSlides && (
                <div className="mt-4 pt-3 border-t border-white/10 flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full border border-white/30 border-t-white animate-spin flex-shrink-0" />
                  <p className="text-white/50 text-[10px]">Generating slides…</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Lesson body (reading mode only) ── */}
        {generating && !genError && <GenerationSkeleton />}

        {genError && (
          <div className="bg-[#D85A30]/8 border border-[#D85A30]/20 rounded-xl p-5 mb-6 text-center">
            <p className="text-sm text-[#D85A30] font-medium mb-3">Failed to generate lesson content</p>
            <p className="text-xs text-gray-500 mb-4">{genError}</p>
            <button
              onClick={() => window.location.reload()}
              className="text-xs font-semibold text-[#7F77DD] hover:text-[#3C3489] transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {blocks.length > 0 && viewMode === "reading" && (
          <LessonBody blocks={blocks} activeBlock={speech.currentIndex} />
        )}

        {/* ── Quiz CTA ── */}
        {showQuizCta && (
          <div
            className={`mt-10 transition-all duration-500 ${
              viewMode === "slides"
                ? "opacity-100 translate-y-0"
                : quizVisible
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-4 pointer-events-none"
            }`}
          >
            <div
              className="bg-white rounded-2xl p-6 text-center"
              style={{ border: "0.5px solid #E5E7EB" }}
            >
              <div className="w-12 h-12 rounded-full bg-[#EEEDFE] flex items-center justify-center mx-auto mb-4">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#7F77DD" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-gray-900 mb-1.5">
                Ready to test your knowledge?
              </h3>
              <p className="text-sm text-gray-500 mb-5">
                5 questions · Takes about 3 minutes
              </p>
              <button
                onClick={() => {
                  try { speech.stop(); } catch {}
                  router.push(`/lesson/${lessonId}/quiz`);
                }}
                className="inline-flex items-center gap-2 px-7 py-3 bg-[#7F77DD] hover:bg-[#3C3489] text-white text-sm font-semibold rounded-xl transition-colors"
              >
                Take Knowledge Check
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
              {nextLessonId && (
                <p className="text-xs text-gray-400 mt-4">
                  Pass with 60%+ to unlock the next lesson
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
