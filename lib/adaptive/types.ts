export type AdaptiveDifficultyLevel = "foundational" | "standard" | "advanced";

export interface WeakTopic {
  topic: string;
  occurrences: number;
  lastSeen: string; // ISO timestamp
}

export interface LearningProfile {
  weakTopics: WeakTopic[];
  masteredTopics: string[];
  rollingScore: number | null;
  pace: {
    lessonsLastWeek: number;
    lessonsPerDay: number;
  };
  difficultyLevel: AdaptiveDifficultyLevel;
}

export interface Recommendation {
  type: "review" | "advance" | "pace" | "encourage";
  message: string;
  ctaLabel: string;
  ctaHref: string;
}
