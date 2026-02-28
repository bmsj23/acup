"use client";

import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import Select from "@/components/ui/select";
import DatePicker from "@/components/ui/date-picker";
import type { DepartmentItem } from "./types";

type AnnouncementCreateFormProps = {
  role: "avp" | "division_head" | "department_head";
  userDepartmentId: string | null;
  userDepartmentName: string | null;
  departments: DepartmentItem[];
  onCreated: () => void;
  onCancel: () => void;
};

export default function AnnouncementCreateForm({
  role,
  userDepartmentId,
  userDepartmentName,
  departments,
  onCreated,
  onCancel,
}: AnnouncementCreateFormProps) {
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [createPriority, setCreatePriority] = useState<"normal" | "urgent" | "critical">("normal");
  const [isSystemWide, setIsSystemWide] = useState(role !== "department_head");
  const [departmentId, setDepartmentId] = useState(
    role === "department_head" ? (userDepartmentId ?? "") : "",
  );
  const [expiresAt, setExpiresAt] = useState("");
  const [memoFile, setMemoFile] = useState<File | null>(null);

  async function handleSubmit() {
    setCreateError(null);

    if (!title.trim() || !content.trim()) {
      setCreateError("Title and content are required.");
      return;
    }

    if (!isSystemWide && !departmentId) {
      setCreateError("Department is required for department-scoped announcements.");
      return;
    }

    if (memoFile && memoFile.type !== "application/pdf") {
      setCreateError("Memo attachment must be a PDF file.");
      return;
    }

    setCreateBusy(true);

    try {
      const payload = new FormData();
      payload.set("title", title.trim());
      payload.set("content", content.trim());
      payload.set("priority", createPriority);
      payload.set("is_system_wide", String(isSystemWide));

      if (!isSystemWide) {
        payload.set("department_id", departmentId);
      }

      if (expiresAt) {
        payload.set("expires_at", new Date(expiresAt).toISOString());
      }

      if (memoFile) {
        payload.set("memo_file", memoFile);
      }

      const response = await fetch("/api/announcements", {
        method: "POST",
        credentials: "include",
        body: payload,
      });

      if (!response.ok) {
        setCreateError("Failed to create announcement.");
        return;
      }

      onCreated();
    } catch {
      setCreateError("Failed to create announcement.");
    } finally {
      setCreateBusy(false);
    }
  }

  return (
    <div className="w-full space-y-6">
      <button
        type="button"
        onClick={onCancel}
        className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600 transition-colors hover:cursor-pointer hover:text-zinc-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Announcements
      </button>

      <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="font-serif text-2xl font-semibold text-zinc-900">Create Announcement</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Publish an operational update with an optional PDF memo attachment.
        </p>

        <div className="mt-6 space-y-5">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-600">
              Title
            </label>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Announcement title"
              className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-blue-800 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-600">
              Content
            </label>
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              rows={6}
              placeholder="Write the announcement details"
              className="w-full resize-none rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-blue-800 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-600">
                Priority
              </label>
              <Select
                value={createPriority}
                onChange={(val) => setCreatePriority(val as "normal" | "urgent" | "critical")}
                options={[
                  { value: "normal", label: "Normal" },
                  { value: "urgent", label: "Urgent" },
                  { value: "critical", label: "Critical" },
                ]}
              />
            </div>

            {role === "department_head" ? (
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-600">
                  Department
                </label>
                <div className="flex items-center rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-700">
                  {userDepartmentName ?? "Your Department"}
                </div>
                <p className="mt-1 text-xs text-zinc-400">
                  Announcements are scoped to your department only.
                </p>
              </div>
            ) : (
              <>
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-600">
                    Scope
                  </label>
                  <Select
                    value={isSystemWide ? "system" : "department"}
                    onChange={(val) => setIsSystemWide(val === "system")}
                    options={[
                      { value: "system", label: "System-wide" },
                      { value: "department", label: "Department-scoped" },
                    ]}
                  />
                </div>

                {!isSystemWide ? (
                  <div>
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-600">
                      Department
                    </label>
                    <Select
                      value={departmentId}
                      onChange={setDepartmentId}
                      placeholder="Select department"
                      options={departments.map((department) => ({
                        value: department.id,
                        label: department.name,
                      }))}
                    />
                  </div>
                ) : null}
              </>
            )}

            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-600">
                Expires On (Optional)
              </label>
              <DatePicker
                value={expiresAt}
                onChange={setExpiresAt}
                placeholder="No expiration"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-600">
              Memo Attachment (PDF, Optional)
            </label>
            <input
              type="file"
              accept="application/pdf"
              onChange={(event) => setMemoFile(event.target.files?.[0] ?? null)}
              className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 file:mr-3 file:rounded-md file:border-0 file:bg-blue-100 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-blue-800 hover:cursor-pointer"
            />
          </div>

          {createError ? (
            <p className="text-sm font-medium text-red-700">{createError}</p>
          ) : null}

          <div className="flex items-center justify-end gap-3 border-t border-zinc-100 pt-5">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:cursor-pointer hover:bg-zinc-100"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={createBusy}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-800 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:cursor-pointer hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {createBusy ? "Publishing..." : "Publish Announcement"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}