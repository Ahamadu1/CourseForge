import { createAdminClient } from "@/lib/supabase/admin";
import type { LearningProfile, WeakTopic, AdaptiveDifficultyLevel } from "./types";

/**
 * Builds a learning profile for a user from their quiz history, weak spots,
 * and lesson completion data. Pure read — no side effects.
 */
export async function buildLearningProfile(userId: string): Promise<LearningProfile> {
  const db = createAdminClient();

  // Parallel reads for speed
  const [weakRes, attemptsRes, progressRes] = await Promise.all([
    db
      .from("weak_spots")
      .select("topic, created_at")
      .eq("user_id", userId)
      .eq("resolved", false)
      .order("created_at", { ascending: false })
      .limit(60),

    db
      .from("quiz_attempts")
      .select("score, passed, completed_at")
      .eq("user_id", userId)
      .not("score", "is", null)
      .order("completed_at", { ascending: false })
      .limit(10),

    db
      .from("lesson_progress")
      .select("completed_at")
      .eq("user_id", userId)
      .eq("completed", true)
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false })
      .limit(30),
  ]);

  // ── Weak topics: group by topic text, count occurrences ─────────────────
  const topicMap = new Map<string, { count: number; lastSeen: string }>();
  for (const ws of weakRes.data ?? []) {
    const key = ws.topic.trim();
    const prev = topicMap.get(key);
    if (!prev) {
      topicMap.set(key, { count: 1, lastSeen: ws.created_at });
    } else {
      topicMap.set(key, {
        count: prev.count + 1,
        lastSeen: ws.created_at > prev.lastSeen ? ws.created_at : prev.lastSeen,
      });
    }
  }

  const weakTopics: WeakTopic[] = Array.from(topicMap.entries())
    .sort((a, b) => b[1].count - a[1].count || b[1].lastSeen.localeCompare(a[1].lastSeen))
    .slice(0, 3)
    .map(([topic, { count, lastSeen }]) => ({ topic, occurrences: count, lastSeen }));

  // ── Rolling score: average of last 5 quiz attempts ───────────────────────
  const recentAttempts = (attemptsRes.data ?? []).slice(0, 5);
  const scores = recentAttempts.map((a) => a.score as number);
  const rollingScore =
    scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : null;

  // ── Mastered topics: inferred from number of high-score passes ──────────
  const highScoreCount = (attemptsRes.data ?? []).filter((a) => (a.score ?? 0) >= 80).length;
  const masteredTopics =
    highScoreCount >= 3
      ? ["Core concepts", "Applied practice"]
      : highScoreCount >= 1
      ? ["Core concepts"]
      : [];

  // ── Pace: lessons completed in the last 7 days ──────────────────────────
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const lessonsLastWeek = (progressRes.data ?? []).filter(
    (p) => p.completed_at && p.completed_at >= oneWeekAgo
  ).length;
  const lessonsPerDay = Math.round((lessonsLastWeek / 7) * 10) / 10;

  // ── Adaptive difficulty derived from rolling score ───────────────────────
  let difficultyLevel: AdaptiveDifficultyLevel;
  if (rollingScore === null) {
    difficultyLevel = "standard";
  } else if (rollingScore < 55) {
    difficultyLevel = "foundational";
  } else if (rollingScore >= 80) {
    difficultyLevel = "advanced";
  } else {
    difficultyLevel = "standard";
  }

  return {
    weakTopics,
    masteredTopics,
    rollingScore,
    pace: { lessonsLastWeek, lessonsPerDay },
    difficultyLevel,
  };
}
