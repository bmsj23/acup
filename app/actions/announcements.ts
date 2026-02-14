"use server";

import { revalidatePath } from "next/cache";
import {
  createAnnouncementSchema,
  updateAnnouncementSchema,
} from "@/lib/data/announcements";
import { isValidUuid } from "@/lib/data/auth";
import { internalApiFetch } from "./internal-api";

export async function createAnnouncementAction(input: unknown) {
  const parsed = createAnnouncementSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      status: 400,
      error: "VALIDATION_ERROR",
      details: parsed.error.flatten().fieldErrors,
    };
  }

  const result = await internalApiFetch("/api/announcements", {
    method: "POST",
    body: JSON.stringify(parsed.data),
  });

  if (result.ok) {
    revalidatePath("/dashboard");
  }

  return result;
}

export async function updateAnnouncementAction(
  announcementId: string,
  input: unknown,
) {
  if (!isValidUuid(announcementId)) {
    return {
      ok: false,
      status: 400,
      error: "VALIDATION_ERROR",
      details: { announcementId: ["Invalid announcement id"] },
    };
  }

  const parsed = updateAnnouncementSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      status: 400,
      error: "VALIDATION_ERROR",
      details: parsed.error.flatten().fieldErrors,
    };
  }

  const result = await internalApiFetch(`/api/announcements/${announcementId}`, {
    method: "PUT",
    body: JSON.stringify(parsed.data),
  });

  if (result.ok) {
    revalidatePath("/dashboard");
  }

  return result;
}

export async function deleteAnnouncementAction(announcementId: string) {
  if (!isValidUuid(announcementId)) {
    return {
      ok: false,
      status: 400,
      error: "VALIDATION_ERROR",
      details: { announcementId: ["Invalid announcement id"] },
    };
  }

  const result = await internalApiFetch(`/api/announcements/${announcementId}`, {
    method: "DELETE",
  });

  if (result.ok) {
    revalidatePath("/dashboard");
  }

  return result;
}