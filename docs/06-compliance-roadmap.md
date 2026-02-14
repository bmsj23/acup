# Section 6: Compliance Roadmap

## 6.1 Data Privacy Act of 2012 (Republic Act No. 10173) Compliance Checklist

| #   | Requirement                 | Implementation                                                                                        | Status                  |
| --- | --------------------------- | ----------------------------------------------------------------------------------------------------- | ----------------------- |
| 1   | **Lawful processing**       | System processes data only for internal hospital communication; consent obtained at user registration | Planned                 |
| 2   | **Proportionality**         | Only necessary data collected (name, email, role, department); no extraneous PII                      | Planned                 |
| 3   | **Data minimization**       | No collection of patient data; system handles administrative documents only                           | By design               |
| 4   | **Accuracy**                | Users can update their profile; admins verify accuracy during onboarding                              | Planned                 |
| 5   | **Retention limits**        | Data retention model defined (Section 2.7); automated archival procedures                             | Planned                 |
| 6   | **Transparency**            | Privacy notice displayed at login; data processing purposes documented                                | Planned                 |
| 7   | **Security measures**       | Encryption at rest + in transit; RLS; audit logging (MFA deferred to production)                      | Core architecture       |
| 8   | **Breach notification**     | Procedure to notify NPC within 72 hours; affected users within reasonable time                        | Documented below        |
| 9   | **Data Protection Officer** | Hospital must designate DPO; system provides audit tools for DPO                                      | Hospital responsibility |
| 10  | **Rights of data subjects** | Users can request data export; admin can delete/anonymize user data                                   | Planned                 |
| 11  | **Data sharing agreements** | No third-party data sharing; Supabase DPA required                                                    | Planned                 |
| 12  | **Registration with NPC**   | Hospital registers processing system with National Privacy Commission                                 | Hospital responsibility |

## 6.2 HIPAA-Aligned Controls Checklist

> [!NOTE]
> HIPAA is a US law and not legally binding in the Philippines. These controls are adopted as **best practices** for handling sensitive medical-adjacent data.

### Administrative Safeguards

| Control                          | Implementation                                               |
| -------------------------------- | ------------------------------------------------------------ |
| Security management process      | Threat model (Section 3.1) + risk assessment documented      |
| Assigned security responsibility | Hospital IT Security Officer designated                      |
| Workforce security               | Background checks for system users (hospital responsibility) |
| Information access management    | RBAC + RLS (documented in Sections 2.5, 3.3)                 |
| Security awareness training      | Admin guide + user training materials (deliverable)          |
| Security incident procedures     | Incident response plan (Section 5.8)                         |
| Contingency plan                 | Backup + DR model (Section 2.8)                              |

### Technical Safeguards

| Control               | Implementation                                                        |
| --------------------- | --------------------------------------------------------------------- |
| Access control        | Unique user IDs, role-based access, session management (MFA deferred) |
| Audit controls        | Immutable audit logs, trigger-based, 6-year retention                 |
| Integrity controls    | Checksums on documents, database constraints, versioning              |
| Transmission security | TLS 1.3 on all connections                                            |
| Automatic logoff      | 60-minute idle timeout, 24-hour absolute timeout                      |

### Physical Safeguards

| Control                  | Implementation                                 |
| ------------------------ | ---------------------------------------------- |
| Facility access controls | Managed by Supabase (cloud) and Vercel (cloud) |
| Workstation security     | Hospital policy (not in system scope)          |
| Device controls          | Session management; no local data storage      |

## 6.3 Log Retention Requirements

| Log Type              | Minimum Retention | Format                                  | Storage                           |
| --------------------- | ----------------- | --------------------------------------- | --------------------------------- |
| Audit logs (database) | 6 years           | PostgreSQL table (partitioned by year)  | Supabase + cold storage export    |
| Authentication events | 6 years           | Supabase Auth logs + custom audit table | Supabase + cold storage export    |
| API access logs       | 1 year            | Structured JSON                         | Vercel logs + external aggregator |
| Error logs            | 1 year            | Structured JSON                         | Vercel logs                       |
| Storage access logs   | 6 years           | Custom audit table entries              | Supabase + cold storage export    |

### Retention Enforcement

- Automated weekly export of audit logs older than 6 months to cold storage
- Yearly partition rotation for `audit_logs` table
- Retention policy review annually
- Logs are immutable: no UPDATE or DELETE permitted

