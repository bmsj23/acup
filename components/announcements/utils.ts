import type { AnnouncementItem, PublisherProfile } from "./types";

export const DEPT_CODE_LABELS: Record<string, string> = {
  PULM: "Pulmonary",
  SPEC: "Specialty Clinics",
  PATH: "Laboratory",
  PHAR: "Pharmacy",
  CARD: "Cardiovascular",
  RADI: "Radiology",
  CPHR: "Clinical Pharmacy",
  NUCM: "Nuclear Medicine",
  MEDR: "Medical Records",
  PHRE: "Rehabilitation",
  CNUT: "Clinical Nutrition",
  BRST: "Breast Center",
  NEUR: "Neuroscience",
  IBLI: "Ibaan-LIMA",
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
  if (!profile) return "Unknown";
  if (profile.role === "avp") return "AVP";
  if (profile.role === "division_head") return "Ancillary Director";

  // eslint-disable-next-line security/detect-object-injection
  const code = profile.department_memberships?.[0]?.departments?.code;
  const deptLabel = code ? DEPT_CODE_LABELS[code] : null;
  return deptLabel ? `${deptLabel} Head` : "Department Head";
}