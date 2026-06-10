// Server-side PDF document — rendered by renderToBuffer in the export API route.
// No "use client". Uses @react-pdf/renderer primitives only.

import React from "react";
import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  Svg,
  Path,
} from "@react-pdf/renderer";
import { renderMarkdownToPdf } from "./markdownToPdf";
import type { Slide } from "@/lib/anthropic/types";
import type { QuizQuestion } from "@/types/database";

// ─── Data types ───────────────────────────────────────────────────────────────

export interface ExportLesson {
  id: string;
  title: string;
  content: string;
  position: number;
  slides: Slide[] | null;
}

export interface ExportQuiz {
  id: string;
  lesson_id: string | null;
  title: string;
  questions: QuizQuestion[];
}

export interface ExportModule {
  id: string;
  title: string;
  description: string | null;
  position: number;
  lessons: ExportLesson[];
  quizzes: ExportQuiz[];
}

export interface ExportGoal {
  title: string;
  description: string | null;
  target_date: string | null;
  progress: number;
}

export interface ExportTask {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: "low" | "medium" | "high";
  status: string;
}

export interface CourseExportData {
  course: {
    id: string;
    title: string;
    description: string | null;
    difficulty_level: string | null;
  };
  userName: string;
  generatedAt: string;
  modules: ExportModule[];
  goal: ExportGoal | null;
  tasks: ExportTask[];
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  // Cover
  coverPage: {
    backgroundColor: "#7F77DD",
  },
  coverBody: {
    flex: 1,
    paddingHorizontal: 60,
    paddingTop: 80,
    paddingBottom: 60,
    justifyContent: "center",
    alignItems: "center",
  },
  coverLogoWrap: {
    width: 52,
    height: 52,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 40,
  },
  coverTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 32,
    color: "white",
    textAlign: "center",
    lineHeight: 1.25,
    marginBottom: 18,
  },
  coverSubtitle: {
    fontFamily: "Helvetica",
    fontSize: 14,
    color: "#EEEDFE",
    textAlign: "center",
    marginBottom: 8,
  },
  coverDate: {
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
  },
  coverBrand: {
    position: "absolute",
    bottom: 38,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  coverBrandName: {
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    color: "rgba(255,255,255,0.8)",
    letterSpacing: 2,
  },
  coverBrandSub: {
    fontFamily: "Helvetica",
    fontSize: 9,
    color: "rgba(255,255,255,0.5)",
    marginTop: 2,
  },

  // Content page
  contentPage: {
    paddingTop: 52,
    paddingBottom: 68,
    paddingHorizontal: 58,
    backgroundColor: "white",
  },

  // Footer (fixed — appears on every content page)
  footer: {
    position: "absolute",
    bottom: 24,
    left: 58,
    right: 58,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 7,
    borderTopColor: "#E5E7EB",
    borderTopWidth: 0.5,
  },
  footerLeft: {
    fontFamily: "Helvetica",
    fontSize: 8.5,
    color: "#9CA3AF",
    flex: 1,
  },
  footerRight: {
    fontFamily: "Helvetica",
    fontSize: 8.5,
    color: "#9CA3AF",
  },

  // TOC
  tocTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 24,
    color: "#3C3489",
    marginBottom: 6,
  },
  tocSubtitle: {
    fontFamily: "Helvetica",
    fontSize: 10.5,
    color: "#6B7280",
    marginBottom: 28,
    lineHeight: 1.5,
  },
  tocRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 7,
    borderBottomColor: "#F3F4F6",
    borderBottomWidth: 0.5,
  },
  tocBadge: {
    width: 26,
    height: 26,
    backgroundColor: "#EEEDFE",
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    flexShrink: 0,
  },
  tocBadgeText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9.5,
    color: "#7F77DD",
  },
  tocModTitle: {
    fontFamily: "Helvetica",
    fontSize: 10.5,
    color: "#1C1C1C",
    flex: 1,
    lineHeight: 1.4,
  },
  tocMeta: {
    fontFamily: "Helvetica",
    fontSize: 9,
    color: "#9CA3AF",
    flexShrink: 0,
    marginLeft: 8,
  },

  // Section label (small uppercase purple label)
  sectionLabel: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    color: "#7F77DD",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 14,
  },

  // Goal section
  goalTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 24,
    color: "#3C3489",
    marginBottom: 24,
  },
  goalQuoteBox: {
    borderLeftColor: "#7F77DD",
    borderLeftWidth: 3,
    paddingLeft: 16,
    marginBottom: 16,
  },
  goalQuoteText: {
    fontFamily: "Helvetica-BoldOblique",
    fontSize: 17,
    color: "#3C3489",
    lineHeight: 1.45,
    marginBottom: 6,
  },
  goalDescription: {
    fontFamily: "Helvetica",
    fontSize: 11,
    color: "#374151",
    lineHeight: 1.6,
  },
  goalMeta: {
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#9CA3AF",
    marginTop: 12,
  },

  // Task row (action plan)
  taskRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 7,
    borderBottomColor: "#F9FAFB",
    borderBottomWidth: 0.5,
  },
  taskDotHigh: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#D85A30",
    marginTop: 3.5,
    marginRight: 10,
    flexShrink: 0,
  },
  taskDotMed: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF9F27",
    marginTop: 3.5,
    marginRight: 10,
    flexShrink: 0,
  },
  taskDotLow: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#1D9E75",
    marginTop: 3.5,
    marginRight: 10,
    flexShrink: 0,
  },
  taskTitle: {
    fontFamily: "Helvetica",
    fontSize: 10.5,
    color: "#1C1C1C",
    flex: 1,
    lineHeight: 1.5,
  },
  taskMeta: {
    fontFamily: "Helvetica",
    fontSize: 9,
    color: "#9CA3AF",
    marginLeft: 10,
    flexShrink: 0,
  },

  // Module header
  moduleHeader: {
    marginBottom: 20,
    paddingBottom: 14,
    borderBottomColor: "#EEEDFE",
    borderBottomWidth: 1.5,
  },
  moduleLabel: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    color: "#7F77DD",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 5,
  },
  moduleTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 22,
    color: "#3C3489",
    lineHeight: 1.25,
    marginBottom: 6,
  },
  moduleDescription: {
    fontFamily: "Helvetica",
    fontSize: 10.5,
    color: "#6B7280",
    lineHeight: 1.55,
  },

  // Lesson header
  lessonMeta: {
    fontFamily: "Helvetica",
    fontSize: 9,
    color: "#9CA3AF",
    marginBottom: 2,
    marginTop: 20,
  },
  lessonTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 15,
    color: "#111827",
    lineHeight: 1.3,
    marginBottom: 10,
    paddingBottom: 7,
    borderBottomColor: "#F3F4F6",
    borderBottomWidth: 0.5,
  },

  // Action callout (from "action" kind slides)
  actionBox: {
    backgroundColor: "#EEEDFE",
    borderLeftColor: "#7F77DD",
    borderLeftWidth: 3,
    borderRadius: 4,
    padding: 10,
    marginTop: 8,
    marginBottom: 12,
  },
  actionBoxTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    color: "#3C3489",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  actionBoxItem: {
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#374151",
    lineHeight: 1.55,
    marginBottom: 3,
  },

  // Quiz (questions only — end of module)
  quizBox: {
    backgroundColor: "#FAFAFA",
    borderRadius: 6,
    padding: 14,
    marginTop: 16,
    borderColor: "#E5E7EB",
    borderWidth: 0.5,
  },
  quizBoxTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 12,
    color: "#3C3489",
    marginBottom: 12,
  },
  quizQuestion: {
    marginBottom: 12,
  },
  quizQNum: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    color: "#1C1C1C",
    marginBottom: 4,
    lineHeight: 1.4,
  },
  quizOption: {
    flexDirection: "row",
    paddingLeft: 8,
    marginBottom: 2,
  },
  quizOptionLabel: {
    fontFamily: "Helvetica",
    fontSize: 9.5,
    color: "#9CA3AF",
    width: 18,
    flexShrink: 0,
  },
  quizOptionText: {
    fontFamily: "Helvetica",
    fontSize: 9.5,
    color: "#374151",
    flex: 1,
    lineHeight: 1.4,
  },

  // Answer key
  answerKeyTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 24,
    color: "#3C3489",
    marginBottom: 8,
  },
  answerKeyIntro: {
    fontFamily: "Helvetica",
    fontSize: 10.5,
    color: "#6B7280",
    marginBottom: 28,
    lineHeight: 1.5,
  },
  answerKeyModule: {
    fontFamily: "Helvetica-Bold",
    fontSize: 13,
    color: "#7F77DD",
    marginBottom: 10,
    marginTop: 16,
  },
  answerKeyLesson: {
    fontFamily: "Helvetica-Oblique",
    fontSize: 10.5,
    color: "#374151",
    marginBottom: 8,
    marginTop: 10,
  },
  answerKeyItem: {
    marginBottom: 12,
    paddingLeft: 10,
    borderLeftColor: "#EEEDFE",
    borderLeftWidth: 2,
  },
  answerKeyQ: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    color: "#1C1C1C",
    lineHeight: 1.4,
    marginBottom: 3,
  },
  answerKeyA: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    color: "#1D9E75",
    marginBottom: 2,
  },
  answerKeyExpl: {
    fontFamily: "Helvetica",
    fontSize: 9.5,
    color: "#6B7280",
    lineHeight: 1.5,
  },
});

