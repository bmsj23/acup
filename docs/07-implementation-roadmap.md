# Section 7: Implementation Roadmap

## Phase Overview

| Phase | Name                          | Duration  | Dependencies     |
| ----- | ----------------------------- | --------- | ---------------- |
| 1     | Core Infrastructure           | 2 weeks   | None             |
| 2     | Secure Data Layer             | 2 weeks   | Phase 1          |
| 3     | Secure Storage & Watermarking | 2 weeks   | Phase 2          |
| 4     | Frontend Role-Based UI        | 3 weeks   | Phase 2, Phase 3 |
| 5     | Audit & Monitoring            | 1.5 weeks | Phase 2, Phase 4 |
| 6     | Hardening & Compliance        | 2 weeks   | All prior phases |

**Total estimated duration: 12.5 weeks (solo developer)**

---

## Phase 1: Core Infrastructure (Weeks 1-2)

### Deliverables

- Next.js project initialized with App Router, TypeScript strict mode, Tailwind CSS
- Supabase project created (free tier for development; Pro tier when needed for pilot)
- Supabase Auth configured with email/password (no email verification for pilot)
- `profiles` table created with trigger to auto-populate from `auth.users`
- `departments` table seeded with all 14 departments
- `department_memberships` table with initial associations
- Next.js Middleware for auth validation on all `(protected)/` routes
- Login page
- Supabase client configuration: `lib/supabase/client.ts`, `lib/supabase/server.ts`
- Environment variable configuration across dev/staging/prod
- Git repository initialized with `.gitignore`, branch protection rules
- CI pipeline: lint + type check + secret scan

### Dependencies

- Supabase account and project
- Vercel account
- GitHub repository
- Domain name (optional at this stage)

### Risks

| Risk                                    | Likelihood | Impact | Mitigation                                                        |
| --------------------------------------- | ---------- | ------ | ----------------------------------------------------------------- |
| Free tier limits hit during development | Medium     | Low    | Use Supabase local (Docker) for development                       |
| Auth flow complexity underestimated     | Low        | Low    | Simple email+password only; no MFA or email verification in pilot |

### Validation Criteria

- [ ] User can register and log in with email + password
- [ ] Middleware redirects unauthenticated users to `/login`
- [ ] `profiles` table auto-populated on user signup
- [ ] CI pipeline passes on clean commit

---

## Phase 2: Secure Data Layer (Weeks 3-4)

### Deliverables

- All database tables created (schemas from Section 2.3)
- All enum types created
- All indexes created (Section 2.4)
- RLS enabled on every table with policies per role (Section 2.5)
- Audit trigger function deployed on all core tables
- `audit_logs` table with immutability enforcement (REVOKE)
- `document_access_grants` table for Top Confidential access
- Seed data: departments, test users with each role
- Migration files versioned in `supabase/migrations/`
- RLS test suite (pgTAP) covering all policies
- API routes for documents (CRUD), announcements (CRUD), departments (read)

### Dependencies

- Phase 1 complete (auth + profiles + departments)

### Risks

| Risk                                     | Likelihood | Impact   | Mitigation                                                      |
| ---------------------------------------- | ---------- | -------- | --------------------------------------------------------------- |
| RLS policy logic errors                  | High       | Critical | Extensive pgTAP testing; test every role combination            |
| Audit trigger performance                | Low        | Medium   | Benchmark with 1000+ operations; monitor trigger execution time |
| Migration conflicts between environments | Medium     | Medium   | Linear migration strategy; no branching migrations              |

### Validation Criteria

- [ ] Every table has RLS enabled (verified via `SELECT relrowsecurity FROM pg_class`)
- [ ] Admin can read all documents; department_head sees only their department
- [ ] Auditor can read audit_logs; cannot read documents
- [ ] Department_head cannot update their own role
- [ ] Every INSERT/UPDATE/DELETE creates an audit_log entry
- [ ] No UPDATE or DELETE possible on `audit_logs` table
- [ ] All pgTAP tests pass (positive and negative cases)

---

## Phase 3: Secure Storage & Watermarking (Weeks 5-6)

### Deliverables

- Supabase Storage bucket created (private, versioning enabled)
- Storage RLS policies: upload restricted by role, download via signed URL only
- API route: `POST /api/documents` (upload with validation)
- API route: `GET /api/documents/[id]/view` (watermarked PDF stream)
- API route: `GET /api/documents/[id]/download` (watermarked download)
- Watermarking logic using `pdf-lib` (server-side)
- File type validation (PDF, DOCX, XLSX only)
- File size validation (25MB max)
- Checksum computation and storage
- Signed URL generation (60s TTL)
- CORS configuration restricted to application domain

### Dependencies

- Phase 2 complete (documents table, RLS policies)
- `pdf-lib` npm package

### Risks

| Risk                                   | Likelihood | Impact   | Mitigation                                                                    |
| -------------------------------------- | ---------- | -------- | ----------------------------------------------------------------------------- |
| Watermarking performance on large PDFs | Medium     | Medium   | Set 25MB limit; optimize with streaming; cache watermarked versions if needed |
| pdf-lib compatibility issues           | Low        | Medium   | Validate with sample PDFs from each department                                |
| Storage bucket misconfiguration        | Medium     | Critical | Automated tests verify bucket is private; no public URLs work                 |

### Validation Criteria

- [ ] File upload succeeds for PDF, DOCX, XLSX under 25MB
- [ ] File upload rejects disallowed types and oversized files
- [ ] Viewing a PDF returns a watermarked version with user email + timestamp
- [ ] Original un-watermarked PDF is never sent to the client
- [ ] Signed URLs expire after 60 seconds
- [ ] Direct storage URL access returns 403
- [ ] Checksum stored matches uploaded file

