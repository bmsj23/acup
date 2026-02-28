"use client";

import { Plus, Search } from "lucide-react";
import Select from "@/components/ui/select";
import type { DepartmentItem, ThreadItem } from "./types";

type ThreadListProps = {
  threads: ThreadItem[];
  selectedThreadId: string | null;
  unreadThreadIds: string[];
  threadSearch: string;
  loadingThreads: boolean;
  showCreateComposer: boolean;
  threadTitle: string;
  threadBody: string;
  threadScope: "system" | "department";
  threadDepartmentId: string;
  threadError: string | null;
  creatingThread: boolean;
  departments: DepartmentItem[];
  onSearchChange: (value: string) => void;
  onToggleComposer: () => void;
  onSelectThread: (id: string) => void;
  onTitleChange: (value: string) => void;
  onBodyChange: (value: string) => void;
  onScopeChange: (value: "system" | "department") => void;
  onDepartmentIdChange: (value: string) => void;
  onCreateThread: () => void;
};

export default function ThreadList({
  threads,
  selectedThreadId,
  unreadThreadIds,
  threadSearch,
  loadingThreads,
  showCreateComposer,
  threadTitle,
  threadBody,
  threadScope,
  threadDepartmentId,
  threadError,
  creatingThread,
  departments,
  onSearchChange,
  onToggleComposer,
  onSelectThread,
  onTitleChange,
  onBodyChange,
  onScopeChange,
  onDepartmentIdChange,
  onCreateThread,
}: ThreadListProps) {
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50/70">
      <div className="border-b border-zinc-200 p-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
            <input
              value={threadSearch}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search threads"
              className="w-full rounded-lg border border-zinc-200 bg-white py-2 pl-9 pr-3 text-sm text-zinc-900 outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-200"
            />
          </div>
          <button
            type="button"
            onClick={onToggleComposer}
            className="inline-flex items-center justify-center rounded-lg bg-blue-800 p-2 text-white transition-colors hover:bg-blue-900 hover:cursor-pointer"
            title="Create thread"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {showCreateComposer ? (
          <div className="mt-3 space-y-2 rounded-lg border border-blue-100 bg-blue-50/60 p-2.5">
            <input
              value={threadTitle}
              onChange={(event) => onTitleChange(event.target.value)}
              placeholder="Thread title"
              className="w-full rounded-md border border-blue-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-200"
            />
            <div className="grid gap-2 sm:grid-cols-2">
              <Select
                value={threadScope}
                onChange={(val) => onScopeChange(val as "system" | "department")}
                options={[
                  { value: "system", label: "System-wide" },
                  { value: "department", label: "Department-scoped" },
                ]}
              />
              {threadScope === "department" ? (
                <Select
                  value={threadDepartmentId}
                  onChange={onDepartmentIdChange}
                  placeholder="Select department"
                  options={departments.map((department) => ({
                    value: department.id,
                    label: department.name,
                  }))}
                />
              ) : null}
            </div>
            <textarea
              value={threadBody}
              onChange={(event) => onBodyChange(event.target.value)}
              rows={2}
              placeholder="Opening message"
              className="w-full rounded-md border border-blue-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-200"
            />
            <div className="flex items-center justify-between">
              {threadError ? <p className="text-xs font-medium text-red-700">{threadError}</p> : <span />}
              <button
                type="button"
                onClick={onCreateThread}
                disabled={creatingThread}
                className="rounded-md bg-blue-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-900 hover:cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
              >
                {creatingThread ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {loadingThreads ? (
          <p className="text-sm text-zinc-600">Loading threads...</p>
        ) : threads.length > 0 ? (
          threads.map((thread) => {
            const isActive = thread.id === selectedThreadId;
            return (
              <button
                key={thread.id}
                type="button"
                onClick={() => onSelectThread(thread.id)}
                className={
                  isActive
                    ? "w-full rounded-lg border border-blue-200 bg-blue-50 p-3 text-left shadow-sm hover:cursor-pointer"
                    : "w-full rounded-lg border border-zinc-200 bg-white p-3 text-left transition-colors hover:border-blue-200 hover:bg-blue-50 hover:cursor-pointer"
                }
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="line-clamp-1 text-sm font-semibold text-zinc-900">
                    {thread.title}
                  </p>
                  {unreadThreadIds.includes(thread.id) ? (
                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-800 px-1.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                      New
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-xs text-zinc-500">
                  {thread.is_system_wide ? "System-wide" : "Department"}
                </p>
                {thread.latest_message_body ? (
                  <p className="mt-1 line-clamp-1 text-xs text-zinc-500">
                    {thread.latest_message_body}
                  </p>
                ) : null}
              </button>
            );
          })
        ) : (
          <p className="text-sm text-zinc-600">No messaging threads found.</p>
        )}
      </div>
    </article>
  );
}