// ─── Helper functions ─────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function priorityDotStyle(priority: string) {
  if (priority === "high")   return S.taskDotHigh;
  if (priority === "medium") return S.taskDotMed;
  return S.taskDotLow;
}

const OPTION_LABELS = ["A", "B", "C", "D", "E"];

// ─── Sub-components ───────────────────────────────────────────────────────────

function Footer({ courseTitle }: { courseTitle: string }) {
  return (
    <View fixed style={S.footer}>
      <Text style={S.footerLeft}>{courseTitle}</Text>
      <Text
        style={S.footerRight}
        render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
      />
    </View>
  );
}

function TOCSection({ data }: { data: CourseExportData }) {
  const totalLessons = data.modules.reduce((s, m) => s + m.lessons.length, 0);
  return (
    <View>
      <Text style={S.sectionLabel}>Contents</Text>
      <Text style={S.tocTitle}>Table of Contents</Text>
      <Text style={S.tocSubtitle}>
        {data.modules.length} module{data.modules.length !== 1 ? "s" : ""} ·{" "}
        {totalLessons} lesson{totalLessons !== 1 ? "s" : ""}
        {data.goal ? " · Includes your goal breakdown and action plan" : ""}
      </Text>
      {data.modules.map((mod, i) => (
        <View key={mod.id} style={S.tocRow}>
          <View style={S.tocBadge}>
            <Text style={S.tocBadgeText}>{i + 1}</Text>
          </View>
          <Text style={S.tocModTitle}>{mod.title}</Text>
          <Text style={S.tocMeta}>
            {mod.lessons.length} lesson{mod.lessons.length !== 1 ? "s" : ""}
          </Text>
        </View>
      ))}
      {data.goal && (
        <View style={S.tocRow}>
          <View style={[S.tocBadge, { backgroundColor: "#F0FDF4" }]}>
            <Text style={[S.tocBadgeText, { color: "#1D9E75" }]}>G</Text>
          </View>
          <Text style={S.tocModTitle}>Your Goal & Action Plan</Text>
        </View>
      )}
    </View>
  );
}

