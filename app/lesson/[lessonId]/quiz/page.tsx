import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateQuiz } from "@/lib/anthropic/generate";
import { QuizClient } from "./QuizClient";
import type { Json } from "@/types/database";

type QuizQuestion = {
  id: string;
  text: string;
  options: string[];
  correct_answer: string;
  explanation: string;
  points: number;
};

type QuizRow = {
  id: string;
  questions: QuizQuestion[];
  passing_score: number | null;
};

type LessonRow = {
  id: string;
  title: string;
  content: string | null;
  position: number;
  module_id: string;
  modules: {
    id: string;
    title: string;
    position: number;
    course_id: string;
    courses: {
      id: string;
      title: string;
      creator_id: string | null;
      difficulty_level: string | null;
    } | null;
  } | null;
};

type SiblingLesson = { id: string; title: string; position: number };

export default async function QuizPage({
  params,
}: {
  params: { lessonId: string };
}) {
  const { lessonId } = params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // ── Fetch lesson with context ─────────────────────────────────────────────
  const { data: rawLesson } = await supabase
    .from("lessons")
    .select(`
      id, title, content, position, module_id,
      modules(
        id, title, position, course_id,
        courses(id, title, creator_id, difficulty_level)
      )
    `)
    .eq("id", lessonId)
    .single();

  const lesson = rawLesson as unknown as LessonRow | null;
  if (!lesson) redirect("/dashboard");

  const course = lesson.modules?.courses;
  const mod = lesson.modules;
  if (!course || !mod) redirect("/dashboard");

  if (course.creator_id !== user.id) redirect("/dashboard");

  // ── Fetch quiz for this lesson ────────────────────────────────────────────
  const { data: rawQuiz } = await supabase
    .from("quizzes")
    .select("id, questions, passing_score")
    .eq("lesson_id", lessonId)
    .single();

  let quiz = rawQuiz as unknown as QuizRow | null;

  // ── Generate quiz on-demand if missing (e.g. prior generation failed) ────
  if (!quiz && lesson.content) {
    try {
      const admin = createAdminClient();
      const generated = await generateQuiz({
        lessonTitle: lesson.title,
        lessonContent: lesson.content,
        level: course.difficulty_level ?? "beginner",
      });
      const { data: saved } = await admin
        .from("quizzes")
        .insert({
          lesson_id: lessonId,
          title: generated.title,
          questions: generated.questions as unknown as Json,
          passing_score: 70,
        })
        .select("id, questions, passing_score")
        .single();
      quiz = saved as unknown as QuizRow | null;
    } catch {
      // Generation failed — send user back to the lesson
      redirect(`/lesson/${lessonId}`);
    }
  }

  if (!quiz) redirect(`/lesson/${lessonId}`);

  // ── Next lesson in module ─────────────────────────────────────────────────
  const { data: rawSiblings } = await supabase
    .from("lessons")
    .select("id, title, position")
    .eq("module_id", mod.id)
    .order("position");

  const siblings = (rawSiblings as unknown as SiblingLesson[]) ?? [];
  const nextLesson = siblings.find((l) => l.position > lesson.position) ?? null;

  return (
    <QuizClient
      lessonId={lessonId}
      lessonTitle={lesson.title}
      courseTitle={course.title}
      courseId={course.id}
      quizId={quiz.id}
      questions={quiz.questions}
      passingScore={quiz.passing_score ?? 60}
      nextLessonId={nextLesson?.id ?? null}
      nextLessonTitle={nextLesson?.title ?? null}
    />
  );
}
