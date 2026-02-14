"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Bell, Filter, MessageSquare, Search } from "lucide-react";

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

function getPriorityTone(priority: AnnouncementItem["priority"]) {
  if (priority === "critical") {
    return "bg-red-100 text-red-700";
  }

  if (priority === "urgent") {
    return "bg-amber-100 text-amber-700";
  }

  return "bg-zinc-200 text-zinc-700";
}

export default function MessagingClient() {
  const [messages, setMessages] = useState<AnnouncementItem[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 6,
    total: 0,
    total_pages: 1,
  });
  const [search, setSearch] = useState("");
  const [scope, setScope] = useState("all");
  const [loading, setLoading] = useState(true);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set("page", String(pagination.page));
    params.set("limit", String(pagination.limit));

    if (search.trim()) {
      params.set("search", search.trim());
    }

    if (scope === "system") {
      params.set("is_system_wide", "true");
    } else if (scope === "department") {
      params.set("is_system_wide", "false");
    }

    return params.toString();
  }, [pagination.page, pagination.limit, search, scope]);

  useEffect(() => {
    async function loadMessages() {
      setLoading(true);

      try {
        const response = await fetch(`/api/announcements?${queryString}`, {
          method: "GET",
          credentials: "include",
        });

        if (!response.ok) {
          setMessages([]);
          return;
        }

        const payload = (await response.json()) as AnnouncementsResponse;
        setMessages(payload.data ?? []);
        setPagination(payload.pagination);
      } finally {
        setLoading(false);
      }
    }

    void loadMessages();
  }, [queryString]);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <section className="rounded-lg border border-zinc-200 bg-white p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="font-serif text-xl font-semibold text-zinc-900">Messaging Command Center</h2>
            <p className="mt-1 text-sm text-zinc-600">
              Centralized communication feed for announcements and operational updates.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/announcements"
              className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 hover:cursor-pointer"
            >
              <Bell className="h-4 w-4" /> Open Announcements
            </Link>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 hover:cursor-pointer"
            >
              <MessageSquare className="h-4 w-4" /> Compose
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
          <div className="w-full lg:max-w-sm">
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-600">
              Search Feed
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
              <input
                value={search}
                onChange={(event) => {
                  setPagination((previous) => ({ ...previous, page: 1 }));
                  setSearch(event.target.value);
                }}
                placeholder="Search messaging feed"
                className="w-full rounded-md border border-zinc-300 bg-white py-2 pl-9 pr-3 text-sm text-zinc-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            </div>
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
            onClick={() => setPagination((previous) => ({ ...previous, page: 1 }))}
            className="inline-flex items-center gap-2 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 hover:cursor-pointer"
          >
            <Filter className="h-4 w-4" /> Reset to page 1
          </button>
        </div>

        <div className="mt-5 space-y-3">
          {loading ? (
            <p className="text-sm text-zinc-600">Loading feed...</p>
          ) : messages.length > 0 ? (
            messages.map((item) => (
              <article key={item.id} className="rounded-md border border-zinc-200 bg-zinc-50 p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <p className="text-sm font-semibold text-zinc-900">{item.title}</p>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs uppercase tracking-wide ${getPriorityTone(item.priority)}`}
                    >
                      {item.priority}
                    </span>
                    <span className="text-xs text-zinc-500">
                      {item.is_system_wide ? "System-wide" : "Department"}
                    </span>
                    <span className="text-xs text-zinc-500">
                      {new Date(item.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>
              </article>
            ))
          ) : (
            <p className="text-sm text-zinc-600">No messages found.</p>
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