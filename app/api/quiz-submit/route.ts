import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";
import { updateRollingScore } from "@/lib/adaptive/difficulty";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDB = any;

interface QuizQuestion {
  id: string;
  text: string;
  options: string[];
  correct_answer: string;
  explanation: string;
  points: number;
}

interface SubmitBody {
  quizId: string;
  lessonId: string;
  courseId: string;
  answers: Record<string, string>;
  timeTaken: number;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: SubmitBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { quizId, lessonId, courseId, answers, timeTaken } = body;

  const db = supabase as AnyDB;

  // ── Fetch quiz questions from DB (don't trust client-side scoring) ─────────
  const { data: quizRow } = await db
    .from("quizzes")
    .select("questions, passing_score")
    .eq("id", quizId)
    .single();

  if (!quizRow) return NextResponse.json({ error: "Quiz not found" }, { status: 404 });

  const questions = quizRow.questions as unknown as QuizQuestion[];
  const passingScore = quizRow.passing_score ?? 60;

  // ── Score calculation ─────────────────────────────────────────────────────
  let correct = 0;
  const wrongQuestions: QuizQuestion[] = [];

  for (const q of questions) {
    if (answers[q.id] === q.correct_answer) {
      correct++;
    } else {
      wrongQuestions.push(q);
    }
  }

  const score = questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0;
  const passed = score >= passingScore;

  // ── Save quiz attempt ─────────────────────────────────────────────────────
  const { data: attempt, error: attemptErr } = await db
    .from("quiz_attempts")
    .insert({
      quiz_id: quizId,
      user_id: user.id,
      answers: answers as unknown as Json,
      score,
      passed,
      time_taken_seconds: timeTaken,
      completed_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (attemptErr) {
    console.error("[quiz-submit] attempt insert:", attemptErr);
    return NextResponse.json({ error: "Failed to save attempt" }, { status: 500 });
  }

  // ── Mark lesson complete if passed ────────────────────────────────────────
  if (passed) {
    await db.from("lesson_progress").upsert(
      {
        user_id: user.id,
        lesson_id: lessonId,
        completed: true,
        completed_at: new Date().toISOString(),
      },
      { onConflict: "user_id,lesson_id" }
    );
  }

  // ── Weak spot detection — insert one row per wrong question ───────────────
  if (wrongQuestions.length > 0 && attempt) {
    const weakSpots = wrongQuestions.map((q) => ({
      user_id: user.id,
      course_id: courseId,
      quiz_attempt_id: attempt.id,
      topic: q.text.slice(0, 200),
      description: `Missed in quiz: ${q.text.slice(0, 400)}`,
      confidence_level: 1,
      resolved: false,
    }));

    const { error: weakErr } = await db.from("weak_spots").insert(weakSpots);
    if (weakErr) console.error("[quiz-submit] weak spots:", weakErr);
  }

  // ── Update adaptive rolling score ─────────────────────────────────────────
  updateRollingScore(user.id, score).catch((e) =>
    console.error("[quiz-submit] rolling score update:", e)
  );

  return NextResponse.json({
    score,
    passed,
    correct,
    total: questions.length,
    attemptId: attempt?.id,
    // First weak topic for client-side remedial fetch trigger
    weakTopics: wrongQuestions.slice(0, 1).map((q) => q.text.slice(0, 150)),
  });
}
