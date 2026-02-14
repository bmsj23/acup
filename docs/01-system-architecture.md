# Section 1: System Architecture Plan

## 1.1 High-Level System Architecture

ACUP is a **three-tier, server-rendered web application** with a zero-trust security posture. The architecture enforces all authorization at the database layer and treats the frontend as an untrusted client.

```
                        +---------------------+
                        |     Cloudflare       |
                        |  (WAF + DDoS + CDN)  |
                        +---------+-----------+
                                  |
                        +---------v-----------+
                        |    Vercel Edge       |
                        |  (Next.js Runtime)   |
                        |  - SSR Pages         |
                        |  - API Routes        |
                        |  - Middleware         |
                        +---------+-----------+
                                  |
                   +--------------+--------------+
                   |                             |
          +--------v--------+          +---------v--------+
          |   Supabase       |          |  Supabase        |
          |   PostgreSQL     |          |  Storage         |
          |  - RLS Policies  |          |  - Private Only  |
          |  - Audit Triggers|          |  - Signed URLs   |
          |  - Auth          |          |  - Versioning    |
          +--------+--------+          +------------------+
                   |
          +--------v--------+
          |  Audit Log       |
          |  (Immutable)     |
          |  - Trigger-based |
          |  - Append-only   |
          +-----------------+
```

## 1.2 Logical Architecture Layers

### Layer 1: Edge / CDN Layer

- **Cloudflare** (free tier) for DDoS mitigation, WAF rules, and TLS termination
- All traffic enters via HTTPS only; HTTP is rejected at the edge
- Bot protection enabled

### Layer 2: Presentation Layer (Next.js on Vercel)

- **Server-Side Rendering (SSR)** and **Server Components** for all protected routes
- No sensitive logic in client components
- Next.js Middleware enforces auth check before any protected route renders
- Role-based route groups: `(public)/`, `(protected)/admin/`, `(protected)/department/`, `(protected)/audit/`

### Layer 3: Application Layer (Next.js API Routes + Server Actions)

- All data mutations go through **server-only API routes**
- Responsibilities: session validation, input sanitization, audit log writing, watermark generation, signed URL minting
- The `service_role` key is used exclusively here and never exposed to the client
- Rate limiting applied per-route

### Layer 4: Data Layer (Supabase PostgreSQL)

- **RLS is the primary enforcement boundary** for all data access
- Every table has RLS enabled with explicit policies per role
- Trigger-based audit logging captures every mutation
- Foreign key constraints enforce referential integrity

### Layer 5: Storage Layer (Supabase Storage)

- All buckets are **private**
- Files are accessed exclusively via **server-generated signed URLs** with a maximum TTL of 60 seconds
- No public bucket flags; no direct client-to-storage communication
- Object versioning enabled for tamper detection

## 1.3 Data Flow Diagrams

### Authentication Flow

```
User -> Login Page -> Supabase Auth (email+password, no email verification)
  -> Session token issued (HTTP-only cookie, SameSite=Strict)
    -> Middleware validates session on every request
      -> auth.uid() used in all RLS policies
```

> [!NOTE]
> MFA is intentionally deferred for the pilot testing phase. The architecture is designed to support TOTP-based MFA when the system moves to production. Email verification is also disabled during pilot testing for faster user onboarding.

### Document Upload Flow

```
1. User selects file + classification level + target department
2. Client sends file to API route (multipart/form-data)
3. API route validates:
   a. User session is valid
   b. User has upload permission for target department
   c. File type is allowed (PDF, DOCX, XLSX only)
   d. File size <= 25MB
   e. File is scanned for malware signatures (basic check)
4. API route uploads to Supabase Storage (private bucket)
5. API route inserts metadata row into `documents` table
6. PostgreSQL triggers write to `audit_logs`
7. Response returned to client
```

### Document View Flow (With Watermarking)

```
1. User clicks "View Document"
2. Client calls API route: GET /api/documents/[id]/view
3. API route validates session + RLS check via Supabase query
4. If authorized:
   a. Generate signed URL (60s TTL) for the storage object
   b. Fetch the PDF via signed URL
   c. Apply dynamic watermark overlay:
      - User email
      - Timestamp (ISO 8601)
      - Document ID
      - Semi-transparent diagonal text
   d. Stream watermarked PDF to client
5. Audit log entry written: { user_id, document_id, action: "view", timestamp }
```

