# ACUP - Project Context Summary

> This document provides complete context about the ACUP project for any developer or AI agent
> continuing this work. Read this first before touching any code or architecture document.

---

## Project Identity

| Field             | Value                                                        |
| ----------------- | ------------------------------------------------------------ |
| Project name      | Secure Ancillary Centralization and Updates Platform (ACUP)  |
| Owner             | Solo developer (university 3rd year, 2nd semester project)   |
| Institution       | Hospital (Philippines)                                       |
| Purpose           | Centralize communications and document sharing for ancillary |
| Classification    | Handles Confidential, Secret, and Top Confidential documents |
| User count        | ~50 users (Directors, Department Heads, Auditors)            |
| Development start | February 2026                                                |
| Estimated build   | 12.5 weeks (15-17 weeks realistic with buffer)               |

---

## Departments Served (14 Total)

Pulmonary, Specialty Clinics, Pathology and Laboratory Medicine, Pharmacy, Cardiovascular Unit, Radiology, Clinical Pharmacy, Nuclear Medicine, Medical Records, Physical and Rehabilitation, Clinical Nutrition/Weight Management, Breast Center, Neuroscience Center, Ibaan and LIMA.

---

## Tech Stack

| Layer       | Technology                              | Notes                                                 |
| ----------- | --------------------------------------- | ----------------------------------------------------- |
| Frontend    | Next.js (App Router) + React + Tailwind | SSR-first, Server Components for all protected routes |
| State       | TanStack Query                          | Client-side only, for real-time UI updates            |
| Backend     | Next.js API Routes + Server Actions     | All mutations go through server-only routes           |
| Database    | Supabase (PostgreSQL)                   | RLS is the primary security boundary                  |
| Auth        | Supabase Auth                           | Email + password (no verification, no MFA for pilot)  |
| Storage     | Supabase Storage                        | Private buckets only, signed URLs (60s TTL)           |
| Hosting     | Vercel                                  | SSR, Edge Middleware, preview deployments             |
| CDN/WAF     | Cloudflare                              | Free tier, DDoS, TLS termination                      |
| CI/CD       | GitHub Actions                          | Lint, type check, secret scan, RLS tests, build       |
| Logging     | pino (structured JSON)                  | Error, warn, info levels in production                |
| PDF Library | pdf-lib                                 | Server-side watermarking                              |

---

## Security Philosophy

- **Zero-Trust Architecture**: Database (RLS) is the primary enforcement boundary, not the frontend
- **Defense in Depth**: Cloudflare -> Vercel Middleware -> API Route validation -> RLS -> Audit triggers
- **Frontend guards are convenience, not security**: Even if UI is bypassed, RLS prevents data access
- **No client-side Supabase SDK for writes**: All mutations go through server API routes
- **service_role key is never exposed to the client**: Server-only, stored in Vercel env vars
- **Immutable audit logging**: Every data mutation is logged via PostgreSQL triggers, no UPDATE/DELETE on audit_logs

---

## Compliance Frameworks

- **Philippine Data Privacy Act of 2012 (RA 10173)**: Primary legal requirement
- **HIPAA (US)**: Adopted as best practices only, not legally binding in the Philippines
- **Audit log retention**: 6 years minimum
- **Breach notification**: NPC within 72 hours

---

## Roles and Access Model

| Role              | Access Scope                                                                    |
| ----------------- | ------------------------------------------------------------------------------- |
| `admin`           | Full system access: manage users, departments, settings, view all documents     |
| `department_head` | View/upload documents within own department(s), manage department announcements |
| `auditor`         | Read-only access to audit logs, cannot access documents or announcements        |

Document classification access:

- **Confidential**: Visible to department members
- **Secret**: Visible to department members
- **Top Confidential**: Requires explicit per-user grant via `document_access_grants` table

---

## Database Schema (Key Tables)

| Table                    | Purpose                                           |
| ------------------------ | ------------------------------------------------- |
| `profiles`               | User identity, role, department, active status    |
| `departments`            | 14 ancillary departments                          |
| `department_memberships` | Many-to-many: users to departments                |
| `documents`              | Document metadata (classification, checksum, etc) |
| `document_access_grants` | Explicit grants for Top Confidential docs         |
| `announcements`          | Department or system-wide announcements           |
| `audit_logs`             | Immutable event log (partitioned by year)         |
| `sessions`               | Active session tracking                           |
| `notification_queue`     | Pending user notifications                        |
| `system_settings`        | Key-value system config                           |

---

## Authentication (Pilot Phase)

- Email + password only via Supabase Auth
- No email verification (disabled for faster onboarding during pilot)
- No MFA (deferred to production; architecture supports TOTP via Supabase Auth)
- Session stored in HTTP-only cookie (SameSite=Strict, Secure=true)
- Idle timeout: 60 minutes, absolute timeout: 24 hours
- Maximum concurrent sessions: 2

