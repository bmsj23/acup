# Section 5: DevSecOps & Deployment Plan

## 5.1 Environment Separation

| Environment     | Purpose                  | Database                    | Deployment                  |
| --------------- | ------------------------ | --------------------------- | --------------------------- |
| **Development** | Local dev + feature work | Supabase local (Docker)     | `npm run dev`               |
| **Staging**     | Pre-production testing   | Separate Supabase project   | Vercel Preview (per branch) |
| **Production**  | Live system              | Production Supabase project | Vercel Production           |

### Key Rules

- Production database credentials are **never** used in development or staging
- Staging mirrors production schema exactly (via shared migration files)
- Feature branches deploy to Vercel Preview URLs automatically
- Environment variables are scoped per environment in Vercel dashboard

## 5.2 CI/CD Pipeline Design

```
Developer Push -> GitHub Actions Pipeline:

1. [Lint]
   - ESLint with security plugin (eslint-plugin-security)
   - TypeScript strict mode compilation

2. [Dependency Audit]
   - npm audit --audit-level=high
   - Fail pipeline on high/critical vulnerabilities

3. [Secret Scan]
   - gitleaks scan on diff
   - Fail if secrets detected

4. [Unit Tests]
   - Jest/Vitest for utility functions
   - Zod schema validation tests

5. [RLS Tests]
   - Run against Supabase local (Docker)
   - Test each RLS policy with each role
   - Verify deny cases (cross-department access)

6. [Build]
   - next build --strict
   - Fail on any TypeScript or build error

7. [Deploy]
   - Staging: auto-deploy on merge to `develop`
   - Production: manual approval required on merge to `main`
```

### GitHub Actions Workflow Summary

- Trigger: push to `develop` or `main`, pull requests
- Runner: `ubuntu-latest`
- Supabase CLI used for local DB in CI
- Migration files applied before RLS tests

## 5.3 Secrets Management

| Secret                          | Storage                       | Rotation                 |
| ------------------------------- | ----------------------------- | ------------------------ |
| `SUPABASE_URL`                  | Vercel env vars               | N/A (static per project) |
| `SUPABASE_ANON_KEY`             | Vercel env vars               | 90 days                  |
| `SUPABASE_SERVICE_ROLE_KEY`     | Vercel env vars (server only) | 90 days                  |
| `NEXT_PUBLIC_SUPABASE_URL`      | Vercel env vars (public)      | N/A                      |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Vercel env vars (public)      | 90 days                  |

### Rules

- No `.env` files committed to Git (enforced via `.gitignore` + gitleaks)
- `service_role` key is **never** prefixed with `NEXT_PUBLIC_`
- Key rotation procedure documented and tested quarterly
- Vercel Environment Variables are encrypted at rest

## 5.4 Migration Strategy

- All schema changes are versioned SQL files in `supabase/migrations/`
- Naming convention: `YYYYMMDDHHMMSS_description.sql`
- Migrations are idempotent where possible
- Every migration is reviewed for RLS impact before merging
- Rollback scripts are maintained alongside forward migrations
- Production migrations require manual approval and are preceded by a backup

### Migration Workflow

```
1. Developer creates migration: supabase migration new <name>
2. Apply locally: supabase db reset
3. Test RLS policies against new schema
4. Commit migration file
5. PR review (includes migration diff)
6. Staging: auto-applied on merge to develop
7. Production: applied manually after backup + approval
```

## 5.5 Automated Testing Plan

| Test Type         | Tool                 | Scope                                                 |
| ----------------- | -------------------- | ----------------------------------------------------- |
| Unit tests        | Vitest               | Utility functions, zod schemas, formatters            |
| RLS tests         | pgTAP + Supabase CLI | Every RLS policy, every role, deny/allow cases        |
| API route tests   | Vitest + supertest   | Request validation, auth checks, error responses      |
| Integration tests | Playwright           | Critical flows: login, upload, view, audit log review |
| Security tests    | Manual + OWASP ZAP   | XSS, CSRF, injection, auth bypass                     |

### RLS Testing Strategy (Critical)

```sql
-- example pgTAP test: department_head cannot see other department's documents
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub": "user-dept-A-uuid"}';

SELECT is(
  (SELECT count(*) FROM documents WHERE department_id = 'dept-B-uuid')::int,
  0,
  'Department head A cannot see Department B documents'
);

ROLLBACK;
```

Every RLS policy must have:

- A positive test (authorized user CAN access)
- A negative test (unauthorized user CANNOT access)
- A cross-role test (lower role cannot escalate)

## 5.6 Backup Strategy

| Target          | Method              | Frequency         | Retention  | Storage                                 |
| --------------- | ------------------- | ----------------- | ---------- | --------------------------------------- |
| Database        | Supabase PITR       | Continuous        | 7 days     | Supabase managed                        |
| Database        | `pg_dump` via cron  | Daily 02:00 UTC+8 | 30 days    | External storage                        |
| Audit logs      | CSV/JSON export     | Weekly            | 6 years    | Cold storage (S3 Glacier or equivalent) |
| Migrations      | Git                 | On every change   | Indefinite | GitHub                                  |
| Storage objects | Supabase versioning | On write          | 90 days    | Supabase managed                        |

## 5.7 Logging & Monitoring Strategy

### Application Logging

- Structured JSON logs via `pino` logger
- Log levels: `error`, `warn`, `info` (no debug in production)
- Logged events: auth failures, API errors, rate limit hits, RLS denials

### Monitoring Alerts

| Event                        | Threshold                          | Action                       |
| ---------------------------- | ---------------------------------- | ---------------------------- |
| Failed login attempts        | > 10/hour from same IP             | Block IP for 1 hour          |
| Privilege escalation attempt | Any occurrence                     | Immediate admin notification |
| Top Confidential access      | Any occurrence                     | Logged + admin notified      |
| API error rate               | > 5% of requests in 5 minutes      | Admin notification           |
| Database connection failures | Any occurrence                     | Admin notification           |
| Storage access anomaly       | > 50 downloads/hour by single user | Admin notification           |

### Monitoring Tools

- **Vercel Analytics**: Frontend performance
- **Supabase Dashboard**: Database metrics, auth events
- **Custom audit dashboard**: Built into admin panel (Section 4)

## 5.8 Incident Response Plan

### Severity Levels

| Level             | Description                       | Response Time | Example                      |
| ----------------- | --------------------------------- | ------------- | ---------------------------- |
| **P1 - Critical** | Data breach, system compromise    | 1 hour        | Service role key leaked      |
| **P2 - High**     | Service degradation, auth failure | 4 hours       | Database connection failure  |
| **P3 - Medium**   | Feature broken, non-security bug  | 24 hours      | Document upload failing      |
| **P4 - Low**      | UI bug, minor issue               | 72 hours      | Alignment issue on dashboard |

### P1 Response Procedure

1. **Contain**: Disable affected system (e.g., rotate compromised key, disable user account)
2. **Assess**: Review audit logs to determine scope of breach
3. **Notify**: Inform hospital IT Security Officer and Data Protection Officer
4. **Remediate**: Fix root cause; deploy patch
5. **Recover**: Restore from backup if data integrity compromised
6. **Report**: Document incident within 72 hours (DPA requirement)
7. **Review**: Post-incident review within 1 week; update procedures
