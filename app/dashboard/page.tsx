import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardClient } from "./DashboardClient";
import type { CourseData, ModuleData, GoalData, TaskData } from "./DashboardClient";
import { buildLearningProfile } from "@/lib/adaptive/analyze";
import { getRecommendation } from "@/lib/adaptive/recommend";

// Supabase infers `never` for rows when filters touch nullable FK columns.
// Using explicit row shapes + `as unknown as T` is the standard workaround.

type RawCourse = {
  id: string;
  title: string;
  description: string | null;
  difficulty_level: string | null;
  created_at: string;
};

type RawModule = {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  position: number;
};

type RawLesson = {
  id: string;
  module_id: string;
  title: string;
  content_type: string;
  lesson_type: string;
  duration_minutes: number | null;
  position: number;
};

type RawProgress = { lesson_id: string };

type RawGoal = {
  id: string;
  title: string;
  description: string | null;
  target_date: string | null;
  status: string;
  progress: number;
};

type RawTask = {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: string;
  status: string;
};

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // ── Course (most recent) ──────────────────────────────────────────────────
  const courseRes = await supabase
    .from("courses")
    .select("id, title, description, difficulty_level, created_at")
    .eq("creator_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1);

  const courseRow = ((courseRes.data as unknown as RawCourse[]) ?? [])[0];
  if (!courseRow) redirect("/onboarding");

  const course: CourseData = {
    id: courseRow.id,
    title: courseRow.title,
    description: courseRow.description,
    difficulty_level: courseRow.difficulty_level,
    created_at: courseRow.created_at,
  };

  // ── Modules ───────────────────────────────────────────────────────────────
  const modulesRes = await supabase
    .from("modules")
    .select("id, course_id, title, description, position")
    .eq("course_id", course.id)
    .order("position");

  const moduleRows = (modulesRes.data as unknown as RawModule[]) ?? [];
  const moduleIds = moduleRows.map((m) => m.id);

  // ── Lessons ───────────────────────────────────────────────────────────────
  const lessonsRes =
    moduleIds.length > 0
      ? await supabase
          .from("lessons")
          .select("id, module_id, title, content_type, lesson_type, duration_minutes, position")
          .in("module_id", moduleIds)
          .order("position")
      : { data: [] };

  const lessonRows = (lessonsRes.data as unknown as RawLesson[]) ?? [];
  const lessonIds = lessonRows.map((l) => l.id);

  // ── Lesson progress ───────────────────────────────────────────────────────
  const progressRes =
    lessonIds.length > 0
      ? await supabase
          .from("lesson_progress")
          .select("lesson_id")
          .in("lesson_id", lessonIds)
          .eq("user_id", user.id)
          .eq("completed", true)
      : { data: [] };

  const completedLessonIds = ((progressRes.data as unknown as RawProgress[]) ?? []).map(
    (p) => p.lesson_id
  );

  // ── Assemble modules with their lessons ───────────────────────────────────
  const modules: ModuleData[] = moduleRows.map((m) => ({
    id: m.id,
    title: m.title,
    description: m.description,
    position: m.position,
    lessons: lessonRows
      .filter((l) => l.module_id === m.id)
      .map((l) => ({
        id: l.id,
        module_id: l.module_id,
        title: l.title,
        content_type: l.content_type,
        lesson_type: l.lesson_type,
        duration_minutes: l.duration_minutes,
        position: l.position,
      })),
  }));

  // ── Goal ──────────────────────────────────────────────────────────────────
  const goalRes = await supabase
    .from("goals")
    .select("id, title, description, target_date, status, progress")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1);

  const goalRow = ((goalRes.data as unknown as RawGoal[]) ?? [])[0] ?? null;

  const goal: GoalData | null = goalRow
    ? {
        id: goalRow.id,
        title: goalRow.title,
        description: goalRow.description,
        target_date: goalRow.target_date,
        status: goalRow.status,
        progress: goalRow.progress,
      }
    : null;

  // ── Tasks ─────────────────────────────────────────────────────────────────
  const tasksRes = await supabase
    .from("tasks")
    .select("id, title, description, due_date, priority, status")
    .eq("user_id", user.id)
    .order("due_date", { ascending: true, nullsFirst: false });

  const tasks: TaskData[] = ((tasksRes.data as unknown as RawTask[]) ?? []).map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    due_date: t.due_date,
    priority: t.priority,
    status: t.status,
  }));

  // ── Adaptive learning profile ─────────────────────────────────────────────
  let adaptiveData: import("./DashboardClient").AdaptiveData | undefined;
  try {
    const profile = await buildLearningProfile(user.id);

    const completedSet = new Set(completedLessonIds);
    const nextLesson = moduleRows
      .slice()
      .sort((a, b) => a.position - b.position)
      .flatMap((m) =>
        lessonRows
          .filter((l) => l.module_id === m.id)
          .sort((a, b) => a.position - b.position)
      )
      .find((l) => !completedSet.has(l.id));

    const recommendation = getRecommendation(profile, { nextLessonId: nextLesson?.id });

    adaptiveData = {
      weakTopics: profile.weakTopics,
      masteredTopics: profile.masteredTopics,
      rollingScore: profile.rollingScore,
      difficultyLevel: profile.difficultyLevel,
      recommendation,
    };
  } catch {
    // Adaptive features degrade gracefully — non-fatal
  }

  return (
    <DashboardClient
      course={course}
      modules={modules}
      completedLessonIds={completedLessonIds}
      goal={goal}
      tasks={tasks}
      adaptiveData={adaptiveData}
    />
  );
}
