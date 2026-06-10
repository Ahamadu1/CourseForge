import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateLessonContent } from "@/lib/anthropic/generate";
import { slugify } from "@/lib/utils";
import { CourseDocument } from "@/lib/pdf/CourseDocument";
import type {
  CourseExportData,
  ExportModule,
  ExportLesson,
  ExportQuiz,
} from "@/lib/pdf/CourseDocument";
import type { Json, QuizQuestion } from "@/types/database";
import type { Slide } from "@/lib/anthropic/types";

// Increase max duration for Vercel (long-running generation)
export const maxDuration = 300;

const CONCURRENCY = 5;

export async function GET(
  _req: NextRequest,
  { params }: { params: { courseId: string } },
) {
  const start = Date.now();

  // ── Auth ────────────────────────────────────────────────────────────────────
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { courseId } = params;
  const admin = createAdminClient();

  // ── Fetch course (ownership check) ─────────────────────────────────────────
  const { data: course, error: courseError } = await admin
    .from("courses")
    .select("id, title, description, difficulty_level, creator_id")
    .eq("id", courseId)
    .single();

  if (courseError || !course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }
  if (course.creator_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // ── Fetch modules ───────────────────────────────────────────────────────────
  const { data: modulesRaw } = await admin
    .from("modules")
    .select("id, title, description, position")
    .eq("course_id", courseId)
    .order("position");

  const modules = modulesRaw ?? [];

  // ── Fetch lessons ───────────────────────────────────────────────────────────
  const moduleIds = modules.map((m) => m.id);
  const { data: lessonsRaw } = await admin
    .from("lessons")
    .select("id, module_id, title, content, slides, position")
    .in("module_id", moduleIds.length > 0 ? moduleIds : ["__none__"])
    .order("position");

  const lessons = (lessonsRaw ?? []).map((l) => ({ ...l }));

  // ── Fetch quizzes ───────────────────────────────────────────────────────────
  const lessonIds = lessons.map((l) => l.id);
  const { data: quizzesRaw } = await admin
    .from("quizzes")
    .select("id, lesson_id, title, questions")
    .in("lesson_id", lessonIds.length > 0 ? lessonIds : ["__none__"]);

  const quizzes = (quizzesRaw ?? []).map((q) => ({ ...q }));

  // ── Fetch goal + tasks ──────────────────────────────────────────────────────
  const { data: goal } = await admin
    .from("goals")
    .select("id, title, description, target_date, status, progress")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: tasksRaw } = await admin
    .from("tasks")
    .select("id, title, description, due_date, priority, status")
    .eq("user_id", user.id)
    .order("due_date");

  const tasks = tasksRaw ?? [];

  // ── Fetch user display name ─────────────────────────────────────────────────
  const { data: profile } = await admin
    .from("user_profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  const userName = profile?.full_name ?? user.email?.split("@")[0] ?? "You";

  // ── Generate missing lesson content in parallel ─────────────────────────────
  const missing = lessons.filter((l) => !l.content);
  if (missing.length > 0) {
    console.log(`[export] Generating ${missing.length} missing lessons…`);
    for (let i = 0; i < missing.length; i += CONCURRENCY) {
      const batch = missing.slice(i, i + CONCURRENCY);
      await Promise.allSettled(
        batch.map(async (lesson) => {
          try {
            const mod = modules.find((m) => m.id === lesson.module_id);
            const result = await generateLessonContent({
              courseTitle: course.title,
              moduleTitle: mod?.title ?? "Module",
              lessonTitle: lesson.title,
              lessonPosition: lesson.position,
              totalLessons: lessons.length,
              level: course.difficulty_level ?? "beginner",
            });
            await admin
              .from("lessons")
              .update({
                content: result.content,
                slides: result.slides.length > 0
                  ? (result.slides as unknown as Json)
                  : null,
                is_published: true,
              })
              .eq("id", lesson.id);
            lesson.content = result.content;
            lesson.slides = result.slides.length > 0
              ? (result.slides as unknown as Json)
              : null;
          } catch (err) {
            console.error(`[export] Failed to generate lesson ${lesson.id}:`, err);
            lesson.content = `[Content for "${lesson.title}" is being prepared. Please view this lesson and try exporting again.]`;
          }
        }),
      );
    }
  }

  // ── Assemble export data ────────────────────────────────────────────────────
  const exportModules: ExportModule[] = modules
    .sort((a, b) => a.position - b.position)
    .map((mod) => {
      const modLessons: ExportLesson[] = lessons
        .filter((l) => l.module_id === mod.id)
        .sort((a, b) => a.position - b.position)
        .map((l) => ({
          id: l.id,
          title: l.title,
          content: l.content ?? "",
          position: l.position,
          slides: l.slides ? (l.slides as unknown as Slide[]) : null,
        }));

      const modLessonIds = new Set(modLessons.map((l) => l.id));
      const modQuizzes: ExportQuiz[] = quizzes
        .filter((q) => q.lesson_id && modLessonIds.has(q.lesson_id))
        .map((q) => ({
          id: q.id,
          lesson_id: q.lesson_id,
          title: q.title,
          questions: q.questions as unknown as QuizQuestion[],
        }));

      return {
        id: mod.id,
        title: mod.title,
        description: mod.description,
        position: mod.position,
        lessons: modLessons,
        quizzes: modQuizzes,
      };
    });

  const exportData: CourseExportData = {
    course: {
      id: course.id,
      title: course.title,
      description: course.description,
      difficulty_level: course.difficulty_level,
    },
    userName,
    generatedAt: new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    modules: exportModules,
    goal: goal
      ? {
          title: goal.title,
          description: goal.description,
          target_date: goal.target_date,
          progress: goal.progress,
        }
      : null,
    tasks: tasks.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      due_date: t.due_date,
      priority: t.priority as "low" | "medium" | "high",
      status: t.status,
    })),
  };

  // ── Render PDF ──────────────────────────────────────────────────────────────
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const element = React.createElement(CourseDocument, { data: exportData }) as any;
    const buffer = await renderToBuffer(element);

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`[export] PDF generated in ${elapsed}s — ${Math.round(buffer.length / 1024)} KB`);

    const filename = `${slugify(course.title)}-courseforge.pdf`;

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(buffer.length),
      },
    });
  } catch (err) {
    console.error("[export] PDF render failed:", err);
    return NextResponse.json(
      {
        error: "PDF generation failed",
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
