import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { buildTrailingMonths, percentageFromRatio } from "@/lib/data/monitoring";
import { TRAINING_MAX_FILE_SIZE_BYTES } from "@/lib/constants/training";
import type {
  MonitoringDepartment,
  TrainingComplianceItem,
  TrainingModuleItem,
  TrainingSummaryResponse,
} from "@/types/monitoring";

const reportMonthRegex = /^\d{4}-\d{2}-01$/;

const trainingModuleBaseSchema = z
  .object({
    title: z.string().trim().min(1).max(255),
    description: z.string().trim().min(1).max(5000),
    department_id: z.string().uuid().nullable().optional(),
    is_system_wide: z.boolean(),
    material_file_name: z.string().trim().min(1).max(255),
    material_storage_path: z.string().trim().min(1).max(1024),
    material_mime_type: z.string().trim().min(1).max(255),
    material_size_bytes: z.number().int().positive().max(TRAINING_MAX_FILE_SIZE_BYTES),
    qr_token: z.string().trim().min(12).max(255),
    published_at: z.string().datetime().nullable().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.is_system_wide && value.department_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "System-wide modules cannot be scoped to a department",
        path: ["department_id"],
      });
    }

    if (!value.is_system_wide && !value.department_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Department-scoped modules require a department",
        path: ["department_id"],
      });
    }
  });

export const createTrainingModuleSchema = trainingModuleBaseSchema;

export const updateTrainingModuleSchema = z
  .object({
    title: z.string().trim().min(1).max(255).optional(),
    description: z.string().trim().min(1).max(5000).optional(),
    department_id: z.string().uuid().nullable().optional(),
    is_system_wide: z.boolean().optional(),
    published_at: z.string().datetime().nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided",
  })
  .superRefine((value, ctx) => {
    if (value.is_system_wide === true && value.department_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "System-wide modules cannot be scoped to a department",
        path: ["department_id"],
      });
    }

    if (value.is_system_wide === false && value.department_id === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Department-scoped modules require a department",
        path: ["department_id"],
      });
    }
  });

const trainingComplianceBaseSchema = z.object({
  report_month: z.string().regex(reportMonthRegex),
  training_module_id: z.string().uuid(),
  department_id: z.string().uuid(),
  assigned_staff_count: z.number().int().min(0),
  completed_staff_count: z.number().int().min(0),
});

function validateTrainingComplianceCounts(
  value: {
    assigned_staff_count?: number;
    completed_staff_count?: number;
  },
  ctx: z.RefinementCtx,
) {
  if (
    value.assigned_staff_count !== undefined
    && value.completed_staff_count !== undefined
    && value.completed_staff_count > value.assigned_staff_count
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "completed_staff_count cannot exceed assigned_staff_count",
      path: ["completed_staff_count"],
    });
  }
}

export const createTrainingComplianceSchema = trainingComplianceBaseSchema.superRefine(
  validateTrainingComplianceCounts,
);

export const updateTrainingComplianceSchema = trainingComplianceBaseSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided",
  })
  .superRefine(validateTrainingComplianceCounts);

export type CreateTrainingModuleInput = z.infer<typeof createTrainingModuleSchema>;
export type UpdateTrainingModuleInput = z.infer<typeof updateTrainingModuleSchema>;
export type CreateTrainingComplianceInput = z.infer<typeof createTrainingComplianceSchema>;
export type UpdateTrainingComplianceInput = z.infer<typeof updateTrainingComplianceSchema>;

const trainingModuleSelect = [
  "id",
  "title",
  "description",
  "department_id",
  "is_system_wide",
  "material_file_name",
  "material_storage_path",
  "material_mime_type",
  "material_size_bytes",
  "qr_token",
  "published_at",
  "created_by",
  "created_at",
  "updated_at",
  "departments!department_id(name, code)",
  "profiles!created_by(full_name, role)",
].join(", ");

const trainingComplianceSelect = [
  "id",
  "report_month",
  "training_module_id",
  "department_id",
  "assigned_staff_count",
  "completed_staff_count",
  "updated_by",
  "created_at",
  "updated_at",
  "departments!department_id(name, code)",
].join(", ");