## 6.4 Breach Response Workflow

```
Breach Detected
    |
    v
[1] CONTAIN (Immediate - within 1 hour)
    - Isolate affected systems (disable user accounts, rotate keys)
    - Preserve evidence (do not delete logs)
    - Notify internal IT Security Officer
    |
    v
[2] ASSESS (Within 24 hours)
    - Determine scope: what data, how many users, what duration
    - Review audit logs for unauthorized access patterns
    - Classify breach severity (P1-P4 per Section 5.8)
    - Determine if personal data of data subjects is involved
    |
    v
[3] NOTIFY (Within 72 hours per DPA requirement)
    - If personal data involved:
      a. Notify National Privacy Commission (NPC) within 72 hours
      b. Notify affected data subjects within reasonable time
      c. Provide: nature of breach, data involved, remedial measures
    - Internal notification to hospital management
    |
    v
[4] REMEDIATE (Within 1 week)
    - Fix root cause
    - Deploy security patches
    - Rotate all potentially compromised credentials
    - Re-validate RLS policies
    |
    v
[5] RECOVER
    - Restore from backup if data integrity compromised
    - Re-enable affected systems
    - Verify system integrity
    |
    v
[6] DOCUMENT (Within 2 weeks)
    - Full incident report
    - Root cause analysis
    - Lessons learned
    - Updated procedures
    - Report to NPC if required
    |
    v
[7] REVIEW (Within 1 month)
    - Post-incident review with stakeholders
    - Update threat model
    - Update security controls if needed
    - Schedule follow-up audit
```

## 6.5 Documentation Requirements

| Document                   | Purpose                                | Owner                   | Review Cycle        |
| -------------------------- | -------------------------------------- | ----------------------- | ------------------- |
| System Security Plan       | Overall security posture documentation | Developer + IT Security | Annually            |
| Data Processing Agreement  | Supabase as data processor             | Hospital DPO            | At contract renewal |
| Privacy Impact Assessment  | Risk assessment for data processing    | Hospital DPO            | Annually            |
| Incident Response Plan     | Breach handling procedures             | Developer + IT Security | Semi-annually       |
| User Access Register       | Current users, roles, permissions      | Admin                   | Quarterly           |
| Audit Log Review Report    | Periodic review of audit logs          | Auditor                 | Monthly             |
| Backup Verification Report | Confirmation backups are restorable    | Developer               | Quarterly           |
| Change Management Log      | Record of all system changes           | Developer               | Continuous          |
| User Training Materials    | How to use the system securely         | Developer               | At release          |
| Data Retention Schedule    | What is kept, for how long, and why    | Hospital DPO            | Annually            |

## 6.6 Audit-Readiness Checklist

| Category              | Item                                           | Evidence                                   |
| --------------------- | ---------------------------------------------- | ------------------------------------------ |
| **Access Control**    | All users have unique accounts                 | `profiles` table                           |
|                       | MFA planned for production (deferred in pilot) | Architecture supports TOTP enrollment      |
|                       | Role assignments documented                    | `profiles.role` + `department_memberships` |
|                       | Inactive users disabled                        | `profiles.is_active = false`               |
| **Audit Trail**       | All data access logged                         | `audit_logs` table                         |
|                       | Logs are immutable                             | No UPDATE/DELETE policies on audit_logs    |
|                       | Logs retained 6+ years                         | Partition + cold storage exports           |
|                       | Log includes who, what, when                   | `performed_by`, `action`, `performed_at`   |
| **Encryption**        | Data encrypted in transit                      | TLS 1.3 certificates                       |
|                       | Data encrypted at rest                         | Supabase encryption configuration          |
| **Incident Response** | Breach notification procedure documented       | Incident Response Plan document            |
|                       | Response tested                                | Quarterly tabletop exercise                |
| **Data Management**   | Retention policy defined                       | Data Retention Schedule document           |
|                       | Data disposal procedure documented             | Retention model (Section 2.7)              |
|                       | Backup verification conducted                  | Quarterly Backup Verification Report       |
| **Compliance**        | NPC registration completed                     | Registration certificate                   |
|                       | Privacy notice displayed                       | Login page implementation                  |
|                       | DPO designated                                 | Hospital appointment record                |