function GoalSection({ goal, tasks }: { goal: ExportGoal; tasks: ExportTask[] }) {
  const pending = tasks.filter((t) => t.status !== "done");
  return (
    <View break>
      <Text style={S.sectionLabel}>Your Goal</Text>
      <Text style={S.goalTitle}>What You&apos;re Working Toward</Text>
      <View style={S.goalQuoteBox}>
        <Text style={S.goalQuoteText}>&ldquo;{goal.title}&rdquo;</Text>
        {goal.description && (
          <Text style={S.goalDescription}>{goal.description}</Text>
        )}
      </View>
      {goal.target_date && (
        <Text style={S.goalMeta}>Target date: {formatDate(goal.target_date)}</Text>
      )}
      {pending.length > 0 && (
        <View style={{ marginTop: 24 }}>
          <Text style={S.sectionLabel}>Action Items</Text>
          {pending.slice(0, 12).map((task) => (
            <View key={task.id} style={S.taskRow}>
              <View style={priorityDotStyle(task.priority)} />
              <Text style={S.taskTitle}>{task.title}</Text>
              {task.due_date && (
                <Text style={S.taskMeta}>{formatDate(task.due_date)}</Text>
              )}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function LessonSection({
  lesson,
  index,
  totalInModule,
}: {
  lesson: ExportLesson;
  index: number;
  totalInModule: number;
}) {
  const actionSlides = lesson.slides?.filter((s) => s.kind === "action") ?? [];

  return (
    <View>
      <Text style={S.lessonMeta}>
        Lesson {index + 1} of {totalInModule}
      </Text>
      <Text style={S.lessonTitle}>{lesson.title}</Text>

      {/* Full lesson content rendered from markdown */}
      {renderMarkdownToPdf(lesson.content)}

      {/* Action steps callout (from action-kind slides) */}
      {actionSlides.length > 0 && (
        <View style={S.actionBox}>
          <Text style={S.actionBoxTitle}>Action Steps</Text>
          {actionSlides.flatMap((slide) =>
            slide.bullets.map((bullet, bi) => (
              <Text key={`${slide.heading}-${bi}`} style={S.actionBoxItem}>
                • {bullet}
              </Text>
            ))
          )}
        </View>
      )}
    </View>
  );
}

function ModuleQuizSection({ quizzes }: { quizzes: ExportQuiz[] }) {
  if (quizzes.length === 0) return null;
  return (
    <View style={S.quizBox}>
      <Text style={S.quizBoxTitle}>Module Review Quiz</Text>
      {quizzes.flatMap((quiz) =>
        (quiz.questions as QuizQuestion[]).map((q, qi) => (
          <View key={q.id} style={S.quizQuestion}>
            <Text style={S.quizQNum}>
              {qi + 1}. {q.text}
            </Text>
            {q.options?.map((opt, oi) => (
              <View key={oi} style={S.quizOption}>
                <Text style={S.quizOptionLabel}>{OPTION_LABELS[oi]})</Text>
                <Text style={S.quizOptionText}>{opt}</Text>
              </View>
            ))}
          </View>
        ))
      )}
    </View>
  );
}

function ModuleSection({ mod, index }: { mod: ExportModule; index: number }) {
  return (
    <View break>
      <View style={S.moduleHeader}>
        <Text style={S.moduleLabel}>Module {index + 1}</Text>
        <Text style={S.moduleTitle}>{mod.title}</Text>
        {mod.description && (
          <Text style={S.moduleDescription}>{mod.description}</Text>
        )}
      </View>

      {mod.lessons.map((lesson, li) => (
        <LessonSection
          key={lesson.id}
          lesson={lesson}
          index={li}
          totalInModule={mod.lessons.length}
        />
      ))}

      <ModuleQuizSection quizzes={mod.quizzes} />
    </View>
  );
}

function ActionPlanSection({ tasks, goal }: { tasks: ExportTask[]; goal: ExportGoal | null }) {
  if (tasks.length === 0) return null;

  // Group tasks by week
  const withDates = [...tasks]
    .filter((t) => t.due_date)
    .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime());

  const weeks: ExportTask[][] = [];
  for (const task of withDates) {
    if (weeks.length === 0) { weeks.push([task]); continue; }
    const firstOfLastWeek = new Date(weeks[weeks.length - 1][0].due_date!);
    const cutoff = new Date(firstOfLastWeek);
    cutoff.setDate(cutoff.getDate() + 7);
    if (new Date(task.due_date!) <= cutoff) {
      weeks[weeks.length - 1].push(task);
    } else {
      weeks.push([task]);
    }
  }

  return (
    <View break>
      <Text style={S.sectionLabel}>Action Plan</Text>
      <Text style={[S.goalTitle, { marginBottom: goal?.title ? 6 : 24 }]}>
        Your Learning Roadmap
      </Text>
      {goal?.title && (
        <Text style={[S.goalDescription, { marginBottom: 24, fontFamily: "Helvetica-Oblique" }]}>
          Goal: {goal.title}
        </Text>
      )}

      {weeks.length > 0 ? (
        weeks.slice(0, 8).map((week, wi) => (
          <View key={wi} style={{ marginBottom: 16 }}>
            <Text style={[S.sectionLabel, { marginBottom: 8 }]}>Week {wi + 1}</Text>
            {week.map((task) => (
              <View key={task.id} style={S.taskRow}>
                <View style={priorityDotStyle(task.priority)} />
                <View style={{ flex: 1 }}>
                  <Text style={S.taskTitle}>{task.title}</Text>
                  {task.description && (
                    <Text style={[S.taskMeta, { marginLeft: 0, marginTop: 1 }]}>{task.description}</Text>
                  )}
                </View>
                {task.due_date && (
                  <Text style={S.taskMeta}>{formatDate(task.due_date)}</Text>
                )}
              </View>
            ))}
          </View>
        ))
      ) : (
        tasks.map((task) => (
          <View key={task.id} style={S.taskRow}>
            <View style={priorityDotStyle(task.priority)} />
            <Text style={S.taskTitle}>{task.title}</Text>
          </View>
        ))
      )}
    </View>
  );
}

function AnswerKeySection({ modules }: { modules: ExportModule[] }) {
  const modulesWithQuizzes = modules.filter((m) => m.quizzes.length > 0);
  if (modulesWithQuizzes.length === 0) return null;

  return (
    <View break>
      <Text style={S.sectionLabel}>Answer Key</Text>
      <Text style={S.answerKeyTitle}>Quiz Answer Key</Text>
      <Text style={S.answerKeyIntro}>
        Correct answers and explanations for all module review quizzes.
      </Text>

      {modulesWithQuizzes.map((mod, mi) => (
        <View key={mod.id}>
          <Text style={S.answerKeyModule}>
            Module {mi + 1}: {mod.title}
          </Text>
          {mod.quizzes.map((quiz) => {
            const lessonTitle = mod.lessons.find((l) => l.id === quiz.lesson_id)?.title;
            return (
              <View key={quiz.id}>
                {lessonTitle && (
                  <Text style={S.answerKeyLesson}>{lessonTitle}</Text>
                )}
                {(quiz.questions as QuizQuestion[]).map((q, qi) => (
                  <View key={q.id} style={S.answerKeyItem}>
                    <Text style={S.answerKeyQ}>
                      {qi + 1}. {q.text}
                    </Text>
                    <Text style={S.answerKeyA}>
                      Answer: {Array.isArray(q.correct_answer) ? q.correct_answer.join(", ") : q.correct_answer}
                    </Text>
                    {q.explanation && (
                      <Text style={S.answerKeyExpl}>{q.explanation}</Text>
                    )}
                  </View>
                ))}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

// ─── Main document ────────────────────────────────────────────────────────────

export function CourseDocument({ data }: { data: CourseExportData }) {
  const hasQuizzes = data.modules.some((m) => m.quizzes.length > 0);
  const hasTasks = data.tasks.length > 0;

  return (
    <Document
      title={data.course.title}
      author="CourseForge"
      creator="CourseForge"
    >
      {/* ── Cover page ─────────────────────────────────────────────────────── */}
      <Page size="A4" style={S.coverPage}>
        <View style={S.coverBody}>
          {/* Logo mark */}
          <View style={S.coverLogoWrap}>
            <Svg width="22" height="22" viewBox="0 0 14 14">
              <Path
                d="M7 1L12 4V10L7 13L2 10V4L7 1Z"
                fill="white"
                opacity="0.9"
              />
            </Svg>
          </View>

          <Text style={S.coverTitle}>{data.course.title}</Text>
          <Text style={S.coverSubtitle}>
            Personalized for {data.userName || "You"}
          </Text>
          <Text style={S.coverDate}>Generated {data.generatedAt}</Text>
        </View>

        <View style={S.coverBrand}>
          <Text style={S.coverBrandName}>COURSEFORGE</Text>
          <Text style={S.coverBrandSub}>AI-Powered Learning</Text>
        </View>
      </Page>

      {/* ── All content pages (auto-wraps) ─────────────────────────────────── */}
      <Page size="A4" style={S.contentPage}>
        <Footer courseTitle={data.course.title} />

        {/* Table of contents */}
        <TOCSection data={data} />

        {/* Goal page */}
        {data.goal && <GoalSection goal={data.goal} tasks={data.tasks} />}

        {/* Module sections */}
        {data.modules.map((mod, i) => (
          <ModuleSection key={mod.id} mod={mod} index={i} />
        ))}

        {/* Action plan */}
        {hasTasks && (
          <ActionPlanSection tasks={data.tasks} goal={data.goal} />
        )}

        {/* Answer key */}
        {hasQuizzes && <AnswerKeySection modules={data.modules} />}
      </Page>
    </Document>
  );
}
