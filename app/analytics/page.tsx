import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getAnthropicClient } from "@/lib/anthropic/client";
import { MODELS } from "@/lib/anthropic/models";
import { AnalyticsClient } from "./AnalyticsClient";
import type {
  AnalyticsData,
  TimelinePoint,
  QuizHistoryItem,
  TopicMasteryItem,
  Achievement,
} from "./AnalyticsClient";

// ─── Raw DB shapes ────────────────────────────────────────────────────────────

type RawCourse = { id: string; title: string; difficulty_level: string | null };

type RawModule = {
  id: string;
  title: string;
  position: number;
  lessons: { id: string }[];
};

type RawProgress = {
  lesson_id: string;
  completed_at: string | null;
  lessons: { title: string; duration_minutes: number | null; module_id: string } | null;
};

type RawAttempt = {
  id: string;
  quiz_id: string;
  score: number | null;
  passed: boolean | null;
  completed_at: string | null;
  quizzes: { lesson_id: string | null; lessons: { title: string } | null } | null;
};

type RawWeakSpot = { topic: string; resolved: boolean; created_at: string };

type RawAdaptive = { rolling_score: number | null; difficulty_level: string };

// ─── Pure computation helpers ─────────────────────────────────────────────────

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

function computeProgressTimeline(isoTimestamps: string[]): TimelinePoint[] {
  const sorted = isoTimestamps.filter(Boolean).sort();
  const result: TimelinePoint[] = [];
  const now = new Date();

  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const dayStr = d.toISOString().slice(0, 10);
    const cumulative = sorted.filter((ts) => ts.slice(0, 10) <= dayStr).length;
    result.push({
      date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      cumulative,
    });
  }
  return result;
}

function computeMostActiveDay(isoTimestamps: string[]): string | null {
  if (isoTimestamps.length === 0) return null;
  const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const counts = new Array(7).fill(0);
  for (const ts of isoTimestamps) {
    counts[new Date(ts).getDay()]++;
  }
  const max = Math.max(...counts);
  if (max === 0) return null;
  return DAYS[counts.indexOf(max)];
}

function computeBestStudyHour(isoTimestamps: string[]): number | null {
  if (isoTimestamps.length === 0) return null;
  const counts = new Array(24).fill(0);
  for (const ts of isoTimestamps) counts[new Date(ts).getHours()]++;
  const max = Math.max(...counts);
  return max === 0 ? null : counts.indexOf(max);
}

function computeTopicMastery(spots: RawWeakSpot[]): TopicMasteryItem[] {
  const map = new Map<string, { resolved: number; unresolved: number }>();
  for (const ws of spots) {
    const key = ws.topic.slice(0, 70);
    const cur = map.get(key) ?? { resolved: 0, unresolved: 0 };
    if (ws.resolved) cur.resolved++;
    else cur.unresolved++;
    map.set(key, cur);
  }
  return Array.from(map.entries())
    .map(([topic, c]) => ({
      topic,
      status: (c.resolved > 0 ? "mastered" : c.unresolved >= 2 ? "weak" : "developing") as TopicMasteryItem["status"],
      occurrences: c.resolved + c.unresolved,
    }))
    .sort((a, b) => b.occurrences - a.occurrences);
}

