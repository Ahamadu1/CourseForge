import Anthropic from "@anthropic-ai/sdk";
import { getAnthropicClient } from "./client";
import { MODELS } from "./models";
import { buildCourseOutlinePrompt } from "./prompts/courseOutline";
import { buildLessonContentPrompt } from "./prompts/lessonContent";
import { buildQuizGeneratorPrompt } from "./prompts/quizGenerator";
import { buildGoalBreakdownPrompt } from "./prompts/goalBreakdown";
import type {
  OnboardingData,
  LessonContentContext,
  QuizContext,
  GoalBreakdownContext,
  GeneratedCourseOutline,
  GeneratedLessonContent,
  GeneratedQuiz,
  GeneratedGoalBreakdown,
  Slide,
} from "./types";

// Shared system prompt — cached across all requests (stable content)
const SYSTEM_PROMPT =
  "You are CourseForge AI, an expert educational content creator and curriculum designer. " +
  "You produce pedagogically sound, practical learning experiences. " +
  "Always respond by calling the provided tool with complete, accurate, well-structured data. " +
  "Never return freeform text instead of a tool call.";

// ─── Tool schemas ─────────────────────────────────────────────────────────────

const COURSE_OUTLINE_TOOL: Anthropic.Tool = {
  name: "create_course_outline",
  description: "Create a structured course outline with modules and lesson stubs",
  input_schema: {
    type: "object" as const,
    properties: {
      title: { type: "string", description: "Course title" },
      description: { type: "string", description: "2–3 sentence course overview" },
      slug: { type: "string", description: "URL-friendly slug (lowercase, hyphens)" },
      difficulty_level: {
        type: "string",
        enum: ["complete_beginner", "some_knowledge", "intermediate", "advanced"],
      },
      modules: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            description: { type: "string" },
            position: { type: "integer", description: "1-based ordering" },
            lessons: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  content_type: {
                    type: "string",
                    enum: ["text", "video", "interactive", "audio"],
                  },
                  duration_minutes: { type: "integer" },
                  position: { type: "integer", description: "1-based ordering" },
                },
                required: ["title", "content_type", "duration_minutes", "position"],
              },
            },
          },
          required: ["title", "description", "position", "lessons"],
        },
      },
    },
    required: ["title", "description", "slug", "difficulty_level", "modules"],
  },
};

const SLIDE_ITEM_SCHEMA = {
  type: "object" as const,
  properties: {
    heading:  { type: "string", description: "Slide title — max 6 words" },
    bullets: {
      type: "array",
      items: { type: "string", description: "Max 8 words each" },
      description: "2–4 punchy bullet points",
    },
    keyPoint: {
      type: "string",
      description: "Optional: a standout stat, quote, or analogy to emphasise",
    },
    kind: {
      type: "string",
      enum: ["intro", "concept", "example", "action", "summary"],
    },
  },
  required: ["heading", "bullets", "kind"],
};

const LESSON_CONTENT_TOOL: Anthropic.Tool = {
  name: "create_lesson_content",
  description: "Create full lesson body, summary, key takeaways, and visual slides",
  input_schema: {
    type: "object" as const,
    properties: {
      content: {
        type: "string",
        description: "Full lesson content in Markdown (800–2000 words)",
      },
      summary: {
        type: "string",
        description: "2–4 sentence summary of the lesson",
      },
      key_takeaways: {
        type: "array",
        items: { type: "string" },
        description: "3–5 short, actionable takeaway phrases",
      },
      slides: {
        type: "array",
        description: "5–8 visual slides summarising the lesson, one per major section",
        items: SLIDE_ITEM_SCHEMA,
      },
    },
    required: ["content", "summary", "key_takeaways", "slides"],
  },
};

const SLIDES_ONLY_TOOL: Anthropic.Tool = {
  name: "create_lesson_slides",
  description: "Generate visual presentation slides from an existing lesson",
  input_schema: {
    type: "object" as const,
    properties: {
      slides: {
        type: "array",
        description: "5–8 visual slides summarising the lesson",
        items: SLIDE_ITEM_SCHEMA,
      },
    },
    required: ["slides"],
  },
};

const QUIZ_TOOL: Anthropic.Tool = {
  name: "create_quiz",
  description: "Create a 5-question multiple-choice quiz for a lesson",
  input_schema: {
    type: "object" as const,
    properties: {
      title: { type: "string" },
      questions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string", description: "Short unique id e.g. q1" },
            text: { type: "string", description: "The question text" },
            type: { type: "string", enum: ["multiple_choice"] },
            options: {
              type: "array",
              items: { type: "string" },
              description: "Exactly 4 answer options",
            },
            correct_answer: {
              type: "string",
              description: "Must match one of the options verbatim",
            },
            explanation: { type: "string", description: "Why the correct answer is right" },
            points: { type: "integer", description: "Always 20" },
          },
          required: ["id", "text", "type", "options", "correct_answer", "explanation", "points"],
        },
      },
    },
    required: ["title", "questions"],
  },
};

