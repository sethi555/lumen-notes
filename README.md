# 🌿 Lumen Notes

A calm, eye-friendly note-taking web app built with TanStack Start, React 19, and Supabase. Designed to keep your writing workflow distraction-free, with rich-text editing, folder organization, and multiple accessibility-focused themes.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Features](#features)
- [Project Structure](#project-structure)
- [Database Schema](#database-schema)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Scripts](#scripts)
- [Themes](#themes)
- [Components](#components)

---

## Overview

Lumen Notes is a full-stack notes application that provides a serene writing experience. It supports hierarchical folders, tags, private/pinned/favorite notes, rich-text editing, voice recording, drawing, spreadsheets, slides, PDF export, and an AI-powered research panel — all behind Supabase authentication.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [TanStack Start](https://tanstack.com/start) (React 19, file-based routing) |
| Build tool | [Vite 8](https://vitejs.dev/) |
| Styling | [Tailwind CSS v4](https://tailwindcss.com/) |
| UI Components | [Radix UI](https://www.radix-ui.com/) + [shadcn/ui](https://ui.shadcn.com/) |
| Backend/Auth | [Supabase](https://supabase.com/) (PostgreSQL + Row-Level Security) |
| Server Functions | TanStack Start `createServerFn` |
| Forms | React Hook Form + Zod |
| Icons | Lucide React |
| Toasts | Sonner |
| Package Manager | Bun (+ npm lock for compatibility) |

---

## Features

### 📝 Notes
- Rich-text editor (WYSIWYG, via `NoteEditor`)
- Auto-save with 700ms debounce
- Note title inline editing
- Pin, favorite, and private flags per note

### 📁 Folders & Tags
- Hierarchical folders with optional colour labels
- Tags system with colour support
- Filter notes by folder
- Full-text search by title

### 🔒 Privacy & Security
- **Private notes** — locked behind a vault PIN (`VaultLock` component)
- **Three-finger swipe-down** gesture instantly hides all private notes (mobile)
- Row-Level Security on every Supabase table — users can only access their own data

### 🎨 Themes
Three eye-comfort themes switchable at runtime (persisted to `localStorage`):

| Theme | Description |
|---|---|
| **Focus** | Soft sage greens tuned to retinal comfort |
| **Circadian** | Pure black & amber, minimal blue light (dark mode) |
| **Reading** | Warm sepia & cream textures |

### 🛠️ Content Tools (toolbar)
| Tool | Description |
|---|---|
| **Draw** | Freehand canvas drawing (`DrawCanvas`) |
| **Voice** | Browser microphone recorder; transcribes speech & embeds audio (`VoiceRecorder`) |
| **Sheet** | Inline spreadsheet block (`SpreadsheetBlock`) |
| **Slides** | Render the note as a slide deck (`SlidesView`) |
| **PDF** | Export the current note to a PDF file |
| **Research** | AI-powered research side panel (`ResearchPanel`) |

### 📱 Responsive Layout
- Desktop: persistent sidebar + main editor
- Mobile: slide-in drawer sidebar with hamburger menu, back-navigation

### 🔑 Authentication
- Email/password sign-in & sign-up
- Google OAuth
- Session persisted via Supabase; protected routes redirect unauthenticated users

---

## Project Structure

```
notes taking/
├── src/
│   ├── components/          # Feature components
│   │   ├── DrawCanvas.tsx       # Freehand drawing overlay
│   │   ├── NoteEditor.tsx       # Rich-text WYSIWYG editor
│   │   ├── ResearchPanel.tsx    # AI research side panel
│   │   ├── SlidesView.tsx       # Slide presentation view
│   │   ├── SpreadsheetBlock.tsx # Embedded spreadsheet
│   │   ├── VaultLock.tsx        # Private-note PIN lock screen
│   │   ├── VoiceRecorder.tsx    # Mic recorder + transcript
│   │   └── ui/                  # shadcn/ui primitives
│   ├── hooks/               # Custom React hooks
│   ├── integrations/
│   │   └── supabase/        # Supabase client & auth middleware
│   ├── lib/
│   │   ├── notes.functions.ts   # Server functions (CRUD for notes/folders/tags)
│   │   ├── research.functions.ts# Server functions for research panel
│   │   ├── theme.tsx            # Theme context & provider
│   │   ├── pdf.ts               # PDF export helper
│   │   ├── cdn.ts               # CDN utilities
│   │   └── utils.ts             # Shared utilities
│   ├── routes/
│   │   ├── __root.tsx           # Root layout (ThemeProvider, QueryClient)
│   │   ├── index.tsx            # Landing / redirect page
│   │   ├── auth.tsx             # Sign-in / sign-up page
│   │   └── _authenticated/
│   │       ├── route.tsx        # Auth guard layout
│   │       └── app.tsx          # Main application page
│   ├── router.tsx           # TanStack Router setup
│   ├── server.ts            # Nitro server entry
│   └── styles.css           # Global Tailwind styles & theme tokens
├── supabase/
│   ├── combined_setup.sql   # Full DB schema (run once on a fresh Supabase project)
│   └── config.toml          # Supabase local dev config
├── public/                  # Static assets
├── vite.config.ts
├── tsconfig.json
└── package.json
```

---

## Database Schema

All tables live in the `public` schema with Row-Level Security enabled. Every user can only read/write their own rows.

```
auth.users (Supabase managed)
│
├── profiles          — display name, avatar, preferred theme
├── user_roles        — admin | user role enum
├── folders           — hierarchical (parent_id self-ref), colour, position
├── tags              — name + colour, unique per user
├── notes             — title, content (HTML), layout (JSONB), flags, audio_url
├── note_tags         — many-to-many join between notes and tags
└── web_clips         — bookmarklet / clipper intake (source URL + content)
```

**Storage bucket:** `media` — user audio recordings and uploaded media, scoped per user.

---

## Getting Started

### Prerequisites
- Node.js ≥ 18 or [Bun](https://bun.sh/)
- A [Supabase](https://supabase.com/) project

### 1. Clone & install

```bash
git clone <repo-url>
cd "notes taking"
bun install   # or: npm install
```

### 2. Set up Supabase

1. Create a new project on [supabase.com](https://supabase.com).
2. Run `supabase/combined_setup.sql` in the Supabase SQL editor to create all tables, policies, triggers, and storage rules.
3. Create a storage bucket named **`media`** (public or private, policies are already in the SQL).

### 3. Configure environment variables

Copy the example env file and fill in your values:

```bash
cp env .env
```

See [Environment Variables](#environment-variables) below.

### 4. Run locally

```bash
bun run dev   # or: npm run dev
```

The app starts at `http://localhost:5173` by default.

---

## Environment Variables

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous/publishable key |

> **Note:** Never commit `.env` to version control. It is listed in `.gitignore`.

---

## Scripts

| Command | Description |
|---|---|
| `bun run dev` | Start the Vite dev server with HMR |
| `bun run build` | Production build |
| `bun run build:dev` | Development-mode build |
| `bun run preview` | Preview the production build locally |
| `bun run lint` | Run ESLint |
| `bun run format` | Run Prettier on all files |

---

## Themes

Themes are managed by `ThemeProvider` in [`src/lib/theme.tsx`](./src/lib/theme.tsx).

- The active theme is stored in `localStorage` under the key `lumen-theme`.
- A `data-theme` attribute is set on `<html>` for CSS variable scoping.
- The **Circadian** theme also toggles the `dark` class for Tailwind dark-mode utilities.

---

## Components

| Component | File | Purpose |
|---|---|---|
| `NoteEditor` | `src/components/NoteEditor.tsx` | WYSIWYG rich-text editor; exposes `insertText` / `insertHtml` via `ref` |
| `DrawCanvas` | `src/components/DrawCanvas.tsx` | Full-screen freehand drawing canvas overlay |
| `VoiceRecorder` | `src/components/VoiceRecorder.tsx` | Microphone capture; emits transcript text and audio URL |
| `SpreadsheetBlock` | `src/components/SpreadsheetBlock.tsx` | Lightweight inline spreadsheet embedded in a note |
| `SlidesView` | `src/components/SlidesView.tsx` | Renders note HTML as a slide presentation |
| `ResearchPanel` | `src/components/ResearchPanel.tsx` | AI-powered side panel for researching within a note |
| `VaultLock` | `src/components/VaultLock.tsx` | PIN gate shown before a private note is revealed |

---

## Contributing

This project is connected to [Lovable](https://lovable.dev). To keep history clean:

- Do **not** force-push, rebase, amend, or squash already-pushed commits.
- Keep the connected branch in a working state — commits sync back to the Lovable editor automatically.

---

*Built with ❤️ using TanStack Start + Supabase.*
