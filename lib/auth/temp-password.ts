import type { UserRole } from "@/types/database";

export const SAME_AS_TEMP_PASSWORD_ERROR =
  "Your new password cannot be the same as your temporary password.";

export function buildTempPassword(
  role: UserRole,
  departmentCode?: string | null,
) {
  const suffix =
    role === "avp"
      ? "avp"
      : role === "division_head"
        ? "director"
        : (departmentCode ?? "dept").toLowerCase();

  return `asms${suffix}`;
}
