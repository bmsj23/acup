"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Bell, Search, Trash2 } from "lucide-react";

type AnnouncementItem = {
  id: string;
  title: string;
  priority: "normal" | "urgent" | "critical";
  is_system_wide: boolean;
  created_at: string;
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

  const loadAnnouncements = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
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
    } catch {
      setError("Failed to load announcements.");
      setAnnouncements([]);
    } finally {
      setLoading(false);
    }
  }, [queryString]);

  useEffect(() => {
    void loadAnnouncements();
  }, [loadAnnouncements]);

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
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <section className="rounded-lg border border-zinc-200 bg-white p-5">
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
              className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
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
              className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
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

      <section className="rounded-lg border border-zinc-200 bg-white p-5">
        <h2 className="font-serif text-xl font-semibold text-zinc-900">Latest Updates</h2>
        <div className="mt-4 space-y-3">
          {loading ? (
            <p className="text-sm text-zinc-600">Loading announcements...</p>
          ) : announcements.length > 0 ? (
            announcements.map((item) => (
              <article key={item.id} className="rounded-md border border-zinc-200 bg-zinc-50 p-4">
                <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">{item.title}</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {new Date(item.created_at).toLocaleString()}
                    </p>
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
    </div>
  );
}
