import { z } from "zod";
import { MEDICAL_RECORDS_TRANSACTION_CATEGORIES } from "@/lib/constants/departments";
import { METRIC_CATEGORIES, METRIC_PERIOD_TYPES } from "@/lib/constants/metrics";

const metricTransactionEntrySchema = z.object({
  category: z.enum(MEDICAL_RECORDS_TRANSACTION_CATEGORIES as unknown as [string, ...string[]]),
  count: z.number().int().min(0),
});

const revenueMetricSchema = z.object({
  revenue_total: z.number().min(0),
  self_pay_count: z.number().int().min(0),
  hmo_count: z.number().int().min(0),
  guarantee_letter_count: z.number().int().min(0),
  pharmacy_revenue_inpatient: z.number().min(0).nullable().optional(),
  pharmacy_revenue_opd: z.number().min(0).nullable().optional(),
});

const censusMetricSchema = z.object({
  census_total: z.number().int().min(0),
  census_opd: z.number().int().min(0),
  census_er: z.number().int().min(0),
  census_walk_in: z.number().int().min(0).nullable().optional(),
  census_inpatient: z.number().int().min(0).nullable().optional(),
});

const operationsMetricSchema = z.object({
  monthly_input_count: z.number().int().min(0),
  equipment_utilization_pct: z.number().min(0).max(100).optional(),
  medication_error_count: z.number().int().min(0).nullable().optional(),
  notes: z.string().trim().max(5000).nullable().optional(),
  transaction_entries: z.array(metricTransactionEntrySchema).optional(),
});

const baseMetricSchema = z.object({
  category: z.enum(METRIC_CATEGORIES),
  department_id: z.string().uuid(),
  subdepartment_id: z.string().uuid().nullable().optional(),
  revenue: revenueMetricSchema.optional(),
  census: censusMetricSchema.optional(),
  operations: operationsMetricSchema.optional(),
});

function validateMetricCategoryPayload(
  value: {
    category: z.infer<typeof baseMetricSchema>["category"];
    revenue?: Partial<z.infer<typeof revenueMetricSchema>>;
    census?: Partial<z.infer<typeof censusMetricSchema>>;
    operations?: Partial<z.infer<typeof operationsMetricSchema>>;
  },
  ctx: z.RefinementCtx,
) {
  if (value.category === "revenue" && !value.revenue) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Revenue payload is required for the revenue category",
      path: ["revenue"],
    });
  }

  if (value.category === "census" && !value.census) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Census payload is required for the census category",
      path: ["census"],
    });
  }

  if (value.category === "operations" && !value.operations) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Operations payload is required for the operations category",
      path: ["operations"],
    });
  }
}

export const createMetricSchema = z.discriminatedUnion("period_type", [
  baseMetricSchema.extend({
    period_type: z.literal("daily"),
    metric_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }),
  baseMetricSchema.extend({
    period_type: z.literal("monthly"),
    report_month: z.string().regex(/^\d{4}-\d{2}-01$/),
  }),
]).superRefine(validateMetricCategoryPayload);

export const updateMetricSchema = z.object({
  period_type: z.enum(METRIC_PERIOD_TYPES),
  category: z.enum(METRIC_CATEGORIES),
  metric_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  report_month: z.string().regex(/^\d{4}-\d{2}-01$/).optional(),
  department_id: z.string().uuid().optional(),
  subdepartment_id: z.string().uuid().nullable().optional(),
  revenue: revenueMetricSchema.partial().optional(),
  census: censusMetricSchema.partial().optional(),
  operations: operationsMetricSchema.partial().optional(),
}).superRefine((value, ctx) => {
  validateMetricCategoryPayload(value, ctx);

  if (value.period_type === "daily" && value.report_month !== undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "report_month is only valid for monthly metrics",
      path: ["report_month"],
    });
  }

  if (value.period_type === "monthly" && value.metric_date !== undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "metric_date is only valid for daily metrics",
      path: ["metric_date"],
    });
  }
});

export function isDateIsoString(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function isReportMonthIsoString(value: string) {
  return /^\d{4}-\d{2}-01$/.test(value);
}
