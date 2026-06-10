import type { LearningProfile, Recommendation } from "./types";

/**
 * Pure function — derives ONE recommendation from the user's learning profile.
 */
export function getRecommendation(
  profile: LearningProfile,
  opts: { nextLessonId?: string | null; remedialLessonId?: string | null } = {}
): Recommendation {
  const { weakTopics, rollingScore, pace, difficultyLevel } = profile;
  const { nextLessonId, remedialLessonId } = opts;
  const href = (id?: string | null) =>
    id ? `/lesson/${id}` : "/dashboard";

  // 1. Remedial lesson queued — highest priority
  if (remedialLessonId && weakTopics.length > 0) {
    const topic = weakTopics[0].topic.slice(0, 70);
    return {
      type: "review",
      message: `"${topic}" was a gap — a short refresher has been added right after that lesson.`,
      ctaLabel: "Take the refresher",
      ctaHref: `/lesson/${remedialLessonId}`,
    };
  }

  // 2. Repeated weak spots + low score
  if (weakTopics.length >= 2 && (rollingScore ?? 100) < 65) {
    const topic = weakTopics[0].topic.slice(0, 70);
    return {
      type: "review",
      message: `"${topic}" keeps appearing as a gap. Reinforcing it now will unlock later modules faster.`,
      ctaLabel: "Resume course",
      ctaHref: href(nextLessonId),
    };
  }

  // 3. High scorer on advanced track
  if ((rollingScore ?? 0) >= 85 && difficultyLevel === "advanced" && nextLessonId) {
    return {
      type: "advance",
      message: "You're averaging 85%+ — genuinely ahead of pace. Keep the momentum.",
      ctaLabel: "Continue learning",
      ctaHref: `/lesson/${nextLessonId}`,
    };
  }

  // 4. No activity in a week
  if (pace.lessonsLastWeek === 0) {
    return {
      type: "pace",
      message: "Pick up where you left off — even one lesson today rebuilds the habit.",
      ctaLabel: nextLessonId ? "Resume" : "Go to dashboard",
      ctaHref: href(nextLessonId),
    };
  }

  // 5. Strong recent pace
  if (pace.lessonsLastWeek >= 4) {
    return {
      type: "encourage",
      message: `${pace.lessonsLastWeek} lessons this week — that's real momentum.`,
      ctaLabel: nextLessonId ? "Next lesson" : "View progress",
      ctaHref: href(nextLessonId),
    };
  }

  // 6. Default positive nudge
  return {
    type: "encourage",
    message: "You're making solid progress — keep going.",
    ctaLabel: nextLessonId ? "Next lesson" : "View progress",
    ctaHref: href(nextLessonId),
  };
}
