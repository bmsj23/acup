"use server";

import { revalidatePath } from "next/cache";
import {
  createMetricSchema,
  isDateIsoString,
  updateMetricSchema,
} from "@/lib/data/metrics-action-helpers";
import { isValidUuid } from "@/lib/data/auth";
import { internalApiFetch } from "./internal-api";

export async function createMetricAction(input: unknown) {
  const parsed = createMetricSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      status: 400,
      error: "VALIDATION_ERROR",
      details: parsed.error.flatten().fieldErrors,
    };
  }

  const result = await internalApiFetch("/api/metrics", {
    method: "POST",
    body: JSON.stringify(parsed.data),
  });

  if (result.ok) {
    revalidatePath("/dashboard");
    revalidatePath("/documents");
  }

  return result;
}

export async function updateMetricAction(metricId: string, input: unknown) {
  if (!isValidUuid(metricId)) {
    return {
      ok: false,
      status: 400,
      error: "VALIDATION_ERROR",
      details: { metricId: ["Invalid metric id"] },
    };
  }

  const parsed = updateMetricSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      status: 400,
      error: "VALIDATION_ERROR",
      details: parsed.error.flatten().fieldErrors,
    };
  }

  const result = await internalApiFetch(`/api/metrics/${metricId}`, {
    method: "PUT",
    body: JSON.stringify(parsed.data),
  });

  if (result.ok) {
    revalidatePath("/dashboard");
    revalidatePath("/documents");
  }

  return result;
}

export async function deleteMetricAction(metricId: string) {
  if (!isValidUuid(metricId)) {
    return {
      ok: false,
      status: 400,
      error: "VALIDATION_ERROR",
      details: { metricId: ["Invalid metric id"] },
    };
  }

  const result = await internalApiFetch(`/api/metrics/${metricId}`, {
    method: "DELETE",
  });

  if (result.ok) {
    revalidatePath("/dashboard");
    revalidatePath("/documents");
  }

  return result;
}

export async function listMetricsAction(params: {
  page?: number;
  limit?: number;
  department_id?: string;
  subdepartment_id?: string;
  start_date?: string;
  end_date?: string;
}) {
  const query = new URLSearchParams();

  if (params.page) {
    query.set("page", String(params.page));
  }

  if (params.limit) {
    query.set("limit", String(params.limit));
  }

  if (params.department_id && isValidUuid(params.department_id)) {
    query.set("department_id", params.department_id);
  }

  if (params.subdepartment_id && isValidUuid(params.subdepartment_id)) {
    query.set("subdepartment_id", params.subdepartment_id);
  }

  if (params.start_date && isDateIsoString(params.start_date)) {
    query.set("start_date", params.start_date);
  }

  if (params.end_date && isDateIsoString(params.end_date)) {
    query.set("end_date", params.end_date);
  }

  return await internalApiFetch(`/api/metrics?${query.toString()}`, {
    method: "GET",
  });
}
