import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { MEDICAL_RECORDS_TRANSACTION_CATEGORIES } from "@/lib/constants/departments";

export const transactionCategoryEntrySchema = z.object({
  metric_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  department_id: z.string().uuid(),
  category: z.enum(MEDICAL_RECORDS_TRANSACTION_CATEGORIES as unknown as [string, ...string[]]),
  count: z.number().int().min(0),
});

export const batchTransactionCategoriesSchema = z.object({
  metric_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  department_id: z.string().uuid(),
  entries: z.array(
    z.object({
      category: z.enum(MEDICAL_RECORDS_TRANSACTION_CATEGORIES as unknown as [string, ...string[]]),
      count: z.number().int().min(0),
    }),
  ).min(1),
});

export type TransactionCategoryEntryInput = z.infer<typeof transactionCategoryEntrySchema>;
export type BatchTransactionCategoriesInput = z.infer<typeof batchTransactionCategoriesSchema>;

export async function listTransactionCategories(
  supabase: SupabaseClient,
  params: {
    department_id?: string;
    start_date?: string;
    end_date?: string;
    category?: string;
    from?: number;
    to?: number;
  },
) {
  let query = supabase
    .from("transaction_category_entries")
    .select("*, profiles!created_by(full_name)", { count: "exact" })
    .order("metric_date", { ascending: false })
    .order("category", { ascending: true });

  if (params.department_id) {
    query = query.eq("department_id", params.department_id);
  }

  if (params.start_date) {
    query = query.gte("metric_date", params.start_date);
  }

  if (params.end_date) {
    query = query.lte("metric_date", params.end_date);
  }

  if (params.category) {
    query = query.eq("category", params.category);
  }

  if (params.from !== undefined && params.to !== undefined) {
    query = query.range(params.from, params.to);
  }

  return await query;
}

export async function upsertTransactionCategories(
  supabase: SupabaseClient,
  payload: BatchTransactionCategoriesInput,
  userId: string,
) {
  const rows = payload.entries.map((entry) => ({
    metric_date: payload.metric_date,
    department_id: payload.department_id,
    category: entry.category,
    count: entry.count,
    created_by: userId,
    updated_by: userId,
  }));

  return await supabase
    .from("transaction_category_entries")
    .upsert(rows, { onConflict: "metric_date,department_id,category" })
    .select("*");
}

export async function getTransactionCategoryById(supabase: SupabaseClient, id: string) {
  return await supabase
    .from("transaction_category_entries")
    .select("*")
    .eq("id", id)
    .single();
}

export async function updateTransactionCategoryById(
  supabase: SupabaseClient,
  id: string,
  payload: { count: number },
  userId: string,
) {
  return await supabase
    .from("transaction_category_entries")
    .update({ count: payload.count, updated_by: userId })
    .eq("id", id)
    .select("*")
    .single();
}

export async function deleteTransactionCategoryById(supabase: SupabaseClient, id: string) {
  return await supabase
    .from("transaction_category_entries")
    .delete()
    .eq("id", id)
    .select("id")
    .single();
}

export async function getTransactionSummary(
  supabase: SupabaseClient,
  params: {
    department_id: string;
    start_date: string;
    end_date: string;
  },
) {
  const { data, error } = await supabase
    .from("transaction_category_entries")
    .select("category, count, metric_date")
    .eq("department_id", params.department_id)
    .gte("metric_date", params.start_date)
    .lte("metric_date", params.end_date)
    .order("metric_date", { ascending: true });

  if (error) return { data: null, error };

  // aggregate by category
  const categoryTotals = new Map<string, number>();
  const dailyTotals = new Map<string, number>();

  for (const row of data ?? []) {
    categoryTotals.set(
      row.category,
      (categoryTotals.get(row.category) ?? 0) + row.count,
    );
    dailyTotals.set(
      row.metric_date,
      (dailyTotals.get(row.metric_date) ?? 0) + row.count,
    );
  }

  return {
    data: {
      category_totals: Object.fromEntries(categoryTotals),
      daily_totals: Array.from(dailyTotals.entries()).map(([date, total]) => ({
        date,
        total,
      })),
      grand_total: Array.from(categoryTotals.values()).reduce((s, v) => s + v, 0),
    },
    error: null,
  };
}