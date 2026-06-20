"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatDuration, slugify } from "@/lib/utils";
import { EmbeddedTutorTab } from "@/app/tutor/EmbeddedTutorTab";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LessonData {
  id: string;
  module_id: string;
  title: string;
  content_type: string;
  lesson_type?: string;
  duration_minutes: number | null;
  position: number;
}

export interface ModuleData {
  id: string;
  title: string;
  description: string | null;
  position: number;
  lessons: LessonData[];
}

export interface CourseData {
  id: string;
  title: string;
  description: string | null;
  difficulty_level: string | null;
  created_at: string;
}

export interface GoalData {
  id: string;
  title: string;
  description: string | null;
  target_date: string | null;
  status: string;
  progress: number;
}

export interface TaskData {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: string;
  status: string;
}

export interface AdaptiveData {
  weakTopics: Array<{ topic: string; occurrences: number; lastSeen: string }>;
  masteredTopics: string[];
  rollingScore: number | null;
  difficultyLevel: "foundational" | "standard" | "advanced";
  recommendation: {
    type: "review" | "advance" | "pace" | "encourage";
    message: string;
    ctaLabel: string;
    ctaHref: string;
  };
}

interface DashboardProps {
  course: CourseData;
  modules: ModuleData[];
  completedLessonIds: string[];
  goal: GoalData | null;
  tasks: TaskData[];
  adaptiveData?: AdaptiveData;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

type ModuleStatus = "completed" | "current" | "locked";

function getModuleStatus(
  module: ModuleData,
  sorted: ModuleData[],
  completedIds: Set<string>
): ModuleStatus {
  const idx = sorted.findIndex((m) => m.id === module.id);
  const prevDone = sorted
    .slice(0, idx)
    .every((m) => m.lessons.length === 0 || m.lessons.every((l) => completedIds.has(l.id)));

  if (!prevDone) return "locked";
  const thisDone =
    module.lessons.length === 0 || module.lessons.every((l) => completedIds.has(l.id));
  return thisDone ? "completed" : "current";
}

function getModuleTag(position: number, title: string): string {
  const t = title.toLowerCase();
  if (/intro|foundation|getting started|basics|fundament|overview/.test(t)) return "Foundation";
  if (/strategy|planning|system|framework/.test(t)) return "Strategy";
  if (/action|execut|build|launch|deploy|implement/.test(t)) return "Action";
  if (/advanced|expert|master|optim/.test(t)) return "Advanced";
  const tags = ["Foundation", "Core Skills", "Application", "Strategy", "Action", "Advanced"];
  return tags[Math.min(position, tags.length - 1)];
}

function tagStyle(tag: string): string {
  switch (tag) {
    case "Foundation":  return "bg-[#EEEDFE] text-[#3C3489]";
    case "Core Skills": return "bg-blue-50 text-blue-600";
    case "Application": return "bg-orange-50 text-[#EF9F27]";
    case "Strategy":    return "bg-violet-50 text-violet-600";
    case "Action":      return "bg-emerald-50 text-emerald-600";
    case "Advanced":    return "bg-red-50 text-[#D85A30]";
    default:            return "bg-gray-100 text-gray-600";
  }
}

function difficultyInfo(level: string | null): { label: string; bg: string; text: string } {
  switch (level) {
    case "beginner":
    case "complete_beginner":
      return { label: "Beginner", bg: "bg-[#1D9E75]/10", text: "text-[#1D9E75]" };
    case "some_knowledge":
      return { label: "Beginner+", bg: "bg-[#1D9E75]/10", text: "text-[#1D9E75]" };
    case "intermediate":
      return { label: "Intermediate", bg: "bg-[#EF9F27]/10", text: "text-[#EF9F27]" };
    case "advanced":
      return { label: "Advanced", bg: "bg-[#D85A30]/10", text: "text-[#D85A30]" };
    default:
      return { label: "All Levels", bg: "bg-gray-100", text: "text-gray-500" };
  }
}

function priorityDot(priority: string): string {
  if (priority === "high")   return "bg-[#D85A30]";
  if (priority === "medium") return "bg-[#EF9F27]";
  return "bg-[#1D9E75]";
}

function priorityLabel(priority: string): string {
  return priority.charAt(0).toUpperCase() + priority.slice(1);
}

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}


