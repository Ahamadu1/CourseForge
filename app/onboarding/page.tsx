"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────

type SkillLevel = "complete_beginner" | "some_knowledge" | "intermediate" | "advanced";
type LearningStyle = "read" | "audio_visual" | "both";
type DailyTime = "30min" | "1hr" | "2hr" | "4hr+";

interface KnowledgeQuestion {
  id: string;
  text: string;
  options: string[];
  correct_answer: string;
}

interface WizardState {
  niche: string;
  customNiche: string;
  level: SkillLevel | "";
  goal: string;
  dailyTime: DailyTime | "";
  style: LearningStyle | "";
  questions: KnowledgeQuestion[];
  answers: Record<string, string>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = "cf_onboarding";
const STEP_COUNT = 6;
const PROGRESS = [16, 33, 50, 66, 82, 100];

const NICHES = [
  { id: "dropshipping", label: "Dropshipping" },
  { id: "ai_automation", label: "AI & Automation" },
  { id: "content_creation", label: "Content Creation" },
  { id: "copywriting", label: "Copywriting" },
  { id: "investing", label: "Investing" },
  { id: "coding_saas", label: "Coding / SaaS" },
];

const LEVELS: { id: SkillLevel; label: string; description: string }[] = [
  { id: "complete_beginner", label: "Complete Beginner", description: "I'm new to this topic entirely" },
  { id: "some_knowledge", label: "Some Knowledge", description: "I know the basics but not much more" },
  { id: "intermediate", label: "Intermediate", description: "I have hands-on experience" },
  { id: "advanced", label: "Advanced", description: "I want to master the details" },
];

const STYLES: { id: LearningStyle; label: string; description: string }[] = [
  { id: "read", label: "Reading & Writing", description: "Text-based articles, guides, written exercises" },
  { id: "audio_visual", label: "Visual & Audio", description: "Videos, diagrams, and audio lessons" },
  { id: "both", label: "Mixed Format", description: "A blend of both approaches" },
];

const TIMES: { id: DailyTime; label: string }[] = [
  { id: "30min", label: "30 min" },
  { id: "1hr", label: "1 hr" },
  { id: "2hr", label: "2 hrs" },
  { id: "4hr+", label: "4+ hrs" },
];

const GEN_STEPS = [
  "Analyzing your learning profile…",
  "Designing your curriculum structure…",
  "Creating course modules…",
  "Setting up learning milestones…",
  "Building your weekly action plan…",
  "Finalizing your course…",
];

const INITIAL: WizardState = {
  niche: "",
  customNiche: "",
  level: "",
  goal: "",
  dailyTime: "",
  style: "",
  questions: [],
  answers: {},
};

// ─── Shared UI primitives ─────────────────────────────────────────────────────

function SelectCard({
  selected,
  onClick,
  children,
  className = "",
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left rounded-xl transition-all duration-150 ${className} ${
        selected
          ? "bg-[#EEEDFE] border-[#7F77DD]"
          : "bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50"
      }`}
      style={{ border: `${selected ? "1px" : "0.5px"} solid ${selected ? "#7F77DD" : "#E5E7EB"}` }}
    >
      {children}
    </button>
  );
}

// ─── Step 1 — Niche ───────────────────────────────────────────────────────────

function StepNiche({ state, update }: { state: WizardState; update: (p: Partial<WizardState>) => void }) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1.5">What do you want to master?</h1>
      <p className="text-sm text-gray-500 mb-7">Pick the niche you want your course built around.</p>

      <div className="grid grid-cols-2 gap-2.5 mb-3">
        {NICHES.map((n) => (
          <SelectCard
            key={n.id}
            selected={state.niche === n.id}
            onClick={() => update({ niche: n.id, customNiche: "" })}
            className="p-4"
          >
            <span className={`text-sm font-medium ${state.niche === n.id ? "text-[#3C3489]" : "text-gray-700"}`}>
              {n.label}
            </span>
          </SelectCard>
        ))}
      </div>

      <SelectCard
        selected={state.niche === "custom"}
        onClick={() => update({ niche: "custom" })}
        className="w-full p-4 mb-3"
      >
        <span className={`text-sm font-medium ${state.niche === "custom" ? "text-[#3C3489]" : "text-gray-500"}`}>
          Something else…
        </span>
      </SelectCard>

      {state.niche === "custom" && (
        <input
          type="text"
          autoFocus
          value={state.customNiche}
          onChange={(e) => update({ customNiche: e.target.value })}
          placeholder="e.g. Real estate, Fitness coaching, E-commerce…"
          className="w-full px-4 py-3 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#7F77DD]/25 transition-colors"
          style={{ border: "0.5px solid #E5E7EB" }}
        />
      )}
    </div>
  );
}

// ─── Step 2 — Skill level ─────────────────────────────────────────────────────

function StepLevel({ state, update }: { state: WizardState; update: (p: Partial<WizardState>) => void }) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1.5">What&apos;s your skill level?</h1>
      <p className="text-sm text-gray-500 mb-7">Be honest — we calibrate the course difficulty to fit you exactly.</p>

      <div className="space-y-2.5">
        {LEVELS.map((lvl) => (
          <SelectCard
            key={lvl.id}
            selected={state.level === lvl.id}
            onClick={() => update({ level: lvl.id })}
            className="w-full p-4"
          >
            <p className={`text-sm font-semibold ${state.level === lvl.id ? "text-[#3C3489]" : "text-gray-800"}`}>
              {lvl.label}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">{lvl.description}</p>
          </SelectCard>
        ))}
      </div>
    </div>
  );
}

// ─── Step 3 — Goal ───────────────────────────────────────────────────────────

function StepGoal({ state, update }: { state: WizardState; update: (p: Partial<WizardState>) => void }) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1.5">What&apos;s your main goal?</h1>
      <p className="text-sm text-gray-500 mb-7">The more specific, the better your course will be.</p>

      <textarea
        value={state.goal}
        onChange={(e) => update({ goal: e.target.value })}
        placeholder="e.g. I want to build a profitable dropshipping store generating $5k/month within 6 months…"
        rows={4}
        className="w-full px-4 py-3 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#7F77DD]/25 transition-colors resize-none mb-7"
        style={{ border: "0.5px solid #E5E7EB" }}
      />

      <p className="text-sm font-medium text-gray-700 mb-3">How much time can you commit daily?</p>
      <div className="grid grid-cols-4 gap-2">
        {TIMES.map((t) => (
          <SelectCard
            key={t.id}
            selected={state.dailyTime === t.id}
            onClick={() => update({ dailyTime: t.id })}
            className="py-3 text-center"
          >
            <span className={`text-sm font-medium ${state.dailyTime === t.id ? "text-[#3C3489]" : "text-gray-700"}`}>
              {t.label}
            </span>
          </SelectCard>
        ))}
      </div>
    </div>
  );
}

// ─── Step 4 — Learning style ──────────────────────────────────────────────────

function StepStyle({ state, update }: { state: WizardState; update: (p: Partial<WizardState>) => void }) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1.5">How do you learn best?</h1>
      <p className="text-sm text-gray-500 mb-7">We&apos;ll tailor the lesson format to match your preference.</p>

      <div className="space-y-2.5">
        {STYLES.map((s) => (
          <SelectCard
            key={s.id}
            selected={state.style === s.id}
            onClick={() => update({ style: s.id })}
            className="w-full p-4"
          >
            <p className={`text-sm font-semibold ${state.style === s.id ? "text-[#3C3489]" : "text-gray-800"}`}>
              {s.label}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">{s.description}</p>
          </SelectCard>
        ))}
      </div>
    </div>
  );
}

// ─── Step 5 — Knowledge check ─────────────────────────────────────────────────

function StepKnowledge({
  state,
  update,
  loading,
  onRetry,
}: {
  state: WizardState;
  update: (p: Partial<WizardState>) => void;
  loading: boolean;
  onRetry: () => void;
}) {
  function setAnswer(qid: string, answer: string) {
    update({ answers: { ...state.answers, [qid]: answer } });
  }

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1.5">Let&apos;s check your baseline</h1>
        <p className="text-sm text-gray-500 mb-10">Generating questions tailored to your niche…</p>
        <div className="flex justify-center py-10">
          <div className="w-8 h-8 rounded-full border-2 border-[#7F77DD]/25 border-t-[#7F77DD] animate-spin" />
        </div>
      </div>
    );
  }

  if (state.questions.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1.5">Let&apos;s check your baseline</h1>
        <p className="text-sm text-gray-500 mb-8">We couldn&apos;t generate questions right now.</p>
        <button
          onClick={onRetry}
          className="px-5 py-2.5 text-sm font-medium text-[#7F77DD] rounded-xl hover:bg-[#EEEDFE] transition-colors"
          style={{ border: "1px solid #7F77DD" }}
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1.5">Let&apos;s check your baseline</h1>
      <p className="text-sm text-gray-500 mb-7">3 quick questions — helps us calibrate your course perfectly.</p>

      <div className="space-y-5">
        {state.questions.map((q, idx) => (
          <div
            key={q.id}
            className="bg-white rounded-xl p-5"
            style={{ border: "0.5px solid #E5E7EB" }}
          >
            <p className="text-sm font-semibold text-gray-900 mb-4 leading-snug">
              <span className="text-[#7F77DD] mr-1.5">{idx + 1}.</span>
              {q.text}
            </p>
            <div className="space-y-2">
              {q.options.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setAnswer(q.id, opt)}
                  className={`w-full px-4 py-2.5 rounded-lg text-left text-sm transition-all ${
                    state.answers[q.id] === opt
                      ? "bg-[#EEEDFE] text-[#3C3489] font-medium"
                      : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                  }`}
                  style={{
                    border: `${state.answers[q.id] === opt ? "1px solid #7F77DD" : "0.5px solid #E5E7EB"}`,
                  }}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Step 6 — Loading / generation ───────────────────────────────────────────

function StepLoading({
  currentStep,
  error,
  onRetry,
}: {
  currentStep: number;
  error: string | null;
  onRetry: () => void;
}) {
  if (error) {
    return (
      <div className="text-center py-8">
        <div className="w-13 h-13 rounded-full bg-[#D85A30]/10 flex items-center justify-center mx-auto mb-4" style={{ width: 52, height: 52 }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#D85A30" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Generation failed</h2>
        <p className="text-sm text-gray-500 mb-6 max-w-xs mx-auto">{error}</p>
        <button
          onClick={onRetry}
          className="px-6 py-2.5 bg-[#7F77DD] hover:bg-[#3C3489] text-white text-sm font-semibold rounded-xl transition-colors"
        >
          Try again
        </button>
      </div>
    );
  }

  const done = currentStep >= GEN_STEPS.length - 1;

  return (
    <div>
      <div className="text-center mb-10">
        <div
          className="rounded-full bg-[#EEEDFE] flex items-center justify-center mx-auto mb-5"
          style={{ width: 56, height: 56 }}
        >
          {done ? (
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#7F77DD" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <div className="w-6 h-6 rounded-full border-2 border-[#7F77DD]/25 border-t-[#7F77DD] animate-spin" />
          )}
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {done ? "Your course is ready!" : "Building your course…"}
        </h1>
        <p className="text-sm text-gray-500">
          {done ? "Redirecting you to your dashboard…" : "This takes about 30 seconds. Hang tight!"}
        </p>
      </div>

      <div className="space-y-2.5">
        {GEN_STEPS.map((label, i) => {
          const visible = i <= currentStep;
          const isDone = i < currentStep || done;
          const isCurrent = i === currentStep && !done;

          return (
            <div
              key={i}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-500 ${
                visible ? "opacity-100" : "opacity-0"
              } ${isCurrent ? "bg-[#EEEDFE]" : isDone ? "bg-gray-50" : ""}`}
            >
              <div
                className="flex-shrink-0 rounded-full flex items-center justify-center transition-colors duration-300"
                style={{
                  width: 20,
                  height: 20,
                  backgroundColor: isDone ? "#1D9E75" : isCurrent ? "#7F77DD" : "#E5E7EB",
                }}
              >
                {isDone ? (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <polyline points="2,5 4,7.5 8,3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : isCurrent ? (
                  <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                ) : null}
              </div>
              <span
                className={`text-sm transition-colors duration-300 ${
                  isDone ? "text-gray-500" : isCurrent ? "text-[#3C3489] font-medium" : "text-gray-400"
                }`}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main wizard ──────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [state, setState] = useState<WizardState>(INITIAL);
  const [genStep, setGenStep] = useState(-1);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const loadingRef = useRef(false);

  // Restore persisted state on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const p = JSON.parse(saved) as Partial<WizardState>;
        setState((prev) => ({
          ...prev,
          niche: p.niche ?? "",
          customNiche: p.customNiche ?? "",
          level: p.level ?? "",
          goal: p.goal ?? "",
          dailyTime: p.dailyTime ?? "",
          style: p.style ?? "",
          answers: p.answers ?? {},
        }));
      }
    } catch {}
  }, []);

  // Persist state on every change (skip questions — regenerated on demand)
  useEffect(() => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { questions: _q, ...rest } = state;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rest));
    } catch {}
  }, [state]);

  function update(patch: Partial<WizardState>) {
    setState((prev) => ({ ...prev, ...patch }));
  }

  const effectiveNiche = state.niche === "custom" ? state.customNiche.trim() : state.niche;

  // Fetch knowledge-check questions when entering step 4
  useEffect(() => {
    if (step !== 4) return;
    if (state.questions.length > 0) return;
    loadQuestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  async function loadQuestions() {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setQuestionsLoading(true);
    try {
      const res = await fetch("/api/generate-knowledge-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ niche: effectiveNiche, level: state.level }),
      });
      const data = await res.json();
      if (data.questions) {
        update({ questions: data.questions });
      }
    } catch {
      // User can retry via button
    } finally {
      loadingRef.current = false;
      setQuestionsLoading(false);
    }
  }

  async function generateCourse() {
    setGenError(null);
    const startTime = Date.now();

    // Reveal steps progressively
    GEN_STEPS.forEach((_, i) => {
      setTimeout(() => setGenStep(i), i * 2800);
    });

    try {
      const answersText = state.questions
        .map((q, i) => `Q${i + 1}: ${q.text} → ${state.answers[q.id] ?? "skipped"}`)
        .join(" | ");

      const res = await fetch("/api/generate-course", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          niche: effectiveNiche,
          level: state.level,
          goal: state.goal,
          time: state.dailyTime,
          style: state.style,
          knowledgeCheck: answersText || "no answers provided",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setGenError(data.details ?? data.error ?? "Course generation failed. Please try again.");
        return;
      }

      // Ensure loading animation has enough time to complete
      const elapsed = Date.now() - startTime;
      const minDuration = GEN_STEPS.length * 2800 + 800;
      if (elapsed < minDuration) {
        await new Promise((r) => setTimeout(r, minDuration - elapsed));
      }

      setGenStep(GEN_STEPS.length - 1);
      localStorage.removeItem(STORAGE_KEY);
      router.push("/dashboard");
    } catch {
      setGenError("Something went wrong. Please check your connection and try again.");
    }
  }

  function canAdvance(): boolean {
    switch (step) {
      case 0:
        return state.niche === "custom"
          ? state.customNiche.trim().length > 2
          : state.niche !== "";
      case 1:
        return state.level !== "";
      case 2:
        return state.goal.trim().length > 10 && state.dailyTime !== "";
      case 3:
        return state.style !== "";
      case 4:
        return (
          state.questions.length > 0 &&
          state.questions.every((q) => Boolean(state.answers[q.id]))
        );
      default:
        return false;
    }
  }

  function advance() {
    if (step === 4) {
      setStep(5);
      generateCourse(); // fire & forget — loading screen shown immediately
      return;
    }
    setStep((s) => s + 1);
  }

  function back() {
    if (step === 4) {
      // Clear questions so they reload fresh if user changes niche/level
      update({ questions: [], answers: {} });
    }
    setStep((s) => Math.max(0, s - 1));
  }

  const progress = PROGRESS[step] ?? 100;

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* Progress bar */}
      <div className="fixed inset-x-0 top-0 h-1 bg-gray-100 z-50">
        <div
          className="h-full bg-[#7F77DD] transition-[width] duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="min-h-screen flex flex-col items-center px-4 pt-16 pb-28">
        <div className="w-full max-w-lg">
          {/* Step counter */}
          <p className="text-xs font-semibold text-[#7F77DD] tracking-[0.1em] uppercase text-center mb-8">
            Step {step + 1} / {STEP_COUNT}
          </p>

          {/* Steps */}
          {step === 0 && <StepNiche state={state} update={update} />}
          {step === 1 && <StepLevel state={state} update={update} />}
          {step === 2 && <StepGoal state={state} update={update} />}
          {step === 3 && <StepStyle state={state} update={update} />}
          {step === 4 && (
            <StepKnowledge
              state={state}
              update={update}
              loading={questionsLoading}
              onRetry={loadQuestions}
            />
          )}
          {step === 5 && (
            <StepLoading
              currentStep={genStep}
              error={genError}
              onRetry={() => {
                setGenStep(-1);
                generateCourse();
              }}
            />
          )}

          {/* Nav buttons — hidden on loading step */}
          {step < 5 && (
            <div className="flex gap-3 mt-8">
              {step > 0 && (
                <button
                  type="button"
                  onClick={back}
                  className="px-5 py-2.5 text-sm font-medium text-gray-600 rounded-xl hover:bg-gray-100 transition-colors"
                  style={{ border: "0.5px solid #E5E7EB" }}
                >
                  Back
                </button>
              )}
              <button
                type="button"
                onClick={advance}
                disabled={!canAdvance()}
                className={`flex-1 py-2.5 text-sm font-semibold text-white rounded-xl transition-colors ${
                  canAdvance()
                    ? "bg-[#7F77DD] hover:bg-[#3C3489]"
                    : "bg-[#7F77DD]/40 cursor-not-allowed"
                }`}
              >
                {step === 4 ? "Generate My Course →" : "Continue →"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
