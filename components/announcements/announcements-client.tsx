"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Bell,
  CalendarDays,
  Megaphone,
  Paperclip,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import Select from "@/components/ui/select";
import DatePicker from "@/components/ui/date-picker";

type DepartmentItem = {
  id: string;
  name: string;
};

type PublisherProfile = {
  full_name: string;
  role: string;
  department_memberships?: { departments: { code: string } | null }[];
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
  profiles?: PublisherProfile | null;
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

type ViewState = "list" | "detail" | "create";

function getPriorityBadge(priority: AnnouncementItem["priority"]) {
  if (priority === "critical") {
    return "bg-red-100 text-red-700";
  }

  if (priority === "urgent") {
    return "bg-amber-100 text-amber-700";
  }

  return "bg-zinc-200 text-zinc-700";
}

function getPriorityBorder(priority: AnnouncementItem["priority"]) {
  if (priority === "critical") return "border-l-red-500";
  if (priority === "urgent") return "border-l-amber-500";
  return "border-l-blue-800";
}

const DEPT_CODE_LABELS: Record<string, string> = {
  PULM: "Pulmonary",
  SPEC: "Specialty Clinics",
  PATH: "Laboratory",
  PHAR: "Pharmacy",
  CARD: "Cardiovascular",
  RADI: "Radiology",
  CPHR: "Clinical Pharmacy",
  NUCM: "Nuclear Medicine",
  MEDR: "Medical Records",
  PHRE: "Rehabilitation",
  CNUT: "Clinical Nutrition",
  BRST: "Breast Center",
  NEUR: "Neuroscience",
  IBLI: "Ibaan-LIMA",
};

function formatPublisher(profile: PublisherProfile | null | undefined): string {
  if (!profile) return "Unknown";

  if (profile.role === "avp") return "AVP";
  if (profile.role === "division_head") return "Ancillary Director";

  // department_head — resolve department label
  const code = profile.department_memberships?.[0]?.departments?.code;
  // eslint-disable-next-line security/detect-object-injection
  const deptLabel = code ? DEPT_CODE_LABELS[code] : null;
  return deptLabel ? `${deptLabel} Head` : "Department Head";
}

type AnnouncementsClientProps = {
  role: "avp" | "division_head" | "department_head";
  userDepartmentId: string | null;
  userDepartmentName: string | null;
};

export default function AnnouncementsClient({ role, userDepartmentId, userDepartmentName }: AnnouncementsClientProps) {
  const [view, setView] = useState<ViewState>("list");
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

  // create form state
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [createPriority, setCreatePriority] = useState<"normal" | "urgent" | "critical">("normal");
  const [isSystemWide, setIsSystemWide] = useState(role !== "department_head");
  const [departmentId, setDepartmentId] = useState(role === "department_head" ? (userDepartmentId ?? "") : "");
  const [expiresAt, setExpiresAt] = useState("");
  const [memoFile, setMemoFile] = useState<File | null>(null);

  // detail state
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<AnnouncementDetail | null>(null);
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
      setIsSystemWide(role !== "department_head");
      setDepartmentId(role === "department_head" ? (userDepartmentId ?? "") : "");
      setExpiresAt("");
      setMemoFile(null);
      setView("list");
      await loadAnnouncements();
    } catch {
      setCreateError("Failed to create announcement.");
    } finally {
      setCreateBusy(false);
    }
  }

  async function handleOpenAnnouncement(id: string) {
    setLoadingDetail(true);
    setView("detail");
    try {
      const response = await fetch(`/api/announcements/${id}`, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        setError("Failed to load announcement details.");
        setView("list");
        return;
      }

      const payload = (await response.json()) as { data?: AnnouncementDetail };
      setSelectedAnnouncement(payload.data ?? null);
    } catch {
      setError("Failed to load announcement details.");
      setView("list");
    } finally {
      setLoadingDetail(false);
    }
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm("Delete this announcement?");
    if (!confirmed) return;

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

      setView("list");
      setSelectedAnnouncement(null);
      await loadAnnouncements();
    } catch {
      setError("Delete failed. Try again.");
    } finally {
      setActionBusyId(null);
    }
  }

  function handleBackToList() {
    setView("list");
    setSelectedAnnouncement(null);
    setCreateError(null);
  }

  // detail view
  if (view === "detail") {
    return (
      <div className="w-full space-y-6">
        <button
          type="button"
          onClick={handleBackToList}
          className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900 hover:cursor-pointer">
          <ArrowLeft className="h-4 w-4" />
          Back to Announcements
        </button>

        {loadingDetail ? (
          <div className="flex items-center justify-center rounded-xl border border-zinc-200 bg-white py-20 shadow-sm">
            <p className="text-sm text-zinc-600">Loading announcement details...</p>
          </div>
        ) : selectedAnnouncement ? (
          <article className="rounded-xl border border-zinc-200 bg-white shadow-sm">
            <div className="border-b border-zinc-100 p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="space-y-3">
                  <h1 className="font-serif text-2xl font-semibold text-zinc-900">
                    {selectedAnnouncement.title}
                  </h1>
                  <p className="text-sm font-medium text-zinc-600">
                    {formatPublisher(selectedAnnouncement.profiles)}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs uppercase tracking-wide ${getPriorityBadge(selectedAnnouncement.priority)}`}>
                      {selectedAnnouncement.priority}
                    </span>
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-800">
                      {selectedAnnouncement.is_system_wide ? "System-wide" : "Department"}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs text-zinc-500">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {new Date(selectedAnnouncement.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void handleDelete(selectedAnnouncement.id)}
                  disabled={actionBusyId === selectedAnnouncement.id}
                  className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 hover:cursor-pointer disabled:cursor-not-allowed disabled:opacity-60">
                  <Trash2 className="h-4 w-4" />
                  {actionBusyId === selectedAnnouncement.id ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-5">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">
                  {selectedAnnouncement.content}
                </p>
              </div>
            </div>

            {selectedAnnouncement.memo_file_name ? (
              <div className="border-t border-zinc-100 p-6">
                <div className="rounded-lg border border-blue-200 bg-blue-50/70 p-4">
                  <p className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-blue-800">
                    <Paperclip className="h-3.5 w-3.5" />
                    Memo Attachment
                  </p>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm text-blue-900">{selectedAnnouncement.memo_file_name}</p>
                    <a
                      href={`/api/announcements/${selectedAnnouncement.id}/memo`}
                      className="inline-flex items-center gap-1 rounded-md border border-blue-300 bg-white px-3 py-1.5 text-xs font-semibold text-blue-800 transition-colors hover:bg-blue-100 hover:cursor-pointer">
                      <Megaphone className="h-3.5 w-3.5" />
                      Download Memo
                    </a>
                  </div>
                </div>
              </div>
            ) : null}

            {selectedAnnouncement.expires_at ? (
              <div className="border-t border-zinc-100 px-6 py-4">
                <p className="text-xs text-zinc-500">
                  Expires: {new Date(selectedAnnouncement.expires_at).toLocaleString()}
                </p>
              </div>
            ) : null}
          </article>
        ) : (
          <div className="flex items-center justify-center rounded-xl border border-zinc-200 bg-white py-20 shadow-sm">
            <p className="text-sm text-zinc-600">Announcement not found.</p>
          </div>
        )}

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-medium text-red-700">{error}</p>
          </div>
        ) : null}
      </div>
    );
  }

  // create view
  if (view === "create") {
    return (
      <div className="w-full space-y-6">
        <button
          type="button"
          onClick={handleBackToList}
          className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900 hover:cursor-pointer">
          <ArrowLeft className="h-4 w-4" />
          Back to Announcements
        </button>

        <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h1 className="font-serif text-2xl font-semibold text-zinc-900">Create Announcement</h1>
          <p className="mt-1 text-sm text-zinc-600">Publish an operational update with an optional PDF memo attachment.</p>

          <div className="mt-6 space-y-5">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-600">Title</label>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Announcement title"
                className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-blue-800 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-600">Content</label>
              <textarea
                value={content}
                onChange={(event) => setContent(event.target.value)}
                rows={6}
                placeholder="Write the announcement details"
                className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-blue-800 focus:bg-white focus:ring-4 focus:ring-blue-500/10 resize-none"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-600">Priority</label>
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
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-600">Department</label>
                  <div className="flex items-center rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-700">
                    {userDepartmentName ?? "Your Department"}
                  </div>
                  <p className="mt-1 text-xs text-zinc-400">Announcements are scoped to your department only.</p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-600">Scope</label>
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
                      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-600">Department</label>
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
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-600">Expires On (Optional)</label>
                <DatePicker
                  value={expiresAt}
                  onChange={setExpiresAt}
                  placeholder="No expiration"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-600">Memo Attachment (PDF, Optional)</label>
              <input
                type="file"
                accept="application/pdf"
                onChange={(event) => setMemoFile(event.target.files?.[0] ?? null)}
                className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 file:mr-3 file:rounded-md file:border-0 file:bg-blue-100 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-blue-800 hover:cursor-pointer"
              />
            </div>

            {createError ? <p className="text-sm font-medium text-red-700">{createError}</p> : null}

            <div className="flex items-center justify-end gap-3 border-t border-zinc-100 pt-5">
              <button
                type="button"
                onClick={handleBackToList}
                className="rounded-lg border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 hover:cursor-pointer">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleCreateAnnouncement()}
                disabled={createBusy}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-800 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-900 hover:cursor-pointer disabled:cursor-not-allowed disabled:opacity-60">
                {createBusy ? "Publishing..." : "Publish Announcement"}
              </button>
            </div>
          </div>
        </section>
      </div>
    );
  }

  // list view (default)
  return (
    <div className="w-full space-y-6">
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
                className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2.5 pl-9 pr-3 text-sm text-zinc-900 outline-none transition focus:border-blue-800 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-600">
              Priority
            </label>
            <Select
              value={priority}
              onChange={(val) => {
                setPagination((previous) => ({ ...previous, page: 1 }));
                setPriority(val);
              }}
              options={[
                { value: "all", label: "All" },
                { value: "normal", label: "Normal" },
                { value: "urgent", label: "Urgent" },
                { value: "critical", label: "Critical" },
              ]}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-600">
              Scope
            </label>
            <Select
              value={scope}
              onChange={(val) => {
                setPagination((previous) => ({ ...previous, page: 1 }));
                setScope(val);
              }}
              options={[
                { value: "all", label: "All" },
                { value: "system", label: "System-wide" },
                { value: "department", label: "Department-scoped" },
              ]}
            />
          </div>

          <div className="flex items-center gap-2 lg:ml-auto">
            <button
              type="button"
              onClick={() => void loadAnnouncements()}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-800 px-3 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-900 hover:cursor-pointer">
              <Bell className="h-4 w-4" /> Refresh
            </button>
            <button
              type="button"
              onClick={() => setView("create")}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-800 px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-900 hover:cursor-pointer">
              <Plus className="h-4 w-4" />
              Create Announcement
            </button>
          </div>
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
              <article
                key={item.id}
                onClick={() => void handleOpenAnnouncement(item.id)}
                className={`group rounded-xl border bg-white p-4 transition-all hover:bg-zinc-50/60 hover:-translate-y-0.5 hover:shadow-md hover:cursor-pointer border-l-4 ${getPriorityBorder(item.priority)} border-zinc-200`}>
                <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-zinc-900 transition-colors group-hover:text-blue-800">
                      {item.title}
                    </h3>
                    <p className="mt-0.5 text-xs font-medium text-zinc-600">
                      {formatPublisher(item.profiles)}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {new Date(item.created_at).toLocaleString()}
                    </p>
                    {item.memo_file_name ? (
                      <p className="mt-1 inline-flex items-center gap-1 text-xs text-blue-800">
                        <Paperclip className="h-3.5 w-3.5" />
                        Memo attached
                      </p>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs uppercase tracking-wide ${getPriorityBadge(item.priority)}`}>
                      {item.priority}
                    </span>
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-800">
                      {item.is_system_wide ? "System-wide" : "Department"}
                    </span>
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
              className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100 hover:cursor-pointer disabled:cursor-not-allowed disabled:opacity-60">
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
              className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100 hover:cursor-pointer disabled:cursor-not-allowed disabled:opacity-60">
              Next
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
