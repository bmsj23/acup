# Section 4: Frontend Architecture Plan

## 4.1 Folder Structure

```
src/
  app/
    (public)/
      login/
        page.tsx
      layout.tsx
    (protected)/
      layout.tsx                  <- auth guard + role context
      dashboard/
        page.tsx                  <- role-aware landing
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
      auth/
        callback/route.ts
      documents/
        route.ts
        [id]/
          route.ts
          view/route.ts
          download/route.ts
      announcements/
        route.ts
        [id]/route.ts
      departments/
        route.ts
        [id]/members/route.ts
      audit/
        logs/route.ts
      admin/
        users/route.ts
        roles/route.ts
        settings/route.ts
    layout.tsx
    not-found.tsx
    error.tsx
    middleware.ts
  components/
    ui/                           <- reusable primitives
      button.tsx
      input.tsx
      modal.tsx
      table.tsx
      badge.tsx
      toast.tsx
      dropdown.tsx
      skeleton.tsx
    layout/
      header.tsx
      sidebar.tsx
      breadcrumb.tsx
      page-container.tsx
    documents/
      document-table.tsx
      document-upload-form.tsx
      document-viewer.tsx         <- watermarked PDF display
      classification-badge.tsx
    announcements/
      announcement-card.tsx
      announcement-form.tsx
    admin/
      user-management-table.tsx
      role-editor.tsx
      department-manager.tsx
    audit/
      audit-log-table.tsx
      audit-log-filters.tsx
    auth/
      login-form.tsx
  lib/
    supabase/
      client.ts                   <- browser client (anon key only)
      server.ts                   <- server client (service_role)
      middleware.ts               <- session refresh logic
    api/
      documents.ts                <- typed API call functions
      announcements.ts
      departments.ts
      audit.ts
      admin.ts
    utils/
      watermark.ts                <- pdf-lib watermark logic
      validation.ts               <- zod schemas
      formatting.ts               <- date, file size formatters
      classification.ts           <- classification level helpers
    constants/
      departments.ts
      roles.ts
      routes.ts
  hooks/
    use-auth.ts
    use-role.ts
    use-department.ts
    use-documents.ts
    use-announcements.ts
  types/
    database.ts                   <- generated from Supabase
    api.ts                        <- request/response types
    auth.ts
  middleware.ts                   <- Next.js edge middleware
```

## 4.2 Role-Based UI Separation

### Route Group Strategy

- `(public)/` - No auth required; login page only
- `(protected)/` - Auth required; Middleware validates session before render
- `(protected)/admin/` - Admin role required; layout checks role
- `(protected)/department/` - Department head role required
- `(protected)/audit/` - Auditor role required

### Layout Guards (Defense in Depth)

```
middleware.ts
  -> Checks session validity (redirects to /login if invalid)

(protected)/layout.tsx
  -> Server component; fetches profile from DB
  -> Passes role to context

(protected)/admin/layout.tsx
  -> Reads role from context
  -> If role !== 'admin', renders AccessDenied component
  -> This is UI-level only; RLS prevents data access regardless
```

> [!IMPORTANT]
> Frontend guards are **convenience, not security**. Even if a user bypasses the UI guard, RLS prevents data access at the database layer. The UI guards exist to provide a clean UX, not to enforce access control.

## 4.3 Secure Data Fetching Strategy

### Server Components (Preferred)

- All data-fetching pages use **React Server Components**
- Data is fetched server-side using the Supabase server client (`service_role` or session-scoped)
- No sensitive data enters the client JS bundle

### TanStack Query (Client-Side, Limited Use)

- Used only for **real-time UI updates** (e.g., notification polling, list refresh)
- All queries call Next.js API routes (never Supabase directly from client)
- `staleTime`: 30 seconds for most queries
- `gcTime`: 5 minutes
- `refetchOnWindowFocus`: true (ensures fresh data on tab switch)
- Error boundaries catch and display query failures

### Data Fetching Rules

