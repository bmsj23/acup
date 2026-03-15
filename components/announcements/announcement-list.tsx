"use client";

import {
  ArrowRight,
  BellRing,
  CalendarDays,
  Globe2,
  Paperclip,
  Plus,
  RefreshCw,
  Search,
  TriangleAlert,
} from "lucide-react";
import Select from "@/components/ui/select";
import InlineErrorBanner from "@/components/ui/inline-error-banner";
import { APP_BRAND } from "@/lib/constants/brand";
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
  dataAsOf?: string | null;
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
  dataAsOf,
  onSearchChange,
  onPriorityChange,
  onScopeChange,
  onPageChange,
  onRefresh,
  onOpenAnnouncement,
  onCreateNew,
}: AnnouncementListProps) {
  const criticalCount = announcements.filter((item) => item.priority === "critical").length;
  const urgentCount = announcements.filter((item) => item.priority === "urgent").length;
  const attachmentCount = announcements.filter((item) => Boolean(item.memo_file_name)).length;

  return (
    <div className="relative w-full space-y-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[24rem] rounded-[2.5rem] bg-[linear-gradient(180deg,rgba(239,246,255,0.92),rgba(247,250,252,0.84),rgba(255,255,255,0))]" />

      <section className="overflow-hidden rounded-[2rem] border border-blue-100/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(244,248,252,0.96))] shadow-[0_32px_90px_-48px_rgba(30,64,175,0.18)]">
        <div className="grid gap-6 px-6 py-7 md:px-8 xl:grid-cols-[minmax(0,1.25fr)_24rem] xl:items-start">
          <div>
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.32em] text-slate-500">
              Communication hub
            </p>
            <h1 className="mt-3 text-4xl font-semibold leading-tight text-slate-950 [font-family:var(--font-playfair)] md:text-[3.2rem]">
              Clinical announcements
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-8 text-slate-600">
              Publish operational updates, urgent advisories, and department communications in the {APP_BRAND.shortName} briefing workspace.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[1.4rem] border border-blue-100/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,250,255,0.94))] p-4 shadow-[0_18px_40px_-34px_rgba(30,64,175,0.14)]">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Active on screen
                </p>
                <p className="mt-2 text-3xl font-semibold text-slate-950">{pagination.total}</p>
                <p className="mt-1 text-sm text-slate-600">Matching the current review filters.</p>
              </div>
              <div className="rounded-[1.4rem] border border-blue-100/80 bg-[linear-gradient(180deg,rgba(239,246,255,0.98),rgba(255,255,255,0.92))] p-4 shadow-[0_18px_40px_-34px_rgba(30,64,175,0.12)]">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-blue-700">
                  Urgent or critical
                </p>
                <p className="mt-2 text-3xl font-semibold text-slate-950">{urgentCount + criticalCount}</p>
                <p className="mt-1 text-sm text-slate-600">Priority communications needing closer review.</p>
              </div>
              <div className="rounded-[1.4rem] border border-blue-100/80 bg-[linear-gradient(180deg,rgba(239,246,255,0.98),rgba(255,255,255,0.92))] p-4 shadow-[0_18px_40px_-34px_rgba(30,64,175,0.12)]">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-blue-700">
                  With memo
                </p>
                <p className="mt-2 text-3xl font-semibold text-slate-950">{attachmentCount}</p>
                <p className="mt-1 text-sm text-slate-600">Announcements carrying a formal PDF attachment.</p>
              </div>
            </div>
          </div>

          <div className="rounded-[1.8rem] border border-blue-100/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(245,249,255,0.95))] p-5 shadow-[0_24px_60px_-40px_rgba(30,64,175,0.16)] backdrop-blur-sm">
            <div>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-slate-500">
                Workspace action
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950 [font-family:var(--font-playfair)]">
                Issue a new briefing
              </h2>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                Draft a leadership memo or department update with a clear title, controlled priority, and optional expiration.
              </p>
            </div>

            <button
              type="button"
              onClick={onCreateNew}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-blue-800 px-5 py-3.5 text-sm font-semibold text-white shadow-[0_22px_40px_-28px_rgba(30,64,175,0.45)] transition-colors hover:cursor-pointer hover:bg-blue-900"
            >
              <Plus className="h-4 w-4" />
              New announcement
            </button>

            <button
              type="button"
              onClick={onRefresh}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full border border-blue-100 bg-white/90 px-5 py-3 text-sm font-semibold text-blue-800 transition-colors hover:cursor-pointer hover:bg-blue-50"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh feed
            </button>

            <div className="mt-5 rounded-[1.35rem] border border-blue-100/80 bg-blue-50/55 p-4">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-slate-500">
                Feed status
              </p>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                {dataAsOf ? `Latest data refresh at ${dataAsOf}.` : "Waiting for the latest refresh timestamp."}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[1.9rem] border border-blue-100/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(245,249,255,0.94))] p-5 shadow-[0_28px_70px_-46px_rgba(30,64,175,0.14)] backdrop-blur-sm">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_12rem_13rem] md:items-end">
          <div className="relative">
            <label className="mb-2 block text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-slate-500">
              Search briefings
            </label>
            <Search className="absolute left-4 top-[calc(50%+0.4rem)] h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search title or communication details"
              className="w-full rounded-[1.2rem] border border-blue-100 bg-slate-50/70 py-3 pl-11 pr-4 text-sm text-slate-800 outline-none transition-colors focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label className="mb-2 block text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-slate-500">
              Priority
            </label>
            <Select
              value={priority}
              onChange={onPriorityChange}
              aria-label="Filter announcements by priority"
              options={[
                { value: "all", label: "All priority" },
                { value: "normal", label: "Normal" },
                { value: "urgent", label: "Urgent" },
                { value: "critical", label: "Critical" },
              ]}
            />
          </div>

          <div>
            <label className="mb-2 block text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-slate-500">
              Scope
            </label>
            <Select
              value={scope}
              onChange={onScopeChange}
              aria-label="Filter announcements by scope"
              options={[
                { value: "all", label: "All scopes" },
                { value: "system", label: "System-wide" },
                { value: "department", label: "Department" },
              ]}
            />
          </div>
        </div>
      </section>

      {error ? <InlineErrorBanner message={error} /> : null}

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="rounded-[1.8rem] border border-blue-100/75 bg-[linear-gradient(135deg,rgba(255,255,255,0.99),rgba(245,249,255,0.95))] p-5 shadow-[0_24px_60px_-42px_rgba(30,64,175,0.16)]"
            >
              <div className="animate-pulse">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="h-7 w-24 rounded-full bg-blue-100/85" />
                      <div className="h-7 w-32 rounded-full bg-blue-50" />
                    </div>
                    <div className="mt-4 h-5 w-2/3 rounded-full bg-blue-100/80" />
                    <div className="mt-3 h-4 w-48 rounded-full bg-slate-100" />
                    <div className="mt-2 h-4 w-36 rounded-full bg-slate-100" />
                    <div className="mt-4 flex gap-2">
                      <div className="h-7 w-28 rounded-full bg-blue-50" />
                      <div className="h-7 w-24 rounded-full bg-slate-100" />
                    </div>
                  </div>
                  <div className="h-4 w-28 rounded-full bg-slate-100 lg:mt-2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : announcements.length > 0 ? (
        <div className="space-y-4">
          {announcements.map((item) => {
            const scopeLabel = item.is_system_wide ? "System-wide" : "Department";
            const priorityTone =
              item.priority === "critical"
                ? "bg-red-50/80 text-red-700"
                : item.priority === "urgent"
                  ? "bg-blue-50/90 text-blue-700"
                  : "bg-slate-100 text-slate-600";

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => void onOpenAnnouncement(item.id)}
                className={`group relative w-full overflow-hidden rounded-[1.8rem] border bg-[linear-gradient(135deg,rgba(255,255,255,0.99),rgba(245,249,255,0.95))] p-5 text-left shadow-[0_24px_60px_-42px_rgba(30,64,175,0.16)] transition-all duration-300 hover:cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_30px_80px_-44px_rgba(30,64,175,0.22)] ${getPriorityBorder(item.priority)}`}
              >
                <div
                  className={`pointer-events-none absolute inset-y-0 left-0 w-1 ${
                    item.priority === "critical"
                      ? "bg-red-500/85"
                      : item.priority === "urgent"
                        ? "bg-blue-600/85"
                        : "bg-blue-300/85"
                  }`}
                />

                <div className="flex flex-col gap-5 pl-2 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] ${getPriorityBadge(item.priority)}`}
                      >
                        {item.priority}
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50/75 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-blue-700">
                        <Globe2 className="h-3.5 w-3.5" />
                        {scopeLabel}
                      </span>
                      {item.memo_file_name ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-white/90 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-600">
                          <Paperclip className="h-3.5 w-3.5" />
                          Memo attached
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-4">
                      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-slate-500">
                        Announcement title
                      </p>
                      <h2 className="mt-2 text-xl font-semibold text-slate-950 transition-colors group-hover:text-blue-800 [font-family:var(--font-playfair)]">
                        {item.title}
                      </h2>
                    </div>

                    <div className="mt-5 grid gap-3 md:grid-cols-3">
                      <div className="rounded-[1.2rem] border border-blue-100/80 bg-blue-50/45 p-3.5">
                        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-slate-500">
                          Published by
                        </p>
                        <p className="mt-2 text-sm font-semibold text-slate-900">
                          {formatPublisher(item.profiles)}
                        </p>
                      </div>
                      <div className="rounded-[1.2rem] border border-blue-100/80 bg-blue-50/45 p-3.5">
                        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-slate-500">
                          Scope
                        </p>
                        <p className="mt-2 text-sm font-semibold text-slate-900">{scopeLabel}</p>
                      </div>
                      <div className={`rounded-[1.2rem] border border-blue-100/80 p-3.5 ${priorityTone}`}>
                        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-current/80">
                          Priority posture
                        </p>
                        <p className="mt-2 text-sm font-semibold capitalize text-current">
                          {item.priority}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-end justify-between gap-4 lg:w-56 lg:flex-col lg:items-end">
                    <div className="inline-flex items-center gap-2 text-xs font-medium text-slate-500">
                      <CalendarDays className="h-3.5 w-3.5" />
                      <span>{new Date(item.created_at).toLocaleString()}</span>
                    </div>
                    <div className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 transition-colors group-hover:text-slate-950">
                      Open briefing
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-[1.8rem] border border-blue-100/75 bg-white/95 py-24 text-center shadow-[0_28px_70px_-46px_rgba(30,64,175,0.14)]">
          <BellRing className="mb-4 h-12 w-12 text-slate-300" />
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-slate-500">
            No matching communications
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-slate-950 [font-family:var(--font-playfair)]">
            The announcement feed is clear
          </h2>
          <p className="mt-2 max-w-md text-sm leading-7 text-slate-600">
            Adjust the filters or publish a new briefing to share an operational update.
          </p>
        </div>
      )}

      {pagination.total_pages > 1 ? (
        <div className="flex flex-col gap-3 rounded-[1.6rem] border border-blue-100/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(245,249,255,0.94))] px-5 py-4 shadow-[0_24px_60px_-42px_rgba(30,64,175,0.14)] sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-600">
            Page <span className="font-semibold text-slate-900">{pagination.page}</span> of{" "}
            <span className="font-semibold text-slate-900">{pagination.total_pages}</span>
            {" "}with {pagination.total} total announcements.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onPageChange(Math.max(1, pagination.page - 1))}
              disabled={pagination.page <= 1 || loading}
              className="rounded-full border border-blue-100 bg-white px-4 py-2 text-sm font-medium text-blue-700 transition-colors hover:cursor-pointer hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => onPageChange(Math.min(pagination.total_pages, pagination.page + 1))}
              disabled={pagination.page >= pagination.total_pages || loading}
              className="rounded-full border border-blue-100 bg-white px-4 py-2 text-sm font-medium text-blue-700 transition-colors hover:cursor-pointer hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}

      {criticalCount > 0 ? (
        <section className="rounded-[1.8rem] border border-red-100/80 bg-[linear-gradient(180deg,rgba(254,242,242,0.96),rgba(255,255,255,0.98))] p-5 shadow-[0_24px_60px_-46px_rgba(220,38,38,0.12)]">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-600">
              <TriangleAlert className="h-4 w-4" />
            </span>
            <div>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-red-700">
                Priority note
              </p>
              <p className="mt-2 text-sm leading-7 text-slate-700">
                There {criticalCount === 1 ? "is" : "are"} currently{" "}
                <span className="font-semibold text-slate-950">{criticalCount}</span>{" "}
                critical announcement{criticalCount === 1 ? "" : "s"} visible in this view.
              </p>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
