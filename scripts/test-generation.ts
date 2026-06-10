/**
 * CourseForge generation engine smoke test.
 * Run with:  npx tsx scripts/test-generation.ts
 *
 * Tests all four generators against the Anthropic API.
 * Does NOT touch the database — pure generation only.
 */

import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import {
  generateCourseOutline,
  generateGoalBreakdown,
  generateLessonContent,
  generateQuiz,
} from "../lib/anthropic/generate";
import type { OnboardingData } from "../lib/anthropic/types";

// ─── Sample data ──────────────────────────────────────────────────────────────

const SAMPLE_ONBOARDING: OnboardingData = {
  niche: "Dropshipping",
  level: "complete_beginner",
  goal: "Make $3000/month from dropshipping in 90 days",
  time: "1hr",
  style: "both",
  knowledgeCheck: "",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function section(title: string) {
  console.log(`\n${"─".repeat(60)}`);
  console.log(`  ${title}`);
  console.log("─".repeat(60));
}

function pass(msg: string) {
  console.log(`  ✓ ${msg}`);
}

function detail(msg: string) {
  console.log(`    ${msg}`);
}

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(`Assertion failed: ${msg}`);
  pass(msg);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

async function testCourseOutline() {
  section("1 / 4  Course Outline Generator");

  const outline = await generateCourseOutline(SAMPLE_ONBOARDING);

  assert(typeof outline.title === "string" && outline.title.length > 0, "Has title");
  assert(typeof outline.slug === "string" && /^[a-z0-9-]+$/.test(outline.slug), "Slug is URL-safe");
  assert(
    ["complete_beginner", "some_knowledge", "intermediate", "advanced"].includes(outline.difficulty_level),
    `Difficulty is valid (got: ${outline.difficulty_level})`,
  );
  assert(
    outline.modules.length >= 3 && outline.modules.length <= 6,
    `Module count in range (got: ${outline.modules.length})`,
  );

  const totalLessons = outline.modules.reduce((s, m) => s + m.lessons.length, 0);
  assert(totalLessons >= 9, `Has enough lessons (got: ${totalLessons})`);

  for (const mod of outline.modules) {
    assert(typeof mod.position === "number", `Module "${mod.title}" has position`);
    for (const lesson of mod.lessons) {
      assert(
        ["text", "video", "interactive", "audio"].includes(lesson.content_type),
        `Lesson "${lesson.title}" has valid content_type`,
      );
    }
  }

  console.log();
  detail(`Course: "${outline.title}"`);
  detail(`Slug: ${outline.slug}`);
  detail(`Level: ${outline.difficulty_level}`);
  detail(`Modules: ${outline.modules.length} | Total lessons: ${totalLessons}`);
  outline.modules.forEach((m) =>
    detail(`  [${m.position}] ${m.title} (${m.lessons.length} lessons)`),
  );

  return outline;
}

async function testGoalBreakdown(outline: Awaited<ReturnType<typeof testCourseOutline>>) {
  section("2 / 4  Goal Breakdown Generator");

  const result = await generateGoalBreakdown({
    userGoal: SAMPLE_ONBOARDING.goal,
    courseTitle: outline.title,
    modules: outline.modules.map((m) => m.title),
    timePerWeek: SAMPLE_ONBOARDING.time,
  });

  assert(typeof result.goal.title === "string", "Goal has title");
  assert(/^\d{4}-\d{2}-\d{2}$/.test(result.goal.target_date), "target_date is ISO date");
  assert(
    result.tasks.length >= 5 && result.tasks.length <= 12,
    `Task count in range (got: ${result.tasks.length})`,
  );

  const priorities = new Set(result.tasks.map((t) => t.priority));
  assert(priorities.size >= 2, "Tasks span at least two priority levels");

  console.log();
  detail(`Goal: "${result.goal.title}"`);
  detail(`Target date: ${result.goal.target_date}`);
  detail(`Tasks (${result.tasks.length}):`);
  result.tasks.forEach((t) => detail(`  [${t.priority}] ${t.title} — due ${t.due_date.slice(0, 10)}`));
}

async function testLessonContent(outline: Awaited<ReturnType<typeof testCourseOutline>>) {
  section("3 / 4  Lesson Content Generator");

  const firstModule = outline.modules[0];
  const firstLesson = firstModule.lessons[0];

  console.log();
  detail(`Generating: "${firstLesson.title}" in "${firstModule.title}"`);

  const content = await generateLessonContent({
    courseTitle: outline.title,
    moduleTitle: firstModule.title,
    lessonTitle: firstLesson.title,
    lessonPosition: 1,
    totalLessons: firstModule.lessons.length,
    level: outline.difficulty_level,
  });

  assert(content.content.length >= 500, `Content length OK (${content.content.length} chars)`);
  assert(typeof content.summary === "string" && content.summary.length > 0, "Has summary");
  assert(
    Array.isArray(content.key_takeaways) && content.key_takeaways.length >= 3,
    `Key takeaways OK (${content.key_takeaways.length})`,
  );

  console.log();
  detail(`Content: ${content.content.length} chars`);
  detail(`Summary: ${content.summary.slice(0, 100)}…`);
  detail("Key takeaways:");
  content.key_takeaways.forEach((k) => detail(`  • ${k}`));

  return content;
}

async function testQuiz(
  outline: Awaited<ReturnType<typeof testCourseOutline>>,
  lessonContent: Awaited<ReturnType<typeof testLessonContent>>,
) {
  section("4 / 4  Quiz Generator");

  const firstLesson = outline.modules[0].lessons[0];

  const quiz = await generateQuiz({
    lessonTitle: firstLesson.title,
    lessonContent: lessonContent.content,
    level: outline.difficulty_level,
  });

  assert(typeof quiz.title === "string", "Quiz has title");
  assert(quiz.questions.length === 5, `Exactly 5 questions (got: ${quiz.questions.length})`);

  for (const q of quiz.questions) {
    assert(q.options.length === 4, `Q "${q.id}" has 4 options`);
    assert(
      q.options.includes(q.correct_answer),
      `Q "${q.id}" correct_answer is one of the options`,
    );
    assert(q.points === 20, `Q "${q.id}" worth 20 points`);
    assert(typeof q.explanation === "string", `Q "${q.id}" has explanation`);
  }

  const totalPoints = quiz.questions.reduce((s, q) => s + q.points, 0);
  assert(totalPoints === 100, `Total points = 100 (got: ${totalPoints})`);

  console.log();
  detail(`Quiz: "${quiz.title}"`);
  detail(`Questions: ${quiz.questions.length} | Total points: ${totalPoints}`);
  console.log();
  detail("Sample question:");
  const q0 = quiz.questions[0];
  detail(`  Q: ${q0.text}`);
  q0.options.forEach((opt, i) => detail(`    ${String.fromCharCode(65 + i)}) ${opt}`));
  detail(`  Correct: ${q0.correct_answer}`);
  detail(`  Explanation: ${q0.explanation}`);
}

// ─── Runner ───────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║       CourseForge — Generation Engine Test Suite        ║");
  console.log("╚══════════════════════════════════════════════════════════╝");
  console.log(`  Niche:  ${SAMPLE_ONBOARDING.niche}`);
  console.log(`  Level:  ${SAMPLE_ONBOARDING.level}`);
  console.log(`  Goal:   ${SAMPLE_ONBOARDING.goal}`);

  const start = Date.now();

  const outline = await testCourseOutline();
  await testGoalBreakdown(outline);
  const lessonContent = await testLessonContent(outline);
  await testQuiz(outline, lessonContent);

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  console.log(`\n${"═".repeat(60)}`);
  console.log(`  All tests passed  ✓  (${elapsed}s)`);
  console.log(`${"═".repeat(60)}\n`);
}

main().catch((err) => {
  console.error("\n✗ Test suite failed:", err);
  process.exit(1);
});
