export const DEPARTMENTS = [
  { name: "Pulmonary Department", code: "PULM" },
  { name: "Specialty Clinics", code: "SPEC" },
  { name: "Pathology and Laboratory Medicine", code: "PATH" },
  { name: "Pharmacy", code: "PHAR" },
  { name: "Cardiovascular Unit", code: "CARD" },
  { name: "Radiology Department", code: "RADI" },
  { name: "Clinical Pharmacy", code: "CPHR" },
  { name: "Nuclear Medicine", code: "NUCM" },
  { name: "Medical Records", code: "MEDR" },
  { name: "Physical and Rehabilitation", code: "PHRE" },
  { name: "Clinical Nutrition/Weight Management", code: "CNUT" },
  { name: "Breast Center", code: "BRST" },
  { name: "Neuroscience Center", code: "NEUR" },
  { name: "Ibaan and LIMA", code: "IBLI" },
] as const;

export type DepartmentCode = (typeof DEPARTMENTS)[number]["code"];

export const DEPARTMENT_SHORT_LABELS: Record<DepartmentCode, string> = {
  PULM: "Pulmonary Head",
  SPEC: "Specialty Clinics Head",
  PATH: "Laboratory Head",
  PHAR: "Pharmacy Head",
  CARD: "Cardiovascular Head",
  RADI: "Radiology Head",
  CPHR: "Clinical Pharmacy Head",
  NUCM: "Nuclear Medicine Head",
  MEDR: "Medical Records Head",
  PHRE: "Rehab Head",
  CNUT: "Clinical Nutrition Head",
  BRST: "Breast Center Head",
  NEUR: "Neuroscience Head",
  IBLI: "Ibaan-LIMA Head",
};