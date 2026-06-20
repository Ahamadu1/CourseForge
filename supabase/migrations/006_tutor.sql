-- Phase 4F: Context-Aware AI Tutor Chat
-- Run this in the Supabase SQL editor.

-- ── Tables ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.tutor_sessions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id   uuid REFERENCES public.courses(id) ON DELETE SET NULL,
  title       text NOT NULL DEFAULT 'New chat',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tutor_messages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  uuid NOT NULL REFERENCES public.tutor_sessions(id) ON DELETE CASCADE,
  role        text NOT NULL CHECK (role IN ('user', 'assistant')),
  content     text NOT NULL,
  tokens_used integer,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ── Indexes ───────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS tutor_sessions_user_id_idx
  ON public.tutor_sessions(user_id);

CREATE INDEX IF NOT EXISTS tutor_sessions_updated_at_idx
  ON public.tutor_sessions(updated_at DESC);

CREATE INDEX IF NOT EXISTS tutor_messages_session_id_idx
  ON public.tutor_messages(session_id);

CREATE INDEX IF NOT EXISTS tutor_messages_created_at_idx
  ON public.tutor_messages(created_at);

-- ── Row-Level Security ────────────────────────────────────────────────────────

ALTER TABLE public.tutor_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tutor_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_tutor_sessions"
  ON public.tutor_sessions FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "users_own_tutor_messages"
  ON public.tutor_messages FOR ALL
  USING (
    session_id IN (
      SELECT id FROM public.tutor_sessions WHERE user_id = auth.uid()
    )
  );
