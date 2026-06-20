// Shared types, styles, and components used by all three PDF scopes.
// No "use client" — server-side only.

import React from "react";
import { Text, View, StyleSheet } from "@react-pdf/renderer";
import { renderMarkdownToPdf } from "./markdownToPdf";
import type { Slide } from "@/lib/anthropic/types";
import type { QuizQuestion } from "@/types/database";

// ─── Shared export types ───────────────────────────────────────────────────────

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

// ─── Shared styles ─────────────────────────────────────────────────────────────

export const SHARED = StyleSheet.create({
  contentPage: {
    paddingTop: 52,
    paddingBottom: 68,
    paddingHorizontal: 58,
    backgroundColor: "white",
  },

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
  footerLeft: { fontFamily: "Helvetica", fontSize: 8.5, color: "#9CA3AF", flex: 1 },
  footerRight: { fontFamily: "Helvetica", fontSize: 8.5, color: "#9CA3AF" },

  sectionLabel: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    color: "#7F77DD",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 14,
  },

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

  quizBox: {
    backgroundColor: "#FAFAFA",
    borderRadius: 6,
    padding: 14,
    marginTop: 16,
    borderColor: "#E5E7EB",
    borderWidth: 0.5,
  },
  quizBoxTitle: { fontFamily: "Helvetica-Bold", fontSize: 12, color: "#3C3489", marginBottom: 12 },
  quizQuestion: { marginBottom: 12 },
  quizQNum: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    color: "#1C1C1C",
    marginBottom: 4,
    lineHeight: 1.4,
  },
  quizOption: { flexDirection: "row", paddingLeft: 8, marginBottom: 2 },
  quizOptionLabel: {
    fontFamily: "Helvetica",
    fontSize: 9.5,
    color: "#9CA3AF",
    width: 18,
    flexShrink: 0,
  },
  quizOptionText: { fontFamily: "Helvetica", fontSize: 9.5, color: "#374151", flex: 1, lineHeight: 1.4 },

  answerKeyTitle: { fontFamily: "Helvetica-Bold", fontSize: 24, color: "#3C3489", marginBottom: 8 },
  answerKeyIntro: { fontFamily: "Helvetica", fontSize: 10.5, color: "#6B7280", marginBottom: 28, lineHeight: 1.5 },
  answerKeyGroup: { fontFamily: "Helvetica-Bold", fontSize: 13, color: "#7F77DD", marginBottom: 10, marginTop: 16 },
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
  answerKeyQ: { fontFamily: "Helvetica-Bold", fontSize: 10, color: "#1C1C1C", lineHeight: 1.4, marginBottom: 3 },
  answerKeyA: { fontFamily: "Helvetica-Bold", fontSize: 10, color: "#1D9E75", marginBottom: 2 },
  answerKeyExpl: { fontFamily: "Helvetica", fontSize: 9.5, color: "#6B7280", lineHeight: 1.5 },

  taskRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 7,
    borderBottomColor: "#F9FAFB",
    borderBottomWidth: 0.5,
  },
  taskTitle: { fontFamily: "Helvetica", fontSize: 10.5, color: "#1C1C1C", flex: 1, lineHeight: 1.5 },
  taskMeta: { fontFamily: "Helvetica", fontSize: 9, color: "#9CA3AF", marginLeft: 10, flexShrink: 0 },
});

// ─── Shared utilities ──────────────────────────────────────────────────────────

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

const HIGH_DOT = { width: 8, height: 8, borderRadius: 4, backgroundColor: "#D85A30", marginTop: 3.5, marginRight: 10, flexShrink: 0 as const };
const MED_DOT  = { ...HIGH_DOT, backgroundColor: "#EF9F27" };
const LOW_DOT  = { ...HIGH_DOT, backgroundColor: "#1D9E75" };
export function priorityDotStyle(priority: string) {
  if (priority === "high")   return HIGH_DOT;
  if (priority === "medium") return MED_DOT;
  return LOW_DOT;
}

