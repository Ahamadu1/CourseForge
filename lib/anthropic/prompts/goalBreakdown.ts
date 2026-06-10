import type { GoalBreakdownContext } from "@/lib/anthropic/types";

// Level → task pacing guide
// complete_beginner : Allow generous time per task; include setup and orientation tasks; keep scope small per milestone
// some_knowledge    : Moderate pacing; skip basic setup tasks; milestones can cover more ground per week
// intermediate      : Tighter cadence; milestones focus on practice and optimisation; expect faster task completion
// advanced          : Aggressive pacing; milestones are outcome-focused; no hand-holding tasks

export function buildGoalBreakdownPrompt(ctx: GoalBreakdownContext): string {
  const today = new Date().toISOString().split("T")[0];

  return `Break down a student's learning goal into a structured goal and actionable tasks.

## Student Goal
"${ctx.userGoal}"

## Course Context
- **Course:** ${ctx.courseTitle}
- **Modules:** ${ctx.modules.join(", ")}
- **Available Time:** ${ctx.timePerWeek} per week
- **Today's Date:** ${today}

## Requirements

### Goal object
- Derive a clear, measurable title from the student's stated goal
- Write a 2–3 sentence description with the "why" behind the goal
- Set a realistic target_date (ISO date string, YYYY-MM-DD) based on course length and ${ctx.timePerWeek}/week

### Tasks array (6–10 tasks)
- Cover key milestones: environment setup, module completions, practice projects, final review
- Use priority: "high" for critical path items, "medium" for regular progress, "low" for optional extras
- Set due_date (ISO datetime string) spaced realistically from ${today}
- Each task description explains the what AND why in 1–2 sentences

Call the create_goal_breakdown tool with the complete data.`;
}
