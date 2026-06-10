# CourseForge

> An AI-powered personalized course creator that builds adaptive learning experiences from a single onboarding flow.

CourseForge generates a complete course tailored to your skill level, goal, and learning style — then evolves as you progress. Lessons are AI-narrated with auto-generated slides. Quizzes detect weak spots and inject remedial micro-lessons. Your goal gets broken down into an executable schedule. Everything is stored as structured data, not text blobs.

This is not a ChatGPT wrapper. Remove the AI tomorrow and you still have a fully functional course platform.

---

## What It Does

- **Personalized onboarding** — 6-step flow capturing niche, skill level, goal, daily time, and learning style
- **AI course generation** — structured course outline, modules, lessons, and quizzes generated per user
- **Audio narration** — every lesson can be read aloud with read-along highlighting
- **Auto-generated slides** — visual presentation that auto-advances in sync with the audio
- **Adaptive learning engine** — detects weak spots, generates remedial micro-lessons, adjusts difficulty
- **Goal breakdown** — your goal gets converted into prioritized tasks and a weekly schedule
- **Quizzes with feedback** — instant scoring, explanations, weakness tracking
- **Personal analytics** — progress over time, quiz performance, streaks, topic mastery, achievements
- **PDF export** — download your entire course as a polished workbook

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), React, TypeScript |
| Styling | Tailwind CSS |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| AI Generation | Anthropic Claude API (Sonnet 4.6 + Haiku 4.5) |
| Audio | Web Speech API (browser TTS) |
| PDF | @react-pdf/renderer |
| Charts | Recharts |
| Deployment | Vercel-ready |

---

## Architecture

The product is built around structured data, not generated text. Every course is a graph of relationships:

```
users → user_profiles → courses → modules → lessons → quizzes → quiz_attempts
                     ↘ goals → tasks
                     ↘ weak_spots → adaptive_profiles
                     ↘ lesson_progress
```

The AI layer generates the content that fills this structure. The app's value is in the structure, the progress tracking, the adaptive logic, and the user experience.

---

## Project Structure

```
/app
  /(auth)              Login / signup
  /onboarding          6-step wizard
  /dashboard           Course + goals + schedule + progress
  /lesson/[id]         Lesson viewer with audio + slides
  /lesson/[id]/quiz    Quiz UI
  /analytics           Personal learning analytics
  /api                 Generation + export endpoints
/components            Shared UI
/hooks                 useSpeech, useUser, etc.
/lib
  /anthropic           AI client + prompt builders
  /adaptive            Weakness analysis + difficulty engine
  /supabase            Server + browser clients
  /tts                 Text-to-speech helpers
/supabase
  /migrations          Database migrations (run in order)
  schema.sql           Full schema reference
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project (free tier works)
- An [Anthropic API key](https://console.anthropic.com)

### 1. Clone and install

```bash
git clone https://github.com/YOUR_USERNAME/courseforge.git
cd courseforge
npm install
```

### 2. Set environment variables

Copy the example file:

```bash
cp .env.local.example .env.local
```

Fill in the required keys:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ANTHROPIC_API_KEY=sk-ant-your-key
```

### 3. Set up the database

In your Supabase project's SQL Editor, run the migrations in `/supabase/migrations` in order, or run the full `schema.sql` from a fresh database.

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and create an account to walk through the onboarding flow.

---

## Build Phases

The product was built in clear phases. Each phase is reviewable and reversible.

| Phase | Status | Description |
|---|---|---|
| 1 | ✅ | Project scaffold, schema, auth |
| 2 | ✅ | Claude API course generation engine |
| 3A | ✅ | Auth pages + 6-step onboarding |
| 3B | ✅ | Dashboard with course, goals, schedule, progress tabs |
| 3C | ✅ | Lesson viewer + quiz + progress tracking |
| 4A | ✅ | Browser TTS audio narration with read-along highlighting |
| 4B | ✅ | Adaptive learning engine — weak spot detection + remedial lessons |
| 4C | ✅ | Auto-generated visual slides |
| 4D | ✅ | Personal analytics dashboard |
| 4E | 🚧 | PDF course export |
| 4F | ⏳ | Context-aware AI tutor chat |

---

## Cost Per User (Estimated)

| Item | Cost |
|---|---|
| Claude API — course generation (cached) | ~$0.05–0.10 |
| Claude API — quizzes (Haiku) | ~$0.01–0.03 |
| Web Speech API audio | $0.00 |
| Supabase + Vercel free tiers | $0.00 |
| **Total per user** | **~$0.10–0.15** |

Built with cost discipline. Lesson content is generated once and cached forever — costs converge toward zero per user over time.

---

## Design Principles

This project follows a few rules to avoid becoming "just a wrapper":

1. **Structured data over text** — every AI output gets parsed into typed JSON and stored in real database tables
2. **Lazy generation** — lessons aren't generated until they're opened, reducing cost ~80% vs upfront generation
3. **Cached forever** — once generated, content is never regenerated unless explicitly requested
4. **Adaptive by default** — the course evolves based on the user's quiz performance, not their stated preferences
5. **Cost-tiered models** — Sonnet for reasoning-heavy tasks, Haiku for structured outputs and routing
6. **No client-side AI calls** — every Claude API call happens server-side, behind auth

---

## Roadmap

- [ ] Phase 4E — PDF course export
- [ ] Phase 4F — Context-aware AI tutor chat
- [ ] Stripe payments + subscription tiers
- [ ] Email reminders (Resend)
- [ ] Premium voices (ElevenLabs / OpenAI TTS)
- [ ] Course sharing + public links
- [ ] Mobile app (React Native)

---

## License

Proprietary. All rights reserved.

---

## Acknowledgements

Built with [Anthropic Claude](https://anthropic.com), [Supabase](https://supabase.com), [Next.js](https://nextjs.org), and [Vercel](https://vercel.com).
