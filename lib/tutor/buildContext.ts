import { createAdminClient } from "@/lib/supabase/admin";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface TutorContext {
  goal: { title: string; targetDate: string | null } | null;
  course: { title: string; difficultyLevel: string | null };
  progress: {
    completedLessons: number;
    totalLessons: number;
    completedModules: number;
    totalModules: number;
  };
  recentLessons: string[];
  currentLesson: string | null;
  nextLesson: string | null;
  weakSpots: string[];
  masteredTopics: string[];
  difficultyLevel: string;
  rollingScore: number | null;
  streak: number;
  systemContext: string;
}

// ── In-memory cache (5-minute TTL per user+course) ────────────────────────────

const contextCache = new Map<string, { data: TutorContext; expiresAt: number }>();

// ── Streak helper (mirrors analytics logic) ───────────────────────────────────

function computeStreak(isoTimestamps: string[]): number {
  if (isoTimestamps.length === 0) return 0;
  const uniqueDays = Array.from(new Set(isoTimestamps.map((d) => d.slice(0, 10)))).sort().reverse();
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (uniqueDays[0] !== today && uniqueDays[0] !== yesterday) return 0;
  let streak = 1;
  for (let i = 1; i < uniqueDays.length; i++) {
    const a = new Date(uniqueDays[i - 1]).getTime();
    const b = new Date(uniqueDays[i]).getTime();
    if (Math.round((a - b) / 86400000) === 1) streak++;
    else break;
  }
  return streak;
}

function formatDifficultyLevel(level: string | null): string {
  switch (level) {
    case "complete_beginner": return "beginner";
    case "some_knowledge":    return "beginner+";
    case "intermediate":      return "intermediate";
    case "advanced":          return "advanced";
    default:                  return level ?? "standard";
  }
}

// ── Main builder ──────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRow = any;

export async function buildTutorContext(userId: string, courseId: string): Promise<TutorContext> {
  const cacheKey = `${userId}:${courseId}`;
  const cached = contextCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) return cached.data;

  const db = createAdminClient();

  const [
    courseRes,
    goalRes,
    modulesRes,
    recentProgressRes,
    allCompletedRes,
    weakRes,
    adaptiveRes,
    streakProgressRes,
    resolvedSpotsRes,
    quizScoresRes,
  ] = await Promise.all([
    db.from("courses").select("title, difficulty_level").eq("id", courseId).single(),
    db.from("goals").select("title, target_date").eq("user_id", userId).eq("status", "active").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    db.from("modules").select("id, title, position, lessons(id, title, position)").eq("course_id", courseId).order("position"),
    db.from("lesson_progress").select("lesson_id, lessons(title)").eq("user_id", userId).eq("completed", true).order("completed_at", { ascending: false }).limit(5),
    db.from("lesson_progress").select("lesson_id").eq("user_id", userId).eq("completed", true),
    db.from("weak_spots").select("topic").eq("user_id", userId).eq("course_id", courseId).eq("resolved", false).order("created_at", { ascending: false }).limit(30),
    db.from("adaptive_profiles").select("rolling_score, difficulty_level").eq("user_id", userId).maybeSingle(),
    db.from("lesson_progress").select("completed_at").eq("user_id", userId).eq("completed", true).not("completed_at", "is", null).order("completed_at", { ascending: false }).limit(30),
    db.from("weak_spots").select("topic").eq("user_id", userId).eq("course_id", courseId).eq("resolved", true).limit(5),
    db.from("quiz_attempts").select("score").eq("user_id", userId).gte("score", 80).not("score", "is", null),
  ]);

  const course = courseRes.data as AnyRow;
  const goal = goalRes.data as AnyRow;
  const modules = ((modulesRes.data as AnyRow[]) ?? []).sort((a: AnyRow, b: AnyRow) => a.position - b.position);
  const recentProgress = (recentProgressRes.data as AnyRow[]) ?? [];
  const allCompleted = new Set(((allCompletedRes.data as AnyRow[]) ?? []).map((p: AnyRow) => p.lesson_id));
  const adaptive = adaptiveRes.data as AnyRow;

  // Flatten all lessons in course order
  const allLessons: AnyRow[] = modules.flatMap((m: AnyRow) =>
    ((m.lessons as AnyRow[]) ?? [])
      .sort((a: AnyRow, b: AnyRow) => a.position - b.position)
      .map((l: AnyRow) => ({ ...l, moduleTitle: m.title }))
  );

  // Progress counts
  const totalLessons = allLessons.length;
  const completedLessons = allLessons.filter((l: AnyRow) => allCompleted.has(l.id)).length;
  const completedModules = modules.filter((m: AnyRow) =>
    m.lessons?.length > 0 && (m.lessons as AnyRow[]).every((l: AnyRow) => allCompleted.has(l.id))
  ).length;

  // Current and next lesson (first two incomplete)
  const incompleteByOrder = allLessons.filter((l: AnyRow) => !allCompleted.has(l.id));
  const currentLesson = incompleteByOrder[0]?.title ?? null;
  const nextLesson = incompleteByOrder[1]?.title ?? null;

  // Recent lessons (titles of last 5 completed)
  const recentLessons = recentProgress
    .slice(0, 5)
    .map((p: AnyRow) => (p.lessons as AnyRow)?.title)
    .filter(Boolean) as string[];

  // Weak spots — deduplicated, sorted by frequency
  const topicMap = new Map<string, number>();
  for (const ws of (weakRes.data as AnyRow[]) ?? []) {
    const key = ws.topic.trim();
    topicMap.set(key, (topicMap.get(key) ?? 0) + 1);
  }
  const weakSpots = Array.from(topicMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([topic]) => topic);

  // Mastered topics
  const resolvedSpots = (resolvedSpotsRes.data as AnyRow[]) ?? [];
  let masteredTopics: string[] = resolvedSpots.map((r: AnyRow) => r.topic);
  if (masteredTopics.length === 0) {
    const highScoreCount = (quizScoresRes.data as AnyRow[])?.length ?? 0;
    if (highScoreCount >= 3) masteredTopics = ["Core concepts", "Applied practice"];
    else if (highScoreCount >= 1) masteredTopics = ["Core concepts"];
  }

  // Streak
  const completedTimestamps = ((streakProgressRes.data as AnyRow[]) ?? [])
    .map((p: AnyRow) => p.completed_at as string)
    .filter(Boolean);
  const streak = computeStreak(completedTimestamps);

  const ctx: TutorContext = {
    goal: goal ? { title: goal.title, targetDate: goal.target_date } : null,
    course: {
      title: course?.title ?? "Your course",
      difficultyLevel: course?.difficulty_level ?? null,
    },
    progress: { completedLessons, totalLessons, completedModules, totalModules: modules.length },
    recentLessons,
    currentLesson,
    nextLesson,
    weakSpots,
    masteredTopics: masteredTopics.slice(0, 5),
    difficultyLevel: adaptive?.difficulty_level ?? "standard",
    rollingScore: adaptive?.rolling_score ?? null,
    streak,
    systemContext: "", // filled below
  };

  ctx.systemContext = buildSystemContextString(ctx);

  contextCache.set(cacheKey, { data: ctx, expiresAt: Date.now() + 5 * 60 * 1000 });

  // Evict old entries
  if (contextCache.size > 500) {
    const firstKey = contextCache.keys().next().value;
    if (firstKey) contextCache.delete(firstKey);
  }

  return ctx;
}

