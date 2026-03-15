"use client";

import WorkspacePanel from "@/components/workspace/workspace-panel";

type IncidentPaginationProps = {
  page: number;
  totalPages: number;
  total: number;
  loading: boolean;
  onPageChange: (page: number) => void;
};

export default function IncidentPagination({
  page,
  totalPages,
  total,
  loading,
  onPageChange,
}: IncidentPaginationProps) {
  return (
    <WorkspacePanel className="px-5 py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-600">
          Page <span className="font-semibold text-slate-900">{page}</span> of{" "}
          <span className="font-semibold text-slate-900">{totalPages}</span>
          {" "}with {total} total incidents.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page <= 1 || loading}
            className="rounded-full border border-blue-100 bg-white px-4 py-2 text-sm font-medium text-blue-700 transition-colors hover:cursor-pointer hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages || loading}
            className="rounded-full border border-blue-100 bg-white px-4 py-2 text-sm font-medium text-blue-700 transition-colors hover:cursor-pointer hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </WorkspacePanel>
  );
}