---

## Supabase Tier Strategy

| Phase       | Tier | Rationale                                              |
| ----------- | ---- | ------------------------------------------------------ |
| Development | Free | 500MB DB, 1GB storage is sufficient for dev/testing    |
| Pilot       | Free | Start on free, upgrade to Pro when PITR/backups needed |
| Production  | Pro  | $25/month for PITR, daily backups, higher limits       |

---

## Key Architectural Patterns

1. **SSR over SPA**: Sensitive data never enters client JS bundles
2. **Server-side watermarking**: Every PDF view has a unique watermark (email + timestamp + doc ID); the un-watermarked original is never sent to the client
3. **Signed URLs (60s TTL)**: Storage objects are never directly accessible; server generates short-lived signed URLs
4. **Audit triggers**: PostgreSQL AFTER triggers on all core tables automatically write to `audit_logs`
5. **RLS-first security**: Every table has RLS enabled with explicit policies per role; default-deny

---

## Folder Structure (Planned)

```
src/
  app/
    (public)/
      login/page.tsx
      layout.tsx
    (protected)/
      layout.tsx                  <- auth guard + role context
      dashboard/page.tsx          <- role-aware landing
      admin/
        layout.tsx                <- admin-only guard
        users/page.tsx
        departments/page.tsx
        settings/page.tsx
        audit/page.tsx
      department/
        layout.tsx                <- department_head guard
        [departmentId]/
          documents/page.tsx
          announcements/page.tsx
          upload/page.tsx
      audit/
        layout.tsx                <- auditor guard
        logs/page.tsx
    api/
      auth/callback/route.ts
      documents/route.ts
      documents/[id]/route.ts
      documents/[id]/view/route.ts
      documents/[id]/download/route.ts
      announcements/route.ts
      announcements/[id]/route.ts
      departments/route.ts
      departments/[id]/members/route.ts
      audit/logs/route.ts
      admin/users/route.ts
      admin/roles/route.ts
      admin/settings/route.ts
  components/
    ui/          <- button, input, modal, table, badge, toast, dropdown, skeleton
    layout/      <- header, sidebar, breadcrumb, page-container
    documents/   <- document-table, upload-form, viewer, classification-badge
    announcements/ <- announcement-card, announcement-form
    admin/       <- user-management-table, role-editor, department-manager
    audit/       <- audit-log-table, audit-log-filters
    auth/        <- login-form
  lib/
    supabase/    <- client.ts, server.ts, middleware.ts
    api/         <- typed API call functions per resource
    utils/       <- watermark.ts, validation.ts, formatting.ts, classification.ts
    constants/   <- departments.ts, roles.ts, routes.ts
  hooks/         <- use-auth, use-role, use-department, use-documents, use-announcements
  types/         <- database.ts (generated), api.ts, auth.ts
  middleware.ts  <- Next.js edge middleware
```

---

## Architecture Documents (Reference)

All detailed architecture docs live in `docs/`:

| File                            | Content                                                              |
| ------------------------------- | -------------------------------------------------------------------- |
| `01-system-architecture.md`     | High-level architecture, data flows, security boundaries, API design |
| `02-database-design.md`         | Full schemas, RLS policies, audit triggers, indexing, retention, DR  |
| `03-security-implementation.md` | STRIDE threat model, encryption, auth, sessions, rate limiting, CSP  |
| `04-frontend-architecture.md`   | Folder structure, role-based UI, data fetching, error handling       |
| `05-devsecops.md`               | CI/CD, secrets, migrations, testing, monitoring, incident response   |
| `06-compliance-roadmap.md`      | DPA, HIPAA-aligned controls, breach response, audit readiness        |
| `07-implementation-roadmap.md`  | 6-phase roadmap with deliverables, risks, validation criteria        |
| `PHASE-TRACKER.md`              | Granular task checklist for tracking development progress            |

---

## Important Constraints and Decisions

1. **Solo developer**: Single point of failure; all procedures must be thoroughly documented
2. **No gradients in UI**: Solid colors only per design guidelines
3. **No emojis anywhere**: Professionalism requirement
4. **Lowercase comments only**: All new code comments must be lowercase
5. **No JSDoc-style comments**: Use `//` comments only
6. **hover:cursor-pointer on all clickable elements**: Required per project standards
7. **Tailwind CSS**: Primary styling framework (user-specified)
8. **MFA is deferred**: Architecture supports it, but not implemented for pilot testing
9. **No email verification**: Disabled for pilot phase, planned for production
10. **No patient data**: System handles administrative documents only, not clinical/patient data
