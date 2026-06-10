import type { OnboardingData, SkillLevel } from "@/lib/anthropic/types";

// Level → content depth guide
// complete_beginner : Define every term on first use; no assumed knowledge; heavy analogies; step-by-step how-tos; start from absolute zero
// some_knowledge    : Skip basic "what is X" explanations; build on dabbled experience; fill gaps and introduce intermediate concepts
// intermediate      : Assume solid working experience; focus on patterns, optimisation, and common pitfalls; no intro-level content
// advanced          : Skip fundamentals entirely; niche tactics, edge cases, and expert trade-offs only; assume mastery of everything foundational

function levelGuidance(level: SkillLevel): string {
  switch (level) {
    case "complete_beginner":
      return "The student has ZERO prior experience. Every module must start from scratch. Define all terminology on first use. Use plain-language analogies. Avoid jargon without immediate explanation. The first 1–2 modules must cover absolute basics before introducing any advanced ideas.";
    case "some_knowledge":
      return "The student has dabbled but lacks depth. Skip 'what is X' introductions for core concepts they likely know. Build on existing familiarity and fill knowledge gaps. Progress to intermediate content by the second module.";
    case "intermediate":
      return "The student has solid hands-on experience. Assume they know fundamentals. Focus modules on patterns, optimisation techniques, scaling strategies, and common pitfalls. No 'intro to X' content.";
    case "advanced":
      return "The student is an expert. Skip ALL foundational content. Every module should target niche tactics, edge cases, advanced trade-offs, and expert-level strategies. Assume complete mastery of basics.";
  }
}

export function buildCourseOutlinePrompt(data: OnboardingData): string {
  return `Create a comprehensive course outline for the following student profile.

## Student Profile
- **Topic / Niche:** ${data.niche}
- **Current Level:** ${data.level}
- **Learning Goal:** ${data.goal}
- **Available Time:** ${data.time} per week
- **Preferred Style:** ${data.style}
- **Prior Knowledge:** ${data.knowledgeCheck}

## Level Guidance
${levelGuidance(data.level)}

## Requirements
- Design 3–6 modules that progress logically and match the level guidance above
- Each module should contain 3–8 lessons
- Lessons should be practical and achievable given ${data.time}/week
- Difficulty must match the "${data.level}" level throughout — do not include content below or above that level
- Generate a URL-friendly slug from the course title (lowercase, hyphens only)
- Estimate realistic duration for each lesson in minutes
- Choose the most appropriate content_type per lesson: text, video, interactive, or audio

Call the create_course_outline tool with the complete structured data.`;
}
