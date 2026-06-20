import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildTutorContext, buildSuggestedQuestions } from "@/lib/tutor/buildContext";
import { TutorClient } from "./TutorClient";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRow = any;

export const metadata = { title: "Tutor" };

export default async function TutorPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const db = createAdminClient();

  // ── Get user's course ──────────────────────────────────────────────────────
  const { data: courseRow } = await db
    .from("courses")
    .select("id, title")
    .eq("creator_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const course = courseRow as AnyRow | null;
  if (!course) redirect("/onboarding");

  // ── Fetch tutor sessions ───────────────────────────────────────────────────
  const { data: sessionsRaw } = await db
    .from("tutor_sessions")
    .select("id, title, created_at, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(50);

  const sessions = ((sessionsRaw as AnyRow[]) ?? []).map((s: AnyRow) => ({
    id: s.id as string,
    title: s.title as string,
    created_at: s.created_at as string,
    updated_at: s.updated_at as string,
  }));

  // ── Fetch most recent session's messages ───────────────────────────────────
  const mostRecentSession = sessions[0] ?? null;
  let initialMessages: { id: string; role: "user" | "assistant"; content: string; created_at: string }[] = [];

  if (mostRecentSession) {
    const { data: msgRows } = await db
      .from("tutor_messages")
      .select("id, role, content, created_at")
      .eq("session_id", mostRecentSession.id)
      .order("created_at", { ascending: true });

    initialMessages = ((msgRows as AnyRow[]) ?? []).map((m: AnyRow) => ({
      id: m.id as string,
      role: m.role as "user" | "assistant",
      content: m.content as string,
      created_at: m.created_at as string,
    }));
  }

  // ── Build suggested questions from context ─────────────────────────────────
  let suggestedQuestions: string[] = [
    "What should I focus on next given my progress?",
    "Give me a summary of what I've learned so far",
    "What are the most important concepts in my course?",
  ];

  try {
    const ctx = await buildTutorContext(user.id, course.id);
    suggestedQuestions = buildSuggestedQuestions(ctx);
  } catch {
    // Use defaults
  }

  return (
    <TutorClient
      sessions={sessions}
      initialMessages={initialMessages}
      initialSessionId={mostRecentSession?.id ?? null}
      courseId={course.id}
      courseTitle={course.title}
      suggestedQuestions={suggestedQuestions}
    />
  );
}
