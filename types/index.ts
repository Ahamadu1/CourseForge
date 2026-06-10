import type { Database } from "./database";

// ─── Table row types ──────────────────────────────────────────────────────────

export type UserProfile = Database["public"]["Tables"]["user_profiles"]["Row"];
export type Course = Database["public"]["Tables"]["courses"]["Row"];
export type Module = Database["public"]["Tables"]["modules"]["Row"];
export type Lesson = Database["public"]["Tables"]["lessons"]["Row"];
export type Quiz = Database["public"]["Tables"]["quizzes"]["Row"];
export type QuizAttempt = Database["public"]["Tables"]["quiz_attempts"]["Row"];
export type Goal = Database["public"]["Tables"]["goals"]["Row"];
export type Task = Database["public"]["Tables"]["tasks"]["Row"];
export type WeakSpot = Database["public"]["Tables"]["weak_spots"]["Row"];
export type Enrollment = Database["public"]["Tables"]["enrollments"]["Row"];
export type LessonProgress = Database["public"]["Tables"]["lesson_progress"]["Row"];

// ─── Insert types ─────────────────────────────────────────────────────────────

export type InsertUserProfile = Database["public"]["Tables"]["user_profiles"]["Insert"];
export type InsertCourse = Database["public"]["Tables"]["courses"]["Insert"];
export type InsertModule = Database["public"]["Tables"]["modules"]["Insert"];
export type InsertLesson = Database["public"]["Tables"]["lessons"]["Insert"];
export type InsertQuiz = Database["public"]["Tables"]["quizzes"]["Insert"];
export type InsertQuizAttempt = Database["public"]["Tables"]["quiz_attempts"]["Insert"];
export type InsertGoal = Database["public"]["Tables"]["goals"]["Insert"];
export type InsertTask = Database["public"]["Tables"]["tasks"]["Insert"];
export type InsertWeakSpot = Database["public"]["Tables"]["weak_spots"]["Insert"];

// ─── Update types ─────────────────────────────────────────────────────────────

export type UpdateUserProfile = Database["public"]["Tables"]["user_profiles"]["Update"];
export type UpdateCourse = Database["public"]["Tables"]["courses"]["Update"];
export type UpdateGoal = Database["public"]["Tables"]["goals"]["Update"];
export type UpdateTask = Database["public"]["Tables"]["tasks"]["Update"];
export type UpdateWeakSpot = Database["public"]["Tables"]["weak_spots"]["Update"];

// ─── Enum types ───────────────────────────────────────────────────────────────

export type DifficultyLevel = "beginner" | "intermediate" | "advanced";
export type ContentType = "video" | "text" | "interactive" | "audio";
export type GoalStatus = "active" | "completed" | "paused" | "abandoned";
export type TaskPriority = "low" | "medium" | "high";
export type TaskStatus = "todo" | "in_progress" | "done";

// ─── Composite / enriched types ───────────────────────────────────────────────

export type CourseWithModules = Course & {
  modules: (Module & {
    lessons: Lesson[];
  })[];
};

export type ModuleWithLessons = Module & {
  lessons: Lesson[];
};

export type GoalWithTasks = Goal & {
  tasks: Task[];
};
