# UIGen — Claude Code Guide

## Project Overview
AI-powered React component generator with live preview. Users describe components in chat; Claude generates them into a virtual file system with hot-reload preview.

## Commands
```bash
npm run dev          # Start dev server (Turbopack) at localhost:3000
npm run setup        # Install deps + generate Prisma client + run migrations
npm run test         # Run Vitest tests
npm run build        # Production build
npm run db:reset     # Reset database (destructive)
```

## Architecture

### Key Concepts
- **Virtual File System**: All generated files live in-memory (`src/lib/file-system.ts`). Nothing is written to disk. Files are serialized to JSON and stored in the `Project.data` DB column for authenticated users.
- **AI Tools**: Claude uses two tools during generation — `str_replace_editor` (edit existing files) and `file_manager` (create/delete/rename files). Defined in `src/lib/tools/`.
- **Entry point for generated apps**: Every project must have `/App.jsx` as the root component with a default export.
- **Import alias**: Non-library imports in generated files use `@/` (e.g., `@/components/Button`).

### Directory Structure
```
src/
  app/
    api/chat/route.ts       # Streaming AI endpoint (POST)
    [projectId]/page.tsx    # Project view
    page.tsx                # Home / project list
  components/
    chat/                   # Chat UI (MessageList, MessageInput, ChatInterface)
    editor/                 # CodeEditor (Monaco), FileTree
    preview/                # PreviewFrame (renders generated app)
    auth/                   # SignIn/SignUp forms, AuthDialog
    ui/                     # shadcn/ui primitives
  lib/
    file-system.ts          # VirtualFileSystem class
    auth.ts                 # JWT auth (jose + bcrypt)
    prisma.ts               # Prisma client singleton
    provider.ts             # getLanguageModel() — returns Claude or mock
    tools/                  # AI tool builders (str-replace, file-manager)
    prompts/generation.tsx  # System prompt for component generation
    contexts/               # React contexts (chat, file-system)
    transform/jsx-transformer.ts  # Babel transpile for preview
  actions/                  # Next.js server actions (create/get projects)
prisma/
  schema.prisma             # User + Project models (SQLite)
  dev.db                    # Local SQLite database
```

### Data Flow
1. User sends message → `POST /api/chat` with `{ messages, files, projectId }`
2. Server reconstructs `VirtualFileSystem` from serialized `files`
3. `streamText` runs with Claude + tools (up to 40 steps)
4. Claude calls `str_replace_editor` / `file_manager` to build/edit files
5. On finish: if authenticated + `projectId`, saves messages + serialized FS to DB
6. Client streams response, updates file system context, re-renders preview

### Auth
- Custom JWT using `jose` (no NextAuth)
- Passwords hashed with `bcrypt`
- Session stored in HTTP-only cookie
- Anonymous users can generate but cannot persist projects

## Tech Stack
- **Next.js 15** App Router, React 19, TypeScript
- **Tailwind CSS v4** (no config file — uses CSS-based config)
- **Prisma 6** + SQLite (`prisma/dev.db`)
- **Vercel AI SDK** (`ai` + `@ai-sdk/anthropic`)
- **Monaco Editor** for code editing
- **Babel standalone** for JSX transpilation in preview
- **Vitest** + Testing Library for tests

## Environment
```
ANTHROPIC_API_KEY=   # Optional — omit to use mock provider (returns static code)
```

## Testing
Tests live in `__tests__` folders alongside source. Run with `npm run test`.
Mock provider is used automatically when `ANTHROPIC_API_KEY` is not set (maxSteps reduced to 4).

## Session Notes

- `ANTHROPIC_API_KEY` is set in `.env` — real Claude API is active
- User prefers brief responses, no summaries after tasks
- User uses `#` to reference files in prompts (e.g. `#CLAUDE.md`)
- Memory system initialized at `~/.claude/projects/C--Users-USER/memory/`
- This project uses Next.js with SQLite via Prisma
- The database schema is defined in `prisma/schema.prisma` — reference it anytime you need to understand the structure of data stored in the database

---

## Claude Behavior Instructions

### Code Style
- Use Tailwind CSS only — no inline styles or CSS modules
- TypeScript for all app code, JSX for generated components
- All new components go in `src/components/`
- Use named exports for app code; default exports for generated `/App.jsx`

### What to do
- Keep responses brief — no summaries after completing a task
- Read existing code before suggesting changes
- Follow the virtual FS model — generated files are never written to disk
- When adding features, check `src/lib/contexts/` for existing state before adding new

### What NOT to do
- Don't add comments unless logic is non-obvious
- Don't refactor code outside the scope of the task
- Don't install new packages without asking first
- Don't use NextAuth — auth is custom JWT via `jose` + `bcrypt`
- Don't write to the real filesystem for generated app files
