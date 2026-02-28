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

// non-revenue departments do not track revenue metrics
export const NON_REVENUE_DEPARTMENT_CODES: DepartmentCode[] = ["MEDR", "CPHR"];

// non-census departments use transaction counts instead of patient census
export const NON_CENSUS_DEPARTMENT_CODES: DepartmentCode[] = ["MEDR"];

// departments with medication error tracking
export const MEDICATION_ERROR_DEPARTMENT_CODES: DepartmentCode[] = ["CPHR"];

// medical records transaction categories (checkbox-pick approach)
export const MEDICAL_RECORDS_TRANSACTION_CATEGORIES = [
  "Release of medical records copies",
  "Processing of medical certificate requests",
  "Insurance / HMO documentation requests",
  "PhilHealth claims documentation",
  "Chart retrieval (inpatient / outpatient)",
  "Chart filing and refiling",
  "Scanning and digitization entries",
  "Record verification requests",
  "Medico-legal document preparation",
] as const;

export type MedicalRecordsTransactionCategory =
  (typeof MEDICAL_RECORDS_TRANSACTION_CATEGORIES)[number];