1. Never use the Supabase client SDK for mutations on the client
2. All mutations go through API routes (POST, PUT, DELETE)
3. API routes validate session, role, and input before executing
4. File uploads use multipart form POST to API route; API route handles storage

## 4.4 Error Handling Model

| Layer                   | Strategy                                                                     |
| ----------------------- | ---------------------------------------------------------------------------- |
| API routes              | Try/catch with structured error responses: `{ error: string, code: string }` |
| Server Components       | Error boundaries (`error.tsx`) per route segment                             |
| Client Components       | TanStack Query `onError` callbacks + toast notifications                     |
| Network failures        | Retry with exponential backoff (3 attempts max)                              |
| Auth errors (401)       | Redirect to login; clear stale session                                       |
| Forbidden (403)         | Display AccessDenied component; log attempt                                  |
| Validation errors (400) | Display inline field errors via zod                                          |
| Server errors (500)     | Generic error page; log details server-side                                  |

### Error Response Format

```typescript
type ApiError = {
  error: string;
  code:
    | "UNAUTHORIZED"
    | "FORBIDDEN"
    | "NOT_FOUND"
    | "VALIDATION_ERROR"
    | "RATE_LIMITED"
    | "INTERNAL_ERROR";
  details?: Record<string, string[]>;
};
```

## 4.5 State Management Plan

| State Type                      | Tool                             | Rationale                        |
| ------------------------------- | -------------------------------- | -------------------------------- |
| Server state (documents, users) | TanStack Query                   | Cache, dedup, background refresh |
| Auth state (session, role)      | React Context + Server Component | Global; set once at layout level |
| UI state (modals, filters)      | React `useState`                 | Local; no global sharing needed  |
| Form state                      | React Hook Form + zod            | Validation, controlled inputs    |
| URL state (pagination, filters) | `useSearchParams`                | Shareable, bookmarkable          |

No Redux, Zustand, or Jotai. The application is simple enough that these add unnecessary complexity.

## 4.6 Access Control Enforcement in UI

| Control               | UI Behavior                     | Security Enforcement                     |
| --------------------- | ------------------------------- | ---------------------------------------- |
| Admin-only pages      | Render `AccessDenied` component | RLS returns 0 rows                       |
| Upload button         | Hidden for auditors             | API route rejects non-authorized uploads |
| Delete button         | Hidden for non-owners           | RLS prevents DELETE for non-owners       |
| Classification badge  | Color-coded (green/orange/red)  | RLS filters documents by classification  |
| User role dropdown    | Disabled for non-admins         | RLS prevents UPDATE on `profiles.role`   |
| Top Confidential docs | Hidden unless explicit grant    | RLS + `document_access_grants` table     |

## 4.7 Performance Strategy

| Technique               | Application                                        |
| ----------------------- | -------------------------------------------------- |
| React Server Components | Minimize client JS; server-render data-heavy pages |
| Dynamic imports         | Lazy-load PDF viewer and heavy components          |
| Image optimization      | Next.js `<Image>` for any static assets            |
| Route prefetching       | Next.js `<Link>` prefetch for sidebar navigation   |
| Query deduplication     | TanStack Query prevents duplicate requests         |
| Skeleton loading        | Suspense boundaries with skeleton components       |
| Pagination              | All list endpoints paginated (20 items default)    |
| Database indexes        | Indexed columns reduce query time (see Section 2)  |

### Performance Targets

- Time to Interactive (TTI): < 3 seconds
- Document list load: < 1 second
- PDF view (with watermark): < 3 seconds
- API response time (p95): < 500ms

## 4.8 Deployment Strategy

- **Platform**: Vercel (integrated with Next.js)
- **Environments**: Preview (per PR), Staging, Production
- **Environment variables**: Set via Vercel dashboard (encrypted at rest)
- **Domain**: Custom domain with Cloudflare DNS + proxy
- **Build**: `next build` with strict TypeScript and ESLint checks
- **Edge Middleware**: Deployed to Vercel Edge for auth checks (low latency)
- **Monitoring**: Vercel Analytics + Speed Insights (free tier)
