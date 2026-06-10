import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LessonClient } from "./LessonClient";
import type { Slide } from "@/lib/anthropic/types";

type LessonRow = {
  id: string;
  title: string;
  content: string | null;
  content_type: string;
  duration_minutes: number | null;
  position: number;
  module_id: string;
  slides: unknown | null;
  modules: {
    id: string;
    title: string;
    position: number;
    course_id: string;
    courses: {
      id: string;
      title: string;
      difficulty_level: string | null;
      creator_id: string | null;
    } | null;
  } | null;
};

type SiblingLesson = { id: string; title: string; position: number };

export default async function LessonPage({
  params,
}: {
  params: { lessonId: string };
}) {
  const { lessonId } = params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // ── Fetch lesson with full context ────────────────────────────────────────
  const { data: rawLesson } = await supabase
    .from("lessons")
    .select(`
      id, title, content, content_type, duration_minutes, position, slides, module_id,
      modules(
        id, title, position, course_id,
        courses(id, title, difficulty_level, creator_id)
      )
    `)
    .eq("id", lessonId)
    .single();

  const lesson = rawLesson as unknown as LessonRow | null;
  if (!lesson) redirect("/dashboard");

  const course = lesson.modules?.courses;
  const mod = lesson.modules;
  if (!course || !mod) redirect("/dashboard");

  // Only the course creator can view (for now — Phase 4 adds enrollment)
  if (course.creator_id !== user.id) redirect("/dashboard");

  // ── Sibling lessons in this module (for next lesson navigation) ───────────
  const { data: rawSiblings } = await supabase
    .from("lessons")
    .select("id, title, position")
    .eq("module_id", mod.id)
    .order("position");

  const siblings = (rawSiblings as unknown as SiblingLesson[]) ?? [];
  const nextLesson = siblings.find((l) => l.position > lesson.position) ?? null;

  // ── Total module count (for breadcrumb "Module X of Y") ──────────────────
  const { data: rawModules } = await supabase
    .from("modules")
    .select("id")
    .eq("course_id", course.id);

  const totalModules = (rawModules ?? []).length;

  const initialSlides = Array.isArray(lesson.slides)
    ? (lesson.slides as unknown as Slide[])
    : null;

  return (
    <LessonClient
      lessonId={lesson.id}
      lessonTitle={lesson.title}
      initialContent={lesson.content}
      initialSlides={initialSlides}
      contentType={lesson.content_type}
      durationMinutes={lesson.duration_minutes}
      position={lesson.position}
      moduleTitle={mod.title}
      modulePosition={mod.position}
      totalModules={totalModules}
      courseId={course.id}
      courseTitle={course.title}
      nextLessonId={nextLesson?.id ?? null}
      nextLessonTitle={nextLesson?.title ?? null}
    />
  );
}
