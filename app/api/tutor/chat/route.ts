import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAnthropicClient } from "@/lib/anthropic/client";
import { MODELS } from "@/lib/anthropic/models";
import { buildTutorContext } from "@/lib/tutor/buildContext";
import { buildSystemPrompt, buildBaseFallbackPrompt } from "@/lib/tutor/systemPrompt";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDB = any;

// ── In-memory rate limiter (50 messages / user / day) ─────────────────────────

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

const RATE_LIMIT = parseInt(process.env.TUTOR_RATE_LIMIT ?? "50", 10);

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const midnight = new Date();
  midnight.setHours(24, 0, 0, 0);

  const entry = rateLimitMap.get(userId);
  if (!entry || entry.resetAt <= now) {
    rateLimitMap.set(userId, { count: 1, resetAt: midnight.getTime() });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

// ── Conversation summarization (Haiku) ────────────────────────────────────────

async function summarizeOlderMessages(
  messages: { role: string; content: string }[]
): Promise<string> {
  const formatted = messages
    .map((m) => `${m.role === "user" ? "Student" : "Tutor"}: ${m.content}`)
    .join("\n\n");

  try {
    const client = getAnthropicClient();
    const response = await client.messages.create({
      model: MODELS.HAIKU,
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: `Summarize this tutoring conversation in 3–4 sentences, capturing the main topics, questions, and key points covered:\n\n${formatted}`,
        },
      ],
    });
    return response.content[0]?.type === "text"
      ? response.content[0].text.trim()
      : "Earlier conversation covered foundational topics from the course.";
  } catch {
    return "Earlier conversation covered foundational topics from the course.";
  }
}

// ── Session title generator (Haiku) ───────────────────────────────────────────

