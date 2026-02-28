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

export function formatFileSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}