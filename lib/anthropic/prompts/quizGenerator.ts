import type { QuizContext, SkillLevel } from "@/lib/anthropic/types";

// Level → quiz difficulty guide
// complete_beginner : Test recall of definitions and basic concepts; no trick questions; straightforward options
// some_knowledge    : Mix recall with simple application; introduce mild distractors; one moderate reasoning question
// intermediate      : Favour application and analysis; realistic distractors; edge-case question expected
// advanced          : Majority analytical/edge-case; complex multi-condition scenarios; distractors should be plausible expert mistakes

const MAX_CONTENT_CHARS = 3_000;

function quizDifficulty(level: SkillLevel): string {
  switch (level) {
    case "complete_beginner":
      return "Focus on definition recall and basic concept recognition. Keep options clearly distinct — no trick questions. All 5 questions should test whether the student understood the core ideas presented.";
    case "some_knowledge":
      return "Mix 3 recall/recognition questions with 2 simple application questions. Introduce mild distractors. At least one question should require the student to apply a concept to a new scenario.";
    case "intermediate":
      return "Favour application and analysis: 1 recall, 2 applied understanding, 2 analytical/edge-case. Distractors should be realistic mistakes an intermediate practitioner might make.";
    case "advanced":
      return "All questions should be analytical or scenario-based. Distractors must be plausible expert-level mistakes. At least 2 questions should involve multi-condition reasoning or non-obvious trade-offs.";
  }
}

export function buildQuizGeneratorPrompt(ctx: QuizContext): string {
  const content =
    ctx.lessonContent.length > MAX_CONTENT_CHARS
      ? ctx.lessonContent.slice(0, MAX_CONTENT_CHARS) + "\n[content truncated]"
      : ctx.lessonContent;

  return `Create a 5-question multiple-choice quiz for the following lesson.

## Lesson
- **Title:** ${ctx.lessonTitle}
- **Student Level:** ${ctx.level}

## Quiz Difficulty Guidance
${quizDifficulty(ctx.level as SkillLevel)}

## Lesson Content
${content}

## Requirements
- Exactly 5 questions
- Each question has exactly 4 answer options (the correct_answer must be one of the options verbatim)
- Apply the difficulty guidance above when calibrating question complexity and distractors
- Each question worth 20 points (total = 100)
- Assign a unique short id to each question (e.g. "q1", "q2", ...)
- Include a brief explanation (1–2 sentences) for why the correct answer is right
- Quiz title should reference the lesson title

Call the create_quiz tool with the complete quiz data.`;
}