async function generateSessionTitle(firstMessage: string): Promise<string> {
  try {
    const client = getAnthropicClient();
    const response = await client.messages.create({
      model: MODELS.HAIKU,
      max_tokens: 20,
      messages: [
        {
          role: "user",
          content: `Generate a chat title for this question in 3–6 words, no punctuation:\n\n"${firstMessage.slice(0, 200)}"`,
        },
      ],
    });
    const raw = response.content[0]?.type === "text" ? response.content[0].text.trim() : null;
    if (!raw) return "New chat";
    return raw
      .replace(/^["']|["']$/g, "")
      .replace(/[.!?]$/, "")
      .slice(0, 60);
  } catch {
    return firstMessage.slice(0, 40);
  }
}

// ── SSE helpers ───────────────────────────────────────────────────────────────

function sseEvent(data: Record<string, unknown>): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  console.log("[tutor/chat] POST called");
  console.log("[tutor/chat] ANTHROPIC_API_KEY present:", !!process.env.ANTHROPIC_API_KEY);
  console.log("[tutor/chat] SUPABASE_URL present:", !!process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log("[tutor/chat] SERVICE_ROLE_KEY present:", !!process.env.SUPABASE_SERVICE_ROLE_KEY);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  console.log("[tutor/chat] user:", user?.id ?? "NONE");
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!checkRateLimit(user.id)) {
    return NextResponse.json(
      { error: `Rate limit reached. Max ${RATE_LIMIT} messages per day.` },
      { status: 429 }
    );
  }

  let body: { sessionId?: string; message: string; courseId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { sessionId: providedSessionId, message, courseId } = body;
  console.log("[tutor/chat] body:", { providedSessionId, courseId, messageLength: message?.length });

  const cleanMessage = (message ?? "").trim().slice(0, 4000);
  if (!cleanMessage) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  // Using `as AnyDB` to bypass typed Supabase client for new tables (same pattern as quiz-submit)
  const db = createAdminClient() as AnyDB;

  // ── Get or create session ──────────────────────────────────────────────────
  let sessionId: string;
  let isNewSession = false;
  let resolvedCourseId: string | null = courseId ?? null;

  if (!providedSessionId) {
    console.log("[tutor/chat] creating new session for user:", user.id, "course:", resolvedCourseId);
    const { data: newSession, error: sessionErr } = await db
      .from("tutor_sessions")
      .insert({ user_id: user.id, course_id: resolvedCourseId, title: "New chat" })
      .select("id")
      .single();

    if (sessionErr || !newSession) {
      console.error("[tutor/chat] session create failed:", sessionErr);
      return NextResponse.json({ error: "Failed to create session", detail: sessionErr?.message ?? "no data" }, { status: 500 });
    }
    sessionId = newSession.id as string;
    isNewSession = true;
  } else {
    console.log("[tutor/chat] looking up existing session:", providedSessionId);
    const { data: existingSession, error: lookupErr } = await db
      .from("tutor_sessions")
      .select("id, course_id")
      .eq("id", providedSessionId)
      .eq("user_id", user.id)
      .single();

    if (!existingSession) {
      console.error("[tutor/chat] session lookup failed:", lookupErr);
      return NextResponse.json({ error: "Session not found", detail: lookupErr?.message ?? "no data" }, { status: 404 });
    }
    sessionId = existingSession.id as string;
    resolvedCourseId = resolvedCourseId ?? (existingSession.course_id as string | null);
  }

  // ── Save user message ──────────────────────────────────────────────────────
  await db.from("tutor_messages").insert({
    session_id: sessionId,
    role: "user",
    content: cleanMessage,
  });

  // ── Fetch conversation history ─────────────────────────────────────────────
  const { data: historyRows } = await db
    .from("tutor_messages")
    .select("role, content")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true })
    .limit(40);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const history = (historyRows as any[]) ?? [];

  // ── Build messages for Claude (summarize if > 20) ─────────────────────────
  let conversationMessages: { role: "user" | "assistant"; content: string }[];

  if (history.length > 20) {
    const older = history.slice(0, history.length - 20);
    const recent = history.slice(history.length - 20);
    const summary = await summarizeOlderMessages(older);
    conversationMessages = [
      { role: "user", content: `[Context from our earlier conversation: ${summary}]` },
      { role: "assistant", content: "I have that context. Let's continue." },
      ...recent.map((m: AnyDB) => ({ role: m.role as "user" | "assistant", content: m.content as string })),
    ];
  } else {
    conversationMessages = history.map((m: AnyDB) => ({
      role: m.role as "user" | "assistant",
      content: m.content as string,
    }));
  }

  // ── Build system prompt ────────────────────────────────────────────────────
  let systemPrompt = buildBaseFallbackPrompt();
  if (resolvedCourseId) {
    try {
      console.log("[tutor/chat] building context for course:", resolvedCourseId);
      const ctx = await buildTutorContext(user.id, resolvedCourseId);
      systemPrompt = buildSystemPrompt(ctx);
      console.log("[tutor/chat] context built OK, weakSpots:", ctx.weakSpots.length);
    } catch (ctxErr) {
      console.error("[tutor/chat] buildTutorContext failed (using fallback):", ctxErr);
    }
  }

  // ── Stream ─────────────────────────────────────────────────────────────────
  const encoder = new TextEncoder();
  const capturedSessionId = sessionId;
  const capturedIsNew = isNewSession;

  const stream = new ReadableStream({
    async start(controller) {
      const enqueue = (data: Record<string, unknown>) =>
        controller.enqueue(encoder.encode(sseEvent(data)));

      try {
        console.log("[tutor/chat] stream start, sessionId:", capturedSessionId, "isNew:", capturedIsNew);

        // Announce session for new chats
        if (capturedIsNew) {
          enqueue({ type: "session", sessionId: capturedSessionId });
        }

        // Stream Claude Sonnet response
        const anthropic = getAnthropicClient();
        console.log("[tutor/chat] calling Claude, messages:", conversationMessages.length);
        let fullResponse = "";

        const claudeStream = anthropic.messages.stream({
          model: MODELS.SONNET,
          max_tokens: 1024,
          system: systemPrompt,
          messages: conversationMessages,
        });

        for await (const event of claudeStream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            const text = event.delta.text;
            fullResponse += text;
            enqueue({ type: "token", text });
          }
        }

        const finalMessage = await claudeStream.finalMessage();
        const tokensUsed = finalMessage.usage?.output_tokens ?? null;

        // Save assistant message
        const { data: savedMsg } = await db
          .from("tutor_messages")
          .insert({
            session_id: capturedSessionId,
            role: "assistant",
            content: fullResponse,
            tokens_used: tokensUsed,
          })
          .select("id")
          .single();

        // Auto-title new sessions
        if (capturedIsNew) {
          const title = await generateSessionTitle(cleanMessage);
          await db
            .from("tutor_sessions")
            .update({ title, updated_at: new Date().toISOString() })
            .eq("id", capturedSessionId);
          enqueue({ type: "title", sessionId: capturedSessionId, title });
        } else {
          await db
            .from("tutor_sessions")
            .update({ updated_at: new Date().toISOString() })
            .eq("id", capturedSessionId);
        }

        enqueue({ type: "done", messageId: (savedMsg as AnyDB)?.id ?? null });
        controller.close();
      } catch (err) {
        console.error("[tutor/chat] stream error:", err);
        console.error("[tutor/chat] stream error name:", (err as Error)?.name);
        console.error("[tutor/chat] stream error message:", (err as Error)?.message);
        try {
          const errMsg = (err as Error)?.message ?? "Generation failed";
          controller.enqueue(
            encoder.encode(sseEvent({ type: "error", error: errMsg }))
          );
          controller.close();
        } catch {}
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
