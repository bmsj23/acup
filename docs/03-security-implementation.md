# Section 3: Security Implementation Plan

## 3.1 STRIDE Threat Model

| Threat                                                   | Category                   | Target          | Mitigation                                                                        |
| -------------------------------------------------------- | -------------------------- | --------------- | --------------------------------------------------------------------------------- |
| Attacker impersonates legitimate user                    | **Spoofing**               | Auth system     | Session validation, HTTP-only cookies, rate limiting (MFA deferred to production) |
| User modifies document metadata to change classification | **Tampering**              | Documents table | RLS prevents unauthorized UPDATE; audit triggers log all changes                  |
| User denies accessing a Top Confidential document        | **Repudiation**            | Audit system    | Immutable audit logs with `performed_by`, timestamp, IP                           |
| Unauthorized user reads Secret documents                 | **Information Disclosure** | Database        | RLS policies enforce department-scoped access                                     |
| Attacker floods login endpoint                           | **Denial of Service**      | Auth API        | Rate limiting (5 attempts/min/IP), Cloudflare DDoS protection                     |
| Department head grants themselves admin role             | **Elevation of Privilege** | Profiles table  | Only admins can UPDATE `role` column; RLS enforced                                |

### Expanded Threat Scenarios

**T1 - Insider Document Exfiltration**

- Vector: Department head screenshots watermarked PDF and shares externally
- Mitigation: Dynamic watermark with email + timestamp makes leak traceable; does not prevent but enables attribution
- Residual risk: Accepted; fully preventing screenshots is not possible in a browser

**T2 - Service Role Key Compromise**

- Vector: Key leaked via client bundle, logs, or Git
- Mitigation: Key exists only in Vercel environment variables; never in client code; Git hooks scan for secrets
- Response: Immediately rotate key in Supabase dashboard; review audit logs for unauthorized access

**T3 - Session Hijacking**

- Vector: Attacker steals session cookie via XSS
- Mitigation: HTTP-only cookies prevent JS access; CSP blocks inline scripts; SameSite=Strict prevents CSRF
- Response: Session invalidation on IP change; short session TTL (1 hour idle, 24 hours absolute)

## 3.2 Attack Surface Analysis

| Surface        | Exposure                   | Controls                                           |
| -------------- | -------------------------- | -------------------------------------------------- |
| Login endpoint | Public                     | Rate limiting, account lockout after 5 failures    |
| API routes     | Authenticated only         | Session validation, role check, input sanitization |
| Storage URLs   | Signed, 60s TTL            | Server-generated only, single-use recommended      |
| Database       | Not internet-exposed       | Supabase manages; only reachable via API           |
| Admin panel    | Authenticated + admin role | Route-level + RLS + audit logging                  |
| PDF viewer     | Authenticated + authorized | Watermarked server-side; no download of clean file |

## 3.3 Privilege Escalation Prevention

1. **Role is immutable by the user**: Only admins can modify the `role` column on `profiles`
2. **RLS policy on profiles UPDATE**:

```sql
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
) WITH CHECK (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);
```

3. **No client-side role assignment**: Role is never accepted from the client; always read from the database
4. **Department membership changes**: Only admins can INSERT/DELETE on `department_memberships`
5. **Audit trail**: Every role or membership change triggers an audit log entry

## 3.4 Insider Threat Mitigation

| Control                        | Description                                                |
| ------------------------------ | ---------------------------------------------------------- |
| Dynamic watermarking           | Every PDF view is traced to a specific user                |
| Audit logging                  | All actions logged immutably; reviewed weekly              |
| Least privilege                | Users see only their department's documents by default     |
| Top Confidential access grants | Explicit per-user grants required; logged and time-bounded |
| Session monitoring             | Concurrent session detection; anomalous access alerts      |
| Admin action logging           | Admin actions are logged with elevated scrutiny            |

## 3.5 Document Leak Mitigation

