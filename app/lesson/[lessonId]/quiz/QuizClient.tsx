"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

interface QuizQuestion {
  id: string;
  text: string;
  options: string[];
  correct_answer: string;
  explanation: string;
  points: number;
}

interface Props {
  lessonId: string;
  lessonTitle: string;
  courseTitle: string;
  courseId: string;
  quizId: string;
  questions: QuizQuestion[];
  passingScore: number;
  nextLessonId: string | null;
  nextLessonTitle: string | null;
}

type Phase = "quiz" | "submitting" | "results";

// ─── Score helpers ────────────────────────────────────────────────────────────

function scoreEmoji(score: number) {
  if (score >= 80) return "🎉";
  if (score >= 60) return "✅";
  return "📚";
}

function scoreLabel(score: number, passing: number) {
  if (score >= 80) return "Excellent work!";
  if (score >= passing) return "You passed!";
  return "Keep studying";
}

// ─── Progress dots ────────────────────────────────────────────────────────────

function ProgressDots({
  total,
  current,
  answered,
}: {
  total: number;
  current: number;
  answered: Set<number>;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`rounded-full transition-all duration-300 ${
            i === current
              ? "w-4 h-2 bg-[#7F77DD]"
              : answered.has(i)
              ? "w-2 h-2 bg-[#7F77DD]/40"
              : "w-2 h-2 bg-gray-200"
          }`}
        />
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type RemedialState = "none" | "loading" | "ready";

export function QuizClient({
  lessonId,
  lessonTitle,
  courseTitle,
  courseId,
  quizId,
  questions,
  passingScore,
  nextLessonId,
}: Props) {

  const [phase, setPhase] = useState<Phase>("quiz");
  const [questionIdx, setQuestionIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [answeredSet, setAnsweredSet] = useState<Set<number>>(new Set());

  // Results state
  const [score, setScore] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [passed, setPassed] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Adaptive / remedial state
  const [remedialState, setRemedialState] = useState<RemedialState>("none");
  const [remedialLessonId, setRemedialLessonId] = useState<string | null>(null);
  const [weakTopic, setWeakTopic] = useState<string | null>(null);

  const startTimeRef = useRef(Date.now());
  const autoAdvanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentQuestion = questions[questionIdx];
  const totalQuestions = questions.length;
  const isLast = questionIdx === totalQuestions - 1;

  // ── Clear auto-advance timer on unmount ─────────────────────────────────
  useEffect(() => {
    return () => {
      if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
    };
  }, []);

  // ── Handle answer selection ──────────────────────────────────────────────
  function selectAnswer(option: string) {
    if (showFeedback) return;

    setSelectedAnswer(option);
    setShowFeedback(true);
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: option }));
    setAnsweredSet((prev) => new Set(prev).add(questionIdx));

    // Auto-advance after 2.5s
    autoAdvanceRef.current = setTimeout(() => advance(option), 2500);
  }

  // ── Advance to next question or submit ───────────────────────────────────
  function advance(overrideAnswer?: string) {
    if (autoAdvanceRef.current) {
      clearTimeout(autoAdvanceRef.current);
      autoAdvanceRef.current = null;
    }

    const currentAnswers = overrideAnswer
      ? { ...answers, [currentQuestion.id]: overrideAnswer }
      : answers;

    if (isLast) {
      submitQuiz(currentAnswers);
    } else {
      setQuestionIdx((i) => i + 1);
      setSelectedAnswer(null);
      setShowFeedback(false);
    }
  }

  // ── Submit to server ─────────────────────────────────────────────────────
  async function submitQuiz(finalAnswers: Record<string, string>) {
    setPhase("submitting");
    const timeTaken = Math.round((Date.now() - startTimeRef.current) / 1000);

    try {
      const res = await fetch("/api/quiz-submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quizId,
          lessonId,
          courseId,
          answers: finalAnswers,
          timeTaken,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setSubmitError(data.error ?? "Failed to submit quiz");
        setPhase("results");
        return;
      }

      const finalScore = data.score ?? 0;
      const finalPassed = data.passed ?? false;
      setScore(finalScore);
      setCorrect(data.correct ?? 0);
      setPassed(finalPassed);

      // Kick off adaptive remedial fetch in the background when quiz is failed
      const firstTopic: string | null = data.weakTopics?.[0] ?? null;
      if (!finalPassed && finalScore < passingScore && firstTopic) {
        setWeakTopic(firstTopic);
        setRemedialState("loading");
        fetch("/api/adaptive/remedial", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lessonId, topic: firstTopic, lessonTitle, courseTitle }),
        })
          .then((r) => r.json())
          .then((d) => {
            if (d.remedialLessonId) {
              setRemedialLessonId(d.remedialLessonId);
              setRemedialState("ready");
            } else {
              setRemedialState("none");
            }
          })
          .catch(() => setRemedialState("none"));
      }

      setPhase("results");
    } catch {
      setSubmitError("Network error — please try again");
      setPhase("results");
    }
  }

  // ── Retake ───────────────────────────────────────────────────────────────
  function retake() {
    setPhase("quiz");
    setQuestionIdx(0);
    setSelectedAnswer(null);
    setShowFeedback(false);
    setAnswers({});
    setAnsweredSet(new Set());
    setSubmitError(null);
    startTimeRef.current = Date.now();
  }

  // ─── Results screen ───────────────────────────────────────────────────────

  if (phase === "results") {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex flex-col">
        <nav className="sticky top-0 bg-white/90 backdrop-blur border-b border-gray-100 z-50 h-14 flex items-center px-4">
          <div className="max-w-2xl mx-auto w-full flex items-center gap-4">
            <Link
              href={`/lesson/${lessonId}`}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              Back to lesson
            </Link>
          </div>
        </nav>

        <div className="max-w-2xl mx-auto px-4 pt-16 pb-24 w-full">
          {submitError ? (
            <div className="bg-[#D85A30]/8 border border-[#D85A30]/20 rounded-2xl p-8 text-center">
              <p className="text-sm font-medium text-[#D85A30] mb-2">Could not save your results</p>
              <p className="text-xs text-gray-500 mb-6">{submitError}</p>
              <button
                onClick={retake}
                className="px-6 py-2.5 bg-[#7F77DD] hover:bg-[#3C3489] text-white text-sm font-semibold rounded-xl transition-colors"
              >
                Try again
              </button>
            </div>
          ) : (
            <div className="text-center">
              {/* Score circle */}
              <div className="relative w-36 h-36 mx-auto mb-8">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="#EEEDFE" strokeWidth="10" />
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    fill="none"
                    stroke={passed ? "#7F77DD" : "#D85A30"}
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 42}`}
                    strokeDashoffset={`${2 * Math.PI * 42 * (1 - score / 100)}`}
                    style={{ transition: "stroke-dashoffset 1s ease" }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold text-gray-900">{score}%</span>
                </div>
              </div>

              <div className="text-4xl mb-3">{scoreEmoji(score)}</div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">
                {scoreLabel(score, passingScore)}
              </h1>
              <p className="text-gray-500 text-sm mb-2">
                {correct} of {totalQuestions} correct
              </p>
              {!passed && (
                <p className="text-xs text-gray-400 mb-8">
                  You need {passingScore}% to pass
                </p>
              )}
              {passed && (
                <p className="text-xs text-gray-400 mb-8">
                  Lesson marked complete
                </p>
              )}

              {/* ── Adaptive card ── */}
              {remedialState !== "none" && (
                <div className="max-w-xs mx-auto mb-6">
                  {remedialState === "loading" ? (
                    <div className="flex items-center gap-3 bg-[#EEEDFE] rounded-xl px-4 py-4">
                      <div className="w-5 h-5 rounded-full border-2 border-[#7F77DD]/30 border-t-[#7F77DD] animate-spin flex-shrink-0" />
                      <div className="text-left">
                        <p className="text-sm font-semibold text-[#3C3489] leading-snug">
                          Adding a personalized refresher…
                        </p>
                        <p className="text-xs text-[#7F77DD]/70 mt-0.5">
                          Preparing a new way to explain this
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-[#EEEDFE] border border-[#7F77DD]/25 rounded-xl px-4 py-4 text-left">
                      <p className="text-sm font-semibold text-[#3C3489] mb-1">
                        Refresher added to your course ✨
                      </p>
                      <p className="text-xs text-[#7F77DD]/80 leading-relaxed mb-3">
                        <span className="font-medium">
                          &ldquo;{weakTopic?.slice(0, 70)}&rdquo;
                        </span>{" "}
                        was tricky — I&apos;ve queued a short lesson that approaches it a completely different way.
                      </p>
                      <a
                        href={`/lesson/${remedialLessonId}`}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#7F77DD] hover:text-[#3C3489] transition-colors"
                      >
                        Go to refresher
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* CTAs */}
              <div className="flex flex-col gap-3 max-w-xs mx-auto">
                {passed && nextLessonId && (
                  <Link
                    href={`/lesson/${nextLessonId}`}
                    className="inline-flex items-center justify-center gap-2 px-7 py-3 bg-[#7F77DD] hover:bg-[#3C3489] text-white text-sm font-semibold rounded-xl transition-colors"
                  >
                    Next lesson
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </Link>
                )}

                {passed && !nextLessonId && (
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center justify-center gap-2 px-7 py-3 bg-[#7F77DD] hover:bg-[#3C3489] text-white text-sm font-semibold rounded-xl transition-colors"
                  >
                    Back to dashboard
                  </Link>
                )}

                {!passed && (
                  <button
                    onClick={retake}
                    className="px-7 py-3 bg-[#7F77DD] hover:bg-[#3C3489] text-white text-sm font-semibold rounded-xl transition-colors"
                  >
                    Retake quiz
                  </button>
                )}

                <Link
                  href="/dashboard"
                  className="text-sm text-gray-500 hover:text-gray-900 transition-colors py-2"
                >
                  Dashboard
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── Submitting screen ────────────────────────────────────────────────────

  if (phase === "submitting") {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-[#EEEDFE] flex items-center justify-center mx-auto mb-4">
            <div className="w-5 h-5 rounded-full border-2 border-[#7F77DD]/30 border-t-[#7F77DD] animate-spin" />
          </div>
          <p className="text-sm font-medium text-[#3C3489]">Saving your results…</p>
        </div>
      </div>
    );
  }

  // ─── Quiz screen ──────────────────────────────────────────────────────────

  const isCorrect = selectedAnswer === currentQuestion.correct_answer;

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* Nav */}
      <nav className="sticky top-0 bg-white/90 backdrop-blur border-b border-gray-100 z-50 h-14 flex items-center px-4">
        <div className="max-w-2xl mx-auto w-full flex items-center justify-between">
          <Link
            href={`/lesson/${lessonId}`}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            {lessonTitle}
          </Link>
          <ProgressDots
            total={totalQuestions}
            current={questionIdx}
            answered={answeredSet}
          />
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 pt-10 pb-24">
        {/* Question counter */}
        <p className="text-xs font-semibold text-[#7F77DD] uppercase tracking-wide mb-3">
          Question {questionIdx + 1} of {totalQuestions}
        </p>

        {/* Question text */}
        <h2 className="text-xl font-semibold text-gray-900 mb-8 leading-snug">
          {currentQuestion.text}
        </h2>

        {/* Options */}
        <div className="flex flex-col gap-3 mb-6">
          {currentQuestion.options.map((option) => {
            const isSelected = selectedAnswer === option;
            const isCorrectOption = option === currentQuestion.correct_answer;

            let optionStyle =
              "border border-gray-200 bg-white hover:border-[#7F77DD]/40 hover:bg-[#EEEDFE]/30 cursor-pointer";

            if (showFeedback) {
              if (isCorrectOption) {
                optionStyle = "border border-emerald-300 bg-emerald-50 cursor-default";
              } else if (isSelected && !isCorrect) {
                optionStyle = "border border-red-300 bg-red-50 cursor-default";
              } else {
                optionStyle = "border border-gray-200 bg-white cursor-default opacity-60";
              }
            }

            return (
              <button
                key={option}
                onClick={() => selectAnswer(option)}
                disabled={showFeedback}
                className={`w-full text-left px-5 py-4 rounded-xl transition-all duration-200 ${optionStyle}`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-colors ${
                      showFeedback && isCorrectOption
                        ? "border-emerald-500 bg-emerald-500"
                        : showFeedback && isSelected && !isCorrect
                        ? "border-red-400 bg-red-400"
                        : isSelected
                        ? "border-[#7F77DD] bg-[#7F77DD]"
                        : "border-gray-300"
                    }`}
                  >
                    {showFeedback && isCorrectOption && (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                    {showFeedback && isSelected && !isCorrect && (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    )}
                  </div>
                  <span
                    className={`text-[15px] leading-relaxed ${
                      showFeedback && isCorrectOption
                        ? "text-emerald-800 font-medium"
                        : showFeedback && isSelected && !isCorrect
                        ? "text-red-700"
                        : "text-gray-800"
                    }`}
                  >
                    {option}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Feedback explanation */}
        {showFeedback && (
          <div
            className={`rounded-xl p-4 mb-6 transition-all duration-300 ${
              isCorrect
                ? "bg-emerald-50 border border-emerald-200"
                : "bg-[#EEEDFE] border border-[#7F77DD]/20"
            }`}
          >
            <p className={`text-sm font-semibold mb-1 ${isCorrect ? "text-emerald-700" : "text-[#3C3489]"}`}>
              {isCorrect ? "Correct!" : "Not quite"}
            </p>
            <p className={`text-sm leading-relaxed ${isCorrect ? "text-emerald-700" : "text-[#3C3489]"}`}>
              {currentQuestion.explanation}
            </p>
          </div>
        )}

        {/* Next / Submit button — shown after feedback */}
        {showFeedback && (
          <button
            onClick={() => advance()}
            className="w-full py-3.5 bg-[#7F77DD] hover:bg-[#3C3489] text-white text-sm font-semibold rounded-xl transition-colors"
          >
            {isLast ? "See results" : "Next question"}
          </button>
        )}
      </div>
    </div>
  );
}
