# CourseForge — Claude Code Guide

## Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)
- **Styling**: Tailwind CSS

## Brand Palette
| Token | Hex |
|-------|-----|
| Primary | `#7F77DD` |
| Tint | `#EEEDFE` |
| Dark | `#3C3489` |

## Project Structure
```
app/              # Next.js App Router pages and layouts
lib/anthropic/    # Claude API clients and generation logic
components/       # Shared React components
hooks/            # Custom React hooks
supabase/         # Migrations (001–005) and full schema (schema.sql)
```

## Conventions
- Lessons are stored as **structured data** and **lazy-generated** on first access
- Lesson content is **Markdown**
- Use **Claude Sonnet** for lesson/content generation
- Use **Claude Haiku** for quiz generation

## Database
- Migrations: `supabase/migrations/001` through `005`
- Full schema: `supabase/schema.sql`

## Build Status

### Completed
| Phase | Feature |
|-------|---------|
| 1 | Core scaffolding |
| 2 | Course creation flow |
| 3A | Auth pages + 6-step onboarding wizard |
| 3B | Knowledge check API |
| 3C | Dashboard |
| 4A | Audio narration |
| 4B | Adaptive learning engine |
| 4C | Auto slide generation |
| 4D | Analytics dashboard |

### In Progress
| Phase | Feature |
|-------|---------|
| 4E | PDF export |
