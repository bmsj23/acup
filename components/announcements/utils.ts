import type { UserRole } from "@/types/database";
import type { AnnouncementItem, PublisherProfile } from "./types";

const PUBLISHER_ROLE_LABELS: Record<UserRole, string> = {
  avp: "Assistant Vice President",
  division_head: "Ancillary Director",
  department_head: "Department Head",
};

export function getPriorityBadge(priority: AnnouncementItem["priority"]) {
  if (priority === "critical") return "bg-red-100 text-red-700";
  if (priority === "urgent") return "bg-amber-100 text-amber-700";
  return "bg-zinc-200 text-zinc-700";
}

export function getPriorityBorder(priority: AnnouncementItem["priority"]) {
  if (priority === "critical") return "border-l-red-500";
  if (priority === "urgent") return "border-l-amber-500";
  return "border-l-blue-300";
}

export function formatPublisher(profile: PublisherProfile | null | undefined): string {
  if (!profile?.role) {
    return "Unknown";
  }

  if (profile.role === "department_head") {
    return profile.department_name
      ? `${profile.department_name}`
      : "Department Head";
  }

  return PUBLISHER_ROLE_LABELS[profile.role];
}

export function formatAnnouncementScope(announcement: Pick<AnnouncementItem, "is_system_wide" | "department_name">): string {
  if (announcement.is_system_wide) {
    return "System-wide";
  }

  return announcement.department_name ?? "Department";
}