function normalizeTrainingModuleRow(row: Record<string, unknown>): TrainingModuleItem {
  const departments = row.departments as { name?: string; code?: string } | null;
  const profiles = row.profiles as { full_name?: string; role?: string } | null;

  return {
    id: row.id as string,
    title: row.title as string,
    description: row.description as string,
    department_id: (row.department_id as string | null) ?? null,
    is_system_wide: Boolean(row.is_system_wide),
    material_file_name: row.material_file_name as string,
    material_storage_path: row.material_storage_path as string,
    material_mime_type: row.material_mime_type as string,
    material_size_bytes: Number(row.material_size_bytes ?? 0),
    qr_token: row.qr_token as string,
    published_at: (row.published_at as string | null) ?? null,
    created_by: row.created_by as string,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    departments: departments
      ? {
          name: departments.name ?? "Unknown Department",
          code: departments.code ?? "",
        }
      : null,
    profiles: profiles
      ? {
          full_name: profiles.full_name ?? "Unknown User",
          role: profiles.role ?? "",
        }
      : null,
  };
}

function normalizeTrainingComplianceRow(row: Record<string, unknown>): TrainingComplianceItem {
  const departments = row.departments as { name?: string; code?: string } | null;

  return {
    id: row.id as string,
    report_month: row.report_month as string,
    training_module_id: row.training_module_id as string,
    department_id: row.department_id as string,
    assigned_staff_count: Number(row.assigned_staff_count ?? 0),
    completed_staff_count: Number(row.completed_staff_count ?? 0),
    updated_by: row.updated_by as string,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    departments: departments
      ? {
          name: departments.name ?? "Unknown Department",
          code: departments.code ?? "",
        }
      : null,
  };
}

function calculateCompletionRate(assignedStaffCount: number, completedStaffCount: number) {
  return percentageFromRatio(completedStaffCount, assignedStaffCount);
}

export async function listTrainingModules(
  supabase: SupabaseClient,
  params: {
    from: number;
    to: number;
    department_id?: string | null;
    search?: string | null;
  },
) {
  let query = supabase
    .from("training_modules")
    .select(trainingModuleSelect, { count: "exact" })
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .range(params.from, params.to);

  if (params.department_id) {
    query = query.or(`is_system_wide.eq.true,department_id.eq.${params.department_id}`);
  }

  if (params.search) {
    query = query.or(`title.ilike.%${params.search}%,description.ilike.%${params.search}%`);
  }

  return await query;
}

export async function createTrainingModule(
  supabase: SupabaseClient,
  payload: CreateTrainingModuleInput,
  userId: string,
) {
  return await supabase
    .from("training_modules")
    .insert({
      title: payload.title,
      description: payload.description,
      department_id: payload.is_system_wide ? null : payload.department_id ?? null,
      is_system_wide: payload.is_system_wide,
      material_file_name: payload.material_file_name,
      material_storage_path: payload.material_storage_path,
      material_mime_type: payload.material_mime_type,
      material_size_bytes: payload.material_size_bytes,
      qr_token: payload.qr_token,
      published_at: payload.published_at ?? null,
      created_by: userId,
    })
    .select(trainingModuleSelect)
    .single();
}

export async function getTrainingModuleById(
  supabase: SupabaseClient,
  id: string,
) {
  return await supabase
    .from("training_modules")
    .select(trainingModuleSelect)
    .eq("id", id)
    .single();
}

export async function getTrainingModuleByQrToken(
  supabase: SupabaseClient,
  qrToken: string,
) {
  return await supabase
    .from("training_modules")
    .select(trainingModuleSelect)
    .eq("qr_token", qrToken)
    .maybeSingle();
}

export async function updateTrainingModuleById(
  supabase: SupabaseClient,
  id: string,
  payload: UpdateTrainingModuleInput,
) {
  return await supabase
    .from("training_modules")
    .update({
      ...(payload.title !== undefined ? { title: payload.title } : {}),
      ...(payload.description !== undefined ? { description: payload.description } : {}),
      ...(payload.is_system_wide !== undefined ? { is_system_wide: payload.is_system_wide } : {}),
      ...(payload.department_id !== undefined ? { department_id: payload.department_id } : {}),
      ...(payload.published_at !== undefined ? { published_at: payload.published_at } : {}),
    })
    .eq("id", id)
    .select(trainingModuleSelect)
    .single();
}

export async function deleteTrainingModuleById(
  supabase: SupabaseClient,
  id: string,
) {
  return await supabase
    .from("training_modules")
    .delete()
    .eq("id", id)
    .select("id")
    .single();
}

export async function listTrainingCompliance(
  supabase: SupabaseClient,
  params: {
    from: number;
    to: number;
    department_id?: string | null;
    training_module_id?: string | null;
    report_month?: string | null;
  },
) {
  let query = supabase
    .from("training_compliance_monthly")
    .select(trainingComplianceSelect, { count: "exact" })
    .order("report_month", { ascending: false })
    .range(params.from, params.to);

  if (params.department_id) {
    query = query.eq("department_id", params.department_id);
  }

  if (params.training_module_id) {
    query = query.eq("training_module_id", params.training_module_id);
  }

  if (params.report_month) {
    query = query.eq("report_month", params.report_month);
  }

  return await query;
}

