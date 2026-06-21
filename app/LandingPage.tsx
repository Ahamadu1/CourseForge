"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";

interface Props {
  isLoggedIn: boolean;
}

// ── Intersection Observer hook ────────────────────────────────────────────────
function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll(".reveal");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("visible");
            observer.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}

// ── Icons (inline SVG, zero-dep) ──────────────────────────────────────────────
function IconBrain() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.5 2a4.5 4.5 0 0 1 4.5 4.5v0A4.5 4.5 0 0 1 9.5 11H9" />
      <path d="M4.5 6.5A4.5 4.5 0 0 0 9 11v0a4.5 4.5 0 0 0-4.5 4.5" />
      <path d="M14.5 2a4.5 4.5 0 0 0-4.5 4.5" />
      <path d="M19.5 6.5A4.5 4.5 0 0 1 15 11v0a4.5 4.5 0 0 1 4.5 4.5" />
      <path d="M9 11v2" />
      <path d="M15 11v2" />
      <path d="M4.5 15.5A4.5 4.5 0 0 0 9 20v0a4.5 4.5 0 0 0 4.5-4.5" />
      <path d="M19.5 15.5A4.5 4.5 0 0 1 15 20v0a4.5 4.5 0 0 1-4.5-4.5" />
    </svg>
  );
}
function IconMic() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0" />
      <line x1="12" y1="19" x2="12" y2="22" />
      <line x1="8" y1="22" x2="16" y2="22" />
    </svg>
  );
}
function IconZap() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}
function IconMessageSquare() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
function IconFileText() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}
function IconCheck() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
function IconArrowRight() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