---

## Phase 4: Frontend Role-Based UI (Weeks 7-9)

### Deliverables

- Dashboard page (role-aware: admin sees stats, department_head sees their docs, auditor sees logs)
- Admin panel: user management, department management, system settings
- Department view: document list, document upload, announcement list
- Audit view: searchable, filterable audit log table
- Document viewer component (embedded watermarked PDF)
- Announcement creation and display
- UI components: table, modal, badge, toast, skeleton, dropdown
- Layout: sidebar navigation (role-aware menu items), header, breadcrumb
- Error boundaries per route segment
- Loading states with skeleton components
- Responsive design (desktop-first; tablet support)
- TanStack Query integration for client-side data refreshing

### Dependencies

- Phase 2 (API routes) and Phase 3 (storage + watermarking) complete

### Risks

| Risk                                  | Likelihood | Impact | Mitigation                                                      |
| ------------------------------------- | ---------- | ------ | --------------------------------------------------------------- |
| UI/UX complexity for 3 distinct roles | Medium     | Medium | Build admin UI first as it's most complex; derive simpler views |
| PDF viewer cross-browser issues       | Medium     | Low    | Test on Chrome, Firefox, Edge; use `react-pdf` as fallback      |
| Scope creep on UI polish              | High       | Medium | Ship functional first; polish in Phase 6                        |

### Validation Criteria

- [ ] Admin can manage users, departments, and view audit logs
- [ ] Department head can upload, view, and manage their department's documents
- [ ] Auditor can view audit logs; cannot see upload/edit UI elements
- [ ] Navigation sidebar shows only role-appropriate menu items
- [ ] All pages load with skeleton states before data arrives
- [ ] Error boundaries display user-friendly error messages

---

## Phase 5: Audit & Monitoring (Weeks 10-11)

### Deliverables

- Admin audit dashboard with filters (user, action, date range, table)
- Audit log export to CSV/JSON (admin only)
- Failed login attempt monitoring
- Rate limiting on all API routes
- Alert system for critical events (Top Confidential access, privilege changes)
- Notification queue for in-app alerts
- Session monitoring: concurrent session detection
- Weekly audit log export to cold storage (automated)
- Logging infrastructure with `pino` (structured JSON)

### Dependencies

- Phase 4 complete (admin UI framework)
- Phase 2 complete (audit_logs table)

### Risks

| Risk                                      | Likelihood | Impact | Mitigation                                             |
| ----------------------------------------- | ---------- | ------ | ------------------------------------------------------ |
| Alert fatigue from too many notifications | Medium     | Low    | Start with critical alerts only; tune thresholds       |
| Cold storage export complexity            | Low        | Medium | Start with simple file export; automate later          |
| Rate limiting false positives             | Low        | Medium | Set conservative limits; whitelist known IPs initially |

### Validation Criteria

- [ ] Audit log dashboard loads with pagination and filters
- [ ] CSV export downloads correctly with all fields
- [ ] Rate limiting returns 429 after threshold exceeded
- [ ] Admin receives notification on Top Confidential document access
- [ ] Failed login threshold triggers IP block
- [ ] Weekly cold storage export runs successfully

---

## Phase 6: Hardening & Compliance (Weeks 12-13)

### Deliverables

- All CSP and HTTP security headers configured (Section 3.10)
- Penetration testing (manual, against OWASP Top 10)
- OWASP ZAP scan with remediation
- Key rotation procedures tested
- Backup restoration test (full DR drill)
- Privacy notice page
- User training documentation
- System administration guide
- Incident response plan finalized and tested (tabletop exercise)
- DPA compliance documentation package
- HIPAA-aligned controls evidence collection
- Performance optimization pass (Core Web Vitals)
- Final RLS audit (verify all policies with fresh test data)
- Production environment setup with custom domain + Cloudflare

### Dependencies

- All prior phases complete

### Risks

| Risk                                                 | Likelihood | Impact | Mitigation                                           |
| ---------------------------------------------------- | ---------- | ------ | ---------------------------------------------------- |
| Penetration testing reveals critical vulnerabilities | Medium     | High   | Budget 1 extra week for remediation                  |
| Documentation takes longer than estimated            | High       | Low    | Use templates; prioritize security-critical docs     |
| Performance issues under load                        | Low        | Medium | Load test with 50 concurrent users; optimize queries |

### Validation Criteria

- [ ] All security headers present (verified via securityheaders.com)
- [ ] OWASP ZAP scan returns no high/critical findings
- [ ] Backup restoration completes within RTO (4 hours)
- [ ] All compliance documentation reviewed by hospital DPO
- [ ] Production deployment successful with custom domain + TLS
- [ ] Core Web Vitals pass (LCP < 2.5s, FID < 100ms, CLS < 0.1)
- [ ] Tabletop exercise for P1 incident completed

---

## Timeline Summary

```
Week 1-2:   [==== Phase 1: Core Infrastructure ====]
Week 3-4:   [==== Phase 2: Secure Data Layer ======]
Week 5-6:   [==== Phase 3: Storage & Watermark ====]
Week 7-9:   [======= Phase 4: Frontend UI =========]
Week 10-11: [=== Phase 5: Audit & Monitoring ======]
Week 12-13: [=== Phase 6: Hardening & Compliance ==]
```

> [!WARNING]
> **Solo developer risk**: These estimates assume uninterrupted development. Add 20-30% buffer for debugging, unexpected issues, and learning curve. A realistic total is **15-17 weeks**.

> [!IMPORTANT]
> **Go/No-Go gate**: Before deploying to production (end of Phase 6), a formal security review with the hospital IT Security Officer should be conducted. The system should not go live until this review is passed and documented.