export async function createTrainingCompliance(
  supabase: SupabaseClient,
  payload: CreateTrainingComplianceInput,
  userId: string,
) {
  return await supabase
    .from("training_compliance_monthly")
    .insert({
      report_month: payload.report_month,
      training_module_id: payload.training_module_id,
      department_id: payload.department_id,
      assigned_staff_count: payload.assigned_staff_count,
      completed_staff_count: payload.completed_staff_count,
      updated_by: userId,
    })
    .select(trainingComplianceSelect)
    .single();
}

export async function getTrainingComplianceById(
  supabase: SupabaseClient,
  id: string,
) {
  return await supabase
    .from("training_compliance_monthly")
    .select(trainingComplianceSelect)
    .eq("id", id)
    .single();
}

export async function updateTrainingComplianceById(
  supabase: SupabaseClient,
  id: string,
  payload: UpdateTrainingComplianceInput,
  userId: string,
) {
  return await supabase
    .from("training_compliance_monthly")
    .update({
      ...(payload.report_month !== undefined ? { report_month: payload.report_month } : {}),
      ...(payload.training_module_id !== undefined
        ? { training_module_id: payload.training_module_id }
        : {}),
      ...(payload.department_id !== undefined ? { department_id: payload.department_id } : {}),
      ...(payload.assigned_staff_count !== undefined
        ? { assigned_staff_count: payload.assigned_staff_count }
        : {}),
      ...(payload.completed_staff_count !== undefined
        ? { completed_staff_count: payload.completed_staff_count }
        : {}),
      updated_by: userId,
    })
    .eq("id", id)
    .select(trainingComplianceSelect)
    .single();
}

export async function deleteTrainingComplianceById(
  supabase: SupabaseClient,
  id: string,
) {
  return await supabase
    .from("training_compliance_monthly")
    .delete()
    .eq("id", id)
    .select("id")
    .single();
}