- **Primary**: Dynamic watermark on every PDF render (email + timestamp + document ID)
- **Secondary**: Signed URLs expire in 60 seconds; cannot be bookmarked or shared
- **Tertiary**: No download of un-watermarked files; downloads also watermarked
- **Detective**: Audit logs record every view/download event with user identity
- **Deterrent**: Users are informed that all access is logged and watermarked (visible in UI)

## 3.6 Encryption Model

| Layer              | Method                                                 | Standard                    |
| ------------------ | ------------------------------------------------------ | --------------------------- |
| In transit         | TLS 1.3 (enforced by Cloudflare + Vercel + Supabase)   | AES-256-GCM                 |
| At rest (database) | Supabase managed encryption (AES-256)                  | Transparent Data Encryption |
| At rest (storage)  | Supabase Storage / S3 server-side encryption (AES-256) | SSE-S3                      |
| Session tokens     | Signed JWT with HS256                                  | Supabase Auth managed       |
| Passwords          | bcrypt (Supabase Auth default)                         | Cost factor 10+             |

### Key Management

- Supabase manages encryption keys for database and storage (you do not hold the keys)
- JWT secret is managed by Supabase; rotated via dashboard
- `service_role` and `anon` keys: rotated every 90 days via Supabase dashboard
- API keys stored exclusively in Vercel environment variables (encrypted at rest)
- No secrets in Git, `.env` files committed, or client-side code

## 3.7 Authentication Strategy (Pilot Phase)

- **Method**: Email + password via Supabase Auth
- **Email verification**: Disabled for pilot testing (faster onboarding)
- **MFA**: Deferred to production phase; architecture supports TOTP via Supabase Auth MFA when needed
- **Session issuance**: On successful email + password authentication

```
Login Flow (Pilot):
1. Email + Password -> Supabase Auth
2. Credentials valid -> Session issued (HTTP-only cookie)
3. Middleware validates session on every protected route request
```

> [!NOTE]
> When transitioning to production, MFA (TOTP) should be enabled with mandatory enrollment and AAL2 enforcement in middleware.

## 3.8 Session Handling Strategy

| Parameter                               | Value            | Rationale                         |
| --------------------------------------- | ---------------- | --------------------------------- |
| Session storage                         | HTTP-only cookie | Prevents XSS access to token      |
| SameSite                                | Strict           | Prevents CSRF                     |
| Secure flag                             | true             | HTTPS only                        |
| Idle timeout                            | 60 minutes       | Unattended workstation protection |
| Absolute timeout                        | 24 hours         | Forces daily re-authentication    |
| Concurrent sessions                     | 2 maximum        | Limits credential sharing         |
| Session invalidation on role change     | Immediate        | Prevents stale privilege          |
| Session invalidation on password change | Immediate        | Security best practice            |

## 3.9 Rate Limiting Strategy

| Endpoint                     | Limit       | Window            | Response                  |
| ---------------------------- | ----------- | ----------------- | ------------------------- |
| POST /api/auth (login)       | 5 requests  | 1 minute per IP   | 429 + exponential backoff |
| POST /api/documents (upload) | 10 requests | 1 minute per user | 429                       |
| GET /api/documents/[id]/view | 30 requests | 1 minute per user | 429                       |
| All other API routes         | 60 requests | 1 minute per user | 429                       |

Implementation: Vercel Edge Middleware with in-memory rate counter (Vercel KV or Upstash Redis for distributed state if needed).

## 3.10 CSP and HTTP Security Headers

```typescript
// next.config.ts headers configuration
const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value:
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https://*.supabase.co; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-DNS-Prefetch-Control", value: "off" },
];
```

## 3.11 Secure Storage Configuration

```
Supabase Storage Checklist:
[x] All buckets set to private (public = false)
[x] No public access policies on any bucket
[x] Signed URL TTL: 60 seconds maximum
[x] Signed URLs generated server-side only (service_role)
[x] File type validation: PDF, DOCX, XLSX only
[x] File size limit: 25MB
[x] Object versioning enabled
[x] CORS: restricted to application domain only
[x] No direct client-to-storage uploads (all via API route)
```
