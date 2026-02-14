# ACUP Development Phase Tracker

> This document tracks all implementation phases, their specific tasks, and completion status.
> Update this document as tasks are completed during development.

**Legend**: `[ ]` Not started | `[/]` In progress | `[x]` Completed

---

## Phase 1: Core Infrastructure (Weeks 1-2)

### 1.1 Project Setup

- [ ] Initialize Next.js project with App Router and TypeScript strict mode
- [ ] Install and configure Tailwind CSS
- [ ] Install core dependencies (`@supabase/supabase-js`, `@supabase/ssr`, `zod`, `@tanstack/react-query`)
- [ ] Configure ESLint with `eslint-plugin-security`
- [ ] Configure `.gitignore` (include `.env*`, `node_modules`, `.next`)
- [ ] Initialize Git repository with branch protection rules (`main`, `develop`)

### 1.2 Supabase Setup

- [ ] Create Supabase project (free tier)
- [ ] Set up Supabase local development environment (Docker)
- [ ] Configure Supabase Auth for email/password (no email verification)
- [ ] Create `lib/supabase/client.ts` (browser client, anon key only)
- [ ] Create `lib/supabase/server.ts` (server client, service_role)
- [ ] Create `lib/supabase/middleware.ts` (session refresh logic)

### 1.3 Database Foundations

- [ ] Create `user_role` enum type (`admin`, `department_head`, `auditor`)
- [ ] Create `profiles` table with auto-populate trigger from `auth.users`
- [ ] Create `departments` table
- [ ] Create `department_memberships` table (many-to-many)
- [ ] Seed all 14 departments
- [ ] Seed initial test users (one per role)
- [ ] Enable RLS on all tables with initial policies

### 1.4 Authentication Flow

- [ ] Create login page (`(public)/login/page.tsx`)
- [ ] Create login form component (`components/auth/login-form.tsx`)
- [ ] Implement Next.js Middleware for session validation on `(protected)/` routes
- [ ] Create auth callback route (`app/api/auth/callback/route.ts`)
- [ ] Implement role context provider in `(protected)/layout.tsx`

### 1.5 Environment and CI

- [ ] Configure environment variables in Vercel (dev/staging/prod scoping)
- [ ] Set up GitHub Actions: lint + type check + secret scan (gitleaks)
- [ ] Create Vercel project with preview deployments

### 1.6 Phase 1 Validation

- [ ] User can register and log in with email + password
- [ ] Middleware redirects unauthenticated users to `/login`
- [ ] `profiles` table auto-populates on user signup
- [ ] CI pipeline passes on clean commit

---

## Phase 2: Secure Data Layer (Weeks 3-4)

### 2.1 Schema Creation

- [ ] Create `classification_level` enum (`confidential`, `secret`, `top_confidential`)
- [ ] Create `audit_action` enum (`INSERT`, `UPDATE`, `DELETE`, `VIEW`, `DOWNLOAD`, `LOGIN`, `LOGOUT`, `ACCESS_DENIED`)
- [ ] Create `document_status` enum (`active`, `archived`, `deleted`)
- [ ] Create `announcement_priority` enum (`normal`, `urgent`, `critical`)
- [ ] Create `documents` table (with classification, checksum, versioning)
- [ ] Create `document_access_grants` table (Top Confidential explicit access)
- [ ] Create `announcements` table
- [ ] Create `audit_logs` table (partitioned by year)
- [ ] Create `sessions` table
- [ ] Create `notification_queue` table
- [ ] Create `system_settings` table

### 2.2 Immutability and Triggers

- [ ] Create audit trigger function (`audit_trigger_func()`)
- [ ] Apply audit triggers to: `documents`, `profiles`, `announcements`, `document_access_grants`
- [ ] Revoke UPDATE/DELETE/TRUNCATE on `audit_logs` from all roles including `service_role`
- [ ] Create `updated_at` auto-update triggers on relevant tables

### 2.3 Indexing

- [ ] Create all indexes defined in Section 2.4 of database design
- [ ] Verify index usage with `EXPLAIN ANALYZE` on common queries

### 2.4 RLS Policies

- [ ] Enable RLS on every table (`ALTER TABLE <table> ENABLE ROW LEVEL SECURITY`)
- [ ] Create `documents` SELECT policy (admin sees all, dept_head sees department, top_confidential needs grant)
- [ ] Create `documents` INSERT policy (dept_head can upload to own department, admin to all)
- [ ] Create `documents` UPDATE policy (owner or admin only)
- [ ] Create `documents` DELETE policy (admin only, soft delete)
- [ ] Create `announcements` SELECT/INSERT/UPDATE/DELETE policies
- [ ] Create `audit_logs` SELECT policy (admin + auditor only)
- [ ] Create `profiles` SELECT/UPDATE policies
- [ ] Create `department_memberships` policies (admin can manage)
- [ ] Create `document_access_grants` policies

### 2.5 API Routes

