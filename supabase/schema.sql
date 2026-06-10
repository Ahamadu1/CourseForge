-- ============================================================
-- CourseForge — Supabase Schema
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor)
-- ============================================================

-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm"; -- for full-text search on titles

-- ============================================================
-- HELPER: auto-update updated_at on any row change
-- ============================================================

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- TABLE: user_profiles
-- One row per authenticated user (synced from auth.users).
-- ============================================================

create table public.user_profiles (
  id          uuid        primary key references auth.users (id) on delete cascade,
  email       text        unique not null,
  full_name   text,
  avatar_url  text,
  bio         text,
  timezone    text        not null default 'UTC',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger on_user_profiles_updated
  before update on public.user_profiles
  for each row execute function public.handle_updated_at();

-- Auto-create a profile row whenever a new auth user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
as $$
begin
  insert into public.user_profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- TABLE: courses
-- ============================================================

create table public.courses (
  id               uuid        primary key default uuid_generate_v4(),
  creator_id       uuid        references auth.users (id) on delete set null,
  title            text        not null,
  description      text,
  slug             text        unique not null,
  thumbnail_url    text,
  difficulty_level text        check (difficulty_level in ('beginner', 'intermediate', 'advanced')),
  is_published     boolean     not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index idx_courses_creator   on public.courses (creator_id);
create index idx_courses_slug      on public.courses (slug);
create index idx_courses_published on public.courses (is_published) where is_published = true;

create trigger on_courses_updated
  before update on public.courses
  for each row execute function public.handle_updated_at();

-- ============================================================
-- TABLE: modules
-- Ordered sections within a course.
-- ============================================================

create table public.modules (
  id          uuid        primary key default uuid_generate_v4(),
  course_id   uuid        not null references public.courses (id) on delete cascade,
  title       text        not null,
  description text,
  position    integer     not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index idx_modules_course on public.modules (course_id, position);

create trigger on_modules_updated
  before update on public.modules
  for each row execute function public.handle_updated_at();

-- ============================================================
-- TABLE: lessons
-- Individual lessons within a module.
-- ============================================================

create table public.lessons (
  id               uuid        primary key default uuid_generate_v4(),
  module_id        uuid        not null references public.modules (id) on delete cascade,
  title            text        not null,
  content          text,
  content_type     text        not null default 'text'
                               check (content_type in ('video', 'text', 'interactive', 'audio')),
  video_url        text,
  duration_minutes integer     check (duration_minutes > 0),
  position         integer     not null default 0,
  is_published     boolean     not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index idx_lessons_module on public.lessons (module_id, position);

create trigger on_lessons_updated
  before update on public.lessons
  for each row execute function public.handle_updated_at();

-- ============================================================
-- TABLE: quizzes
-- Can be attached to a lesson OR a module (not both).
-- questions is a JSONB array of QuizQuestion objects.
-- ============================================================

create table public.quizzes (
  id                  uuid        primary key default uuid_generate_v4(),
  lesson_id           uuid        references public.lessons (id) on delete cascade,
  module_id           uuid        references public.modules (id) on delete cascade,
  title               text        not null,
  description         text,
  questions           jsonb       not null default '[]'::jsonb,
  passing_score       integer     not null default 70
                                  check (passing_score between 0 and 100),
  time_limit_minutes  integer     check (time_limit_minutes > 0),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  -- must belong to at least one parent
  constraint quiz_has_parent check (lesson_id is not null or module_id is not null)
);

create index idx_quizzes_lesson on public.quizzes (lesson_id) where lesson_id is not null;
create index idx_quizzes_module on public.quizzes (module_id) where module_id is not null;

create trigger on_quizzes_updated
  before update on public.quizzes
  for each row execute function public.handle_updated_at();

-- ============================================================
-- TABLE: quiz_attempts
-- One row per user attempt at a quiz.
-- answers: { [questionId]: selectedAnswer }
-- ============================================================

create table public.quiz_attempts (
  id                  uuid        primary key default uuid_generate_v4(),
  quiz_id             uuid        not null references public.quizzes (id) on delete cascade,
  user_id             uuid        not null references auth.users (id) on delete cascade,
  answers             jsonb       not null default '{}'::jsonb,
  score               integer     check (score between 0 and 100),
  passed              boolean,
  time_taken_seconds  integer     check (time_taken_seconds >= 0),
  completed_at        timestamptz,
  created_at          timestamptz not null default now()
);

create index idx_quiz_attempts_user on public.quiz_attempts (user_id);
create index idx_quiz_attempts_quiz on public.quiz_attempts (quiz_id);

-- ============================================================
-- TABLE: goals
-- High-level learning objectives a user sets for themselves.
-- ============================================================

create table public.goals (
  id           uuid        primary key default uuid_generate_v4(),
  user_id      uuid        not null references auth.users (id) on delete cascade,
  title        text        not null,
  description  text,
  target_date  date,
  status       text        not null default 'active'
                           check (status in ('active', 'completed', 'paused', 'abandoned')),
  progress     integer     not null default 0
                           check (progress between 0 and 100),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index idx_goals_user   on public.goals (user_id);
create index idx_goals_status on public.goals (user_id, status);

create trigger on_goals_updated
  before update on public.goals
  for each row execute function public.handle_updated_at();

-- ============================================================
-- TABLE: tasks
-- Actionable to-dos, optionally linked to a goal.
-- ============================================================

create table public.tasks (
  id           uuid        primary key default uuid_generate_v4(),
  user_id      uuid        not null references auth.users (id) on delete cascade,
  goal_id      uuid        references public.goals (id) on delete set null,
  title        text        not null,
  description  text,
  due_date     timestamptz,
  priority     text        not null default 'medium'
                           check (priority in ('low', 'medium', 'high')),
  status       text        not null default 'todo'
                           check (status in ('todo', 'in_progress', 'done')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index idx_tasks_user   on public.tasks (user_id);
create index idx_tasks_goal   on public.tasks (goal_id) where goal_id is not null;
create index idx_tasks_status on public.tasks (user_id, status);

create trigger on_tasks_updated
  before update on public.tasks
  for each row execute function public.handle_updated_at();

-- ============================================================
-- TABLE: weak_spots
-- Topics where a user has demonstrated low mastery.
-- Detected automatically from failed quiz attempts or set manually.
-- ============================================================

create table public.weak_spots (
  id                uuid        primary key default uuid_generate_v4(),
  user_id           uuid        not null references auth.users (id) on delete cascade,
  course_id         uuid        references public.courses (id) on delete cascade,
  quiz_attempt_id   uuid        references public.quiz_attempts (id) on delete set null,
  topic             text        not null,
  description       text,
  confidence_level  integer     check (confidence_level between 1 and 5),
  resolved          boolean     not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index idx_weak_spots_user     on public.weak_spots (user_id);
create index idx_weak_spots_resolved on public.weak_spots (user_id, resolved) where not resolved;

create trigger on_weak_spots_updated
  before update on public.weak_spots
  for each row execute function public.handle_updated_at();

-- ============================================================
-- TABLE: enrollments
-- Tracks which users are enrolled in which courses.
-- ============================================================

create table public.enrollments (
  id           uuid        primary key default uuid_generate_v4(),
  user_id      uuid        not null references auth.users (id) on delete cascade,
  course_id    uuid        not null references public.courses (id) on delete cascade,
  enrolled_at  timestamptz not null default now(),
  completed_at timestamptz,
  unique (user_id, course_id)
);

create index idx_enrollments_user   on public.enrollments (user_id);
create index idx_enrollments_course on public.enrollments (course_id);

-- ============================================================
-- TABLE: lesson_progress
-- Per-user per-lesson completion and video position tracking.
-- ============================================================

create table public.lesson_progress (
  id                     uuid        primary key default uuid_generate_v4(),
  user_id                uuid        not null references auth.users (id) on delete cascade,
  lesson_id              uuid        not null references public.lessons (id) on delete cascade,
  completed              boolean     not null default false,
  completed_at           timestamptz,
  last_position_seconds  integer     not null default 0
                                     check (last_position_seconds >= 0),
  unique (user_id, lesson_id)
);

create index idx_lesson_progress_user on public.lesson_progress (user_id);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- Enable on all user-data tables so users can only see their own rows.
-- courses/modules/lessons are readable by all authenticated users.
-- ============================================================

alter table public.user_profiles  enable row level security;
alter table public.courses         enable row level security;
alter table public.modules         enable row level security;
alter table public.lessons         enable row level security;
alter table public.quizzes         enable row level security;
alter table public.quiz_attempts   enable row level security;
alter table public.goals           enable row level security;
alter table public.tasks           enable row level security;
alter table public.weak_spots      enable row level security;
alter table public.enrollments     enable row level security;
alter table public.lesson_progress enable row level security;

-- user_profiles: own row only
create policy "Users can view own profile"
  on public.user_profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.user_profiles for update
  using (auth.uid() = id);

-- courses: published courses are readable by all authenticated users
create policy "Anyone can read published courses"
  on public.courses for select
  using (is_published = true or auth.uid() = creator_id);

create policy "Creators can insert courses"
  on public.courses for insert
  with check (auth.uid() = creator_id);

create policy "Creators can update own courses"
  on public.courses for update
  using (auth.uid() = creator_id);

create policy "Creators can delete own courses"
  on public.courses for delete
  using (auth.uid() = creator_id);

-- modules: readable if parent course is readable
create policy "Read modules of accessible courses"
  on public.modules for select
  using (
    exists (
      select 1 from public.courses c
      where c.id = course_id
        and (c.is_published = true or c.creator_id = auth.uid())
    )
  );

create policy "Creators can manage modules"
  on public.modules for all
  using (
    exists (
      select 1 from public.courses c
      where c.id = course_id and c.creator_id = auth.uid()
    )
  );

-- lessons: same as modules
create policy "Read lessons of accessible modules"
  on public.lessons for select
  using (
    exists (
      select 1 from public.modules m
      join public.courses c on c.id = m.course_id
      where m.id = module_id
        and (c.is_published = true or c.creator_id = auth.uid())
    )
  );

create policy "Creators can manage lessons"
  on public.lessons for all
  using (
    exists (
      select 1 from public.modules m
      join public.courses c on c.id = m.course_id
      where m.id = module_id and c.creator_id = auth.uid()
    )
  );

-- quizzes: same as lessons/modules
create policy "Read quizzes for accessible content"
  on public.quizzes for select
  using (auth.uid() is not null);

-- quiz_attempts: own attempts only
create policy "Users manage own quiz attempts"
  on public.quiz_attempts for all
  using (auth.uid() = user_id);

-- goals, tasks, weak_spots: own rows only
create policy "Users manage own goals"
  on public.goals for all
  using (auth.uid() = user_id);

create policy "Users manage own tasks"
  on public.tasks for all
  using (auth.uid() = user_id);

create policy "Users manage own weak spots"
  on public.weak_spots for all
  using (auth.uid() = user_id);

-- enrollments: own rows only
create policy "Users manage own enrollments"
  on public.enrollments for all
  using (auth.uid() = user_id);

-- lesson_progress: own rows only
create policy "Users manage own lesson progress"
  on public.lesson_progress for all
  using (auth.uid() = user_id);
