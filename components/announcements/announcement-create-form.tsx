"use client";

import { useState } from "react";
import { ArrowLeft, FileText, Globe2, Megaphone } from "lucide-react";
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
  const selectedDepartmentName =
    departments.find((department) => department.id === departmentId)?.name ?? userDepartmentName;
  const audienceNote =
    role === "department_head"
      ? `This post will be published under ${userDepartmentName ?? "your department"} and all signed-in users can read it, including division heads and the Assistant Vice President.`
      : isSystemWide
        ? "All signed-in users will be able to read this announcement."
        : `${selectedDepartmentName ?? "The selected department"} is the publishing department. All signed-in users can still view the post.`;

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
    <div className="relative w-full space-y-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[24rem] rounded-[2.5rem] bg-[linear-gradient(180deg,rgba(239,246,255,0.9),rgba(247,250,252,0.84),rgba(255,255,255,0))]" />

      <button
        type="button"
        onClick={onCancel}
        className="group inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/75 px-4 py-2 text-sm font-medium text-slate-600 shadow-[0_16px_38px_-32px_rgba(15,23,42,0.55)] backdrop-blur-sm transition-all hover:cursor-pointer hover:border-slate-200 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
        Back to announcements
      </button>

      <section className="overflow-hidden rounded-[2rem] border border-blue-100/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(244,248,252,0.96))] shadow-[0_32px_90px_-48px_rgba(30,64,175,0.18)]">
        <div className="grid gap-6 px-6 py-7 md:px-8 xl:grid-cols-[minmax(0,1.2fr)_23rem] xl:items-start">
          <div>
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.32em] text-slate-500">
              Communication desk
            </p>
            <h1 className="mt-3 text-4xl font-semibold leading-tight text-slate-950 [font-family:var(--font-playfair)] md:text-[3.2rem]">
              Create announcement
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-8 text-slate-600">
              Publish a department update or a system-wide announcement, then attach a PDF memo only when the post needs a formal supporting file.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[1.4rem] border border-blue-100/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,250,255,0.94))] p-4 shadow-[0_18px_40px_-34px_rgba(30,64,175,0.14)]">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Scope mode
                </p>
                <p className="mt-2 text-lg font-semibold text-slate-950">
                  {isSystemWide ? "System-wide" : (selectedDepartmentName ?? "Department")}
                </p>
                <p className="mt-1 text-sm text-slate-600">Choose the publishing department or send it to the full system.</p>
              </div>
              <div className="rounded-[1.4rem] border border-blue-100/80 bg-[linear-gradient(180deg,rgba(239,246,255,0.98),rgba(255,255,255,0.92))] p-4 shadow-[0_18px_40px_-34px_rgba(30,64,175,0.12)]">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-blue-700">
                  Priority
                </p>
                <p className="mt-2 text-lg font-semibold capitalize text-slate-950">{createPriority}</p>
                <p className="mt-1 text-sm text-slate-600">Choose the urgency posture before publishing.</p>
              </div>
              <div className="rounded-[1.4rem] border border-blue-100/80 bg-[linear-gradient(180deg,rgba(239,246,255,0.98),rgba(255,255,255,0.92))] p-4 shadow-[0_18px_40px_-34px_rgba(30,64,175,0.12)]">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-blue-700">
                  Memo file
                </p>
                <p className="mt-2 text-lg font-semibold text-slate-950">
                  {memoFile ? "Attached" : "Optional"}
                </p>
                <p className="mt-1 text-sm text-slate-600">Include a PDF only when the briefing needs a formal record.</p>
              </div>
            </div>
          </div>

          <div className="rounded-[1.8rem] border border-blue-100/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(245,249,255,0.95))] p-5 shadow-[0_24px_60px_-40px_rgba(30,64,175,0.16)] backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-50 text-blue-700">
                <Megaphone className="h-5 w-5" />
              </span>
              <div>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-slate-500">
                  Draft guide
                </p>
                <h2 className="mt-1 text-2xl font-semibold text-slate-950 [font-family:var(--font-playfair)]">
                  Keep it clear
                </h2>
              </div>
            </div>

            <div className="mt-5 space-y-3 text-sm leading-7 text-slate-600">
              <p>Start with the operational update, then state who is affected and what action is expected.</p>
              <p>Use `critical` only for time-sensitive or high-importance communications.</p>
              <p>Add a memo when the announcement needs a downloadable formal reference.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-blue-100/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(245,249,255,0.95))] p-6 shadow-[0_28px_70px_-46px_rgba(30,64,175,0.14)]">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_22rem] xl:items-start">
          <div className="space-y-5">
            <div>
              <label className="mb-2 block text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-slate-500">
                Title
              </label>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Briefing title"
                className="w-full rounded-[1.2rem] border border-blue-100 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-slate-500">
                Communication content
              </label>
              <textarea
                value={content}
                onChange={(event) => setContent(event.target.value)}
                rows={10}
                placeholder="Write the announcement details"
                className="w-full resize-none rounded-[1.4rem] border border-blue-100 bg-white px-4 py-3 text-sm leading-7 text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-slate-500">
                Memo attachment
              </label>
              <label className="flex cursor-pointer flex-col gap-3 rounded-[1.5rem] border border-dashed border-blue-200 bg-[linear-gradient(180deg,rgba(239,246,255,0.62),rgba(255,255,255,0.96))] p-5 transition-colors hover:border-blue-300 hover:bg-blue-50/75">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-blue-700 shadow-[0_12px_30px_-24px_rgba(30,64,175,0.24)]">
                    <FileText className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {memoFile ? memoFile.name : "Attach a PDF memo"}
                    </p>
                    <p className="text-sm text-slate-600">
                      Upload a formal supporting document if needed.
                    </p>
                  </div>
                </div>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(event) => setMemoFile(event.target.files?.[0] ?? null)}
                  className="sr-only"
                />
              </label>
            </div>
          </div>

          <aside className="space-y-5">
            <div className="rounded-[1.8rem] border border-blue-100/80 bg-white/90 p-5 shadow-[0_18px_42px_-34px_rgba(30,64,175,0.12)]">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-slate-500">
                Publication settings
              </p>

              <div className="mt-4 space-y-4">
                <div>
                  <label className="mb-2 block text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-slate-500">
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
                    <label className="mb-2 block text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-slate-500">
                      Department
                    </label>
                    <div className="rounded-[1.1rem] border border-blue-100 bg-blue-50/55 px-4 py-3 text-sm font-medium text-slate-700">
                      {userDepartmentName ?? "Your Department"}
                    </div>
                    <p className="mt-2 text-xs leading-6 text-slate-500">
                      {audienceNote}
                    </p>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="mb-2 block text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-slate-500">
                        Scope
                      </label>
                      <Select
                        value={isSystemWide ? "system" : "department"}
                        onChange={(val) => setIsSystemWide(val === "system")}
                        options={[
                          { value: "system", label: "System-wide" },
                          { value: "department", label: "Specific department" },
                        ]}
                      />
                    </div>

                    {!isSystemWide ? (
                      <div>
                        <label className="mb-2 block text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-slate-500">
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
                  <label className="mb-2 block text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-slate-500">
                    Expires on
                  </label>
                  <DatePicker
                    value={expiresAt}
                    onChange={setExpiresAt}
                    placeholder="No expiration"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-[1.8rem] border border-blue-100/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(245,249,255,0.95))] p-5 shadow-[0_18px_42px_-34px_rgba(30,64,175,0.12)]">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-700">
                  <Globe2 className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-slate-500">
                    Audience
                  </p>
                  <p className="mt-1 text-sm leading-7 text-slate-600">
                    {audienceNote}
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>

        {createError ? (
          <div className="mt-6 rounded-[1.3rem] border border-red-100 bg-red-50/70 p-4 shadow-[0_16px_32px_-26px_rgba(220,38,38,0.16)]">
            <p className="text-sm font-medium text-red-700">{createError}</p>
          </div>
        ) : null}

        <div className="mt-6 flex flex-col gap-3 border-t border-blue-100/80 pt-5 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-blue-100 bg-white px-5 py-3 text-sm font-medium text-blue-800 transition-colors hover:cursor-pointer hover:bg-blue-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={createBusy}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-blue-800 px-5 py-3 text-sm font-semibold text-white shadow-[0_22px_40px_-28px_rgba(30,64,175,0.42)] transition-colors hover:cursor-pointer hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {createBusy ? "Publishing..." : "Publish announcement"}
          </button>
        </div>
      </section>
    </div>
  );
}
