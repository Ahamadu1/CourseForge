import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  generateCourseOutline,
  generateGoalBreakdown,
} from "@/lib/anthropic/generate";
import { slugify } from "@/lib/utils";
import type { OnboardingData } from "@/lib/anthropic/types";

interface RequestBody {
  niche: string;
  level: string;
  goal: string;
  time: string;
  style: string;
  knowledgeCheck: string;
}

function validateBody(body: unknown): body is RequestBody {
  if (typeof body !== "object" || body === null) return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.niche === "string" &&
    typeof b.level === "string" &&
    ["complete_beginner", "some_knowledge", "intermediate", "advanced"].includes(b.level) &&
    typeof b.goal === "string" &&
    typeof b.time === "string" &&
    typeof b.style === "string" &&
    typeof b.knowledgeCheck === "string"
  );
}

export async function POST(request: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Validate body ─────────────────────────────────────────────────────────
  let body: RequestBody;
  try {
    const raw = await request.json();
    if (!validateBody(raw)) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    body = raw;
  } catch {
    return NextResponse.json({ error: "Malformed JSON" }, { status: 400 });
  }

  const onboarding = body as OnboardingData;
  const admin = createAdminClient();

  try {
    // ── 1. Generate course outline ─────────────────────────────────────────
    const outline = await generateCourseOutline(onboarding);

    // Ensure slug uniqueness with a short suffix
    const baseSlug = slugify(outline.slug || outline.title);
    const slug = `${baseSlug}-${Date.now().toString(36)}`;

    // ── 2. Persist course ──────────────────────────────────────────────────
    const { data: course, error: courseError } = await admin
      .from("courses")
      .insert({
        title: outline.title,
        description: outline.description,
        slug,
        difficulty_level: outline.difficulty_level,
        creator_id: user.id,
        is_published: false,
      })
      .select()
      .single();

    if (courseError || !course) {
      throw new Error(`Failed to save course: ${courseError?.message}`);
    }

    // ── 3. Persist modules + lesson stubs ──────────────────────────────────
    for (const mod of outline.modules) {
      const { data: module, error: moduleError } = await admin
        .from("modules")
        .insert({
          course_id: course.id,
          title: mod.title,
          description: mod.description,
          position: mod.position,
        })
        .select()
        .single();

      if (moduleError || !module) {
        throw new Error(`Failed to save module "${mod.title}": ${moduleError?.message}`);
      }

      const lessonRows = mod.lessons.map((lesson) => ({
        module_id: module.id,
        title: lesson.title,
        content_type: lesson.content_type,
        duration_minutes: lesson.duration_minutes,
        position: lesson.position,
        is_published: false,
        // content intentionally omitted — generated lazily on first view
      }));

      const { error: lessonsError } = await admin.from("lessons").insert(lessonRows);
      if (lessonsError) {
        throw new Error(`Failed to save lessons for "${mod.title}": ${lessonsError.message}`);
      }
    }

    // ── 4. Generate goal breakdown ─────────────────────────────────────────
    const goalBreakdown = await generateGoalBreakdown({
      userGoal: onboarding.goal,
      courseTitle: outline.title,
      modules: outline.modules.map((m) => m.title),
      timePerWeek: onboarding.time,
    });

    // ── 5. Persist goal ────────────────────────────────────────────────────
    const { data: goal, error: goalError } = await admin
      .from("goals")
      .insert({
        user_id: user.id,
        title: goalBreakdown.goal.title,
        description: goalBreakdown.goal.description,
        target_date: goalBreakdown.goal.target_date,
        status: "active",
        progress: 0,
      })
      .select()
      .single();

    if (goalError || !goal) {
      throw new Error(`Failed to save goal: ${goalError?.message}`);
    }

    // ── 6. Persist tasks ───────────────────────────────────────────────────
    const taskRows = goalBreakdown.tasks.map((task) => ({
      user_id: user.id,
      goal_id: goal.id,
      title: task.title,
      description: task.description,
      priority: task.priority,
      due_date: task.due_date,
      status: "todo" as const,
    }));

    const { error: tasksError } = await admin.from("tasks").insert(taskRows);
    if (tasksError) {
      throw new Error(`Failed to save tasks: ${tasksError.message}`);
    }

    return NextResponse.json({ courseId: course.id });
  } catch (err) {
    console.error("[generate-course]", err);
    return NextResponse.json(
      {
        error: "Course generation failed",
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
