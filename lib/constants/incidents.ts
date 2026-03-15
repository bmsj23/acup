export const INCIDENT_TYPES = [
  "patient_fall",
  "equipment_malfunction",
  "patient_identification_error",
  "procedure_related_incident",
  "near_miss",
] as const;

export type IncidentType = (typeof INCIDENT_TYPES)[number];

export const INCIDENT_TYPE_LABELS: Record<IncidentType, string> = {
  patient_fall: "Patient Fall",
  equipment_malfunction: "Equipment Malfunction",
  patient_identification_error: "Patient Identification Error",
  procedure_related_incident: "Procedure-Related Incident",
  near_miss: "Near Miss",
};
