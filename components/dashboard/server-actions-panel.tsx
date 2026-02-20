"use client";

import { useState, useTransition } from "react";
import { createDocumentAction } from "@/app/actions/documents";
import {
  createAnnouncementAction,
  deleteAnnouncementAction,
} from "@/app/actions/announcements";

type ActionResult = {
  ok: boolean;
  status: number;
  data?: unknown;
  error?: string;
};

export default function ServerActionsPanel() {
  const [pending, startTransition] = useTransition();

  const [departmentId, setDepartmentId] = useState("");
  const [title, setTitle] = useState("");
  const [announcementId, setAnnouncementId] = useState("");
  const [result, setResult] = useState<ActionResult | null>(null);

  function createDocument() {
    startTransition(async () => {
      const response = (await createDocumentAction({
        title: title || "Dashboard test document",
        description: "Created via server action",
        department_id: departmentId,
        storage_path: `manual/${crypto.randomUUID()}.pdf`,
        file_name: "manual-test.pdf",
        file_size_bytes: 1024,
        mime_type: "application/pdf",
        checksum: crypto.randomUUID().replaceAll("-", ""),
      })) as ActionResult;

      setResult(response);
    });
  }

  function createAnnouncement() {
    startTransition(async () => {
      const response = (await createAnnouncementAction({
        title: title || "Dashboard test announcement",
        content: "Created via server action",
        priority: "normal",
        department_id: departmentId,
        is_system_wide: false,
        expires_at: null,
      })) as ActionResult;

      setResult(response);
    });
  }

  function deleteAnnouncement() {
    startTransition(async () => {
      const response = (await deleteAnnouncementAction(
        announcementId,
      )) as ActionResult;
      setResult(response);
    });
  }

  return (
    <div className="mt-8 rounded-lg border border-zinc-200 dark:border-zinc-800 p-5">
      <h2 className="text-xl font-semibold mb-3">Server Actions Smoke Panel</h2>
      <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
        Uses Server Actions wrappers over internal API routes for secure
        mutations.
      </p>

      <div className="grid gap-3 md:grid-cols-2">
        <input
          value={departmentId}
          onChange={(event) => setDepartmentId(event.target.value)}
          className="rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm"
          placeholder="department uuid"
        />
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm"
          placeholder="title"
        />
        <input
          value={announcementId}
          onChange={(event) => setAnnouncementId(event.target.value)}
          className="rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm md:col-span-2"
          placeholder="announcement uuid to delete"
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={createDocument}
          disabled={pending || !departmentId}
          className="rounded-md bg-[var(--deep-royal)] px-3 py-2 text-sm text-white hover:bg-[var(--deep-royal)] hover:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Create Document
        </button>
        <button
          type="button"
          onClick={createAnnouncement}
          disabled={pending || !departmentId}
          className="rounded-md bg-[var(--deep-royal)] px-3 py-2 text-sm text-white hover:bg-[var(--deep-royal)] hover:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Create Announcement
        </button>
        <button
          type="button"
          onClick={deleteAnnouncement}
          disabled={pending || !announcementId}
          className="rounded-md bg-red-600 px-3 py-2 text-sm text-white hover:bg-red-700 hover:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Delete Announcement
        </button>
      </div>

      <pre className="mt-4 rounded-md bg-zinc-100 dark:bg-zinc-900 p-3 text-xs overflow-auto">
        {JSON.stringify(result, null, 2)}
      </pre>
    </div>
  );
}