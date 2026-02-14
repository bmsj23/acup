"use server";

import { revalidatePath } from "next/cache";
import { createDocumentSchema } from "@/lib/data/documents";
import { isValidUuid } from "@/lib/data/auth";
import { internalApiFetch } from "./internal-api";

export async function createDocumentAction(input: unknown) {
  const parsed = createDocumentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      status: 400,
      error: "VALIDATION_ERROR",
      details: parsed.error.flatten().fieldErrors,
    };
  }

  const result = await internalApiFetch("/api/documents", {
    method: "POST",
    body: JSON.stringify(parsed.data),
  });

  if (result.ok) {
    revalidatePath("/dashboard");
  }

  return result;
}

export async function softDeleteDocumentAction(documentId: string) {
  if (!isValidUuid(documentId)) {
    return {
      ok: false,
      status: 400,
      error: "VALIDATION_ERROR",
      details: { documentId: ["Invalid document id"] },
    };
  }

  const result = await internalApiFetch(`/api/documents/${documentId}`, {
    method: "DELETE",
  });

  if (result.ok) {
    revalidatePath("/dashboard");
  }

  return result;
}