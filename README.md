# ACUP - Ancillary Communication and Updates Platform

A secure, role-based internal platform for centralizing communications, announcements, and operational metrics across 14 ancillary hospital departments.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router), React 19, Tailwind CSS 4 |
| Backend | Next.js API Routes + Server Actions |
| Database | Supabase (PostgreSQL with RLS) |
| Auth | Supabase Auth (email + password) |
| Storage | Supabase Storage (private buckets, signed URLs) |
| Validation | Zod |
| Hosting | Vercel |

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+
- A Supabase project with the migrations applied

### Environment Variables

Copy `.env.example` to `.env` and fill in the required values:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SECRET_KEY=
ADMIN_SETUP_CODE=
```

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build

```bash
npm run build
npm run start
```

### Linting

```bash
npm run lint
```

Lint is configured with `--max-warnings 0` to enforce strict code quality.

## Workflow

Git branch/PR workflow reference: [docs/git-workflow.md](docs/git-workflow.md)

## Roles

| Role | Access |
|------|--------|
| `avp` | Access across all 14 departments |
| `division_head` | Full system control, user management, all logs |
| `department_head` | Scoped to assigned department(s) only |

## Security

- Row Level Security (RLS) as the primary enforcement boundary
- All mutations go through server API routes (no client-side writes)
- `service_role` key is server-only
- Immutable audit logging via PostgreSQL triggers
- Signed URLs with 60-second TTL for storage access
