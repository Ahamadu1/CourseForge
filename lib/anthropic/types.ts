// ─── Input types ─────────────────────────────────────────────────────────────

export type SkillLevel = "complete_beginner" | "some_knowledge" | "intermediate" | "advanced";

export interface OnboardingData {
  niche: string;
  level: SkillLevel;
  goal: string;
  time: string;
  style: string;
  knowledgeCheck: string;
}

export interface LessonContentContext {
  courseTitle: string;
  moduleTitle: string;
  lessonTitle: string;
  lessonPosition: number;
  totalLessons: number;
  level: string;
  previousLessons?: string[];
  /** Optional adaptive override: changes depth/pacing based on quiz history */
  adaptiveDifficulty?: "foundational" | "standard" | "advanced";
}

export interface QuizContext {
  lessonTitle: string;
  lessonContent: string;
  level: string;
}

export interface GoalBreakdownContext {
  userGoal: string;
  courseTitle: string;
  modules: string[];
  timePerWeek: string;
}

// ─── Generated output types ───────────────────────────────────────────────────

export interface GeneratedLesson {
  title: string;
  content_type: "text" | "video" | "interactive" | "audio";
  duration_minutes: number;
  position: number;
}

export interface GeneratedModule {
  title: string;
  description: string;
  position: number;
  lessons: GeneratedLesson[];
}

export interface GeneratedCourseOutline {
  title: string;
  description: string;
  slug: string;
  difficulty_level: SkillLevel;
  modules: GeneratedModule[];
}

export interface Slide {
  heading: string;
  bullets: string[];
  keyPoint?: string;
  kind: "intro" | "concept" | "example" | "action" | "summary";
}

export interface GeneratedLessonContent {
  content: string;
  summary: string;
  key_takeaways: string[];
  slides: Slide[];
}

export interface GeneratedQuizQuestion {
  id: string;
  text: string;
  type: "multiple_choice";
  options: string[];
  correct_answer: string;
  explanation: string;
  points: number;
}

export interface GeneratedQuiz {
  title: string;
  questions: GeneratedQuizQuestion[];
}

export interface GeneratedGoal {
  title: string;
  description: string;
  target_date: string;
}

export interface GeneratedTask {
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
  due_date: string;
}

export interface GeneratedGoalBreakdown {
  goal: GeneratedGoal;
  tasks: GeneratedTask[];
}