// ── CTA helpers ───────────────────────────────────────────────────────────────
function PrimaryBtn({ isLoggedIn, large }: { isLoggedIn: boolean; large?: boolean }) {
  const href = isLoggedIn ? "/dashboard" : "/signup";
  const label = isLoggedIn ? "Go to dashboard →" : "Start learning free →";
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 rounded-full bg-brand-primary text-white font-semibold hover:bg-brand-dark transition-colors ${large ? "px-8 py-4 text-lg" : "px-6 py-3 text-base"}`}
    >
      {label}
    </Link>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function LandingPage({ isLoggedIn }: Props) {
  useReveal();
  const howRef = useRef<HTMLElement>(null);

  function scrollToHow(e: React.MouseEvent) {
    e.preventDefault();
    howRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <div className="min-h-screen font-sans">
      {/* ── Nav ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-[#0d0d1a]/80 backdrop-blur-md border-b border-white/[0.06]">
        <Link href="/" className="text-white font-bold text-xl tracking-tight">
          <span className="text-brand-primary">Course</span>Forge
        </Link>
        <div className="flex items-center gap-4">
          {isLoggedIn ? (
            <Link href="/dashboard" className="text-white/80 hover:text-white text-sm font-medium transition-colors">
              Dashboard →
            </Link>
          ) : (
            <>
              <Link href="/login" className="text-white/70 hover:text-white text-sm font-medium transition-colors">
                Sign in
              </Link>
              <Link href="/signup" className="px-4 py-2 rounded-full bg-brand-primary text-white text-sm font-semibold hover:bg-brand-dark transition-colors">
                Get started free
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-4 bg-[#0d0d1a] overflow-hidden pt-20">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-brand-primary/10 blur-[120px]" />
        </div>

        <div className="relative max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-primary/15 border border-brand-primary/30 text-brand-primary text-sm font-medium mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-primary animate-pulse" />
            Powered by Claude AI
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold text-white leading-[1.08] tracking-tight mb-6">
            Master any niche.
            <br />
            <span className="text-brand-primary">At your exact level.</span>
          </h1>

          <p className="text-lg sm:text-xl text-white/60 max-w-xl mx-auto mb-10 leading-relaxed">
            CourseForge turns any topic into a personalized course — complete with audio, quizzes, an AI tutor, and a study guide you can take anywhere.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <PrimaryBtn isLoggedIn={isLoggedIn} large />
            {!isLoggedIn && (
              <button
                onClick={scrollToHow}
                className="inline-flex items-center gap-2 text-white/60 hover:text-white text-base font-medium transition-colors"
              >
                See how it works <IconArrowRight />
              </button>
            )}
          </div>

          <p className="mt-8 text-white/30 text-sm">
            No credit card required · Cancel any time
          </p>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section ref={howRef} id="how" className="py-24 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16 reveal">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">From idea to lesson in minutes</h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">CourseForge does the heavy lifting so you spend time learning, not planning.</p>
          </div>

          <div className="grid sm:grid-cols-3 gap-8">
            {[
              {
                n: "01",
                title: "Tell us what you want to learn",
                body: "Pick a topic, set your experience level, and share your goal. 60 seconds.",
              },
              {
                n: "02",
                title: "We build a course just for you",
                body: "AI generates a structured curriculum: modules, lessons, quizzes, and audio narration — all personalized.",
              },
              {
                n: "03",
                title: "Learn, ask, export, repeat",
                body: "Work through lessons at your pace, ask the AI tutor anything, and export a PDF to study offline.",
              },
            ].map((step, i) => (
              <div key={step.n} className={`reveal reveal-delay-${i + 1}`}>
                <div className="text-5xl font-black text-brand-primary/20 mb-4">{step.n}</div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-24 px-4 bg-[#0d0d1a]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16 reveal">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Everything you need to learn faster</h2>
            <p className="text-white/50 text-lg max-w-xl mx-auto">Five AI-powered features, one focused platform.</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: <IconBrain />,
                title: "Adaptive Learning Engine",
                body: "Tracks your quiz performance and adjusts lesson difficulty and pacing in real time. Spaced-repetition built in.",
              },
              {
                icon: <IconMic />,
                title: "AI Audio Narration",
                body: "Every lesson ships with natural-sounding audio. Read or listen — your choice, any device.",
              },
              {
                icon: <IconZap />,
                title: "Smart Quizzes",
                body: "Claude generates context-aware questions. Wrong answers unlock targeted review, not just a score.",
              },
              {
                icon: <IconMessageSquare />,
                title: "AI Tutor Chat",
                body: "Stuck on a concept? Your personal tutor knows exactly where you are in the course and what you've struggled with.",
              },
              {
                icon: <IconFileText />,
                title: "PDF Export",
                body: "Generate a polished study guide with cover, table of contents, lessons, and answer key — ready to print or share.",
              },
              {
                icon: (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                ),
                title: "Learn on Your Schedule",
                body: "Streak tracking, daily goals, and a progress dashboard keep you moving without pressure.",
              },
            ].map((f, i) => (
              <div
                key={f.title}
                className={`reveal reveal-delay-${(i % 3) + 1} rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 hover:border-brand-primary/40 hover:bg-brand-primary/5 transition-colors`}
              >
                <div className="text-brand-primary mb-4">{f.icon}</div>
                <h3 className="text-white font-semibold text-base mb-2">{f.title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Social Proof ── */}
      <section className="py-24 px-4 bg-brand-tint">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14 reveal">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Built for people who…</h2>
          </div>

          <div className="grid sm:grid-cols-3 gap-6">
            {[
              {
                emoji: "🔥",
                title: "Are switching careers",
                body: "Learn the skills hiring managers actually care about — at the depth you need, not a generic overview.",
              },
              {
                emoji: "📚",
                title: "Want to go deep, not wide",
                body: "Stop skimming YouTube playlists. Get a structured path through any niche with real checkpoints.",
              },
              {
                emoji: "⚡",
                title: "Have limited time",
                body: "5-minute lessons, audio for the commute, quizzes that adapt. Every minute counts.",
              },
            ].map((c, i) => (
              <div key={c.title} className={`reveal reveal-delay-${i + 1} bg-white rounded-2xl p-6 shadow-sm`}>
                <div className="text-3xl mb-4">{c.emoji}</div>
                <h3 className="font-bold text-gray-900 mb-2">{c.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing (hidden for logged-in users) ── */}
      {!isLoggedIn && (
        <section id="pricing" className="py-24 px-4 bg-white">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-14 reveal">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Simple, honest pricing</h2>
              <p className="text-gray-500 text-lg">Start free. Upgrade when you are ready.</p>
            </div>

            <div className="grid sm:grid-cols-2 gap-8 max-w-2xl mx-auto">
              {/* Free */}
              <div className="reveal reveal-delay-1 rounded-2xl border-2 border-gray-200 p-8">
                <div className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Free</div>
                <div className="text-5xl font-black text-gray-900 mb-1">$0</div>
                <p className="text-gray-400 text-sm mb-8">forever</p>
                <ul className="space-y-3 mb-8">
                  {[
                    "1 active course",
                    "AI-generated lessons & quizzes",
                    "Audio narration",
                    "AI tutor (50 msgs/day)",
                    "Progress tracking",
                  ].map((f) => (
                    <li key={f} className="flex items-center gap-2 text-gray-700 text-sm">
                      <span className="text-brand-primary flex-shrink-0"><IconCheck /></span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/signup" className="block text-center py-3 rounded-xl border-2 border-brand-primary text-brand-primary font-semibold hover:bg-brand-tint transition-colors text-sm">
                  Get started free
                </Link>
              </div>

              {/* PRO */}
              <div className="reveal reveal-delay-2 rounded-2xl border-2 border-brand-primary bg-brand-primary p-8 relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-brand-dark rounded-full text-white text-xs font-bold uppercase tracking-wide">
                  Most popular
                </div>
                <div className="text-sm font-semibold text-white/70 uppercase tracking-wide mb-4">PRO</div>
                <div className="flex items-end gap-2 mb-1">
                  <div className="text-5xl font-black text-white">$29</div>
                  <div className="text-white/70 pb-2">/month</div>
                </div>
                <p className="text-white/50 text-sm mb-8">or $199/year (save 43%)</p>
                <ul className="space-y-3 mb-8">
                  {[
                    "Everything in Free",
                    "Unlimited courses",
                    "PDF export with answer key",
                    "Adaptive difficulty engine",
                    "Priority AI responses",
                    "Early access to new features",
                  ].map((f) => (
                    <li key={f} className="flex items-center gap-2 text-white text-sm">
                      <span className="text-white/80 flex-shrink-0"><IconCheck /></span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/signup" className="block text-center py-3 rounded-xl bg-white text-brand-primary font-semibold hover:bg-brand-tint transition-colors text-sm">
                  Start free, then upgrade
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Final CTA ── */}
      <section className="py-24 px-4 bg-[#0d0d1a] text-center">
        <div className="max-w-2xl mx-auto reveal">
          <h2 className="text-4xl sm:text-5xl font-extrabold text-white mb-6 leading-tight">
            Your next skill is<br />
            <span className="text-brand-primary">one course away.</span>
          </h2>
          <p className="text-white/50 text-lg mb-10">
            {isLoggedIn
              ? "Head to your dashboard and keep building."
              : "Join learners who build personalized courses in under 5 minutes."}
          </p>
          <PrimaryBtn isLoggedIn={isLoggedIn} large />
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-10 px-6 bg-[#080810] border-t border-white/[0.06]">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-white/40 font-bold text-lg">
            <span className="text-brand-primary">Course</span>Forge
          </span>
          <div className="flex items-center gap-6 text-white/30 text-sm">
            <Link href="/terms" className="hover:text-white/60 transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-white/60 transition-colors">Privacy</Link>
          </div>
          <p className="text-white/20 text-xs">Built with <span className="text-white/40">Anthropic Claude</span></p>
        </div>
      </footer>
    </div>
  );
}
