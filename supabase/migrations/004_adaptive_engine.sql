-- ─── Phase 4B: Adaptive Learning Engine ─────────────────────────────────────
-- Run this in the Supabase SQL editor.

-- 1. lesson_type column on lessons
ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS lesson_type text NOT NULL DEFAULT 'standard'
  CHECK (lesson_type IN ('standard', 'remedial', 'challenge'));

-- 2. adaptive_profiles table — one row per user, stores rolling EMA score
CREATE TABLE IF NOT EXISTS public.adaptive_profiles (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid        NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  rolling_score    numeric,                               -- 0–100, exponential moving average
  difficulty_level text        NOT NULL DEFAULT 'standard'
    CHECK (difficulty_level IN ('foundational', 'standard', 'advanced')),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.adaptive_profiles ENABLE ROW LEVEL SECURITY;

-- Users can read and manage their own adaptive profile
CREATE POLICY "adaptive_profiles_user_all"
  ON public.adaptive_profiles FOR ALL
  TO authenticated
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Service role (used by admin client in API routes) bypasses RLS automatically.
