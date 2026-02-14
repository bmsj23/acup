"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FileText, Search, Trash2 } from "lucide-react";
import type { UserRole } from "@/types/database";

type DocumentItem = {
  id: string;
  title: string;
  file_name: string;
  status: "active" | "archived" | "deleted";
  created_at: string;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
};

type DocumentsResponse = {
  data: DocumentItem[];
  pagination: Pagination;
};

type DocumentsClientProps = {
  role: UserRole;
};

function getStatusBadge(status: DocumentItem["status"]) {
  if (status === "deleted") {
    return "bg-red-100 text-red-700";
  }

  if (status === "archived") {
    return "bg-amber-100 text-amber-700";
  }

  return "bg-emerald-100 text-emerald-700";
}

export default function DocumentsClient({ role }: DocumentsClientProps) {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    total_pages: 1,
  });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);

  const canDelete = role === "avp" || role === "division_head";

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set("page", String(pagination.page));
    params.set("limit", String(pagination.limit));

    if (search.trim()) {
      params.set("search", search.trim());
    }

    if (status !== "all") {
      params.set("status", status);
    }

    return params.toString();
  }, [pagination.page, pagination.limit, search, status]);

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/documents?${queryString}`, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        setError("Failed to load documents.");
        setDocuments([]);
        return;
      }

      const payload = (await response.json()) as DocumentsResponse;
      setDocuments(payload.data ?? []);
      setPagination(payload.pagination);
    } catch {
      setError("Failed to load documents.");
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, [queryString]);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

  async function handleDelete(id: string) {
    const confirmed = window.confirm("Archive-delete this document record?");
    if (!confirmed) {
      return;
    }

    setActionBusyId(id);
    setError(null);

    try {
      const response = await fetch(`/api/documents/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        setError("Delete failed. You may not have access for this action.");
        return;
      }

      await loadDocuments();
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
                placeholder="Search title or filename"
                className="w-full rounded-md border border-zinc-300 bg-white py-2 pl-9 pr-3 text-sm text-zinc-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-600">
              Status
            </label>
            <select
              value={status}
              onChange={(event) => {
                setPagination((previous) => ({ ...previous, page: 1 }));
                setStatus(event.target.value);
              }}
              className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
              <option value="deleted">Deleted</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => void loadDocuments()}
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 hover:cursor-pointer"
          >
            <FileText className="h-4 w-4" /> Refresh
          </button>
        </div>
      </section>

      {error ? (
        <section className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-700">{error}</p>
        </section>
      ) : null}

      <section className="rounded-lg border border-zinc-200 bg-white p-5">
        <h2 className="font-serif text-xl font-semibold text-zinc-900">Document Activity</h2>
        <div className="mt-4 space-y-3">
          {loading ? (
            <p className="text-sm text-zinc-600">Loading documents...</p>
          ) : documents.length > 0 ? (
            documents.map((item) => (
              <article key={item.id} className="rounded-md border border-zinc-200 bg-zinc-50 p-4">
                <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">{item.title}</p>
                    <p className="text-xs text-zinc-600">{item.file_name}</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {new Date(item.created_at).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs uppercase tracking-wide ${getStatusBadge(item.status)}`}
                    >
                      {item.status}
                    </span>
                    {canDelete ? (
                      <button
                        type="button"
                        onClick={() => void handleDelete(item.id)}
                        disabled={item.status === "deleted" || actionBusyId === item.id}
                        className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-white px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50 hover:cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {actionBusyId === item.id ? "Deleting" : "Delete"}
                      </button>
                    ) : null}
                  </div>
                </div>
              </article>
            ))
          ) : (
            <p className="text-sm text-zinc-600">No documents found.</p>
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