- [ ] Create `POST /api/documents` (upload)
- [ ] Create `GET /api/documents` (list, paginated)
- [ ] Create `GET /api/documents/[id]` (metadata)
- [ ] Create `DELETE /api/documents/[id]` (soft delete)
- [ ] Create `POST /api/announcements` (create)
- [ ] Create `GET /api/announcements` (list)
- [ ] Create `GET /api/announcements/[id]` (single)
- [ ] Create `PUT /api/announcements/[id]` (update)
- [ ] Create `DELETE /api/announcements/[id]` (delete)
- [ ] Create `GET /api/departments` (list)
- [ ] Create `GET /api/departments/[id]/members` (list members)

### 2.6 RLS Testing

- [ ] Write pgTAP tests: admin can read all documents
- [ ] Write pgTAP tests: department_head sees only their department
- [ ] Write pgTAP tests: auditor can read audit_logs but not documents
- [ ] Write pgTAP tests: department_head cannot update own role
- [ ] Write pgTAP tests: no UPDATE/DELETE possible on audit_logs
- [ ] Write pgTAP tests: cross-department access denied
- [ ] Write pgTAP tests: top_confidential requires explicit grant

### 2.7 Phase 2 Validation

- [ ] Every table has RLS enabled (verified via `SELECT relrowsecurity FROM pg_class`)
- [ ] Every INSERT/UPDATE/DELETE creates an audit_log entry
- [ ] All pgTAP tests pass (positive and negative cases)
- [ ] All API routes return correct data per role

---

## Phase 3: Secure Storage and Watermarking (Weeks 5-6)

### 3.1 Storage Configuration

- [ ] Create Supabase Storage bucket (private, versioning enabled)
- [ ] Configure storage RLS policies (upload restricted by role)
- [ ] Configure CORS to restrict to application domain only
- [ ] Verify bucket is private (no public URLs work)

### 3.2 Upload Pipeline

- [ ] Implement file type validation (PDF, DOCX, XLSX only)
- [ ] Implement file size validation (25MB max)
- [ ] Implement checksum computation (SHA-256) and storage
- [ ] Implement `POST /api/documents` with full validation pipeline
- [ ] Write upload audit log entry on successful upload

### 3.3 Watermarking

- [ ] Install and configure `pdf-lib` for server-side PDF manipulation
- [ ] Implement watermark logic in `lib/utils/watermark.ts`
  - [ ] Overlay user email
  - [ ] Overlay timestamp (ISO 8601)
  - [ ] Overlay document ID
  - [ ] Semi-transparent diagonal text styling
- [ ] Implement `GET /api/documents/[id]/view` (watermarked PDF stream)
- [ ] Implement `GET /api/documents/[id]/download` (watermarked download)

### 3.4 Signed URL Generation

- [ ] Implement server-side signed URL generation (60s TTL)
- [ ] Verify signed URLs expire correctly
- [ ] Verify direct storage URL access returns 403

### 3.5 Phase 3 Validation

- [ ] File upload succeeds for PDF, DOCX, XLSX under 25MB
- [ ] File upload rejects disallowed types and oversized files
- [ ] Viewing a PDF returns watermarked version with user email + timestamp
- [ ] Original un-watermarked PDF is never sent to the client
- [ ] Signed URLs expire after 60 seconds
- [ ] Checksum stored matches uploaded file

---

## Phase 4: Frontend Role-Based UI (Weeks 7-9)

### 4.1 Layout and Navigation

- [ ] Create sidebar component (role-aware menu items)
- [ ] Create header component
- [ ] Create breadcrumb component
- [ ] Create page container component
- [ ] Implement responsive layout (desktop-first, tablet support)

### 4.2 UI Primitives

- [ ] Create button component
- [ ] Create input component
- [ ] Create modal component
- [ ] Create table component (sortable, paginated)
- [ ] Create badge component
- [ ] Create toast/notification component
- [ ] Create dropdown component
- [ ] Create skeleton loading component

### 4.3 Dashboard

- [ ] Create role-aware dashboard page (`(protected)/dashboard/page.tsx`)
  - [ ] Admin view: system stats, user count, recent activity
  - [ ] Department head view: department documents, announcements
  - [ ] Auditor view: recent audit log entries

### 4.4 Document Management UI

- [ ] Create document table component with classification badges
- [ ] Create document upload form (file picker, classification selector, department selector)
- [ ] Create document viewer component (embedded watermarked PDF display)
- [ ] Create classification badge component (color-coded: green/orange/red)
- [ ] Wire up TanStack Query for document list refreshing

### 4.5 Admin Panel

- [ ] Create admin layout with admin-only guard (`(protected)/admin/layout.tsx`)
- [ ] Create user management table (list, activate/deactivate, change role)
- [ ] Create department management page
- [ ] Create system settings page
- [ ] Create admin audit log viewer

### 4.6 Department Views

- [ ] Create department layout with department_head guard
- [ ] Create department document list page
- [ ] Create department announcement list page
- [ ] Create document upload page

### 4.7 Audit Views

- [ ] Create auditor layout with auditor guard
- [ ] Create audit log table with filters (user, action, date range, table)
- [ ] Implement audit log pagination

### 4.8 Announcement System

- [ ] Create announcement card component
- [ ] Create announcement creation form
- [ ] Implement system-wide vs department-scoped announcements

### 4.9 Error Handling

