# Section 2: Database Design Plan

## 2.1 Full Entity List

### Core Entities

| Table                    | Purpose                                            | Estimated Rows |
| ------------------------ | -------------------------------------------------- | -------------- |
| `profiles`               | User identity + role + department                  | ~50            |
| `departments`            | The 14 ancillary departments                       | 14             |
| `documents`              | Document metadata (not the file itself)            | ~5,000/year    |
| `announcements`          | Department or system-wide announcements            | ~500/year      |
| `audit_logs`             | Immutable event log                                | ~50,000/year   |
| `sessions`               | Active user session tracking                       | ~50            |
| `document_access_grants` | Explicit per-user access for Top Confidential docs | ~200           |
| `department_memberships` | Many-to-many: users to departments                 | ~70            |
| `notification_queue`     | Pending notifications for users                    | ~1,000/year    |
| `system_settings`        | Key-value config (session timeout, etc.)           | ~20            |

### Enum Types

```sql
CREATE TYPE user_role AS ENUM ('admin', 'department_head', 'auditor');
CREATE TYPE classification_level AS ENUM ('confidential', 'secret', 'top_confidential');
CREATE TYPE audit_action AS ENUM ('INSERT', 'UPDATE', 'DELETE', 'VIEW', 'DOWNLOAD', 'LOGIN', 'LOGOUT', 'ACCESS_DENIED');
CREATE TYPE document_status AS ENUM ('active', 'archived', 'deleted');
CREATE TYPE announcement_priority AS ENUM ('normal', 'urgent', 'critical');
```

## 2.2 Entity Relationship Design

```
profiles >--< department_memberships >--< departments
   |
   +--- documents (uploaded_by)
   |       |
   |       +--- document_access_grants (for top_confidential)
   |
   +--- announcements (created_by)
   |
   +--- audit_logs (performed_by)
   |
   +--- sessions (user_id)
```

### Key Relationships

- `profiles` 1:N `documents` (a user uploads many documents)
- `profiles` M:N `departments` (via `department_memberships`; a user can belong to multiple departments)
- `documents` 1:N `document_access_grants` (Top Confidential docs get explicit grants)
- `departments` 1:N `documents` (a document belongs to one department)
- `profiles` 1:N `audit_logs` (every user action is logged)

## 2.3 Table Schemas

### `profiles`

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'department_head',
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### `departments`

```sql
CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### `department_memberships`

```sql
CREATE TABLE department_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, department_id)
);
```

### `documents`

```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  classification classification_level NOT NULL,
  department_id UUID NOT NULL REFERENCES departments(id),
  uploaded_by UUID NOT NULL REFERENCES profiles(id),
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  checksum TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  status document_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### `document_access_grants`

```sql
CREATE TABLE document_access_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  granted_to UUID NOT NULL REFERENCES profiles(id),
  granted_by UUID NOT NULL REFERENCES profiles(id),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  UNIQUE(document_id, granted_to)
);
```

### `announcements`

```sql
CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  priority announcement_priority NOT NULL DEFAULT 'normal',
  department_id UUID REFERENCES departments(id),
  created_by UUID NOT NULL REFERENCES profiles(id),
  is_system_wide BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### `audit_logs`

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID,
  action audit_action NOT NULL,
  old_data JSONB,
  new_data JSONB,
  metadata JSONB,
  performed_by UUID REFERENCES profiles(id),
  ip_address INET,
  user_agent TEXT,
  performed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- immutability enforcement
REVOKE UPDATE, DELETE, TRUNCATE ON audit_logs FROM PUBLIC;
REVOKE UPDATE, DELETE, TRUNCATE ON audit_logs FROM authenticated;
REVOKE UPDATE, DELETE, TRUNCATE ON audit_logs FROM service_role;
```

> [!CAUTION]
> The `service_role` REVOKE on `audit_logs` is critical. Even server-side code should not be able to alter audit logs. Only the trigger function (running as the table owner) should INSERT.

## 2.4 Indexing Strategy

```sql
-- profiles
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_is_active ON profiles(is_active);

-- documents
CREATE INDEX idx_documents_department ON documents(department_id);
CREATE INDEX idx_documents_classification ON documents(classification);
CREATE INDEX idx_documents_uploaded_by ON documents(uploaded_by);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_created_at ON documents(created_at DESC);

-- department_memberships
CREATE INDEX idx_dept_members_user ON department_memberships(user_id);
CREATE INDEX idx_dept_members_dept ON department_memberships(department_id);

-- audit_logs
CREATE INDEX idx_audit_performed_by ON audit_logs(performed_by);
CREATE INDEX idx_audit_performed_at ON audit_logs(performed_at DESC);
CREATE INDEX idx_audit_table_name ON audit_logs(table_name);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_record_id ON audit_logs(record_id);

-- document_access_grants
CREATE INDEX idx_dag_document ON document_access_grants(document_id);
CREATE INDEX idx_dag_granted_to ON document_access_grants(granted_to);
```

