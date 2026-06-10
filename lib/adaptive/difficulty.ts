import { createAdminClient } from "@/lib/supabase/admin";
import type { AdaptiveDifficultyLevel } from "./types";

export async function getAdaptiveProfile(userId: string): Promise<{
  rolling_score: number | null;
  difficulty_level: AdaptiveDifficultyLevel;
}> {
  const db = createAdminClient();
  const { data } = await db
    .from("adaptive_profiles")
    .select("rolling_score, difficulty_level")
    .eq("user_id", userId)
    .maybeSingle();

  return {
    rolling_score: data?.rolling_score ?? null,
    difficulty_level: (data?.difficulty_level as AdaptiveDifficultyLevel) ?? "standard",
  };
}

/**
 * Updates the user's adaptive profile with a new quiz score using an
 * exponential moving average (70% historical weight, 30% new score).
 * Creates the row if it doesn't exist yet.
 */
export async function updateRollingScore(userId: string, score: number): Promise<void> {
  const db = createAdminClient();

  const { data: existing } = await db
    .from("adaptive_profiles")
    .select("rolling_score")
    .eq("user_id", userId)
    .maybeSingle();

  const prev = existing?.rolling_score ?? null;
  const updated =
    prev === null ? score : Math.round(prev * 0.7 + score * 0.3);

  let difficulty: AdaptiveDifficultyLevel;
  if (updated < 55) difficulty = "foundational";
  else if (updated >= 80) difficulty = "advanced";
  else difficulty = "standard";

  await db.from("adaptive_profiles").upsert(
    {
      user_id: userId,
      rolling_score: updated,
      difficulty_level: difficulty,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
}