function computeAchievements(data: {
  attempts: RawAttempt[];
  completedCount: number;
  streak: number;
  moduleCompletion: Map<string, { total: number; done: number }>;
}): Achievement[] {
  const { attempts, completedCount, streak, moduleCompletion } = data;

  const acedQuiz = attempts.find((a) => (a.score ?? 0) >= 90);

  const quizMap = new Map<string, { failed: boolean; passed: boolean }>();
  for (const a of attempts) {
    const cur = quizMap.get(a.quiz_id) ?? { failed: false, passed: false };
    if (!a.passed) cur.failed = true;
    if (a.passed) cur.passed = true;
    quizMap.set(a.quiz_id, cur);
  }
  const comebackKid = Array.from(quizMap.values()).some((q) => q.failed && q.passed);

  const anyModuleDone = Array.from(moduleCompletion.values()).some(
    ({ total, done }) => total > 0 && total === done
  );

  const scores = attempts.map((a) => a.score ?? 0);
  let quizSharp = false;
  for (let i = 0; i <= scores.length - 3; i++) {
    if (scores[i] >= 80 && scores[i + 1] >= 80 && scores[i + 2] >= 80) {
      quizSharp = true;
      break;
    }
  }

  return [
    {
      id: "quiz-ace",
      title: "Quiz Ace",
      description: "Score 90%+ on any quiz",
      icon: "🎯",
      earned: !!acedQuiz,
    },
    {
      id: "week-warrior",
      title: "Week Warrior",
      description: "Maintain a 7-day learning streak",
      icon: "🔥",
      earned: streak >= 7,
    },
    {
      id: "module-master",
      title: "Module Master",
      description: "Complete all lessons in a module",
      icon: "🏆",
      earned: anyModuleDone,
    },
    {
      id: "comeback-kid",
      title: "Comeback Kid",
      description: "Fail a quiz, then retake and pass",
      icon: "💪",
      earned: comebackKid,
    },
    {
      id: "deep-dive",
      title: "Deep Dive",
      description: "Complete 5 or more lessons",
      icon: "🤿",
      earned: completedCount >= 5,
    },
    {
      id: "quiz-sharp",
      title: "Quiz Sharp",
      description: "Score 80%+ on 3 quizzes in a row",
      icon: "⚡",
      earned: quizSharp,
    },
  ];
}

// Per-process in-memory insight cache keyed by `userId:date`
const insightCache = new Map<string, string>();