export async function buildTrainingSummary(
  supabase: SupabaseClient,
  params: {
    month: string;
    reportMonth: string;
    prevReportMonth: string;
    departmentId?: string | null;
    availableDepartments: MonitoringDepartment[];
  },
): Promise<Omit<TrainingSummaryResponse, "filters" | "role_scope">> {
  const trailingMonths = buildTrailingMonths(params.month, 6);
  const trailingReportMonths = trailingMonths.map((item) => item.report_month);

  let modulesQuery = supabase
    .from("training_modules")
    .select(trainingModuleSelect)
    .not("published_at", "is", null)
    .order("published_at", { ascending: false, nullsFirst: false });

  if (params.departmentId) {
    modulesQuery = modulesQuery.or(`is_system_wide.eq.true,department_id.eq.${params.departmentId}`);
  }

  let currentComplianceQuery = supabase
    .from("training_compliance_monthly")
    .select(trainingComplianceSelect)
    .eq("report_month", params.reportMonth);

  let previousComplianceQuery = supabase
    .from("training_compliance_monthly")
    .select(trainingComplianceSelect)
    .eq("report_month", params.prevReportMonth);

  let trendComplianceQuery = supabase
    .from("training_compliance_monthly")
    .select(trainingComplianceSelect)
    .in("report_month", trailingReportMonths);

  if (params.departmentId) {
    currentComplianceQuery = currentComplianceQuery.eq("department_id", params.departmentId);
    previousComplianceQuery = previousComplianceQuery.eq("department_id", params.departmentId);
    trendComplianceQuery = trendComplianceQuery.eq("department_id", params.departmentId);
  }

  const [modulesResult, currentComplianceResult, previousComplianceResult, trendComplianceResult] =
    await Promise.all([
      modulesQuery,
      currentComplianceQuery,
      previousComplianceQuery,
      trendComplianceQuery,
    ]);

  const error =
    modulesResult.error
    ?? currentComplianceResult.error
    ?? previousComplianceResult.error
    ?? trendComplianceResult.error;
  if (error) {
    throw error;
  }

  const modules = ((modulesResult.data ?? []) as unknown as Record<string, unknown>[]).map(
    normalizeTrainingModuleRow,
  );
  const visibleModuleMap = new Map(modules.map((module) => [module.id, module]));

  const currentCompliance = ((currentComplianceResult.data ?? []) as unknown as Record<string, unknown>[])
    .map(normalizeTrainingComplianceRow)
    .filter((row) => visibleModuleMap.has(row.training_module_id));
  const previousCompliance = ((previousComplianceResult.data ?? []) as unknown as Record<string, unknown>[])
    .map(normalizeTrainingComplianceRow)
    .filter((row) => visibleModuleMap.has(row.training_module_id));
  const trendCompliance = ((trendComplianceResult.data ?? []) as unknown as Record<string, unknown>[])
    .map(normalizeTrainingComplianceRow)
    .filter((row) => visibleModuleMap.has(row.training_module_id));

  const totals = currentCompliance.reduce(
    (accumulator, row) => {
      accumulator.assigned_staff_count += row.assigned_staff_count;
      accumulator.completed_staff_count += row.completed_staff_count;
      return accumulator;
    },
    { assigned_staff_count: 0, completed_staff_count: 0 },
  );

  const previousTotals = previousCompliance.reduce(
    (accumulator, row) => {
      accumulator.assigned_staff_count += row.assigned_staff_count;
      accumulator.completed_staff_count += row.completed_staff_count;
      return accumulator;
    },
    { assigned_staff_count: 0, completed_staff_count: 0 },
  );

  const moduleCompliance = modules
    .map((module) => {
      const matchingCompliance = currentCompliance.filter(
        (row) => row.training_module_id === module.id,
      );
      const assignedStaffCount = matchingCompliance.reduce(
        (sum, row) => sum + row.assigned_staff_count,
        0,
      );
      const completedStaffCount = matchingCompliance.reduce(
        (sum, row) => sum + row.completed_staff_count,
        0,
      );

      return {
        training_module_id: module.id,
        title: module.title,
        is_system_wide: module.is_system_wide,
        department_name: module.departments?.name ?? null,
        assigned_staff_count: assignedStaffCount,
        completed_staff_count: completedStaffCount,
        completion_rate: calculateCompletionRate(
          assignedStaffCount,
          completedStaffCount,
        ),
        published_at: module.published_at,
        qr_token: module.qr_token,
        material_mime_type: module.material_mime_type,
      };
    })
    .sort((left, right) => left.title.localeCompare(right.title));

  const departmentAccumulator = new Map<
    string,
    {
      department_id: string;
      department_name: string;
      assigned_staff_count: number;
      completed_staff_count: number;
      completion_rate: number;
    }
  >();

  for (const row of currentCompliance) {
    const current =
      departmentAccumulator.get(row.department_id)
      ?? {
        department_id: row.department_id,
        department_name:
          row.departments?.name
          ?? params.availableDepartments.find((department) => department.id === row.department_id)?.name
          ?? "Unknown Department",
        assigned_staff_count: 0,
        completed_staff_count: 0,
        completion_rate: 0,
      };

    current.assigned_staff_count += row.assigned_staff_count;
    current.completed_staff_count += row.completed_staff_count;
    current.completion_rate = calculateCompletionRate(
      current.assigned_staff_count,
      current.completed_staff_count,
    );

    departmentAccumulator.set(row.department_id, current);
  }

  const trend = trailingMonths.map((monthItem) => {
    const monthlyRows = trendCompliance.filter((row) => row.report_month === monthItem.report_month);
    const assignedStaffCount = monthlyRows.reduce(
      (sum, row) => sum + row.assigned_staff_count,
      0,
    );
    const completedStaffCount = monthlyRows.reduce(
      (sum, row) => sum + row.completed_staff_count,
      0,
    );

    return {
      month: monthItem.month,
      assigned_staff_count: assignedStaffCount,
      completed_staff_count: completedStaffCount,
      completion_rate: calculateCompletionRate(
        assignedStaffCount,
        completedStaffCount,
      ),
    };
  });

  return {
    totals: {
      published_module_count: modules.length,
      assigned_staff_count: totals.assigned_staff_count,
      completed_staff_count: totals.completed_staff_count,
      pending_staff_count: totals.assigned_staff_count - totals.completed_staff_count,
      completion_rate: calculateCompletionRate(
        totals.assigned_staff_count,
        totals.completed_staff_count,
      ),
    },
    previous_totals: {
      assigned_staff_count: previousTotals.assigned_staff_count,
      completed_staff_count: previousTotals.completed_staff_count,
      completion_rate: calculateCompletionRate(
        previousTotals.assigned_staff_count,
        previousTotals.completed_staff_count,
      ),
    },
    module_compliance: moduleCompliance,
    department_compliance: Array.from(departmentAccumulator.values()).sort(
      (left, right) => right.completion_rate - left.completion_rate,
    ),
    trend,
  };
}
