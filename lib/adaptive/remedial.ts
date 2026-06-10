import { createAdminClient } from "@/lib/supabase/admin";
import { getAnthropicClient } from "@/lib/anthropic/client";
import { MODELS } from "@/lib/anthropic/models";
import type { AdaptiveDifficultyLevel } from "./types";

export interface GenerateRemedialOptions {
  lessonId: string;
  topic: string;
  lessonTitle: string;
  courseTitle: string;
  difficultyLevel?: AdaptiveDifficultyLevel;
}

/**
 * Generates a short remedial lesson (250–450 words) that re-explains a weak
 * topic from a completely different angle, inserts it right after the source
 * lesson, and returns the new lesson's ID.
 *
 * Idempotent: if a remedial lesson for the same topic already exists in the
 * same module, the existing ID is returned immediately.
 */
export async function generateRemedialLesson(
  opts: GenerateRemedialOptions
): Promise<string> {
  const {
    lessonId,
    topic,
    lessonTitle,
    courseTitle,
    difficultyLevel = "standard",
  } = opts;

  const db = createAdminClient();

  // Fetch source lesson's module + position
  const { data: srcLesson } = await db
    .from("lessons")
    .select("module_id, position")
    .eq("id", lessonId)
    .single();

  if (!srcLesson) throw new Error("Source lesson not found");
  const { module_id, position } = srcLesson;

  // Dedup check — skip if a remedial for this topic already exists in module
  const dedupePrefix = topic.slice(0, 40);
  const { data: existing } = await db
    .from("lessons")
    .select("id")
    .eq("module_id", module_id)
    .eq("lesson_type", "remedial")
    .ilike("title", `%${dedupePrefix}%`)
    .maybeSingle();

  if (existing) return existing.id;

  // Shift all lessons after the source position up by 1 to make room
  const { data: toShift } = await db
    .from("lessons")
    .select("id, position")
    .eq("module_id", module_id)
    .gt("position", position)
    .order("position", { ascending: false }); // descending avoids unique-key conflicts

  for (const l of toShift ?? []) {
    await db.from("lessons").update({ position: l.position + 1 }).eq("id", l.id);
  }

  // Compose the generation prompt
  const toneHint =
    difficultyLevel === "foundational"
      ? "Use the simplest possible language — zero jargon, maximum concrete examples."
      : difficultyLevel === "advanced"
      ? "Be efficient and precise. Skip all basics. Focus entirely on the nuance they missed."
      : "Use clear, conversational language with one strong analogy and one worked example.";

  const anthropic = getAnthropicClient();
  const msg = await anthropic.messages.create({
    model: MODELS.SONNET,
    max_tokens: 1500,
    messages: [
      {
        role: "user",
        content: `You're a patient tutor writing a SHORT remedial lesson (250–450 words, Markdown) for a student who struggled with:

Topic: "${topic}"
Original lesson: "${lessonTitle}"
Course: "${courseTitle}"

Rules:
- Do NOT repeat what the original lesson said
- Explain the same concept from a COMPLETELY DIFFERENT angle — new framing, fresh analogy
- Give ONE concrete worked example (not abstract)
- Keep it warm and confidence-building; the student just got something wrong
- End with one clear, memorable takeaway sentence

${toneHint}

Output ONLY the Markdown content. No preamble, no metadata.`,
      },
    ],
  });

  const raw = msg.content[0];
  if (raw.type !== "text") throw new Error("Unexpected Claude response type");

  // Insert the remedial lesson
  const { data: remedial, error } = await db
    .from("lessons")
    .insert({
      module_id,
      title: `Quick Review: ${topic.slice(0, 80)}`,
      content: raw.text,
      content_type: "text",
      lesson_type: "remedial",
      position: position + 1,
      is_published: true,
      duration_minutes: 5,
    })
    .select("id")
    .single();

  if (error || !remedial) {
    throw new Error(`Failed to save remedial lesson: ${error?.message}`);
  }

  return remedial.id;
}
