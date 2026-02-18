import type { UserRole } from "@/types/database";

export const ROLES: Record<UserRole, { label: string; description: string }> = {
  avp: {
    label: "Assistant Vice President",
    description: "Director-level access across all 14 ancillary departments",
  },
  division_head: {
    label: "Division Head (Ancillary Director)",
    description: "Highest access level with full system control and oversight",
  },
  department_head: {
    label: "Department Head",
    description:
      "Manage documents and announcements within assigned department",
  },
};

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  avp: 2,
  division_head: 3,
  department_head: 1,
};