- [ ] Create `error.tsx` per route segment (error boundaries)
- [ ] Create `not-found.tsx` page
- [ ] Create `AccessDenied` component for unauthorized role access
- [ ] Implement toast notifications for API errors

### 4.10 Phase 4 Validation

- [ ] Admin can manage users, departments, and view audit logs
- [ ] Department head can upload, view, and manage their department's documents
- [ ] Auditor can view audit logs; cannot see upload/edit UI elements
- [ ] Navigation sidebar shows only role-appropriate menu items
- [ ] All pages load with skeleton states before data arrives
- [ ] Error boundaries display user-friendly error messages

---

## Phase 5: Audit and Monitoring (Weeks 10-11)

### 5.1 Audit Dashboard

- [ ] Build admin audit dashboard with filters (user, action, date range, table)
- [ ] Implement audit log export to CSV/JSON (admin only)
- [ ] Add detailed view for individual audit entries

### 5.2 Rate Limiting

- [ ] Implement rate limiting on `POST /api/auth` (5 req/min/IP)
- [ ] Implement rate limiting on `POST /api/documents` (10 req/min/user)
- [ ] Implement rate limiting on `GET /api/documents/[id]/view` (30 req/min/user)
- [ ] Implement rate limiting on all other API routes (60 req/min/user)
- [ ] Return 429 with appropriate headers when limit exceeded

### 5.3 Alerting

- [ ] Implement alert for Top Confidential document access
- [ ] Implement alert for privilege changes (role updates)
- [ ] Implement failed login attempt monitoring (block IP after 10/hour)
- [ ] Create notification queue for in-app alerts

### 5.4 Session Monitoring

- [ ] Implement concurrent session detection (2 max)
- [ ] Implement session invalidation on role change
- [ ] Implement session invalidation on password change

### 5.5 Logging Infrastructure

- [ ] Install and configure `pino` for structured JSON logging
- [ ] Log auth failures, API errors, rate limit hits, RLS denials
- [ ] Configure log levels (error, warn, info in production)

### 5.6 Cold Storage Export

- [ ] Implement weekly audit log export to cold storage (CSV/JSON)
- [ ] Verify export contains all required fields
- [ ] Document export verification procedure

### 5.7 Phase 5 Validation

- [ ] Audit log dashboard loads with pagination and filters
- [ ] CSV export downloads correctly
- [ ] Rate limiting returns 429 after threshold exceeded
- [ ] Admin receives notification on Top Confidential document access
- [ ] Failed login threshold triggers IP block
- [ ] Weekly cold storage export runs successfully

---

## Phase 6: Hardening and Compliance (Weeks 12-13)

### 6.1 Security Headers

- [ ] Configure Content-Security-Policy header
- [ ] Configure X-Frame-Options: DENY
- [ ] Configure X-Content-Type-Options: nosniff
- [ ] Configure Referrer-Policy: strict-origin-when-cross-origin
- [ ] Configure Permissions-Policy (disable camera, microphone, geolocation)
- [ ] Configure Strict-Transport-Security (HSTS)
- [ ] Verify all headers via securityheaders.com

### 6.2 Security Testing

- [ ] Manual penetration testing against OWASP Top 10
- [ ] Run OWASP ZAP scan
- [ ] Remediate all high/critical findings
- [ ] Test key rotation procedures

### 6.3 Backup and DR

- [ ] Perform full backup restoration test
- [ ] Verify restoration completes within RTO (4 hours)
- [ ] Document restoration procedure step-by-step
- [ ] Upgrade to Supabase Pro tier for PITR (if in pilot)

### 6.4 Documentation

- [ ] Create privacy notice page (displayed at login)
- [ ] Create user training documentation
- [ ] Create system administration guide
- [ ] Finalize incident response plan
- [ ] Prepare DPA compliance documentation package
- [ ] Prepare HIPAA-aligned controls evidence collection

### 6.5 Performance and Polish

- [ ] Performance optimization pass (Core Web Vitals targets)
- [ ] Final RLS audit with fresh test data
- [ ] Load test with 50 concurrent users

### 6.6 Production Deployment

- [ ] Set up production environment with custom domain
- [ ] Configure Cloudflare DNS + proxy
- [ ] Final security review with hospital IT Security Officer
- [ ] Deploy to production

### 6.7 Phase 6 Validation

- [ ] All security headers present (verified via securityheaders.com)
- [ ] OWASP ZAP scan returns no high/critical findings
- [ ] Backup restoration completes within RTO (4 hours)
- [ ] All compliance documentation reviewed by hospital DPO
- [ ] Production deployment successful with custom domain + TLS
- [ ] Core Web Vitals pass (LCP < 2.5s, FID < 100ms, CLS < 0.1)
- [ ] Tabletop exercise for P1 incident completed
- [ ] Go/No-Go gate: formal security review passed

---

## Post-Launch

- [ ] Monitor system for 2 weeks post-launch
- [ ] Conduct first monthly audit log review
- [ ] Schedule first quarterly backup verification
- [ ] Plan MFA rollout for production (TOTP via Supabase Auth)
- [ ] Plan email verification enablement for production