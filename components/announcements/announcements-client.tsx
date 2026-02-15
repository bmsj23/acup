"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bell,
  CalendarDays,
  Megaphone,
  Paperclip,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import Modal from "@/components/ui/modal";

type DepartmentItem = {
  id: string;
  name: string;
};

type AnnouncementItem = {
  id: string;
  title: string;
  priority: "normal" | "urgent" | "critical";
  is_system_wide: boolean;
  created_at: string;
  memo_file_name: string | null;
  memo_mime_type: string | null;
  memo_file_size_bytes: number | null;
};

type AnnouncementDetail = AnnouncementItem & {
  content: string;
  expires_at: string | null;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
};

type AnnouncementsResponse = {
  data: AnnouncementItem[];
  pagination: Pagination;
};

function getPriorityBadge(priority: AnnouncementItem["priority"]) {
  if (priority === "critical") {
    return "bg-red-100 text-red-700";
  }

  if (priority === "urgent") {
    return "bg-amber-100 text-amber-700";
  }

  return "bg-zinc-200 text-zinc-700";
}

export default function AnnouncementsClient() {
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 8,
    total: 0,
    total_pages: 1,
  });
  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState("all");
  const [scope, setScope] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [createPriority, setCreatePriority] = useState<"normal" | "urgent" | "critical">("normal");
  const [isSystemWide, setIsSystemWide] = useState(true);
  const [departmentId, setDepartmentId] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [memoFile, setMemoFile] = useState<File | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] =
    useState<AnnouncementDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set("page", String(pagination.page));
    params.set("limit", String(pagination.limit));

    if (search.trim()) {
      params.set("search", search.trim());
    }

    if (priority !== "all") {
      params.set("priority", priority);
    }

    if (scope === "system") {
      params.set("is_system_wide", "true");
    } else if (scope === "department") {
      params.set("is_system_wide", "false");
    }

    return params.toString();
  }, [pagination.page, pagination.limit, priority, scope, search]);

  const cacheKey = useMemo(
    () => `acup-announcements-cache:${queryString}`,
    [queryString],
  );

  const loadAnnouncements = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached) as AnnouncementsResponse;
        setAnnouncements(parsed.data ?? []);
        setPagination(parsed.pagination);
      }

      const response = await fetch(`/api/announcements?${queryString}`, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        setError("Failed to load announcements.");
        setAnnouncements([]);
        return;
      }

      const payload = (await response.json()) as AnnouncementsResponse;
      setAnnouncements(payload.data ?? []);
      setPagination(payload.pagination);
      sessionStorage.setItem(cacheKey, JSON.stringify(payload));
    } catch {
      setError("Failed to load announcements.");
      setAnnouncements([]);
    } finally {
      setLoading(false);
    }
  }, [cacheKey, queryString]);

  useEffect(() => {
    void loadAnnouncements();
  }, [loadAnnouncements]);

  useEffect(() => {
    async function loadDepartments() {
      try {
        const response = await fetch("/api/departments?limit=200", {
          method: "GET",
          credentials: "include",
        });

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as { data?: DepartmentItem[] };
        setDepartments(payload.data ?? []);
      } catch {
        setDepartments([]);
      }
    }

    void loadDepartments();
  }, []);

  async function handleCreateAnnouncement() {
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

      setTitle("");
      setContent("");
      setCreatePriority("normal");
      setIsSystemWide(true);
      setDepartmentId("");
      setExpiresAt("");
      setMemoFile(null);
      setIsCreateModalOpen(false);
      await loadAnnouncements();
    } catch {
      setCreateError("Failed to create announcement.");
    } finally {
      setCreateBusy(false);
    }
  }

  async function handleOpenAnnouncement(id: string) {
    setLoadingDetail(true);
    try {
      const response = await fetch(`/api/announcements/${id}`, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        setError("Failed to load announcement details.");
        return;
      }

      const payload = (await response.json()) as { data?: AnnouncementDetail };
      setSelectedAnnouncement(payload.data ?? null);
    } catch {
      setError("Failed to load announcement details.");
    } finally {
      setLoadingDetail(false);
    }
  }

  const totalSystemWide = announcements.filter((item) => item.is_system_wide).length;
  const totalWithMemo = announcements.filter((item) => item.memo_file_name).length;

  async function handleDelete(id: string) {
    const confirmed = window.confirm("Delete this announcement?");
    if (!confirmed) {
      return;
    }

    setActionBusyId(id);
    setError(null);

    try {
      const response = await fetch(`/api/announcements/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        setError("Delete failed. You may not have access for this action.");
        return;
      }

      await loadAnnouncements();
    } catch {
      setError("Delete failed. Try again.");
    } finally {
      setActionBusyId(null);
    }
  }

  return (
    <div className="w-full space-y-6">
      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-serif text-2xl font-semibold text-zinc-900">Announcements Center</h2>
            <p className="mt-1 text-sm text-zinc-600">Publish operational updates with clear priority and scope.</p>
          </div>
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 hover:cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Create Announcement
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-blue-100 bg-blue-50/70 px-3 py-2">
            <p className="text-[11px] font-medium uppercase tracking-wide text-blue-600">Visible updates</p>
            <p className="mt-1 text-lg font-semibold text-zinc-900">{pagination.total}</p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
            <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">System-wide</p>
            <p className="mt-1 text-lg font-semibold text-zinc-900">{totalSystemWide}</p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
            <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">With memo</p>
            <p className="mt-1 text-lg font-semibold text-zinc-900">{totalWithMemo}</p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
          <div className="w-full lg:max-w-sm">
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-600">
              Search
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
              <input
                value={search}
                onChange={(event) => {
                  setPagination((previous) => ({ ...previous, page: 1 }));
                  setSearch(event.target.value);
                }}
                placeholder="Search title or content"
                className="w-full rounded-md border border-zinc-300 bg-white py-2 pl-9 pr-3 text-sm text-zinc-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-600">
              Priority
            </label>
            <select
              value={priority}
              onChange={(event) => {
                setPagination((previous) => ({ ...previous, page: 1 }));
                setPriority(event.target.value);
              }}
              className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 hover:cursor-pointer"
            >
              <option value="all">All</option>
              <option value="normal">Normal</option>
              <option value="urgent">Urgent</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-600">
              Scope
            </label>
            <select
              value={scope}
              onChange={(event) => {
                setPagination((previous) => ({ ...previous, page: 1 }));
                setScope(event.target.value);
              }}
              className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 hover:cursor-pointer"
            >
              <option value="all">All</option>
              <option value="system">System-wide</option>
              <option value="department">Department-scoped</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => void loadAnnouncements()}
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 hover:cursor-pointer"
          >
            <Bell className="h-4 w-4" /> Refresh
          </button>
        </div>
      </section>

      {error ? (
        <section className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-700">{error}</p>
        </section>
      ) : null}

      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="font-serif text-xl font-semibold text-zinc-900">Latest Updates</h2>
        <div className="mt-4 space-y-3">
          {loading ? (
            <p className="text-sm text-zinc-600">Loading announcements...</p>
          ) : announcements.length > 0 ? (
            announcements.map((item) => (
              <article key={item.id} className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-4 transition-colors hover:border-blue-200 hover:bg-blue-50/40">
                <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <button
                      type="button"
                      onClick={() => void handleOpenAnnouncement(item.id)}
                      className="text-left text-sm font-semibold text-zinc-900 transition-colors hover:text-blue-700 hover:cursor-pointer"
                    >
                      {item.title}
                    </button>
                    <p className="mt-1 text-xs text-zinc-500">
                      {new Date(item.created_at).toLocaleString()}
                    </p>
                    {item.memo_file_name ? (
                      <p className="mt-1 inline-flex items-center gap-1 text-xs text-blue-700">
                        <Paperclip className="h-3.5 w-3.5" />
                        Memo attached: {item.memo_file_name}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs uppercase tracking-wide ${getPriorityBadge(item.priority)}`}
                    >
                      {item.priority}
                    </span>
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                      {item.is_system_wide ? "System-wide" : "Department"}
                    </span>
                    <button
                      type="button"
                      onClick={() => void handleDelete(item.id)}
                      disabled={actionBusyId === item.id}
                      className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-white px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50 hover:cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {actionBusyId === item.id ? "Deleting" : "Delete"}
                    </button>
                  </div>
                </div>
              </article>
            ))
          ) : (
            <p className="text-sm text-zinc-600">No announcements found.</p>
          )}
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-zinc-100 pt-4">
          <p className="text-xs text-zinc-600">
            Page {pagination.page} of {pagination.total_pages} ({pagination.total} total)
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setPagination((previous) => ({
                  ...previous,
                  page: Math.max(1, previous.page - 1),
                }))
              }
              disabled={pagination.page <= 1 || loading}
              className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 hover:cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() =>
                setPagination((previous) => ({
                  ...previous,
                  page: Math.min(previous.total_pages, previous.page + 1),
                }))
              }
              disabled={pagination.page >= pagination.total_pages || loading}
              className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 hover:cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
            >
              Next
            </button>
          </div>
        </div>
      </section>

      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Announcement"
      >
        <div className="space-y-4">
          <p className="text-sm text-zinc-600">Publish updates with an optional PDF memo attachment.</p>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-600">Title</label>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Announcement title"
                className="w-full rounded-md border border-blue-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-600">Content</label>
              <textarea
                value={content}
                onChange={(event) => setContent(event.target.value)}
                rows={4}
                placeholder="Write the announcement details"
                className="w-full rounded-md border border-blue-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-600">Priority</label>
              <select
                value={createPriority}
                onChange={(event) =>
                  setCreatePriority(
                    event.target.value as "normal" | "urgent" | "critical",
                  )
                }
                className="w-full rounded-md border border-blue-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 hover:cursor-pointer"
              >
                <option value="normal">Normal</option>
                <option value="urgent">Urgent</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-600">Scope</label>
              <select
                value={isSystemWide ? "system" : "department"}
                onChange={(event) => setIsSystemWide(event.target.value === "system")}
                className="w-full rounded-md border border-blue-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 hover:cursor-pointer"
              >
                <option value="system">System-wide</option>
                <option value="department">Department-scoped</option>
              </select>
            </div>

            {!isSystemWide ? (
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-600">Department</label>
                <select
                  value={departmentId}
                  onChange={(event) => setDepartmentId(event.target.value)}
                  className="w-full rounded-md border border-blue-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 hover:cursor-pointer"
                >
                  <option value="">Select department</option>
                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-600">Expires At (Optional)</label>
              <input
                type="datetime-local"
                value={expiresAt}
                onChange={(event) => setExpiresAt(event.target.value)}
                className="w-full rounded-md border border-blue-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 hover:cursor-pointer"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-600">Memo Attachment (PDF, Optional)</label>
              <input
                type="file"
                accept="application/pdf"
                onChange={(event) => setMemoFile(event.target.files?.[0] ?? null)}
                className="w-full rounded-md border border-blue-200 bg-white px-3 py-2 text-sm text-zinc-900 file:mr-3 file:rounded-md file:border-0 file:bg-blue-100 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-blue-700 hover:cursor-pointer"
              />
            </div>
          </div>

          {createError ? <p className="text-sm font-medium text-red-700">{createError}</p> : null}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 hover:cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleCreateAnnouncement()}
              disabled={createBusy}
              className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 hover:cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
            >
              {createBusy ? "Publishing..." : "Publish Announcement"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={!!selectedAnnouncement}
        onClose={() => setSelectedAnnouncement(null)}
        title={selectedAnnouncement?.title ?? "Announcement Details"}
      >
        {loadingDetail ? (
          <div className="py-10 text-center text-sm text-zinc-600">Loading announcement details...</div>
        ) : selectedAnnouncement ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-xs uppercase tracking-wide ${getPriorityBadge(selectedAnnouncement.priority)}`}>
                {selectedAnnouncement.priority}
              </span>
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                {selectedAnnouncement.is_system_wide ? "System-wide" : "Department"}
              </span>
              <span className="inline-flex items-center gap-1 text-xs text-zinc-500">
                <CalendarDays className="h-3.5 w-3.5" />
                {new Date(selectedAnnouncement.created_at).toLocaleString()}
              </span>
            </div>

            <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm text-zinc-700">
              <p className="whitespace-pre-wrap">{selectedAnnouncement.content}</p>
            </div>

            {selectedAnnouncement.memo_file_name ? (
              <div className="rounded-lg border border-blue-200 bg-blue-50/70 px-3 py-3">
                <p className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-blue-700">
                  <Paperclip className="h-3.5 w-3.5" />
                  Memo Attachment
                </p>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-blue-900">{selectedAnnouncement.memo_file_name}</p>
                  <a
                    href={`/api/announcements/${selectedAnnouncement.id}/memo`}
                    className="inline-flex items-center gap-1 rounded-md border border-blue-300 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100 hover:cursor-pointer"
                  >
                    <Megaphone className="h-3.5 w-3.5" />
                    Download Memo
                  </a>
                </div>
              </div>
            ) : null}

            {selectedAnnouncement.expires_at ? (
              <p className="text-xs text-zinc-500">Expires: {new Date(selectedAnnouncement.expires_at).toLocaleString()}</p>
            ) : null}
          </div>
        ) : (
          <div className="py-10 text-center text-sm text-zinc-600">No announcement selected.</div>
        )}
      </Modal>
    </div>
  );
}
