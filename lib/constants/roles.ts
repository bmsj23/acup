import type { UserRole } from "@/types/database";

export const ROLES: Record<UserRole, { label: string; description: string }> = {
  avp: {
    label: "Assistant Vice President",
    description: "Highest access level with full system control and oversight",
  },
  division_head: {
    label: "Division Head (Ancillary Director)",
    description: "Director-level access across all 14 ancillary departments",
  },
  department_head: {
    label: "Department Head",
    description:
      "Manage documents and announcements within assigned department",
  },
};

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  avp: 3,
  division_head: 2,
  department_head: 1,
};