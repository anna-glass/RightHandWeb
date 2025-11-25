# RightHandWeb

SMS-based AI personal assistant ("Right Hand") built with Next.js. Users interact via iMessage/SMS to manage calendar, email, and reminders.

## Tech Stack

- **Framework:** Next.js 16 (App Router), React 19, TypeScript
- **Database:** Supabase (PostgreSQL)
- **AI:** Anthropic Claude (claude-sonnet-4-5-20250929)
- **UI:** Tailwind CSS, Radix UI, Shadcn components
- **SMS:** Blooio API
- **Scheduling:** Upstash Qstash
- **Auth:** Google OAuth + Supabase Auth

## Project Structure

```
app/
├── api/                  # API routes
│   ├── process-message/  # Main SMS webhook handler
│   ├── reminders/callback/  # Qstash reminder callback
│   └── webhooks/blooio/  # Blooio webhook
├── home/                 # Authenticated user dashboard
├── admin/                # Admin dashboard (@getrighthand.com only)
├── signin/               # Google OAuth login
└── verify/[token]/       # Onboarding flow

lib/
├── claude.ts             # Claude API integration
├── tools.ts              # Tool definitions for Claude
├── handlers/             # Tool handler implementations
│   ├── calendar.ts       # Google Calendar operations
│   ├── email.ts          # Gmail operations
│   ├── reminders.ts      # Reminder scheduling
│   └── search.ts         # Web search (Perplexity)
├── google-*.ts           # Google API integrations
├── supabase/             # Database clients
└── qstash.ts             # Job scheduling

components/
├── ui/                   # Shadcn UI components
└── *.tsx                 # Custom components
```

## Key Patterns

### Claude Tool Architecture
- Tool definitions in `lib/tools.ts`
- Handlers in `lib/handlers/` (calendar, email, reminders, search)
- Dispatcher in `lib/handlers/index.ts`

### Message Flow
1. Blooio webhook → `/api/process-message`
2. Rate limit check → Claude response with tool use
3. Tool execution → SMS reply via Blooio

### Database Tables (Supabase)
- `profiles` - User data with Google tokens
- `reminders` - Scheduled reminders
- `pending_verifications` - Email verification tokens

## Environment Variables

Required in `.env.local`:
- `ANTHROPIC_API_KEY`
- `BLOOIO_API_KEY`, `BLOOIO_DEVICE_ID`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`
- `QSTASH_TOKEN`, `QSTASH_CURRENT_SIGNING_KEY`, `QSTASH_NEXT_SIGNING_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `PERPLEXITY_API_KEY`

## Commands

```bash
npm run dev      # Start dev server
npm run build    # Production build
npx tsc --noEmit # Type check
```

## Conventions

- Use `@/` path alias (maps to project root)
- All times in user's timezone
- AI responses: lowercase, casual, brief
- Admin routes require `@getrighthand.com` email
- Shadcn components in `components/ui/`

### File Headers

Every file must start with this header format:

```typescript
/**
 * path/to/file.tsx
 *
 * Author: Anna Glass
 * Created: MM/DD/YYYY
 *
 * Right Hand, 2025. All rights reserved.
 */
```

### Function/Component Headers

Top-level functions and components should have a brief description header:

```typescript
/**
 * ComponentName
 * lowercase description of what it does.
 */
export function ComponentName() { ... }

/**
 * METHOD /api/route/path
 * lowercase description of the endpoint.
 */
export async function POST(request: Request) { ... }
```

### Comments

- Keep comments minimal
- Use lowercase throughout
- Only add comments where logic isn't self-evident

### Linting

- NEVER use `eslint-disable` comments - always fix the underlying lint issue
- Fix type errors properly, don't suppress them

## Important Files

- `lib/system-prompts.ts` - AI personality and instructions
- `lib/tools.ts` - Available Claude tools
- `lib/handlers/index.ts` - Tool execution logic
- `app/api/process-message/route.ts` - Main message handler
