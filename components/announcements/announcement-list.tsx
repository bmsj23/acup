"use client";

import { Bell, Paperclip, Plus, Search } from "lucide-react";
import Select from "@/components/ui/select";
import type { AnnouncementItem, Pagination } from "./types";
import { formatPublisher, getPriorityBadge, getPriorityBorder } from "./utils";

type AnnouncementListProps = {
  announcements: AnnouncementItem[];
  pagination: Pagination;
  search: string;
  priority: string;
  scope: string;
  loading: boolean;
  error: string | null;
  onSearchChange: (value: string) => void;
  onPriorityChange: (value: string) => void;
  onScopeChange: (value: string) => void;
  onPageChange: (page: number) => void;
  onRefresh: () => void;
  onOpenAnnouncement: (id: string) => void;
  onCreateNew: () => void;
};

export default function AnnouncementList({
  announcements,
  pagination,
  search,
  priority,
  scope,
  loading,
  error,
  onSearchChange,
  onPriorityChange,
  onScopeChange,
  onPageChange,
  onRefresh,
  onOpenAnnouncement,
  onCreateNew,
}: AnnouncementListProps) {
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
                onChange={(event) => onSearchChange(event.target.value)}
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
              onChange={onPriorityChange}
              aria-label="Filter announcements by priority"
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
              onChange={onScopeChange}
              aria-label="Filter announcements by scope"
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
              onClick={onRefresh}
              className="inline-flex items-center gap-2 rounded-lg bg-zinc-800 px-3 py-2.5 text-sm font-medium text-white transition-colors hover:cursor-pointer hover:bg-zinc-900"
            >
              <Bell className="h-4 w-4" /> Refresh
            </button>
            <button
              type="button"
              onClick={onCreateNew}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-800 px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:cursor-pointer hover:bg-blue-900"
            >
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
                onClick={() => void onOpenAnnouncement(item.id)}
                className={`group rounded-xl border border-l-4 border-zinc-200 bg-white p-4 transition-all hover:-translate-y-0.5 hover:cursor-pointer hover:bg-zinc-50/60 hover:shadow-md ${getPriorityBorder(item.priority)}`}
              >
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

                  <div className="flex shrink-0 items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs uppercase tracking-wide ${getPriorityBadge(item.priority)}`}
                    >
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
              onClick={() => onPageChange(Math.max(1, pagination.page - 1))}
              disabled={pagination.page <= 1 || loading}
              className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:cursor-pointer hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => onPageChange(Math.min(pagination.total_pages, pagination.page + 1))}
              disabled={pagination.page >= pagination.total_pages || loading}
              className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:cursor-pointer hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Next
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}