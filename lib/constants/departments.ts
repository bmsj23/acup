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