## 2.5 RLS Enforcement Strategy

### Principle

Every table has `ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;` with **no default-allow policies**. If no policy matches, the row is invisible.

### Policy Examples

**`documents` SELECT policy:**

```sql
CREATE POLICY "documents_select" ON documents FOR SELECT USING (
  -- admins see all active documents
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  OR
  -- department heads see documents in their departments
  (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'department_head'
    AND classification IN ('confidential', 'secret')
    AND department_id IN (
      SELECT department_id FROM department_memberships WHERE user_id = auth.uid()
    )
  )
  OR
  -- top_confidential requires explicit grant
  (
    classification = 'top_confidential'
    AND id IN (
      SELECT document_id FROM document_access_grants
      WHERE granted_to = auth.uid()
      AND (expires_at IS NULL OR expires_at > now())
    )
  )
);
```

**`audit_logs` SELECT policy:**

```sql
CREATE POLICY "audit_logs_select" ON audit_logs FOR SELECT USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'auditor')
);
```

**`audit_logs` INSERT policy (trigger only):**

```sql
-- no INSERT policy for authenticated role; only the trigger function inserts
```

## 2.6 Audit Log Strategy

### Trigger Function

```sql
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (table_name, record_id, action, old_data, new_data, performed_by, performed_at)
  VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP::audit_action,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
    auth.uid(),
    now()
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

Applied to all core tables:

```sql
CREATE TRIGGER audit_documents AFTER INSERT OR UPDATE OR DELETE ON documents
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
CREATE TRIGGER audit_profiles AFTER INSERT OR UPDATE OR DELETE ON profiles
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
CREATE TRIGGER audit_announcements AFTER INSERT OR UPDATE OR DELETE ON announcements
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
CREATE TRIGGER audit_access_grants AFTER INSERT OR UPDATE OR DELETE ON document_access_grants
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
```

## 2.7 Data Retention Model

| Data Type                 | Retention Period                    | Rationale                     |
| ------------------------- | ----------------------------------- | ----------------------------- |
| Audit logs                | **6 years minimum**                 | HIPAA-aligned; DPA compliance |
| Active documents          | Indefinite (until archived/deleted) | Operational need              |
| Archived documents        | 3 years after archival              | Storage cost management       |
| Deleted document metadata | 1 year (soft delete)                | Recovery window               |
| Deleted document files    | 90 days (storage versioning)        | Accidental deletion recovery  |
| Session data              | 30 days after expiry                | Security investigation window |
| User profiles (inactive)  | 2 years after deactivation          | Legal hold compliance         |

### Partition Strategy for Audit Logs

```sql
-- partition audit_logs by year for performance at scale
CREATE TABLE audit_logs (
  ...
) PARTITION BY RANGE (performed_at);

CREATE TABLE audit_logs_2026 PARTITION OF audit_logs
  FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');
CREATE TABLE audit_logs_2027 PARTITION OF audit_logs
  FOR VALUES FROM ('2027-01-01') TO ('2028-01-01');
```

## 2.8 Backup & Disaster Recovery Model

| Component       | Strategy                            | Frequency            | Retention  |
| --------------- | ----------------------------------- | -------------------- | ---------- |
| Database        | Supabase PITR (Pro tier, for pilot) | Continuous           | 7 days     |
| Database        | Daily logical backup (`pg_dump`)    | Daily at 02:00 UTC+8 | 30 days    |
| Storage objects | Supabase Storage versioning         | On every write       | 90 days    |
| Audit logs      | Separate export to cold storage     | Weekly               | 6 years    |
| Configuration   | Git-versioned SQL migrations        | On every change      | Indefinate |

### Recovery Time Objectives

- **RTO** (Recovery Time Objective): 4 hours
- **RPO** (Recovery Point Objective): 1 hour (PITR granularity)

### Recovery Procedure (Documented)

1. Identify failure scope (full DB, single table, storage)
2. For DB: Restore from PITR to target timestamp
3. For storage: Restore from object version history
4. For audit logs: Restore from cold storage export
5. Validate restored data integrity via checksums
6. Re-enable application access
7. Post-incident review within 24 hours