const GOAL_BREAKDOWN_TOOL: Anthropic.Tool = {
  name: "create_goal_breakdown",
  description: "Break a learning goal into a structured goal object and actionable tasks",
  input_schema: {
    type: "object" as const,
    properties: {
      goal: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          target_date: { type: "string", description: "ISO date YYYY-MM-DD" },
        },
        required: ["title", "description", "target_date"],
      },
      tasks: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            description: { type: "string" },
            priority: { type: "string", enum: ["low", "medium", "high"] },
            due_date: {
              type: "string",
              description: "ISO datetime YYYY-MM-DDTHH:mm:ssZ",
            },
          },
          required: ["title", "description", "priority", "due_date"],
        },
      },
    },
    required: ["goal", "tasks"],
  },
};

// ─── Core caller with retry ───────────────────────────────────────────────────

async function callWithTool<T>(
  userPrompt: string,
  tool: Anthropic.Tool,
  model: string,
  maxTokens = 4096,
): Promise<T> {
  const client = getAnthropicClient();

  const makeRequest = async (prompt: string): Promise<T> => {
    const response = await client.messages.create({
      model,
      max_tokens: maxTokens,
      // Cache the stable system prompt — saves tokens on repeated generation calls
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      tools: [tool],
      tool_choice: { type: "tool", name: tool.name },
      messages: [{ role: "user", content: prompt }],
    });

    const toolBlock = response.content.find(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
    );

    if (!toolBlock) {
      throw new Error(`Expected tool_use block from "${tool.name}" — got none`);
    }

    return toolBlock.input as T;
  };

  try {
    return await makeRequest(userPrompt);
  } catch (firstErr) {
    const msg = firstErr instanceof Error ? firstErr.message : String(firstErr);
    // Retry once with corrective framing
    try {
      return await makeRequest(
        `${userPrompt}\n\n[RETRY — previous attempt error: ${msg}]\n` +
          `You MUST call the ${tool.name} tool. Do not return text — only a tool call.`,
      );
    } catch (retryErr) {
      throw new Error(
        `Generation failed after retry: ${retryErr instanceof Error ? retryErr.message : String(retryErr)}`,
      );
    }
  }
}

// ─── Public generation functions ──────────────────────────────────────────────

export async function generateCourseOutline(
  data: OnboardingData,
): Promise<GeneratedCourseOutline> {
  return callWithTool<GeneratedCourseOutline>(
    buildCourseOutlinePrompt(data),
    COURSE_OUTLINE_TOOL,
    MODELS.SONNET,
  );
}

export async function generateLessonContent(
  ctx: LessonContentContext,
): Promise<GeneratedLessonContent> {
  return callWithTool<GeneratedLessonContent>(
    buildLessonContentPrompt(ctx),
    LESSON_CONTENT_TOOL,
    MODELS.SONNET,
    8192,
  );
}

export async function generateLessonSlides(ctx: {
  lessonTitle: string;
  lessonContent: string;
  level: string;
}): Promise<{ slides: Slide[] }> {
  const prompt = `Generate 5–8 visual presentation slides for this lesson.

Lesson: "${ctx.lessonTitle}" (${ctx.level} level)

Content:
${ctx.lessonContent.slice(0, 6000)}

Rules:
- One slide per major section of the lesson
- Headings: max 6 words, punchy and clear
- Bullets: 2–4 per slide, max 8 words each — no filler
- keyPoint: only for a standout stat, quote, or memorable analogy — omit if nothing fits
- First slide kind = "intro", last slide kind = "summary"
- Middle slides: "concept", "example", or "action" as fits the content

Call the create_lesson_slides tool.`;

  return callWithTool<{ slides: Slide[] }>(prompt, SLIDES_ONLY_TOOL, MODELS.HAIKU);
}

export async function generateQuiz(ctx: QuizContext): Promise<GeneratedQuiz> {
  return callWithTool<GeneratedQuiz>(
    buildQuizGeneratorPrompt(ctx),
    QUIZ_TOOL,
    MODELS.HAIKU,
  );
}

export async function generateGoalBreakdown(
  ctx: GoalBreakdownContext,
): Promise<GeneratedGoalBreakdown> {
  return callWithTool<GeneratedGoalBreakdown>(
    buildGoalBreakdownPrompt(ctx),
    GOAL_BREAKDOWN_TOOL,
    MODELS.SONNET,
  );
}
