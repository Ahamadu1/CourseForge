import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateLessonContent, generateQuiz } from "@/lib/anthropic/generate";
import { getAdaptiveProfile } from "@/lib/adaptive/difficulty";

// Shape of the nested select result
interface LessonRow {
  id: string;
  title: string;
  content: string | null;
  content_type: string;
  duration_minutes: number | null;
  position: number;
  is_published: boolean;
  module_id: string;
  modules: {
    title: string;
    position: number;
    courses: {
      title: string;
      difficulty_level: string | null;
    } | null;
  } | null;
}

export async function POST(
  _request: NextRequest,
  { params }: { params: { lessonId: string } },
) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { lessonId } = params;
  const admin = createAdminClient();

  // ── Fetch lesson with context ─────────────────────────────────────────────
  const { data: lesson, error: lessonError } = await admin
    .from("lessons")
    .select(
      `id, title, content, content_type, duration_minutes, position, is_published, module_id,
       modules ( title, position, courses ( title, difficulty_level ) )`,
    )
    .eq("id", lessonId)
    .single();

  if (lessonError || !lesson) {
    return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
  }

  const row = lesson as unknown as LessonRow;

  // ── Cache hit: content already exists ─────────────────────────────────────
  if (row.content) {
    const { data: existingQuiz } = await admin
      .from("quizzes")
      .select("*")
      .eq("lesson_id", lessonId)
      .maybeSingle();

    return NextResponse.json({ lesson: row, quiz: existingQuiz });
  }

  // ── Generate content ──────────────────────────────────────────────────────
  try {
    const mod = row.modules;
    const course = mod?.courses;

    // Fetch user's adaptive difficulty level (if any) to personalise generation
    const adaptiveProfile = await getAdaptiveProfile(user.id).catch(() => null);

    const contentResult = await generateLessonContent({
      courseTitle: course?.title ?? "Course",
      moduleTitle: mod?.title ?? "Module",
      lessonTitle: row.title,
      lessonPosition: row.position,
      totalLessons: 8, // reasonable approximation for the prompt
      level: course?.difficulty_level ?? "beginner",
      adaptiveDifficulty: adaptiveProfile?.difficulty_level,
    });

    // ── Persist lesson content + slides ───────────────────────────────────
    const { data: updatedLesson, error: updateError } = await admin
      .from("lessons")
      .update({
        content: contentResult.content,
        slides: contentResult.slides.length > 0
          ? (contentResult.slides as unknown as import("@/types/database").Json)
          : null,
        is_published: true,
      })
      .eq("id", lessonId)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to save lesson content: ${updateError.message}`);
    }

    // ── Generate quiz ──────────────────────────────────────────────────────
    const quizResult = await generateQuiz({
      lessonTitle: row.title,
      lessonContent: contentResult.content,
      level: course?.difficulty_level ?? "beginner",
    });

    // ── Persist quiz ───────────────────────────────────────────────────────
    const { data: savedQuiz, error: quizError } = await admin
      .from("quizzes")
      .insert({
        lesson_id: lessonId,
        title: quizResult.title,
        questions: quizResult.questions as unknown as import("@/types/database").Json,
        passing_score: 70,
      })
      .select()
      .single();

    if (quizError) {
      throw new Error(`Failed to save quiz: ${quizError.message}`);
    }

    return NextResponse.json({ lesson: updatedLesson, quiz: savedQuiz });
  } catch (err) {
    console.error("[generate-lesson]", err);
    return NextResponse.json(
      {
        error: "Lesson generation failed",
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
