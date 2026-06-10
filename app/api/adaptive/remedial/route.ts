import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateRemedialLesson } from "@/lib/adaptive/remedial";
import { getAdaptiveProfile } from "@/lib/adaptive/difficulty";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: {
    lessonId: string;
    topic: string;
    lessonTitle: string;
    courseTitle: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { lessonId, topic, lessonTitle, courseTitle } = body;
  if (!lessonId || !topic) {
    return NextResponse.json({ error: "Missing lessonId or topic" }, { status: 400 });
  }

  try {
    const profile = await getAdaptiveProfile(user.id);
    const remedialLessonId = await generateRemedialLesson({
      lessonId,
      topic,
      lessonTitle,
      courseTitle,
      difficultyLevel: profile.difficulty_level,
    });
    return NextResponse.json({ remedialLessonId });
  } catch (err) {
    console.error("[adaptive/remedial]", err);
    return NextResponse.json(
      { error: "Failed to generate remedial lesson" },
      { status: 500 }
    );
  }
}
