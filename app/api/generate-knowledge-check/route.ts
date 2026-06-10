import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAnthropicClient } from "@/lib/anthropic/client";
import { MODELS } from "@/lib/anthropic/models";

interface KnowledgeQuestion {
  id: string;
  text: string;
  options: string[];
  correct_answer: string;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let niche: string, level: string;
  try {
    const body = await request.json();
    niche = String(body.niche ?? "").trim();
    level = String(body.level ?? "").trim();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (!niche || !level) {
    return NextResponse.json({ error: "Missing niche or level" }, { status: 400 });
  }

  const cacheTitle = `__kc__:${niche.toLowerCase()}:${level}`;
  const admin = createAdminClient();

  // Return cached questions if they exist
  const { data: cached } = await admin
    .from("quizzes")
    .select("questions")
    .eq("title", cacheTitle)
    .maybeSingle();

  if (cached?.questions) {
    return NextResponse.json({ questions: cached.questions, cached: true });
  }

  // Generate with Claude Haiku (fast, cheap for 3 simple questions)
  const anthropic = getAnthropicClient();
  const prompt = `Generate exactly 3 multiple-choice questions to assess someone's existing knowledge about "${niche}" at the "${level}" level.

These questions calibrate course difficulty — they test CURRENT knowledge, not teach anything new.

Respond with ONLY a valid JSON array, no markdown, no explanation:
[
  {
    "id": "q1",
    "text": "<question>",
    "options": ["<A>", "<B>", "<C>", "<D>"],
    "correct_answer": "<one of the options verbatim>"
  }
]

Requirements:
- Exactly 3 questions, 4 options each
- correct_answer must exactly match one of the options strings
- Calibrate difficulty to ${level}
- Questions should reveal real understanding, not just trivia`;

  try {
    const message = await anthropic.messages.create({
      model: MODELS.HAIKU,
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = message.content[0];
    if (raw.type !== "text") throw new Error("Unexpected response type");

    const match = raw.text.match(/\[[\s\S]*\]/);
    if (!match) throw new Error("No JSON array in response");

    const questions: KnowledgeQuestion[] = JSON.parse(match[0]);
    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error("Invalid questions format");
    }

    // Cache for future users with same niche+level
    await admin.from("quizzes").insert({
      title: cacheTitle,
      questions: questions as unknown as import("@/types/database").Json,
      passing_score: 60,
    });

    return NextResponse.json({ questions, cached: false });
  } catch (err) {
    console.error("[generate-knowledge-check]", err);
    return NextResponse.json({ error: "Failed to generate questions" }, { status: 500 });
  }
}