function buildSystemContextString(ctx: TutorContext): string {
  const lines: string[] = [];

  if (ctx.goal) {
    lines.push(`Goal: "${ctx.goal.title}"${ctx.goal.targetDate ? ` (target: ${new Date(ctx.goal.targetDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })})` : ""}`);
  }

  lines.push(`Course: "${ctx.course.title}" — ${formatDifficultyLevel(ctx.course.difficultyLevel)} level`);
  lines.push(`Progress: ${ctx.progress.completedLessons}/${ctx.progress.totalLessons} lessons complete, ${ctx.progress.completedModules}/${ctx.progress.totalModules} modules done`);

  if (ctx.recentLessons.length > 0) {
    lines.push(`Recently completed: ${ctx.recentLessons.map((l) => `"${l}"`).join(", ")}`);
  }

  if (ctx.currentLesson) {
    lines.push(`Currently on: "${ctx.currentLesson}"`);
  }
  if (ctx.nextLesson) {
    lines.push(`Up next: "${ctx.nextLesson}"`);
  }

  lines.push(`Adaptive difficulty: ${ctx.difficultyLevel}`);

  if (ctx.rollingScore !== null) {
    lines.push(`Quiz performance (rolling avg): ${ctx.rollingScore}%`);
  }

  if (ctx.streak > 0) {
    lines.push(`Learning streak: ${ctx.streak} day${ctx.streak !== 1 ? "s" : ""}`);
  }

  if (ctx.weakSpots.length > 0) {
    lines.push(`Topics needing reinforcement: ${ctx.weakSpots.map((t) => `"${t}"`).join(", ")}`);
  }

  if (ctx.masteredTopics.length > 0) {
    lines.push(`Topics mastered: ${ctx.masteredTopics.map((t) => `"${t}"`).join(", ")}`);
  }

  return lines.join("\n");
}

export function buildSuggestedQuestions(ctx: TutorContext): string[] {
  const questions: string[] = [];
  if (ctx.weakSpots[0]) {
    questions.push(`Explain "${ctx.weakSpots[0]}" in a different way — I'm struggling with it`);
  }
  questions.push("What should I focus on next given my current progress?");
  if (ctx.currentLesson) {
    questions.push(`I'm stuck on "${ctx.currentLesson}" — can you help?`);
  } else {
    questions.push("Give me a quick quiz on what I've learned so far");
  }
  return questions;
}
