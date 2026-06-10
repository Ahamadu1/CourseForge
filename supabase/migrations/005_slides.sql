-- Phase 4C: Auto-Generated Slides
-- Run this in the Supabase SQL editor.

ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS slides jsonb;