export const OPTION_LABELS = ["A", "B", "C", "D", "E"];

// ─── Shared components ─────────────────────────────────────────────────────────

export function PdfFooter({ label }: { label: string }) {
  return (
    <View fixed style={SHARED.footer}>
      <Text style={SHARED.footerLeft}>{label}</Text>
      <Text
        style={SHARED.footerRight}
        render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
      />
    </View>
  );
}

export function LessonSection({
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
      <Text style={SHARED.lessonMeta}>
        Lesson {index + 1} of {totalInModule}
      </Text>
      <Text style={SHARED.lessonTitle}>{lesson.title}</Text>
      {renderMarkdownToPdf(lesson.content)}
      {actionSlides.length > 0 && (
        <View style={SHARED.actionBox}>
          <Text style={SHARED.actionBoxTitle}>Action Steps</Text>
          {actionSlides.flatMap((slide) =>
            slide.bullets.map((bullet, bi) => (
              <Text key={`${slide.heading}-${bi}`} style={SHARED.actionBoxItem}>
                • {bullet}
              </Text>
            ))
          )}
        </View>
      )}
    </View>
  );
}

export function QuizSection({
  quizzes,
  title = "Review Quiz",
}: {
  quizzes: ExportQuiz[];
  title?: string;
}) {
  if (quizzes.length === 0) return null;
  return (
    <View style={SHARED.quizBox}>
      <Text style={SHARED.quizBoxTitle}>{title}</Text>
      {quizzes.flatMap((quiz) =>
        (quiz.questions as QuizQuestion[]).map((q, qi) => (
          <View key={q.id} style={SHARED.quizQuestion}>
            <Text style={SHARED.quizQNum}>
              {qi + 1}. {q.text}
            </Text>
            {q.options?.map((opt, oi) => (
              <View key={oi} style={SHARED.quizOption}>
                <Text style={SHARED.quizOptionLabel}>{OPTION_LABELS[oi]})</Text>
                <Text style={SHARED.quizOptionText}>{opt}</Text>
              </View>
            ))}
          </View>
        ))
      )}
    </View>
  );
}

type AnswerKeyGroup = {
  groupTitle?: string;
  lessons: ExportLesson[];
  quizzes: ExportQuiz[];
};

export function AnswerKeySection({
  groups,
  title = "Quiz Answer Key",
  intro = "Correct answers and explanations for all review quizzes.",
}: {
  groups: AnswerKeyGroup[];
  title?: string;
  intro?: string;
}) {
  const withQuizzes = groups.filter((g) => g.quizzes.length > 0);
  if (withQuizzes.length === 0) return null;
  return (
    <View break>
      <Text style={SHARED.sectionLabel}>Answer Key</Text>
      <Text style={SHARED.answerKeyTitle}>{title}</Text>
      <Text style={SHARED.answerKeyIntro}>{intro}</Text>
      {withQuizzes.map((group, gi) => (
        <View key={gi}>
          {withQuizzes.length > 1 && group.groupTitle && (
            <Text style={SHARED.answerKeyGroup}>{group.groupTitle}</Text>
          )}
          {group.quizzes.map((quiz) => {
            const lessonTitle = group.lessons.find((l) => l.id === quiz.lesson_id)?.title;
            return (
              <View key={quiz.id}>
                {lessonTitle && (
                  <Text style={SHARED.answerKeyLesson}>{lessonTitle}</Text>
                )}
                {(quiz.questions as QuizQuestion[]).map((q, qi) => (
                  <View key={q.id} style={SHARED.answerKeyItem}>
                    <Text style={SHARED.answerKeyQ}>
                      {qi + 1}. {q.text}
                    </Text>
                    <Text style={SHARED.answerKeyA}>
                      Answer:{" "}
                      {Array.isArray(q.correct_answer)
                        ? q.correct_answer.join(", ")
                        : q.correct_answer}
                    </Text>
                    {q.explanation && (
                      <Text style={SHARED.answerKeyExpl}>{q.explanation}</Text>
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
