"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FileText,
  Search,
  Trash2,
  Plus,
  Eye,
  File,
  FileSpreadsheet,
  Calendar,
} from "lucide-react";
import type { UserRole } from "@/types/database";
import DocumentUploadModal from "./document-upload-modal";
import DocumentViewerModal from "./document-viewer-modal";

type DocumentItem = {
  id: string;
  title: string;
  file_name: string;
  status: "active" | "archived" | "deleted";
  created_at: string;
  mime_type: string;
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
  departmentId: string | null;
};

function getStatusBadge(status: DocumentItem["status"]) {
  if (status === "deleted") {
    return "bg-red-50 text-red-700 border border-red-100";
  }
  if (status === "archived") {
    return "bg-amber-50 text-amber-700 border border-amber-100";
  }
  return "bg-emerald-50 text-emerald-700 border border-emerald-100";
}

function getFileIcon(mimeType: string) {
  if (mimeType.includes("pdf"))
    return <FileText className="h-5 w-5 text-red-500" />;
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel"))
    return <FileSpreadsheet className="h-5 w-5 text-emerald-500" />;
  return <File className="h-5 w-5 text-blue-500" />;
}

export default function DocumentsClient({
  role,
  departmentId,
}: DocumentsClientProps) {
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

  // Modal States
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [viewDocument, setViewDocument] = useState<{
    id: string;
    title: string;
  } | null>(null);

  const canDelete = role === "avp" || role === "division_head";
  const canUpload = !!departmentId; // Only if user belongs to a department
  const totalActive = documents.filter((item) => item.status === "active").length;
  const totalArchived = documents.filter(
    (item) => item.status === "archived",
  ).length;
  const totalDeleted = documents.filter((item) => item.status === "deleted").length;

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set("page", String(pagination.page));
    params.set("limit", String(pagination.limit));
    if (search.trim()) params.set("search", search.trim());
    if (status !== "all") params.set("status", status);
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
        setDocuments([]);
        return;
      }
      const payload = (await response.json()) as DocumentsResponse;
      setDocuments(payload.data ?? []);
      setPagination(payload.pagination);
    } catch {
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, [queryString]);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

  async function handleDelete(id: string) {
    if (!window.confirm("Are you sure you want to delete this document?"))
      return;
    setActionBusyId(id);
    try {
      const res = await fetch(`/api/documents/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete");
      await loadDocuments();
    } catch {
      alert("Failed to delete document.");
    } finally {
      setActionBusyId(null);
    }
  }

  return (
    <div className="w-full space-y-8">
      {/* Header Section */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold text-zinc-900">
            Documents
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            Manage and track departmental files securely.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
              Total: {pagination.total}
            </span>
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
              Active: {totalActive}
            </span>
            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
              Archived: {totalArchived}
            </span>
            <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700">
              Deleted: {totalDeleted}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => void loadDocuments()}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 hover:cursor-pointer transition-colors"
            title="Refresh List">
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          {canUpload && (
            <button
              onClick={() => setIsUploadOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 hover:cursor-pointer transition-all">
              <Plus className="h-4 w-4" />
              <span>Upload Document</span>
            </button>
          )}
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            value={search}
            onChange={(e) => {
              setPagination((p) => ({ ...p, page: 1 }));
              setSearch(e.target.value);
            }}
            placeholder="Search by title or filename..."
            className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2.5 pl-10 pr-4 text-sm text-zinc-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
          />
        </div>
        <div className="flex items-center gap-3">
          <select
            value={status}
            onChange={(e) => {
              setPagination((p) => ({ ...p, page: 1 }));
              setStatus(e.target.value);
            }}
            className="h-10 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 hover:cursor-pointer">
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
            <option value="deleted">Deleted</option>
          </select>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {/* Document List - Card Layout */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-48 animate-pulse rounded-xl border border-zinc-200 bg-zinc-50"></div>
          ))
        ) : documents.length > 0 ? (
          documents.map((doc) => (
            <div
              key={doc.id}
              className="group relative flex flex-col justify-between rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md">
              <div>
                <div className="mb-4 flex items-start justify-between">
                  <div className="rounded-lg bg-zinc-50 p-2.5 shadow-sm ring-1 ring-zinc-900/5 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                    {getFileIcon(doc.mime_type)}
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${getStatusBadge(doc.status)}`}>
                    {doc.status}
                  </span>
                </div>
                <h3
                  className="font-medium text-zinc-900 line-clamp-2"
                  title={doc.title}>
                  {doc.title}
                </h3>
                <p
                  className="mt-1 text-xs text-zinc-500 truncate"
                  title={doc.file_name}>
                  {doc.file_name}
                </p>
              </div>

              <div className="mt-6 flex flex-col gap-3">
                <div className="flex items-center gap-4 text-xs text-zinc-500">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-zinc-100">
                  <button
                    onClick={() =>
                      setViewDocument({ id: doc.id, title: doc.title })
                    }
                    className="flex-1 inline-flex justify-center items-center gap-1.5 rounded-md bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 hover:cursor-pointer transition-colors">
                    <Eye className="h-3.5 w-3.5" />
                    Preview
                  </button>
                  {canDelete && (
                    <button
                      onClick={() => handleDelete(doc.id)}
                      disabled={
                        doc.status === "deleted" || actionBusyId === doc.id
                      }
                      className="inline-flex items-center justify-center rounded-md p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600 hover:cursor-pointer transition-colors disabled:cursor-not-allowed"
                      title="Delete Document">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full flex flex-col items-center justify-center py-20 text-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50">
            <div className="rounded-full bg-zinc-100 p-4">
              <FileText className="h-8 w-8 text-zinc-400" />
            </div>
            <h3 className="mt-4 text-lg font-medium text-zinc-900">
              No documents found
            </h3>
            <p className="mt-1 text-sm text-zinc-500 max-w-sm">
              No documents match your search criteria. Try adjusting filters or
              upload a new document.
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {documents.length > 0 && (
        <div className="flex items-center justify-between border-t border-zinc-200 pt-6">
          <p className="text-sm text-zinc-600">
            Showing page <span className="font-medium">{pagination.page}</span>{" "}
            of <span className="font-medium">{pagination.total_pages}</span>
          </p>
          <div className="flex gap-2">
            <button
              onClick={() =>
                setPagination((p) => ({ ...p, page: Math.max(1, p.page - 1) }))
              }
              disabled={pagination.page <= 1 || loading}
              className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed hover:cursor-pointer">
              Previous
            </button>
            <button
              onClick={() =>
                setPagination((p) => ({
                  ...p,
                  page: Math.min(p.total_pages, p.page + 1),
                }))
              }
              disabled={pagination.page >= pagination.total_pages || loading}
              className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed hover:cursor-pointer">
              Next
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      <DocumentUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={loadDocuments}
        departmentId={departmentId}
      />

      {viewDocument && (
        <DocumentViewerModal
          isOpen={!!viewDocument}
          onClose={() => setViewDocument(null)}
          documentId={viewDocument.id}
          title={viewDocument.title}
        />
      )}
    </div>
  );
}