> [!IMPORTANT]
> The original un-watermarked PDF is never sent to the client. The watermark is applied server-side on every view request, making it unique and traceable per user per access.

### Audit Logging Flow

```
1. Any INSERT/UPDATE/DELETE on protected tables fires a PostgreSQL trigger
2. Trigger function writes to `audit_logs` table:
   - table_name, record_id, action, old_data (jsonb), new_data (jsonb),
     performed_by (auth.uid()), performed_at (now())
3. `audit_logs` table has:
   - RLS: Only auditors and admins can SELECT
   - No UPDATE/DELETE policies (immutable)
   - No TRUNCATE permissions
```

## 1.4 Security Boundaries

| Boundary    | Enforcement Mechanism                               |
| ----------- | --------------------------------------------------- |
| Network     | Cloudflare WAF + TLS 1.3                            |
| Application | Next.js Middleware auth check                       |
| API         | Server-side session validation + input sanitization |
| Data        | PostgreSQL RLS policies tied to `auth.uid()`        |
| Storage     | Private buckets + signed URLs (60s TTL)             |
| Audit       | Immutable append-only log table                     |
| Document    | Server-side watermarking per view                   |

## 1.5 API Architecture

All API routes are **server-only** (no client-callable edge functions). Structure:

```
app/api/
  auth/
    callback/route.ts        -> OAuth/magic link callback
  documents/
    route.ts                  -> GET (list), POST (upload)
    [id]/
      route.ts                -> GET (metadata), DELETE
      view/route.ts           -> GET (watermarked PDF stream)
      download/route.ts       -> GET (watermarked download)
  announcements/
    route.ts                  -> GET (list), POST (create)
    [id]/route.ts             -> GET, PUT, DELETE
  departments/
    route.ts                  -> GET (list)
    [id]/
      members/route.ts        -> GET, POST, DELETE
  audit/
    logs/route.ts             -> GET (paginated, filterable)
  admin/
    users/route.ts            -> GET, POST, PUT
    roles/route.ts            -> GET, PUT
    settings/route.ts         -> GET, PUT
```

**Key constraint**: Every API route performs these checks in order:

1. Session validation (reject if no valid session)
2. Role authorization (reject if role insufficient)
3. Input validation (reject if malformed)
4. Business logic execution
5. Audit log entry

## 1.6 Key Architectural Decisions & Tradeoffs

| Decision                                   | Rationale                                 | Tradeoff                                     |
| ------------------------------------------ | ----------------------------------------- | -------------------------------------------- |
| **SSR over SPA**                           | Sensitive data never in client JS bundles | Slightly higher server load                  |
| **RLS as primary security**                | Cannot be bypassed by frontend bugs       | Complex policy authoring; harder to debug    |
| **Server-side watermarking**               | Prevents clean document extraction        | Adds ~1-3s latency per PDF view              |
| **60s signed URLs**                        | Minimizes window of URL sharing           | Users must re-request if URL expires         |
| **No MFA (pilot phase)**                   | Faster onboarding for pilot testing       | Reduced security; MFA planned for production |
| **No client-side Supabase SDK for writes** | Prevents direct DB manipulation           | All mutations must go through API routes     |
| **Supabase over self-hosted Postgres**     | Managed infra reduces solo-dev ops burden | Less control over network-level security     |

## 1.7 High-Risk Areas

> [!CAUTION]
> **Service Role Key Exposure**: If the `service_role` key leaks, an attacker has full database access bypassing all RLS. This key must only exist in server-side environment variables, never in client bundles.

> [!NOTE]
> **Supabase Free Tier**: The free tier (500MB DB, 1GB storage) is used for development and initial pilot testing. The Pro tier ($25/month) will be adopted when pilot testing requires daily backups, PITR, and higher limits.

> [!WARNING]
> **Solo Developer Risk**: A single developer represents a single point of failure for incident response, key rotation, and system recovery. Document all procedures thoroughly so a secondary party can act in emergencies.