function adaptiveLevelInfo(level: "foundational" | "standard" | "advanced"): { label: string; bg: string; text: string } {
  switch (level) {
    case "foundational": return { label: "Foundational", bg: "bg-[#1D9E75]/10", text: "text-[#1D9E75]" };
    case "advanced":     return { label: "Advanced",     bg: "bg-[#D85A30]/10", text: "text-[#D85A30]" };
    default:             return { label: "Standard",     bg: "bg-[#7F77DD]/10", text: "text-[#7F77DD]" };
  }
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// ─── Course Tab ───────────────────────────────────────────────────────────────

function CourseTab({
  modules,
  completedIds,
  onExportPdf,
  exporting,
  exportError,
}: {
  modules: ModuleData[];
  completedIds: Set<string>;
  onExportPdf: () => void;
  exporting: boolean;
  exportError: boolean;
}) {
  const sorted = [...modules].sort((a, b) => a.position - b.position);

  if (sorted.length === 0) {
    return (
      <div className="text-center py-14 text-gray-400">
        <p className="text-sm">Your course modules are being set up…</p>
      </div>
    );
  }

  const remedialLessons = sorted.flatMap((m) =>
    m.lessons
      .filter((l) => l.lesson_type === "remedial")
      .map((l) => ({ ...l, moduleTitle: m.title }))
  );

  return (
    <div className="space-y-3">
      {remedialLessons.length > 0 && (
        <div className="mb-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Recommended Reviews
          </p>
          <div className="space-y-2">
            {remedialLessons.map((lesson) => (
              <a key={lesson.id} href={`/lesson/${lesson.id}`} className="block">
                <div
                  className="bg-[#FFF8EF] rounded-xl px-4 py-3.5 flex items-center gap-3 hover:shadow-sm transition-shadow"
                  style={{ border: "0.5px solid #EF9F27" }}
                >
                  <div className="w-8 h-8 rounded-full bg-[#EF9F27]/15 flex items-center justify-center flex-shrink-0">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#EF9F27" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="mb-0.5">
                      <span className="text-[10px] font-semibold text-[#EF9F27] bg-[#EF9F27]/10 px-2 py-0.5 rounded-full">
                        Recommended Review
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-800 leading-snug">{lesson.title}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{lesson.moduleTitle}</p>
                  </div>
                  <svg className="flex-shrink-0 text-[#EF9F27]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
      {sorted.map((mod) => {
        const status = getModuleStatus(mod, sorted, completedIds);
        const tag = getModuleTag(mod.position, mod.title);
        const firstLesson = [...mod.lessons].sort((a, b) => a.position - b.position)[0];
        const totalMins = mod.lessons.reduce(
          (s, l) => s + (l.duration_minutes ?? 30),
          0
        );
        const completedInModule = mod.lessons.filter((l) => completedIds.has(l.id)).length;
        const isClickable = status === "completed" || status === "current";
        const href = firstLesson ? `/lesson/${firstLesson.id}` : "#";

        const card = (
          <div
            className={`bg-white rounded-xl p-4 sm:p-5 flex items-start gap-4 transition-all duration-150 ${
              isClickable
                ? "cursor-pointer hover:border-[#7F77DD] hover:shadow-sm"
                : "cursor-not-allowed opacity-55"
            }`}
            style={{ border: `${isClickable ? "0.5px" : "0.5px"} solid ${isClickable ? "#E5E7EB" : "#E5E7EB"}` }}
          >
            {/* Status circle */}
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold transition-colors ${
                status === "completed"
                  ? "bg-[#1D9E75] text-white"
                  : status === "current"
                  ? "bg-[#7F77DD] text-white"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              {status === "completed" ? (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <polyline points="2,7 5.5,10.5 12,3.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : status === "locked" ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              ) : (
                mod.position + 1
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${tagStyle(tag)}`}>
                  {tag}
                </span>
                {status === "completed" && (
                  <span className="text-[10px] font-semibold text-[#1D9E75]">
                    Completed
                  </span>
                )}
              </div>
              <p className="text-sm font-semibold text-gray-900 leading-snug mb-0.5">
                {mod.title}
              </p>
              {mod.description && (
                <p className="text-xs text-gray-500 line-clamp-1 mb-2">{mod.description}</p>
              )}
              <p className="text-xs text-gray-400">
                {mod.lessons.length} lesson{mod.lessons.length !== 1 ? "s" : ""}
                {totalMins > 0 && ` · ${formatDuration(totalMins)}`}
                {status === "current" && completedInModule > 0 && (
                  <span className="ml-1.5 text-[#7F77DD]">
                    · {completedInModule}/{mod.lessons.length} done
                  </span>
                )}
              </p>
            </div>

            {/* Arrow for current */}
            {status === "current" && (
              <svg
                className="flex-shrink-0 text-[#7F77DD] mt-1"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            )}
          </div>
        );

        return isClickable ? (
          <a key={mod.id} href={href} className="block">
            {card}
          </a>
        ) : (
          <div key={mod.id}>{card}</div>
        );
      })}

      {/* ── Export section ── */}
      <div className="mt-6 pt-5 border-t border-gray-100">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Export Course
        </p>
        <div className="bg-white rounded-xl p-4" style={{ border: "0.5px solid #E5E7EB" }}>
          <p className="text-xs text-gray-500 mb-3 leading-relaxed">
            Save your complete course as a formatted PDF — lessons, quizzes, action plan, and answer key.
          </p>
          <div className="flex flex-col gap-2">
            <button
              onClick={onExportPdf}
              disabled={exporting}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border transition-all w-fit ${
                exportError
                  ? "border-red-200 text-red-500 bg-red-50"
                  : exporting
                  ? "border-[#7F77DD]/30 text-[#7F77DD]/60 cursor-not-allowed"
                  : "border-[#7F77DD] text-[#7F77DD] hover:bg-[#EEEDFE]"
              }`}
            >
              {exporting ? (
                <>
                  <svg className="animate-spin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  Generating PDF…
                </>
              ) : exportError ? (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  Export failed — try again
                </>
              ) : (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Export full course as PDF
                </>
              )}
            </button>
            <button
              disabled
              className="flex items-center justify-between gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border border-gray-200 text-gray-400 cursor-not-allowed w-fit"
            >
              <span className="flex items-center gap-2">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                Export current module
              </span>
              <span className="text-[10px] text-gray-400 ml-3">Coming soon</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Goals Tab ────────────────────────────────────────────────────────────────

function GoalsTab({ goal, tasks }: { goal: GoalData | null; tasks: TaskData[] }) {
  if (!goal) {
    return (
      <div className="text-center py-14 text-gray-400">
        <p className="text-sm">No goal found. Complete onboarding to set your goal.</p>
      </div>
    );
  }

  const pending = tasks.filter((t) => t.status !== "done");
  const done = tasks.filter((t) => t.status === "done");

  // Weekly milestones: first 4 tasks sorted by due_date
  const milestones = [...tasks]
    .filter((t) => t.due_date)
    .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
    .reduce<TaskData[][]>((weeks, task) => {
      if (weeks.length === 0) return [[task]];
      const lastWeekEnd = new Date(weeks[weeks.length - 1][0].due_date!);
      lastWeekEnd.setDate(lastWeekEnd.getDate() + 7);
      const taskDate = new Date(task.due_date!);
      if (taskDate <= lastWeekEnd) {
        weeks[weeks.length - 1].push(task);
      } else {
        weeks.push([task]);
      }
      return weeks;
    }, [])
    .slice(0, 4);

  return (
    <div className="space-y-6">
      {/* Goal statement */}
      <div className="bg-white rounded-xl p-5" style={{ border: "0.5px solid #E5E7EB" }}>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-5 h-5 rounded-full bg-[#EEEDFE] flex items-center justify-center">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#7F77DD" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <p className="text-xs font-semibold text-[#7F77DD] uppercase tracking-wide">Your Goal</p>
        </div>
        <p className="text-sm font-semibold text-gray-900 mb-1.5">{goal.title}</p>
        {goal.description && (
          <p className="text-sm text-gray-500 italic leading-relaxed">{goal.description}</p>
        )}
        {goal.target_date && (
          <p className="text-xs text-gray-400 mt-3">
            Target: {new Date(goal.target_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </p>
        )}
      </div>

      {/* Pending tasks */}
      {pending.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Tasks · {pending.length} remaining
          </p>
          <div className="bg-white rounded-xl divide-y divide-gray-50" style={{ border: "0.5px solid #E5E7EB" }}>
            {pending.map((task) => (
              <div key={task.id} className="flex items-start gap-3 px-4 py-3.5">
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${priorityDot(task.priority)}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 font-medium leading-snug">{task.title}</p>
                  {task.due_date && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      Due {formatShortDate(task.due_date)}
                    </p>
                  )}
                </div>
                <span className={`text-xs font-semibold flex-shrink-0 ${
                  task.priority === "high" ? "text-[#D85A30]" :
                  task.priority === "medium" ? "text-[#EF9F27]" :
                  "text-[#1D9E75]"
                }`}>
                  {priorityLabel(task.priority)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Weekly milestones */}
      {milestones.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Milestones
          </p>
          <div className="space-y-2.5">
            {milestones.map((week, i) => {
              const lastTask = week[week.length - 1];
              const allDone = week.every((t) => t.status === "done");
              return (
                <div
                  key={i}
                  className={`flex items-start gap-3 rounded-xl px-4 py-3.5 ${allDone ? "bg-[#1D9E75]/5" : "bg-white"}`}
                  style={{ border: `0.5px solid ${allDone ? "#1D9E75" : "#E5E7EB"}` }}
                >
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${allDone ? "bg-[#1D9E75]" : "bg-gray-100"}`}>
                    {allDone ? (
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <polyline points="2,5 4,7.5 8,3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : (
                      <span className="text-[9px] font-bold text-gray-500">{i + 1}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-700">Week {i + 1} Milestone</p>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                      {week.map((t) => t.title).join(" · ")}
                    </p>
                  </div>
                  {lastTask.due_date && (
                    <p className="text-xs text-gray-400 flex-shrink-0">{formatShortDate(lastTask.due_date)}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Completed tasks (collapsed) */}
      {done.length > 0 && (
        <p className="text-xs text-gray-400 text-center">
          {done.length} task{done.length !== 1 ? "s" : ""} completed ✓
        </p>
      )}
    </div>
  );
}

// ─── Schedule Tab ─────────────────────────────────────────────────────────────

interface DayPlan {
  date: Date;
  isToday: boolean;
  tasks: TaskData[];
  suggestedLesson: LessonData | null;
  suggestedModuleTitle: string | null;
}

function generateWeekPlan(
  tasks: TaskData[],
  modules: ModuleData[],
  completedIds: Set<string>
): DayPlan[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Start from Monday of current week
  const day = today.getDay();
  const offsetToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(today);
  monday.setDate(today.getDate() + offsetToMonday);

  const incompleteLessons = modules
    .slice()
    .sort((a, b) => a.position - b.position)
    .flatMap((m) =>
      m.lessons
        .slice()
        .sort((a, b) => a.position - b.position)
        .filter((l) => !completedIds.has(l.id))
        .map((l) => ({ lesson: l, moduleTitle: m.title }))
    );

  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);

    const dayTasks = tasks.filter((t) => {
      if (!t.due_date || t.status === "done") return false;
      const due = new Date(t.due_date);
      due.setHours(0, 0, 0, 0);
      return isSameDay(due, date);
    });

    const entry = incompleteLessons[i] ?? null;

    return {
      date,
      isToday: isSameDay(date, today),
      tasks: dayTasks,
      suggestedLesson: entry?.lesson ?? null,
      suggestedModuleTitle: entry?.moduleTitle ?? null,
    };
  });
}

function ScheduleTab({
  tasks,
  modules,
  completedIds,
}: {
  tasks: TaskData[];
  modules: ModuleData[];
  completedIds: Set<string>;
}) {
  const week = generateWeekPlan(tasks, modules, completedIds);
  const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className="space-y-2.5">
      {week.map((day, i) => {
        const hasContent = day.tasks.length > 0 || day.suggestedLesson;
        return (
          <div
            key={i}
            className={`rounded-xl px-4 py-4 transition-colors ${
              day.isToday ? "bg-[#EEEDFE]" : "bg-white"
            }`}
            style={{
              border: `${day.isToday ? "1px" : "0.5px"} solid ${day.isToday ? "#7F77DD" : "#E5E7EB"}`,
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <p className={`text-xs font-bold uppercase tracking-widest ${day.isToday ? "text-[#7F77DD]" : "text-gray-400"}`}>
                {DAYS[i]}
              </p>
              <p className={`text-xs ${day.isToday ? "text-[#3C3489]" : "text-gray-500"}`}>
                {day.date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </p>
              {day.isToday && (
                <span className="text-[10px] font-semibold bg-[#7F77DD] text-white px-2 py-0.5 rounded-full">
                  Today
                </span>
              )}
            </div>

            {!hasContent ? (
              <p className="text-xs text-gray-400 italic">Rest day — no sessions scheduled</p>
            ) : (
              <div className="space-y-2">
                {day.tasks.map((t) => (
                  <div key={t.id} className="flex items-start gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${priorityDot(t.priority)}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-800 leading-snug">{t.title}</p>
                    </div>
                  </div>
                ))}

                {day.suggestedLesson && (
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 bg-[#7F77DD]" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-[#3C3489] leading-snug">
                        Study: {day.suggestedLesson.title}
                      </p>
                      {day.suggestedModuleTitle && (
                        <p className="text-[10px] text-gray-400 mt-0.5">{day.suggestedModuleTitle}</p>
                      )}
                    </div>
                    {day.suggestedLesson.duration_minutes && (
                      <p className="text-[10px] text-gray-400 flex-shrink-0">
                        {formatDuration(day.suggestedLesson.duration_minutes)}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Progress Tab ─────────────────────────────────────────────────────────────

function ProgressTab({
  modules,
  completedIds,
  adaptiveData,
}: {
  modules: ModuleData[];
  completedIds: Set<string>;
  adaptiveData?: AdaptiveData;
}) {
  const totalLessons = modules.flatMap((m) => m.lessons).length;
  const completedCount = completedIds.size;

  if (completedCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div
          className="w-16 h-16 rounded-full bg-[#EEEDFE] flex items-center justify-center mb-5"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#7F77DD" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 21h8M12 17v4M12 3C8 3 5 6 5 10c0 2.4 1 4.5 2.7 6h8.6C18 14.5 19 12.4 19 10c0-4-3-7-7-7z" />
          </svg>
        </div>
        <h3 className="text-base font-semibold text-gray-900 mb-2">Start your first lesson</h3>
        <p className="text-sm text-gray-500 max-w-xs leading-relaxed mb-7">
          Begin Module 1 to start tracking your progress and building your streak.
        </p>
        {(() => {
          const firstLesson = modules
            .slice()
            .sort((a, b) => a.position - b.position)
            .flatMap((m) => m.lessons.slice().sort((a, b) => a.position - b.position))[0];
          return firstLesson ? (
            <a
              href={`/lesson/${firstLesson.id}`}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#7F77DD] hover:bg-[#3C3489] text-white text-sm font-semibold rounded-xl transition-colors"
            >
              Start Learning
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </a>
          ) : null;
        })()}
      </div>
    );
  }

  const overallPct = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
  const sortedMods = [...modules].sort((a, b) => a.position - b.position);

  return (
    <div className="space-y-5">
      {/* Overall progress */}
      <div className="bg-white rounded-xl p-5" style={{ border: "0.5px solid #E5E7EB" }}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-gray-800">Overall progress</p>
          <p className="text-sm font-bold text-[#7F77DD]">{overallPct}%</p>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#7F77DD] rounded-full transition-all duration-700"
            style={{ width: `${overallPct}%` }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-2">
          {completedCount} of {totalLessons} lessons completed
        </p>
      </div>

      {/* Module breakdown */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          By Module
        </p>
        <div className="space-y-2.5">
          {sortedMods.map((mod) => {
            const done = mod.lessons.filter((l) => completedIds.has(l.id)).length;
            const total = mod.lessons.length;
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;
            return (
              <div key={mod.id} className="bg-white rounded-xl px-4 py-3.5" style={{ border: "0.5px solid #E5E7EB" }}>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs font-medium text-gray-800 truncate pr-3">{mod.title}</p>
                  <p className="text-xs text-gray-500 flex-shrink-0">{done}/{total}</p>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${pct === 100 ? "bg-[#1D9E75]" : "bg-[#7F77DD]"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Analytics link */}
      <a
        href="/analytics"
        className="flex items-center justify-between bg-white rounded-xl px-5 py-4 hover:shadow-sm transition-shadow"
        style={{ border: "0.5px solid #E5E7EB" }}
      >
        <div>
          <p className="text-sm font-semibold text-gray-800">Full Analytics</p>
          <p className="text-xs text-gray-400 mt-0.5">Streak · quiz trends · topic mastery · badges</p>
        </div>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7F77DD" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </a>

      {/* Adaptive Insights */}
      {adaptiveData && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Adaptive Insights
          </p>

          {/* Level + rolling score */}
          <div className="bg-white rounded-xl p-5 mb-3" style={{ border: "0.5px solid #E5E7EB" }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-800">Your level</p>
              {(() => {
                const lvl = adaptiveLevelInfo(adaptiveData.difficultyLevel);
                return (
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${lvl.bg} ${lvl.text}`}>
                    {lvl.label}
                  </span>
                );
              })()}
            </div>
            {adaptiveData.rollingScore !== null && (
              <>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs text-gray-500">Quiz performance</p>
                  <p className="text-xs font-bold text-[#7F77DD]">{adaptiveData.rollingScore}%</p>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#7F77DD] rounded-full transition-all duration-700"
                    style={{ width: `${adaptiveData.rollingScore}%` }}
                  />
                </div>
              </>
            )}
          </div>

          {/* Recommendation card */}
          <div className="rounded-xl p-4 mb-3 bg-[#EEEDFE]" style={{ border: "0.5px solid #7F77DD" }}>
            <p className="text-[10px] font-semibold text-[#3C3489] uppercase tracking-wide mb-2">
              Next step for you
            </p>
            <p className="text-sm text-gray-700 leading-relaxed mb-4">
              {adaptiveData.recommendation.message}
            </p>
            <a
              href={adaptiveData.recommendation.ctaHref}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-[#7F77DD] hover:bg-[#3C3489] px-4 py-2 rounded-lg transition-colors"
            >
              {adaptiveData.recommendation.ctaLabel}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </a>
          </div>

          {/* Topics to reinforce */}
          {adaptiveData.weakTopics.length > 0 && (
            <div className="bg-white rounded-xl p-5 mb-3" style={{ border: "0.5px solid #E5E7EB" }}>
              <p className="text-xs font-semibold text-gray-500 mb-3">Topics to reinforce</p>
              <div className="space-y-2">
                {adaptiveData.weakTopics.slice(0, 3).map((t, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#EF9F27] flex-shrink-0" />
                    <p className="text-xs text-gray-700 flex-1 leading-snug line-clamp-1">{t.topic}</p>
                    {t.occurrences > 1 && (
                      <span className="text-[10px] text-gray-400 flex-shrink-0">×{t.occurrences}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Topics mastered */}
          {adaptiveData.masteredTopics.length > 0 && (
            <div className="bg-white rounded-xl p-5" style={{ border: "0.5px solid #E5E7EB" }}>
              <p className="text-xs font-semibold text-gray-500 mb-3">Topics mastered</p>
              <div className="flex flex-wrap gap-2">
                {adaptiveData.masteredTopics.slice(0, 6).map((t, i) => (
                  <span
                    key={i}
                    className="text-xs bg-[#1D9E75]/10 text-[#1D9E75] px-2.5 py-1 rounded-full font-medium"
                  >
                    {t.length > 40 ? t.slice(0, 40) + "…" : t}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Dashboard Client ────────────────────────────────────────────────────

type Tab = "course" | "goals" | "schedule" | "progress" | "tutor";

const TABS: { id: Tab; label: string }[] = [
  { id: "course",   label: "Course"   },
  { id: "goals",    label: "Goals"    },
  { id: "schedule", label: "Schedule" },
  { id: "progress", label: "Progress" },
  { id: "tutor",    label: "Tutor"    },
];

export function DashboardClient({
  course,
  modules,
  completedLessonIds,
  goal,
  tasks,
  adaptiveData,
}: DashboardProps) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("course");
  const [signingOut, setSigningOut] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState(false);
  const [tutorMounted, setTutorMounted] = useState(false);

  const completedIds = new Set(completedLessonIds);
  const allLessons = modules.flatMap((m) => m.lessons);
  const totalLessons = allLessons.length;
  const completedCount = completedLessonIds.length;
  const progressPct = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
  const totalMins = allLessons.reduce((s, l) => s + (l.duration_minutes ?? 30), 0);
  const diff = difficultyInfo(course.difficulty_level);

  async function handleSignOut() {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  async function handleExportPdf() {
    if (exporting) return;
    setExportError(false);
    setExporting(true);
    try {
      const res = await fetch(`/api/export/course/${course.id}`);
      if (!res.ok) throw new Error(`Export failed: ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${slugify(course.title)}-courseforge.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("[export]", err);
      setExportError(true);
      setTimeout(() => setExportError(false), 4000);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* ── Nav bar ── */}
      <nav className="h-14 bg-white border-b border-gray-100 flex items-center px-4 z-50">
        <div className="max-w-3xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-[#7F77DD] flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                <path d="M7 1L12 4V10L7 13L2 10V4L7 1Z" fill="white" fillOpacity="0.9" />
              </svg>
            </div>
            <span className="text-sm font-bold text-gray-900 tracking-tight">CourseForge</span>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/analytics"
              className="text-xs font-medium text-[#7F77DD] hover:text-[#3C3489] transition-colors"
            >
              Analytics
            </a>
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="text-xs text-gray-500 hover:text-gray-800 transition-colors disabled:opacity-50"
            >
              {signingOut ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero section ── */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 pt-7 pb-6">
          {/* Title + badge */}
          <div className="flex items-start justify-between gap-3 mb-2">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight flex-1 min-w-0">
              {course.title}
            </h1>
            <span
              className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 mt-0.5 ${diff.bg} ${diff.text}`}
            >
              {diff.label}
            </span>
          </div>

          {/* Subtitle */}
          <p className="text-sm text-gray-500 mb-6">
            {course.description
              ? course.description.split(".")[0] + "."
              : `Personalized for ${diff.label.toLowerCase()} learners`}
          </p>

          {/* Stat cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-[#FAFAFA] rounded-xl p-3.5" style={{ border: "0.5px solid #E5E7EB" }}>
              <p className="text-xl font-bold text-gray-900">{progressPct}%</p>
              <p className="text-xs text-gray-500 mt-0.5">Progress</p>
              <div className="h-1 bg-gray-200 rounded-full mt-2 overflow-hidden">
                <div
                  className="h-full bg-[#7F77DD] rounded-full"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>

            <div className="bg-[#FAFAFA] rounded-xl p-3.5" style={{ border: "0.5px solid #E5E7EB" }}>
              <p className="text-xl font-bold text-gray-900">{modules.length}</p>
              <p className="text-xs text-gray-500 mt-0.5">Modules</p>
              <p className="text-[10px] text-gray-400 mt-1.5">
                {totalLessons} lesson{totalLessons !== 1 ? "s" : ""}
              </p>
            </div>

            <div className="bg-[#FAFAFA] rounded-xl p-3.5" style={{ border: "0.5px solid #E5E7EB" }}>
              <p className="text-xl font-bold text-gray-900">
                {totalMins > 0 ? formatDuration(totalMins) : "—"}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">Total</p>
              <p className="text-[10px] text-gray-400 mt-1.5">
                {completedCount > 0 ? `${completedCount} done` : "Not started"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div className="sticky top-0 bg-white border-b border-gray-100 z-40">
        <div className="max-w-3xl mx-auto px-4 flex gap-0">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setTab(t.id);
                if (t.id === "tutor") setTutorMounted(true);
              }}
              className={`flex-1 py-3.5 text-xs font-semibold transition-colors border-b-2 ${
                tab === t.id
                  ? "border-[#7F77DD] text-[#7F77DD]"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab content ── */}
      {tab !== "tutor" && (
        <div className="max-w-3xl mx-auto px-4 py-6 pb-16">
          {tab === "course" && (
            <CourseTab
              modules={modules}
              completedIds={completedIds}
              onExportPdf={handleExportPdf}
              exporting={exporting}
              exportError={exportError}
            />
          )}
          {tab === "goals" && (
            <GoalsTab goal={goal} tasks={tasks} />
          )}
          {tab === "schedule" && (
            <ScheduleTab tasks={tasks} modules={modules} completedIds={completedIds} />
          )}
          {tab === "progress" && (
            <ProgressTab modules={modules} completedIds={completedIds} adaptiveData={adaptiveData} />
          )}
        </div>
      )}

      {/* ── Tutor tab — mounted once, kept alive via CSS ── */}
      {tutorMounted && (
        <div className={tab !== "tutor" ? "hidden" : "max-w-3xl mx-auto px-4 py-4 pb-8"}>
          <EmbeddedTutorTab
            courseId={course.id}
            suggestedQuestions={
              adaptiveData?.weakTopics[0]
                ? [
                    `Explain "${adaptiveData.weakTopics[0].topic}" in a different way — I'm struggling`,
                    "What should I focus on next given my progress?",
                    "Quiz me on the most important concept I've covered",
                  ]
                : [
                    "What should I focus on next given my progress?",
                    "Break down the key concepts in my current module",
                    "Give me a quick quiz on what I've learned so far",
                  ]
            }
          />
        </div>
      )}
    </div>
  );
}
