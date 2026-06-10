import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateLessonSlides } from "@/lib/anthropic/generate";
import type { Json } from "@/types/database";

type LessonWithContext = {
  id: string;
  title: string;
  content: string;
  modules: {
    courses: { difficulty_level: string | null } | null;
  } | null;
};

export async function POST(
  _req: NextRequest,
  { params }: { params: { lessonId: string } },
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { lessonId } = params;
  const admin = createAdminClient();

  const { data: raw } = await admin
    .from("lessons")
    .select("id, title, content, modules(courses(difficulty_level))")
    .eq("id", lessonId)
    .single();

  const lesson = raw as unknown as LessonWithContext | null;

  if (!lesson?.content) {
    return NextResponse.json({ error: "Lesson content not found" }, { status: 404 });
  }

  const level = lesson.modules?.courses?.difficulty_level ?? "beginner";

  try {
    const { slides } = await generateLessonSlides({
      lessonTitle: lesson.title,
      lessonContent: lesson.content,
      level,
    });

    await admin
      .from("lessons")
      .update({ slides: slides as unknown as Json })
      .eq("id", lessonId);

    return NextResponse.json({ slides });
  } catch (err) {
    console.error("[generate-slides]", err);
    return NextResponse.json({ error: "Slide generation failed" }, { status: 500 });
  }
}
