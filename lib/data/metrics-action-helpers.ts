import { z } from "zod";

export const createMetricSchema = z.object({
  metric_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  department_id: z.string().uuid(),
  subdepartment_id: z.string().uuid().nullable().optional(),
  revenue_total: z.number().min(0),
  pharmacy_revenue_inpatient: z.number().min(0).nullable().optional(),
  pharmacy_revenue_opd: z.number().min(0).nullable().optional(),
  monthly_input_count: z.number().int().min(0),
  census_total: z.number().int().min(0),
  census_opd: z.number().int().min(0),
  census_er: z.number().int().min(0),
  census_walk_in: z.number().int().min(0).nullable().optional(),
  census_inpatient: z.number().int().min(0).nullable().optional(),
  equipment_utilization_pct: z.number().min(0).max(100),
  notes: z.string().trim().max(5000).nullable().optional(),
});

export const updateMetricSchema = createMetricSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  { message: "At least one field must be provided" },
);

export function isDateIsoString(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}
