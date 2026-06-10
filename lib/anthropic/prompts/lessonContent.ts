import type { LessonContentContext, SkillLevel } from "@/lib/anthropic/types";

// Level → content depth guide
// complete_beginner : Explain every concept from scratch; heavy analogies; avoid assumed knowledge; include "why this matters" framing
// some_knowledge    : Skip basic definitions; acknowledge prior exposure; build toward intermediate depth with moderate context-setting
// intermediate      : Assume working knowledge; skip fundamentals; focus on nuance, trade-offs, and real-world application
// advanced          : No introductory framing; target edge cases, niche tactics, and expert-level insight; assume mastery of all prerequisites

function levelDepth(level: SkillLevel): string {
  switch (level) {
    case "complete_beginner":
      return `- Assume the student knows nothing about this topic
- Define every term the first time it appears
- Use concrete, everyday analogies before introducing technical details
- Add a "why this matters" framing at the start
- Walk through examples step-by-step with no steps skipped
- Avoid unexplained acronyms or jargon`;
    case "some_knowledge":
      return `- Assume the student has seen the basics but hasn't gone deep
- Skip definitions of well-known core terms; briefly acknowledge familiar concepts
- Build from that foundation toward intermediate depth
- Use examples that reference real-world scenarios they may have encountered
- Flag common misconceptions from partial knowledge`;
    case "intermediate":
      return `- Assume solid hands-on experience — skip all introductory framing
- Focus on nuance, trade-offs, and real-world application patterns
- Highlight common pitfalls and how to avoid them
- Include worked examples that involve non-obvious decisions
- Reference best practices and when to deviate from them`;
    case "advanced":
      return `- Assume complete mastery of all fundamentals — skip all basics
- Target edge cases, niche tactics, and expert-level trade-offs
- Challenge assumptions; discuss when conventional wisdom breaks down
- Examples should be complex, multi-variable scenarios
- Reference cutting-edge approaches or underexplored angles`;
  }
}

function adaptiveOverride(level: "foundational" | "standard" | "advanced"): string {
  switch (level) {
    case "foundational":
      return `ADAPTIVE OVERRIDE — this student's quiz history shows they need extra support:
- Use more examples than usual (3+), and make each one very concrete
- Slow down the pacing; introduce concepts one at a time
- Define every term on first use; avoid assumed knowledge
- Add extra "why this matters" framing to build motivation`;
    case "advanced":
      return `ADAPTIVE OVERRIDE — this student's quiz history shows strong performance:
- Skip all introductory framing and basic definitions
- Go straight to nuance, trade-offs, and expert-level application
- Use complex, multi-variable examples
- Challenge assumptions; mention edge cases and when rules break`;
    case "standard":
      return "";
  }
}

export function buildLessonContentPrompt(ctx: LessonContentContext): string {
  const prevSection = ctx.previousLessons?.length
    ? `\n**Previous lessons in this module:** ${ctx.previousLessons.join(" → ")}`
    : "";

  const adaptiveSection = ctx.adaptiveDifficulty && ctx.adaptiveDifficulty !== "standard"
    ? `\n## Adaptive Difficulty Instruction\n${adaptiveOverride(ctx.adaptiveDifficulty)}\n`
    : "";

  return `Write full lesson content for the following lesson.

## Context
- **Course:** ${ctx.courseTitle}
- **Module:** ${ctx.moduleTitle}
- **Lesson ${ctx.lessonPosition} of ${ctx.totalLessons}:** ${ctx.lessonTitle}
- **Student Level:** ${ctx.level}${prevSection}

## Level-Specific Depth Requirements
${levelDepth(ctx.level as SkillLevel)}
${adaptiveSection}
## Requirements
Write comprehensive Markdown content (800–2 000 words) that:
1. Opens with a clear, specific learning objective
2. Follows the level-specific depth requirements above throughout
3. Includes at least two worked examples or code snippets appropriate for the level
4. Provides a hands-on exercise or reflection prompt
5. Ends with a concise recap of key points
6. Builds naturally on previous lessons if any

Also return:
- A one-paragraph summary (2–4 sentences)
- 3–5 key takeaways as short, actionable bullet phrases
- 5–8 visual slides (one per major section):
  - heading: max 6 words, punchy
  - bullets: 2–4 per slide, max 8 words each
  - keyPoint: only if there's a standout stat, quote, or analogy — omit otherwise
  - kind: "intro" for first slide, "summary" for last, "concept"/"example"/"action" for middle

Call the create_lesson_content tool with the structured data.`;
}