async function getInsight(stats: {
  lessonsCompleted: number;
  totalLessons: number;
  avgQuizScore: number | null;
  streak: number;
  lessonsLastWeek: number;
  weakTopics: string[];
}): Promise<string> {
  const today = new Date().toISOString().slice(0, 10);
  // Cache key is intentionally incomplete — userId must be prepended by caller
  const prompt = `You are a supportive learning coach. Write exactly 1–2 sentences of personalized, specific insight. Be warm and direct. No generic platitudes.

Student data:
- Lessons completed: ${stats.lessonsCompleted} of ${stats.totalLessons}
- Avg quiz score: ${stats.avgQuizScore !== null ? stats.avgQuizScore + "%" : "none yet"}
- Current streak: ${stats.streak} day${stats.streak !== 1 ? "s" : ""}
- Lessons this week: ${stats.lessonsLastWeek}
- Topics to reinforce: ${stats.weakTopics.slice(0, 2).join(", ") || "none identified yet"}

Write the insight:`;

  try {
    const client = getAnthropicClient();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);

    const response = await client.messages.create({
      model: MODELS.HAIKU,
      max_tokens: 120,
      messages: [{ role: "user", content: prompt }],
    });
    clearTimeout(timer);

    const text = response.content[0]?.type === "text" ? response.content[0].text.trim() : null;
    return text || "You're building solid momentum — keep the habit going!";
  } catch {
    return stats.streak > 0
      ? `${stats.streak}-day streak — that kind of consistency compounds fast.`
      : "Every lesson you complete sharpens your edge — keep going!";
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();

  // ── Fetch course ──────────────────────────────────────────────────────────
  const { data: rawCourse } = await admin
    .from("courses")
    .select("id, title, difficulty_level")
    .eq("creator_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const course = rawCourse as unknown as RawCourse | null;
  if (!course) redirect("/onboarding");

  // ── Parallel data fetches ─────────────────────────────────────────────────
  const [modulesRes, progressRes, attemptsRes, weakSpotsRes, adaptiveRes] =
    await Promise.all([
      admin
        .from("modules")
        .select("id, title, position, lessons(id)")
        .eq("course_id", course.id)
        .order("position"),

      admin
        .from("lesson_progress")
        .select("lesson_id, completed_at, lessons(title, duration_minutes, module_id)")
        .eq("user_id", user.id)
        .eq("completed", true)
        .order("completed_at", { ascending: true }),

      admin
        .from("quiz_attempts")
        .select("id, quiz_id, score, passed, completed_at, quizzes(lesson_id, lessons(title))")
        .eq("user_id", user.id)
        .not("score", "is", null)
        .order("completed_at", { ascending: true }),

      admin
        .from("weak_spots")
        .select("topic, resolved, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(150),

      admin
        .from("adaptive_profiles")
        .select("rolling_score, difficulty_level")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

  const moduleRows = (modulesRes.data as unknown as RawModule[]) ?? [];
  const progressRows = (progressRes.data as unknown as RawProgress[]) ?? [];
  const attemptRows = (attemptsRes.data as unknown as RawAttempt[]) ?? [];
  const weakSpotRows = (weakSpotsRes.data as unknown as RawWeakSpot[]) ?? [];
  const adaptive = adaptiveRes.data as unknown as RawAdaptive | null;

  // ── Compute metrics ───────────────────────────────────────────────────────
  const completedIds = new Set(progressRows.map((p) => p.lesson_id));
  const totalLessons = moduleRows.flatMap((m) => m.lessons).length;
  const lessonsCompleted = completedIds.size;

  const scores = attemptRows.map((a) => a.score).filter((s): s is number => s !== null);
  const avgQuizScore = scores.length > 0
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : null;

  const completedTimestamps = progressRows
    .map((p) => p.completed_at)
    .filter((t): t is string => Boolean(t));

  const currentStreak = computeStreak(completedTimestamps);

  const hoursInvested =
    Math.round(
      (progressRows.reduce((sum, p) => sum + (p.lessons?.duration_minutes ?? 30), 0) / 60) * 10
    ) / 10;

  const progressTimeline = computeProgressTimeline(completedTimestamps);

  const quizHistory: QuizHistoryItem[] = attemptRows.slice(-10).map((a) => ({
    date: a.completed_at
      ? new Date(a.completed_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })
      : "—",
    score: a.score ?? 0,
    passed: a.passed ?? false,
    lessonTitle: a.quizzes?.lessons?.title ?? "Quiz",
  }));

  const topicMastery = computeTopicMastery(weakSpotRows);

  const mostActiveDay = computeMostActiveDay(completedTimestamps);
  const bestStudyHour = computeBestStudyHour(completedTimestamps);

  const oneWeekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const lessonsLastWeek = completedTimestamps.filter((t) => t >= oneWeekAgo).length;

  // Module completion map for achievements
  const moduleCompletion = new Map<string, { total: number; done: number }>();
  for (const mod of moduleRows) {
    const done = mod.lessons.filter((l) => completedIds.has(l.id)).length;
    moduleCompletion.set(mod.id, { total: mod.lessons.length, done });
  }

  const achievements = computeAchievements({
    attempts: attemptRows,
    completedCount: lessonsCompleted,
    streak: currentStreak,
    moduleCompletion,
  });

  // ── AI insight (cached per user per day) ──────────────────────────────────
  const cacheKey = `${user.id}:${new Date().toISOString().slice(0, 10)}`;
  let insight = insightCache.get(cacheKey);
  if (!insight) {
    insight = await getInsight({
      lessonsCompleted,
      totalLessons,
      avgQuizScore,
      streak: currentStreak,
      lessonsLastWeek,
      weakTopics: topicMastery.filter((t) => t.status === "weak").map((t) => t.topic),
    });
    insightCache.set(cacheKey, insight);
    // Prevent unbounded growth
    if (insightCache.size > 500) {
      const firstKey = insightCache.keys().next().value;
      if (firstKey) insightCache.delete(firstKey);
    }
  }

  const analyticsData: AnalyticsData = {
    courseTitle: course.title,
    difficultyLevel: course.difficulty_level,
    lessonsCompleted,
    totalLessons,
    avgQuizScore,
    currentStreak,
    hoursInvested,
    progressTimeline,
    quizHistory,
    topicMastery,
    mostActiveDay,
    bestStudyHour,
    lessonsLastWeek,
    achievements,
    insight,
    rollingScore: adaptive?.rolling_score ?? null,
    adaptiveDifficultyLevel: adaptive?.difficulty_level ?? null,
  };

  return <AnalyticsClient data={analyticsData} />;
}
